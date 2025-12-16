from collections import defaultdict
from datetime import datetime, date
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.core.excel import make_workbook
from app.core.power import overlap_seconds, energy_kwh
from app.models.machine import Machine
from app.models.session_model import Session
from app.models.payment import Payment
from app.models.employee import Employee
from app.models.shift import Shift
from app.schemas.reports import (
    PowerReportOut, PowerRow,
    SalariesReportOut, SalaryRow,
    FinanceReportOut
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_operator(user):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    role = getattr(user.role, "value", user.role)
    if role != "operator":
        raise HTTPException(status_code=403, detail="Only operator allowed")


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ================= POWER REPORT =================
@router.get("/power", response_model=PowerReportOut)
async def power_report(
    date_from: datetime,
    date_to: datetime,
    request: Request,
    price_per_kwh: float = Query(default=7.0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    machines = (await db.execute(select(Machine))).scalars().all()
    machine_map = {m.id: m for m in machines}

    sessions = (await db.execute(
        select(Session).where(
            Session.ended_at.is_not(None),
            Session.started_at < date_to,
            Session.ended_at > date_from,
        )
    )).scalars().all()

    seconds_map = defaultdict(float)

    for s in sessions:
        sec = overlap_seconds(
            cast(datetime, s.started_at),
            cast(datetime, s.ended_at),
            date_from,
            date_to
        )
        seconds_map[s.machine_id] += sec

    rows = []
    total_kwh = 0.0
    total_cost = 0.0

    for mid, sec in seconds_map.items():
        m = machine_map[mid]
        kwh = energy_kwh(m.watt, sec)
        rows.append(PowerRow(
            machine_id=m.id,
            machine_name=m.name,
            watt=m.watt,
            hours_used=round(sec / 3600, 2),
            kwh_used=round(kwh, 3),
        ))
        total_kwh += kwh
        total_cost += kwh * price_per_kwh

    result = PowerReportOut(
        date_from=date_from,
        date_to=date_to,
        price_per_kwh=price_per_kwh,
        rows=rows,
        total_kwh=round(total_kwh, 3),
        total_cost=round(total_cost, 2),
    )

    await log_action(
        db,
        user=user,
        action="GENERATE_REPORT_POWER",
        entity="report",
        entity_id=None,
        details=f"from={date_from.isoformat()} to={date_to.isoformat()} price_per_kwh={price_per_kwh}",
        ip_address=_ip(request),
    )

    return result


@router.get("/power.xlsx")
async def power_report_xlsx(
    date_from: datetime,
    date_to: datetime,
    request: Request,
    price_per_kwh: float = Query(default=7.0, ge=0.0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    report = await power_report(
        date_from=date_from,
        date_to=date_to,
        request=request,
        price_per_kwh=price_per_kwh,
        db=db,
        user=user,
    )

    headers = ["Machine ID", "Machine Name", "Watt", "Hours Used", "kWh Used"]
    rows = [
        [r.machine_id, r.machine_name, r.watt, r.hours_used, r.kwh_used]
        for r in report.rows
    ]
    rows.append([None, "TOTAL", None, report.total_kwh, report.total_cost])

    content = make_workbook("PowerReport", headers, rows)
    filename = f"power_report_{date_from.date()}_{date_to.date()}.xlsx"

    await log_action(
        db,
        user=user,
        action="EXPORT_REPORT_POWER_XLSX",
        entity="report",
        entity_id=None,
        details=f"from={date_from.isoformat()} to={date_to.isoformat()}",
        ip_address=_ip(request),
    )

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ================= SALARY REPORT =================
@router.get("/salaries", response_model=SalariesReportOut)
async def salaries_report(
    month: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    year, m = map(int, month.split("-"))
    start = date(year, m, 1)
    end = date(year + (m == 12), (m % 12) + 1, 1)

    shifts = (await db.execute(
        select(Shift).where(and_(Shift.shift_date >= start, Shift.shift_date < end))
    )).scalars().all()

    employees = (await db.execute(select(Employee))).scalars().all()
    emp_map = {e.id: e.full_name for e in employees}

    count = defaultdict(int)
    for s in shifts:
        count[s.employee_id] += 1

    PAY_PER_SHIFT = 2500
    TAX_RATE = 0.13

    rows = []
    total_salary = 0.0
    total_taxes = 0.0

    for emp_id, shifts_count in count.items():
        salary = shifts_count * PAY_PER_SHIFT
        tax = salary * TAX_RATE
        rows.append(SalaryRow(
            employee_id=emp_id,
            full_name=emp_map.get(emp_id, "Unknown"),
            shifts=shifts_count,
            pay_per_shift=PAY_PER_SHIFT,
            total_salary=salary,
            taxes=tax,
        ))
        total_salary += salary
        total_taxes += tax

    result = SalariesReportOut(
        month=month,
        rows=rows,
        total_salary=total_salary,
        total_taxes=total_taxes,
    )

    await log_action(
        db,
        user=user,
        action="GENERATE_REPORT_SALARIES",
        entity="report",
        entity_id=None,
        details=f"month={month}",
        ip_address=_ip(request),
    )

    return result


@router.get("/salaries.xlsx")
async def salaries_report_xlsx(
    month: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    report = await salaries_report(month=month, request=request, db=db, user=user)

    headers = ["Employee ID", "Full Name", "Shifts", "Pay per shift", "Total salary", "Taxes"]
    rows = [
        [r.employee_id, r.full_name, r.shifts, r.pay_per_shift, r.total_salary, r.taxes]
        for r in report.rows
    ]
    rows.append([None, "TOTAL", None, None, report.total_salary, report.total_taxes])

    content = make_workbook("SalariesReport", headers, rows)
    filename = f"salaries_report_{month}.xlsx"

    await log_action(
        db,
        user=user,
        action="EXPORT_REPORT_SALARIES_XLSX",
        entity="report",
        entity_id=None,
        details=f"month={month}",
        ip_address=_ip(request),
    )

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ================= FINANCE REPORT =================
@router.get("/finance", response_model=FinanceReportOut)
async def finance_report(
    date_from: datetime,
    date_to: datetime,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    payments = (await db.execute(
        select(Payment).where(
            Payment.created_at >= date_from,
            Payment.created_at <= date_to,
        )
    )).scalars().all()

    income = sum(float(p.amount) for p in payments)

    machines = (await db.execute(select(Machine))).scalars().all()
    machine_map = {m.id: m for m in machines}

    sessions = (await db.execute(
        select(Session).where(
            Session.ended_at.is_not(None),
            Session.started_at < date_to,
            Session.ended_at > date_from,
        )
    )).scalars().all()

    total_kwh = 0.0
    for s in sessions:
        sec = overlap_seconds(
            cast(datetime, s.started_at),
            cast(datetime, s.ended_at),
            date_from,
            date_to
        )
        total_kwh += energy_kwh(machine_map[s.machine_id].watt, sec)

    ELECTRICITY_PRICE = 7
    RENT = 65000

    expense_electricity = total_kwh * ELECTRICITY_PRICE

    shifts = (await db.execute(
        select(Shift).where(
            Shift.shift_date >= date_from.date(),
            Shift.shift_date <= date_to.date(),
        )
    )).scalars().all()

    salaries = len(shifts) * 2500
    taxes = salaries * 0.13

    total_expenses = RENT + salaries + taxes + expense_electricity
    profit = income - total_expenses

    result = FinanceReportOut(
        date_from=date_from,
        date_to=date_to,
        income=income,
        expense_rent=RENT,
        expense_salaries=salaries,
        expense_taxes=taxes,
        expense_electricity=round(expense_electricity, 2),
        total_expenses=round(total_expenses, 2),
        profit=round(profit, 2),
    )

    await log_action(
        db,
        user=user,
        action="GENERATE_REPORT_FINANCE",
        entity="report",
        entity_id=None,
        details=f"from={date_from.isoformat()} to={date_to.isoformat()}",
        ip_address=_ip(request),
    )

    return result


@router.get("/finance.xlsx")
async def finance_report_xlsx(
    date_from: datetime,
    date_to: datetime,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    report = await finance_report(date_from=date_from, date_to=date_to, request=request, db=db, user=user)

    headers = ["Metric", "Value"]
    rows = [
        ["date_from", str(report.date_from)],
        ["date_to", str(report.date_to)],
        ["income", report.income],
        ["expense_rent", report.expense_rent],
        ["expense_salaries", report.expense_salaries],
        ["expense_taxes", report.expense_taxes],
        ["expense_electricity", report.expense_electricity],
        ["total_expenses", report.total_expenses],
        ["profit", report.profit],
    ]

    content = make_workbook("FinanceReport", headers, rows)
    filename = f"finance_report_{date_from.date()}_{date_to.date()}.xlsx"

    await log_action(
        db,
        user=user,
        action="EXPORT_REPORT_FINANCE_XLSX",
        entity="report",
        entity_id=None,
        details=f"from={date_from.isoformat()} to={date_to.isoformat()}",
        ip_address=_ip(request),
    )

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

from datetime import datetime
from pydantic import BaseModel


# ---------- POWER ----------
class PowerRow(BaseModel):
    machine_id: int
    machine_name: str
    watt: int
    hours_used: float
    kwh_used: float


class PowerReportOut(BaseModel):
    date_from: datetime
    date_to: datetime
    price_per_kwh: float
    rows: list[PowerRow]
    total_kwh: float
    total_cost: float


# ---------- SALARIES ----------
class SalaryRow(BaseModel):
    employee_id: int
    full_name: str
    shifts: int
    pay_per_shift: float
    total_salary: float
    taxes: float


class SalariesReportOut(BaseModel):
    month: str
    rows: list[SalaryRow]
    total_salary: float
    total_taxes: float


# ---------- FINANCE ----------
class FinanceReportOut(BaseModel):
    date_from: datetime
    date_to: datetime

    income: float

    expense_rent: float
    expense_salaries: float
    expense_taxes: float
    expense_electricity: float

    total_expenses: float
    profit: float

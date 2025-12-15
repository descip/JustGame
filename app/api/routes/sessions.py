from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.core.pricing import calculate_total_price
from app.models.machine import Machine, MachineStatus as MachineStatusEnum
from app.models.session_model import Session
from app.schemas.session import (
    SessionOut,
    SessionStartIn,
    SessionStopOut,
    SessionExtendIn,
    SessionExtendOut,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _role_value(r) -> str:
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


@router.post("/start", response_model=SessionOut)
async def start_session(
    payload: SessionStartIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    # 1) Запрет: у пользователя уже есть активная сессия
    active_user = (
        await db.execute(
            select(Session).where(
                Session.user_id == payload.user_id,
                Session.ended_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if active_user:
        raise HTTPException(status_code=409, detail="User already has an active session")

    # 2) Запрет: на ПК уже есть активная сессия
    active_machine = (
        await db.execute(
            select(Session).where(
                Session.machine_id == payload.machine_id,
                Session.ended_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if active_machine:
        raise HTTPException(status_code=409, detail="Machine already has an active session")

    # 3) Проверяем машину
    machine = (
        await db.execute(select(Machine).where(Machine.id == payload.machine_id))
    ).scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    if machine.status != MachineStatusEnum.available:
        raise HTTPException(status_code=400, detail="Machine is not available")

    # 4) Создаём сессию
    now = datetime.now(timezone.utc)
    paid_minutes = payload.hours * 60
    auto_end_at = now + timedelta(minutes=paid_minutes)

    # помечаем машину занятой
    machine.status = MachineStatusEnum.busy

    s = Session(
        user_id=payload.user_id,
        machine_id=payload.machine_id,
        started_at=now,
        ended_at=None,
        paid_minutes=paid_minutes,
        auto_end_at=auto_end_at,
        billed_minutes=None,
        amount=Decimal("0.00"),
    )

    db.add(s)
    # machine уже в сессии db (если загружена через select), но добавлять не вредно:
    db.add(machine)

    await db.commit()
    await db.refresh(s)
    await db.refresh(machine)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="START_SESSION",
        entity="session",
        entity_id=s.id,
        details=f"user_id={payload.user_id}, machine_id={payload.machine_id}, hours={payload.hours}",
        ip_address=ip,
    )

    return SessionOut.model_validate(s, from_attributes=True)


@router.post("/{session_id}/extend", response_model=SessionExtendOut)
async def extend_session(
    session_id: int,
    payload: SessionExtendIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    s = (await db.execute(select(Session).where(Session.id == session_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    if s.ended_at is not None:
        raise HTTPException(status_code=400, detail="Session already ended")

    if s.auto_end_at is None:
        raise HTTPException(status_code=500, detail="auto_end_at is not set")

    add_minutes = payload.add_hours * 60
    s.paid_minutes = int(s.paid_minutes) + add_minutes
    s.auto_end_at = cast(datetime, s.auto_end_at) + timedelta(minutes=add_minutes)

    await db.commit()
    await db.refresh(s)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="EXTEND_SESSION",
        entity="session",
        entity_id=s.id,
        details=f"add_hours={payload.add_hours}, new_paid_minutes={int(s.paid_minutes)}",
        ip_address=ip,
    )

    return SessionExtendOut(
        id=s.id,
        paid_minutes=int(s.paid_minutes),
        auto_end_at=cast(datetime, s.auto_end_at),
    )


@router.post("/{session_id}/stop", response_model=SessionStopOut)
async def stop_session(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    s = (await db.execute(select(Session).where(Session.id == session_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    if s.ended_at is not None:
        raise HTTPException(status_code=400, detail="Session already ended")

    now = datetime.now(timezone.utc)

    started_at = cast(datetime, s.started_at)

    # фактический конец для цены: не позже auto_end_at
    if s.auto_end_at is not None:
        end_at_for_price = min(now, cast(datetime, s.auto_end_at))
    else:
        end_at_for_price = now

    machine = (await db.execute(select(Machine).where(Machine.id == s.machine_id))).scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=500, detail="Machine for session not found")

    billed_minutes = int(s.paid_minutes)
    s.billed_minutes = billed_minutes

    total = calculate_total_price(
        zone=machine.zone,
        billed_minutes=billed_minutes,
        start=started_at,
        end=end_at_for_price,
    )

    s.amount = cast(Decimal, total)
    s.ended_at = now
    machine.status = MachineStatusEnum.available

    db.add(machine)
    await db.commit()
    await db.refresh(s)
    await db.refresh(machine)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="STOP_SESSION",
        entity="session",
        entity_id=s.id,
        details=f"machine_id={s.machine_id}, billed_minutes={billed_minutes}, amount={float(s.amount)}",
        ip_address=ip,
    )

    return SessionStopOut(
        id=s.id,
        billed_minutes=billed_minutes,
        amount=float(s.amount),
        ended_at=cast(datetime, s.ended_at),
    )

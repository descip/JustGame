from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.machine import Machine, MachineStatus as MachineStatusEnum
from app.models.session_model import Session
from app.schemas.session import SessionOut, SessionStartIn, SessionStopOut

router = APIRouter(prefix="/sessions", tags=["sessions"])

PRICE_PER_MIN = Decimal("0.20")  # демо-тариф


@router.post("/start", response_model=SessionOut)
async def start_session(
    payload: SessionStartIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # машина должна быть доступна
    m = (await db.execute(select(Machine).where(Machine.id == payload.machine_id))).scalar_one_or_none()
    if not m or m.status != MachineStatusEnum.available:
        raise HTTPException(status_code=400, detail="Machine is not available")

    # помечаем busy и создаём сессию
    m.status = MachineStatusEnum.busy
    s = Session(
        user_id=payload.user_id,
        machine_id=payload.machine_id,
        started_at=datetime.now(timezone.utc),
        ended_at=None,
        billed_minutes=None,
        amount=Decimal("0.00"),
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return SessionOut.model_validate(s, from_attributes=True)


@router.post("/{session_id}/stop", response_model=SessionStopOut)
async def stop_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    s = (await db.execute(select(Session).where(Session.id == session_id))).scalar_one_or_none()
    if not s or s.ended_at is not None:
        raise HTTPException(status_code=404, detail="Active session not found")

    now = datetime.now(timezone.utc)
    s.ended_at = now

    # считаем минуты и сумму
    elapsed_min = (now - s.started_at).total_seconds() / 60
    billed = int(elapsed_min) if float(elapsed_min).is_integer() else int(elapsed_min) + 1
    s.billed_minutes = billed
    s.amount = (PRICE_PER_MIN * Decimal(billed)).quantize(Decimal("0.01"))

    # освобождаем машину
    m = (await db.execute(select(Machine).where(Machine.id == s.machine_id))).scalar_one_or_none()
    if m:
        m.status = MachineStatusEnum.available

    await db.commit()

    return SessionStopOut(id=s.id, billed_minutes=billed, amount=float(s.amount))

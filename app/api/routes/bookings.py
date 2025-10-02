from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_current_user
from app.models.booking import Booking, BookingStatus
from app.models.machine import Machine, MachineStatus
from app.schemas.booking import BookingCreate, BookingOut
from typing import List
from datetime import datetime

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingOut)
async def create_booking(payload: BookingCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    # check machine exists & available
    mres = await db.execute(select(Machine).where(Machine.id == payload.machine_id))
    m = mres.scalar_one_or_none()
    if not m or m.status == MachineStatus.service:
        raise HTTPException(status_code=400, detail="Machine unavailable")
    if payload.start_at >= payload.end_at:
        raise HTTPException(status_code=400, detail="Invalid time range")

    # naive overlap check (improve with DB constraints/locks)
    bq = select(Booking).where(
        Booking.machine_id == payload.machine_id,
        Booking.status != BookingStatus.canceled,
        Booking.start_at < payload.end_at,
        Booking.end_at > payload.start_at,
    )
    exists = (await db.execute(bq)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Time slot overlaps")

    b = Booking(
        user_id=payload.user_id,
        machine_id=payload.machine_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        status=BookingStatus.confirmed,
        note=payload.note,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b

@router.get("", response_model=List[BookingOut])
async def list_bookings(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    res = await db.execute(select(Booking))
    return list(res.scalars())

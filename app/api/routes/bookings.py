from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.models.booking import Booking, BookingStatus as BookingStatusEnum
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingOut, BookingCancelOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _role_value(r) -> str:
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


@router.get("", response_model=List[BookingOut])
async def list_bookings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)

    stmt = select(Booking).order_by(Booking.start_at.desc())
    if role == "user":
        stmt = stmt.where(Booking.user_id == user.id)

    res = await db.execute(stmt)
    rows = list(res.scalars())

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="LIST_BOOKINGS",
        entity="booking",
        entity_id=None,
        details=f"scope={'all' if role in {'admin','operator'} else 'own'}; count={len(rows)}",
        ip_address=ip,
    )

    return rows


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)

    # user создаёт бронь только для себя; admin/operator могут создать для любого user_id
    target_user_id = user.id if role == "user" else payload.user_id

    # Проверяем существование пользователя (важно для admin/operator, иначе получим FK error)
    target_user = (
        await db.execute(select(User).where(User.id == target_user_id))
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    b = Booking(
        user_id=target_user_id,
        machine_id=payload.machine_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        note=payload.note,
        status=BookingStatusEnum.active,
    )

    # Проверка пересечений (если у тебя уже есть — оставь свою)
    overlap_stmt = select(Booking).where(
        Booking.machine_id == payload.machine_id,
        Booking.status == BookingStatusEnum.active,
        Booking.start_at < payload.end_at,
        Booking.end_at > payload.start_at,
    )
    overlap = (await db.execute(overlap_stmt)).scalar_one_or_none()
    if overlap:
        raise HTTPException(status_code=409, detail="Booking overlap")

    # Запрет: у пользователя уже есть активная бронь, пересекающаяся по времени
    user_overlap_stmt = select(Booking).where(
        Booking.user_id == target_user_id,
        Booking.status == BookingStatusEnum.active,
        Booking.start_at < payload.end_at,
        Booking.end_at > payload.start_at,
    )
    user_overlap = (await db.execute(user_overlap_stmt)).scalar_one_or_none()
    if user_overlap:
        raise HTTPException(
            status_code=409,
            detail="User already has an active booking for this time range",
        )

    db.add(b)
    await db.commit()
    await db.refresh(b)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="CREATE_BOOKING",
        entity="booking",
        entity_id=b.id,
        details=f"machine_id={b.machine_id}, start={b.start_at}, end={b.end_at}",
        ip_address=ip,
    )

    return b


@router.post("/{booking_id}/cancel", response_model=BookingCancelOut)
async def cancel_booking(
    booking_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    b = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    role = _role_value(user.role)
    if role == "user" and b.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    b.status = BookingStatusEnum.cancelled
    await db.commit()

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="CANCEL_BOOKING",
        entity="booking",
        entity_id=b.id,
        details=f"machine_id={b.machine_id}",
        ip_address=ip,
    )

    return BookingCancelOut(
        id=b.id,
        status=getattr(b.status, "value", b.status),
    )


@router.delete("/{booking_id}")
async def delete_cancelled_booking(
    booking_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    b = (
        await db.execute(select(Booking).where(Booking.id == booking_id))
    ).scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    role = _role_value(user.role)
    if role == "user" and b.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if b.status != BookingStatusEnum.cancelled:
        raise HTTPException(
            status_code=400,
            detail="Only cancelled bookings can be deleted",
        )

    await db.execute(delete(Booking).where(Booking.id == booking_id))
    await db.commit()

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="DELETE_BOOKING",
        entity="booking",
        entity_id=booking_id,
        details="status=cancelled",
        ip_address=ip,
    )

    return {"ok": True}
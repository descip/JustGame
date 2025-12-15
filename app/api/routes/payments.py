from datetime import datetime, timezone
from decimal import Decimal
from typing import List
import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.session_extend import extend_active_session
from app.models.payment import PaymentStatus as PaymentStatusEnum
from app.schemas.payment import FakeOnlinePaymentCreate
from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.core.payment_provider import create_payment
from app.core.pricing import calculate_total_price
from app.models.machine import Zone
from app.models.payment import (
    Payment,
    PaymentMethod as PaymentMethodEnum,
    PaymentStatus as PaymentStatusEnum,
)
from app.models.user import User
from app.schemas.payment import (
    PaymentOut,
    CashPaymentCreate,
    OnlinePaymentCreate,
    OnlinePaymentCreateOut,
    PaymentWebhookIn,
)

router = APIRouter(prefix="/payments", tags=["payments"])


def _role_value(r) -> str:
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


# ===========================
# LIST PAYMENTS
# ===========================
@router.get("", response_model=List[PaymentOut])
async def list_payments(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)

    stmt = select(Payment).order_by(Payment.created_at.desc())
    if role == "user":
        stmt = stmt.where(Payment.user_id == user.id)

    rows = (await db.execute(stmt)).scalars().all()

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="LIST_PAYMENTS",
        entity="payment",
        entity_id=None,
        details=f"scope={'all' if role in {'admin','operator'} else 'own'}; count={len(rows)}",
        ip_address=ip,
    )

    return [PaymentOut.model_validate(p, from_attributes=True) for p in rows]


# ===========================
# CASH PAYMENT
# ===========================
@router.post("/cash", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def create_cash_payment(
    payload: CashPaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    target_user = (
        await db.execute(select(User).where(User.id == payload.user_id))
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Нал: считаем по STANDART без скидок (упрощённо)
    amount = calculate_total_price(
        zone=Zone.STANDART,
        billed_minutes=payload.hours * 60,
        start=datetime.now(timezone.utc),
        end=datetime.now(timezone.utc),
    )

    p = Payment(
        user_id=payload.user_id,
        session_id=None,
        method=PaymentMethodEnum.cash,
        status=PaymentStatusEnum.succeeded,
        hours=payload.hours,
        amount=amount,
        note=payload.note,
    )

    db.add(p)
    await db.commit()
    await db.refresh(p)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="CREATE_CASH_PAYMENT",
        entity="payment",
        entity_id=p.id,
        details=f"user_id={payload.user_id}, hours={payload.hours}, amount={float(p.amount)}",
        ip_address=ip,
    )

    return PaymentOut.model_validate(p, from_attributes=True)


# ===========================
# ONLINE PAYMENT (CREATE)
# ===========================
@router.post(
    "/online",
    response_model=OnlinePaymentCreateOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_online_payment(
    payload: OnlinePaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # считаем цену (STANDART, без привязки к ПК)
    amount = calculate_total_price(
        zone=Zone.STANDART,
        billed_minutes=payload.hours * 60,
        start=datetime.now(timezone.utc),
        end=datetime.now(timezone.utc),
    )

    payment = Payment(
        user_id=user.id,
        session_id=None,
        method=PaymentMethodEnum.online,
        status=PaymentStatusEnum.created,
        hours=payload.hours,
        amount=amount,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # создаём платёж у провайдера (заглушка)
    provider = create_payment(float(amount))

    payment.provider_payment_id = provider["provider_payment_id"]
    payment.status = PaymentStatusEnum.pending

    await db.commit()

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="CREATE_ONLINE_PAYMENT",
        entity="payment",
        entity_id=payment.id,
        details=f"hours={payload.hours}, amount={float(payment.amount)}",
        ip_address=ip,
    )

    return OnlinePaymentCreateOut(
        payment_id=payment.id,
        payment_url=provider["payment_url"],
    )
# ===========================
# FAKE ONLINE PAYMENT
# ===========================
@router.post("/fake/online", response_model=PaymentOut)
async def fake_online_payment(
    payload: FakeOnlinePaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # создаём pending-платёж
    amount = (Decimal("90") * Decimal(payload.hours)).quantize(Decimal("0.01"))

    payment = Payment(
        user_id=payload.user_id,
        session_id=None,
        created_at=datetime.now(timezone.utc),
        method=PaymentMethodEnum.online,
        hours=payload.hours,
        amount=amount,
        status=PaymentStatusEnum.pending,
    )

    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # эмуляция платёжки
    async def _simulate_success():
        await asyncio.sleep(2)

        payment.status = PaymentStatusEnum.succeeded
        payment.provider_payment_id = f"fake_{uuid.uuid4().hex}"
        await db.commit()

    asyncio.create_task(_simulate_success())

    return PaymentOut.model_validate(payment, from_attributes=True)


# ===========================
# PAYMENT WEBHOOK
# ===========================
@router.post("/webhook")
async def payment_webhook(
    payload: PaymentWebhookIn,
    db: AsyncSession = Depends(get_db),
):
    payment = (
        await db.execute(select(Payment).where(Payment.id == payload.payment_id))
    ).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # идемпотентность (если уже подтверждён — ничего не делаем)
    if payment.status == PaymentStatusEnum.succeeded:
        return {"ok": True}

    payment.status = PaymentStatusEnum(getattr(payload.status, "value", payload.status))
    payment.provider_payment_id = payload.provider_payment_id
    await db.commit()

    # АВТОПРОДЛЕНИЕ: если онлайн-оплата успешна — продляем активную сессию
    if payment.method == PaymentMethodEnum.online and payment.status == PaymentStatusEnum.succeeded:
        await extend_active_session(db=db, user_id=payment.user_id, hours=payment.hours)

    return {"ok": True}

from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class PaymentMethod(str, Enum):
    cash = "cash"
    online = "online"


class PaymentStatus(str, Enum):
    created = "created"
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"


class PaymentOut(BaseModel):
    id: int
    user_id: int
    session_id: int | None
    created_at: datetime
    updated_at: datetime

    method: PaymentMethod
    status: PaymentStatus

    hours: int
    amount: float

    provider_payment_id: str | None
    note: str | None

    class Config:
        from_attributes = True

class FakeOnlinePaymentCreate(BaseModel):
    user_id: int
    hours: int = Field(ge=1, le=24)



# ---------- CASH ----------
class CashPaymentCreate(BaseModel):
    user_id: int
    hours: int = Field(ge=1, le=24)
    note: str | None = "cash payment"


# ---------- ONLINE ----------
class OnlinePaymentCreate(BaseModel):
    """
    Пользователь создаёт платёж онлайн.
    """
    hours: int = Field(ge=1, le=24)


class OnlinePaymentCreateOut(BaseModel):
    """
    Ответ: куда идти платить.
    """
    payment_id: int
    payment_url: str


# ---------- WEBHOOK ----------
class PaymentWebhookIn(BaseModel):
    """
    То, что присылает платёжная система (или наша заглушка).
    """
    payment_id: int
    provider_payment_id: str
    status: PaymentStatus

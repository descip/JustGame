from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    online = "online"


class PaymentStatus(str, enum.Enum):
    created = "created"     # создан (ещё не отправлен в платёжку)
    pending = "pending"     # пользователь платит
    succeeded = "succeeded" # оплачен
    failed = "failed"       # ошибка / отменён


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )

    # может быть NULL до момента, когда платёж привязан к сессии
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("sessions.id"),
        index=True,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod),
        nullable=False,
    )

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.created,
    )

    # сколько часов куплено (пакет)
    hours: Mapped[int] = mapped_column(nullable=False)

    # итоговая сумма
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    # ID платежа в ЮKassa / Stripe и т.п.
    provider_payment_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )

    # комментарий (нал / корректировки)
    note: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

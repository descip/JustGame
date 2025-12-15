from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # купленный пакет (в минутах)
    paid_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    # время, когда сессия должна завершиться автоматически
    auto_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # для отчётности можно хранить реально посчитанные минуты (у нас = paid_minutes)
    billed_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class BookingStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True, nullable=False)

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus),
        default=BookingStatus.active,
        nullable=False
    )

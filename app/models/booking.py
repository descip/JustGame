from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, DateTime, String, Enum
from app.db.session import Base
import enum

class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    canceled = "canceled"

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True)
    start_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.pending)
    note: Mapped[str] = mapped_column(String(255), default="")

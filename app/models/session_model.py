from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, DateTime, Numeric
from app.db.session import Base

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True)
    started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    billed_minutes: Mapped[int | None]
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), default=0)

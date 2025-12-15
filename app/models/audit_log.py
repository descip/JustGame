from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown")

    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)  # например START_SESSION
    entity: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)  # session/machine/payment...
    entity_id: Mapped[int | None] = mapped_column(nullable=True, index=True)

    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

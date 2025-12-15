from datetime import date
from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    shift_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

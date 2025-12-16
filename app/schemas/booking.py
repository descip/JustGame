from datetime import datetime
from enum import Enum

from pydantic import BaseModel, field_validator


class BookingStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"


class BookingCreate(BaseModel):
    user_id: int
    machine_id: int
    start_at: datetime
    end_at: datetime
    note: str | None = None

    @field_validator("start_at")
    @classmethod
    def validate_start_at_not_past(cls, start_at: datetime):
        # `datetime-local` с фронта обычно приходит без tzinfo и без секунд.
        # Чтобы не ловить ложные срабатывания, сравниваем с "текущей минутой".
        now = datetime.now(start_at.tzinfo) if start_at.tzinfo else datetime.now()
        now_minute = now.replace(second=0, microsecond=0)
        if start_at < now_minute:
            raise ValueError("start_at must not be in the past")
        return start_at

    @field_validator("end_at")
    @classmethod
    def validate_time(cls, end_at: datetime, info):
        start_at = info.data.get("start_at")
        if start_at and end_at <= start_at:
            raise ValueError("end_at must be greater than start_at")
        return end_at


class BookingOut(BaseModel):
    id: int
    user_id: int
    machine_id: int
    start_at: datetime
    end_at: datetime
    note: str | None
    status: BookingStatus

    class Config:
        from_attributes = True


class BookingCancelOut(BaseModel):
    id: int
    status: str

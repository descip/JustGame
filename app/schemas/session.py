from datetime import datetime
from pydantic import BaseModel, Field


class SessionStartIn(BaseModel):
    user_id: int
    machine_id: int
    hours: int = Field(ge=1, le=24)


class SessionExtendIn(BaseModel):
    add_hours: int = Field(ge=1, le=24)


class SessionOut(BaseModel):
    id: int
    user_id: int
    machine_id: int
    started_at: datetime
    ended_at: datetime | None
    paid_minutes: int
    auto_end_at: datetime | None
    billed_minutes: int | None
    amount: float

    class Config:
        from_attributes = True


class SessionStopOut(BaseModel):
    id: int
    billed_minutes: int
    amount: float
    ended_at: datetime


class SessionExtendOut(BaseModel):
    id: int
    paid_minutes: int
    auto_end_at: datetime

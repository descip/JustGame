from pydantic import BaseModel
from datetime import datetime

class SessionStartIn(BaseModel):
    user_id: int
    machine_id: int

class SessionStopOut(BaseModel):
    id: int
    billed_minutes: int
    amount: float

class SessionOut(BaseModel):
    id: int
    user_id: int
    machine_id: int
    started_at: datetime
    ended_at: datetime | None
    billed_minutes: int | None
    amount: float
    class Config:
        from_attributes = True

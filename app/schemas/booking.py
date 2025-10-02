from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    canceled = "canceled"

class BookingCreate(BaseModel):
    user_id: int
    machine_id: int
    start_at: datetime
    end_at: datetime
    note: str = ""

class BookingOut(BaseModel):
    id: int
    user_id: int
    machine_id: int
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    note: str
    class Config:
        from_attributes = True

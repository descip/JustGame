from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


class Zone(str, Enum):
    STANDART = "STANDART"
    PREMIUM = "PREMIUM"
    VIP = "VIP"
    SUPERVIP = "SUPERVIP"
    SOLO = "SOLO"


class MachineStatus(str, Enum):
    available = "available"
    busy = "busy"
    offline = "offline"


class MachineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    zone: Zone
    watt: int = Field(default=450, ge=50, le=2000)


class MachineStatusPatch(BaseModel):
    status: MachineStatus


class MachineOut(BaseModel):
    id: int
    name: str
    zone: Zone
    status: MachineStatus
    watt: int

    class Config:
        from_attributes = True

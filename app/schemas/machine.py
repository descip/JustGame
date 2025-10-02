from pydantic import BaseModel
from enum import Enum

class MachineStatus(str, Enum):
    available = "available"
    busy = "busy"
    service = "service"

class MachineCreate(BaseModel):
    name: str
    zone: str = "main"

class MachineOut(BaseModel):
    id: int
    name: str
    zone: str
    status: MachineStatus
    class Config:
        from_attributes = True

class MachineStatusPatch(BaseModel):
    status: MachineStatus

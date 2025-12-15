from datetime import datetime
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    role: str
    action: str
    entity: str | None
    entity_id: int | None
    details: str | None
    ip_address: str | None
    created_at: datetime

    class Config:
        from_attributes = True

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


def _role_value(r) -> str:
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


def _require_operator(user) -> None:
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if _role_value(user.role) != "operator":
        raise HTTPException(status_code=403, detail="Only operator allowed")


@router.get("", response_model=List[AuditLogOut])
async def list_audit_logs(
    request: Request,
    user_id: int | None = Query(default=None),
    action: str | None = Query(default=None),
    entity: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    _require_operator(user)

    filters = []
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if action is not None:
        filters.append(AuditLog.action == action)
    if entity is not None:
        filters.append(AuditLog.entity == entity)
    if date_from is not None:
        filters.append(AuditLog.created_at >= date_from)
    if date_to is not None:
        filters.append(AuditLog.created_at <= date_to)

    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if filters:
        stmt = stmt.where(and_(*filters))

    res = await db.execute(stmt)
    rows = list(res.scalars())

    return [AuditLogOut.model_validate(x, from_attributes=True) for x in rows]

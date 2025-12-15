from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


def _role_value(r) -> str:
    if r is None:
        return "unknown"
    return getattr(r, "value", str(r))


async def log_action(
    db: AsyncSession,
    *,
    user,
    action: str,
    entity: str | None = None,
    entity_id: int | None = None,
    details: str | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Универсальная запись в audit log.
    Не бросает исключения наружу — чтобы логи не ломали бизнес-логику.
    """
    try:
        row = AuditLog(
            user_id=getattr(user, "id", None) if user else None,
            role=_role_value(getattr(user, "role", None)) if user else "anonymous",
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        db.add(row)
        await db.commit()
    except Exception:
        # если запись лога не удалась — не ломаем запрос
        try:
            await db.rollback()
        except Exception:
            pass

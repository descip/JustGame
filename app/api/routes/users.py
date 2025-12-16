from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.models.user import User, Role
from app.schemas.user import UserOut, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _role_value(r) -> str:
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


@router.get("", response_model=List[UserOut])
async def list_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Получить список всех пользователей (только для operator)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role != "operator":
        raise HTTPException(status_code=403, detail="Only operator allowed")

    stmt = select(User).order_by(User.id)
    res = await db.execute(stmt)
    rows = list(res.scalars())

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="LIST_USERS",
        entity="user",
        entity_id=None,
        details=f"count={len(rows)}",
        ip_address=ip,
    )

    return [UserOut.model_validate(u, from_attributes=True) for u in rows]


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Обновить роль пользователя (только для operator)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = _role_value(user.role)
    if role != "operator":
        raise HTTPException(status_code=403, detail="Only operator allowed")

    target_user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Нельзя изменить роль самому себе
    if target_user.id == user.id:
        raise HTTPException(
            status_code=400, detail="Cannot change your own role"
        )

    old_role = target_user.role
    target_user.role = Role(payload.role.value)
    await db.commit()
    await db.refresh(target_user)

    ip = request.client.host if request.client else None
    await log_action(
        db,
        user=user,
        action="UPDATE_USER_ROLE",
        entity="user",
        entity_id=target_user.id,
        details=f"user_id={target_user.id}, old_role={old_role.value}, new_role={payload.role.value}",
        ip_address=ip,
    )

    return UserOut.model_validate(target_user, from_attributes=True)


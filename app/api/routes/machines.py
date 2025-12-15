from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.audit import log_action
from app.models.machine import Machine, MachineStatus as MachineStatusEnum
from app.schemas.machine import MachineCreate, MachineOut, MachineStatusPatch

router = APIRouter(prefix="/machines", tags=["machines"])


def _role_value(r) -> str:
    """Безопасно получить строковое значение роли (Enum | str | None)."""
    if r is None:
        return "user"
    return getattr(r, "value", str(r))


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=List[MachineOut])
async def list_machines(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    res = await db.execute(select(Machine))
    rows = list(res.scalars())

    # 🔹 логируем просмотр списка ПК
    await log_action(
        db,
        user=user,
        action="LIST_MACHINES",
        entity="machine",
        entity_id=None,
        details=f"count={len(rows)}",
        ip_address=_ip(request),
    )

    return [MachineOut.model_validate(row, from_attributes=True) for row in rows]


@router.post("", response_model=MachineOut, status_code=status.HTTP_201_CREATED)
async def create_machine(
    payload: MachineCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if _role_value(user.role) not in {"admin", "operator"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    m = Machine(
        name=payload.name,
        zone=payload.zone,
        status=MachineStatusEnum.available,
        watt=payload.watt,
    )
    db.add(m)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Machine name already exists",
        )

    await db.refresh(m)

    # 🔹 логируем создание ПК
    await log_action(
        db,
        user=user,
        action="CREATE_MACHINE",
        entity="machine",
        entity_id=m.id,
        details=f"name={m.name}, zone={m.zone}, watt={m.watt}",
        ip_address=_ip(request),
    )

    return MachineOut.model_validate(m, from_attributes=True)


@router.patch("/{machine_id}/status", response_model=MachineOut)
async def set_status(
    machine_id: int,
    patch: MachineStatusPatch,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if _role_value(user.role) not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Insufficient role")

    res = await db.execute(select(Machine).where(Machine.id == machine_id))
    m = res.scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Machine not found")

    # ключевая строка
    m.status = MachineStatusEnum(patch.status.value)
    
    await db.commit()
    await db.refresh(m)
    return MachineOut.model_validate(m, from_attributes=True)


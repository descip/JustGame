from __future__ import annotations

from enum import Enum

from sqlalchemy import Enum as SAEnum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


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


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    zone: Mapped[Zone] = mapped_column(
        SAEnum(Zone, name="machine_zone"),
        nullable=False,
        default=Zone.STANDART,
    )

    status: Mapped[MachineStatus] = mapped_column(
        SAEnum(MachineStatus, name="machine_status"),
        nullable=False,
        default=MachineStatus.available,
    )

    watt: Mapped[int] = mapped_column(Integer, nullable=False, default=450)

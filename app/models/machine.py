from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, Integer
from app.db.session import Base
import enum

class MachineStatus(str, enum.Enum):
    available = "available"
    busy = "busy"
    service = "service"

class Machine(Base):
    __tablename__ = "machines"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    zone: Mapped[str] = mapped_column(String(50), default="main")
    status: Mapped[MachineStatus] = mapped_column(Enum(MachineStatus), default=MachineStatus.available)
    watt: Mapped[int] = mapped_column(Integer, default=0)

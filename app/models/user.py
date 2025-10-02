from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum
from app.db.session import Base
import enum

class Role(str, enum.Enum):
    admin = "admin"
    operator = "operator"
    user = "user"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.user, nullable=False)

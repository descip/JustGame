from pydantic import BaseModel, EmailStr
from enum import Enum

class Role(str, Enum):
    admin = "admin"
    operator = "operator"
    user = "user"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Role = Role.user

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    class Config:
        from_attributes = True

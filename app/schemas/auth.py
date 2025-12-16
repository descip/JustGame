from pydantic import BaseModel
from app.schemas.user import Role

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginIn(BaseModel):
    email: str
    password: str

class UserProfileOut(BaseModel):
    id: int
    email: str
    role: Role
    balance: float

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections.abc import AsyncGenerator  # <-- добавили

from app.db.session import get_session
from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User

http_bearer = HTTPBearer()

async def get_db() -> AsyncGenerator[AsyncSession, None]:  # <-- исправили тип
    async for s in get_session():
        yield s

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = creds.credentials if creds else None
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(token, settings.secret_key)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    res = await db.execute(select(User).where(User.email == payload["sub"]))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

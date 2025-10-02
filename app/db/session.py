from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from collections.abc import AsyncGenerator  # <-- добавили

engine = create_async_engine(settings.database_url, future=True, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_session() -> AsyncGenerator[AsyncSession, None]:  # <-- было AsyncSession
    async with async_session() as session:
        yield session

from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.session_model import Session


async def extend_active_session(
    db: AsyncSession,
    user_id: int,
    hours: int,
):
    stmt = select(Session).where(
        Session.user_id == user_id,
        Session.ended_at.is_(None),
    )

    session = (await db.execute(stmt)).scalar_one_or_none()
    if not session or not session.auto_end_at:
        return None

    add_minutes = hours * 60
    session.paid_minutes += add_minutes
    session.auto_end_at += timedelta(minutes=add_minutes)

    await db.commit()
    return session

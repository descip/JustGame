import asyncio
from datetime import datetime, timezone
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pricing import calculate_total_price
from app.db.session import async_session
from app.models.machine import Machine, MachineStatus as MachineStatusEnum
from app.models.session_model import Session
from app.models.payment import (
    Payment,
    PaymentMethod as PaymentMethodEnum,
    PaymentStatus as PaymentStatusEnum,
)


CHECK_INTERVAL_SECONDS = 10  # как часто проверять автозавершение


async def _close_due_sessions_once(db: AsyncSession) -> int:
    """
    Закрывает все активные сессии, у которых наступило auto_end_at.
    Возвращает количество закрытых сессий.
    """
    now = datetime.now(timezone.utc)

    stmt = select(Session).where(
        Session.ended_at.is_(None),
        Session.auto_end_at.is_not(None),
        Session.auto_end_at <= now,
    )

    sessions = (await db.execute(stmt)).scalars().all()
    closed = 0

    for s in sessions:
        # получаем машину
        machine = (
            await db.execute(
                select(Machine).where(Machine.id == s.machine_id)
            )
        ).scalar_one_or_none()

        if not machine:
            continue

        # auto_end_at гарантированно не None по условию запроса
        end_at = cast(datetime, s.auto_end_at)
        start_at = cast(datetime, s.started_at)

        s.ended_at = end_at
        s.billed_minutes = s.paid_minutes

        s.amount = calculate_total_price(
            zone=machine.zone,
            billed_minutes=int(s.paid_minutes),
            start=start_at,
            end=end_at,
        )

        # Создаём платеж для завершённой сессии, если его ещё нет
        existing_payment = (
            await db.execute(
                select(Payment).where(Payment.session_id == s.id)
            )
        ).scalar_one_or_none()
        
        if not existing_payment:
            payment = Payment(
                user_id=s.user_id,
                session_id=s.id,
                method=PaymentMethodEnum.cash,  # По умолчанию наличный платёж
                status=PaymentStatusEnum.succeeded,
                hours=int(s.paid_minutes) // 60,
                amount=s.amount,
                note=f"Автоматически завершенная сессия {s.id}",
                created_at=end_at,
                updated_at=end_at,
            )
            db.add(payment)
            db.add(s)  # Убеждаемся, что сессия тоже в сессии

        machine.status = MachineStatusEnum.available
        closed += 1

    if closed > 0:
        await db.commit()

    return closed


async def auto_close_loop() -> None:
    """
    Фоновый цикл автозавершения сессий.
    Запускается при старте приложения.
    """
    while True:
        try:
            async with async_session() as db:
                await _close_due_sessions_once(db)
        except Exception:
            # защищаем фоновую задачу от падения
            pass

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

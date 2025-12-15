from datetime import datetime, time
from decimal import Decimal

from app.models.machine import Zone


# Часовые тарифы по зонам (руб/час)
ZONE_HOURLY_PRICES: dict[Zone, Decimal] = {
    Zone.STANDART: Decimal("90"),
    Zone.PREMIUM: Decimal("115"),
    Zone.VIP: Decimal("130"),
    Zone.SUPERVIP: Decimal("150"),
    Zone.SOLO: Decimal("180"),
}

DAY_START = time(8, 0)   # 08:00
DAY_END = time(20, 0)    # 20:00


def get_base_price_per_minute(zone: Zone) -> Decimal:
    """Базовая стоимость 1 минуты игры для зоны (без скидок)."""
    hourly = ZONE_HOURLY_PRICES[zone]
    return (hourly / Decimal("60")).quantize(Decimal("0.01"))


def _is_fully_daytime(start: datetime, end: datetime) -> bool:
    """
    True, если сессия полностью попадает в дневной интервал [08:00, 20:00].
    (упрощённо: по локальному времени начала/конца)
    """
    st = start.time()
    en = end.time()
    return DAY_START <= st <= DAY_END and DAY_START <= en <= DAY_END


def _get_discount_rate(hours: float, start: datetime, end: datetime) -> Decimal:
    """
    Скидки:
      1–2 часа  -> 0%
      3–4 часа  -> 10%
      5+ часов  -> 15%
    Скидка действует ТОЛЬКО если сессия полностью в дневном интервале.
    """
    if not _is_fully_daytime(start, end):
        return Decimal("0.00")

    if hours >= 5:
        return Decimal("0.15")
    if hours >= 3:
        return Decimal("0.10")
    return Decimal("0.00")


def calculate_total_price(
    zone: Zone,
    billed_minutes: int,
    start: datetime,
    end: datetime,
) -> Decimal:
    """Полный расчёт стоимости сессии с учётом скидок."""
    price_per_min = get_base_price_per_minute(zone)
    base = price_per_min * Decimal(billed_minutes)

    hours = billed_minutes / 60.0
    discount_rate = _get_discount_rate(hours, start, end)

    total = base * (Decimal("1.00") - discount_rate)
    return total.quantize(Decimal("0.01"))

from datetime import datetime


def overlap_seconds(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> float:
    """
    Возвращает количество секунд пересечения двух интервалов.
    """
    start = max(a_start, b_start)
    end = min(a_end, b_end)
    if end <= start:
        return 0.0
    return (end - start).total_seconds()


def energy_kwh(watt: int, seconds: float) -> float:
    """
    kWh = (W / 1000) * hours
    """
    hours = seconds / 3600
    return (watt / 1000) * hours

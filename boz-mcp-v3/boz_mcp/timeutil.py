"""Europe/Istanbul saat dilimi yardımcıları. Trendyol zaman damgaları epoch-ms (GMT)."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Istanbul")


def now() -> datetime:
    return datetime.now(TZ)


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def to_ms(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    return int(dt.timestamp() * 1000)


def from_ms(ms: int | float | None) -> datetime | None:
    if ms is None:
        return None
    return datetime.fromtimestamp(float(ms) / 1000, tz=TZ)


def local_date(ms: int | float) -> date:
    return from_ms(ms).date()  # type: ignore[union-attr]


def iso(ms: int | float | None) -> str | None:
    d = from_ms(ms)
    return d.isoformat(timespec="seconds") if d else None


def day_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=TZ)


def windows(start_ms: int, end_ms: int, max_days: int) -> list[tuple[int, int]]:
    """[start,end] aralığını API'nin izin verdiği en fazla `max_days` günlük pencerelere böler."""
    out: list[tuple[int, int]] = []
    step = max_days * 86_400_000 - 1
    s = start_ms
    while s < end_ms:
        e = min(s + step, end_ms)
        out.append((s, e))
        s = e + 1
    return out


def period_bounds(period: str, ref: datetime | None = None) -> tuple[datetime, datetime, str]:
    """'today','yesterday','7d','30d','90d','365d','this_week','last_week','this_month','last_month','this_year' → (başlangıç, bitiş, etiket)."""
    ref = ref or now()
    today = day_start(ref.date())
    p = period.strip().lower()
    if p == "today":
        return today, ref, "Bugün"
    if p == "yesterday":
        return today - timedelta(days=1), today - timedelta(milliseconds=1), "Dün"
    if p.endswith("d") and p[:-1].isdigit():
        n = int(p[:-1])
        return today - timedelta(days=n - 1), ref, f"Son {n} gün"
    if p == "this_week":
        s = today - timedelta(days=today.weekday())
        return s, ref, "Bu hafta"
    if p == "last_week":
        s = today - timedelta(days=today.weekday() + 7)
        return s, s + timedelta(days=7) - timedelta(milliseconds=1), "Geçen hafta"
    if p == "this_month":
        return today.replace(day=1), ref, "Bu ay"
    if p == "last_month":
        first = today.replace(day=1)
        prev = (first - timedelta(days=1)).replace(day=1)
        return prev, first - timedelta(milliseconds=1), "Geçen ay"
    if p == "this_year":
        return today.replace(month=1, day=1), ref, "Bu yıl"
    raise ValueError(f"Geçersiz dönem: {period!r}")


def previous_period(start: datetime, end: datetime, period: str | None = None) -> tuple[datetime, datetime]:
    """Karşılaştırma dönemi. Devam eden dönemlerde (bugün, bu hafta, bu ay, bu yıl) bir önceki dönemin
    AYNI geçen süresiyle karşılaştırılır (ör. bugün 00:00–14:00 ↔ dün 00:00–14:00)."""
    p = (period or "").lower()
    if p == "today":
        return start - timedelta(days=1), end - timedelta(days=1)
    if p == "this_week":
        return start - timedelta(days=7), end - timedelta(days=7)
    if p == "this_month":
        prev_start = (start - timedelta(days=1)).replace(day=1)
        return prev_start, prev_start + (end - start)
    if p == "this_year":
        prev_start = start.replace(year=start.year - 1)
        return prev_start, prev_start + (end - start)
    span = end - start
    return start - span - timedelta(milliseconds=1), start - timedelta(milliseconds=1)

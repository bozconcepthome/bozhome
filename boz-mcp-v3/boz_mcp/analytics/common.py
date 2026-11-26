"""Analizlerde ortak yardımcılar: dönem toplamları, günlük seriler, istatistik."""
from __future__ import annotations

import math
import statistics
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Iterable

from ..db import DB
from ..timeutil import TZ, from_ms, local_date, to_ms

CANCEL_STATUSES = ("Cancelled", "UnSupplied")
RETURN_STATUSES = ("Returned", "UnDelivered")


def tl(x: float | None) -> str:
    if x is None:
        return "—"
    s = f"{x:,.2f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".") + " TL"


def pct(a: float, b: float) -> float | None:
    if not b:
        return None
    return round((a - b) / b * 100, 1)


def order_coverage(db: DB) -> tuple[int | None, int | None]:
    r = db.one("SELECT MIN(order_date), MAX(order_date) FROM order_lines")
    return (r[0], r[1]) if r else (None, None)


def settlement_coverage(db: DB) -> tuple[int | None, int | None]:
    r = db.one("SELECT MIN(transaction_date), MAX(transaction_date) FROM settlements")
    return (r[0], r[1]) if r else (None, None)


def sales_totals(db: DB, start_ms: int, end_ms: int, barcode: str | None = None) -> dict[str, Any]:
    """Sipariş paketlerinden dönem özeti. Brüt = indirim öncesi, net = müşteri ödediği (indirim sonrası)."""
    args: list[Any] = [start_ms, end_ms]
    extra = ""
    if barcode:
        extra = " AND barcode=?"
        args.append(barcode)
    r = db.one(f"""
      SELECT
        COUNT(DISTINCT CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN order_number END) AS orders,
        COUNT(DISTINCT package_id) AS packages_all,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN quantity ELSE 0 END) AS units,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN unit_gross*quantity ELSE 0 END) AS gross,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN unit_net*quantity ELSE 0 END) AS net,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN unit_seller_discount*quantity ELSE 0 END) AS seller_discount,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN unit_ty_discount*quantity ELSE 0 END) AS ty_discount,
        SUM(CASE WHEN package_status NOT IN {CANCEL_STATUSES} THEN unit_net*quantity*COALESCE(commission_rate,0)/100.0 ELSE 0 END) AS est_commission,
        COUNT(DISTINCT CASE WHEN package_status IN {CANCEL_STATUSES} THEN order_number END) AS cancelled_orders,
        SUM(CASE WHEN package_status IN {CANCEL_STATUSES} THEN unit_net*quantity ELSE 0 END) AS cancelled_amount,
        COUNT(DISTINCT CASE WHEN package_status IN {RETURN_STATUSES} THEN order_number END) AS returned_orders
      FROM order_lines WHERE order_date BETWEEN ? AND ? {extra}""", args)
    d = dict(r) if r else {}
    for k in list(d):
        if d[k] is None:
            d[k] = 0
        elif isinstance(d[k], float):
            d[k] = round(d[k], 2)
    d["avg_order_value"] = round(d["net"] / d["orders"], 2) if d.get("orders") else None
    return d


def settlement_totals(db: DB, start_ms: int, end_ms: int) -> dict[str, Any]:
    r = db.one("""SELECT
        SUM(CASE WHEN transaction_type='Sale' THEN credit ELSE 0 END) sale_amount,
        SUM(CASE WHEN transaction_type='Sale' THEN commission_amount ELSE 0 END) sale_commission,
        SUM(CASE WHEN transaction_type='Sale' THEN seller_revenue ELSE 0 END) sale_seller_revenue,
        COUNT(CASE WHEN transaction_type='Sale' THEN 1 END) sale_lines,
        SUM(CASE WHEN transaction_type='Return' THEN debt ELSE 0 END) return_amount,
        SUM(CASE WHEN transaction_type='Return' THEN commission_amount ELSE 0 END) return_commission,
        COUNT(CASE WHEN transaction_type='Return' THEN 1 END) return_lines
      FROM settlements WHERE transaction_date BETWEEN ? AND ?""", (start_ms, end_ms))
    d = {k: (round(v, 2) if isinstance(v, float) else (v or 0)) for k, v in dict(r).items()} if r else {}
    return d


def daily_series(db: DB, start: date, end: date, barcode: str | None = None, metric: str = "net") -> list[tuple[date, float]]:
    expr = {"net": "unit_net*quantity", "units": "quantity", "gross": "unit_gross*quantity"}[metric]
    args: list[Any] = [to_ms_day(start), to_ms_day(end + timedelta(days=1)) - 1]
    extra = ""
    if barcode:
        extra = " AND barcode=?"
        args.append(barcode)
    rows = db.q(f"""SELECT order_date, {expr} v FROM order_lines
                    WHERE order_date BETWEEN ? AND ? AND package_status NOT IN {CANCEL_STATUSES} {extra}""", args)
    agg: dict[date, float] = defaultdict(float)
    for r in rows:
        agg[local_date(r["order_date"])] += float(r["v"] or 0)
    out = []
    d = start
    while d <= end:
        out.append((d, round(agg.get(d, 0.0), 2)))
        d += timedelta(days=1)
    return out


def to_ms_day(d: date) -> int:
    from datetime import datetime
    return to_ms(datetime(d.year, d.month, d.day, tzinfo=TZ))


def robust_z(values: list[float]) -> list[float]:
    if len(values) < 5:
        return [0.0] * len(values)
    med = statistics.median(values)
    mad = statistics.median([abs(v - med) for v in values]) or 0.0
    if mad == 0:
        sd = statistics.pstdev(values) or 1.0
        return [(v - med) / sd for v in values]
    return [0.6745 * (v - med) / mad for v in values]


def mean_sd(values: Iterable[float]) -> tuple[float, float]:
    v = list(values)
    if not v:
        return 0.0, 0.0
    return statistics.fmean(v), (statistics.stdev(v) if len(v) > 1 else 0.0)


def _seasonal_index(series: list[float], season: int) -> list[float]:
    n = len(series)
    if n < 4 * season:
        return [1.0] * season
    overall = sum(series) / n or 1.0
    buckets: dict[int, list[float]] = defaultdict(list)
    for i, v in enumerate(series):
        buckets[i % season].append(v)
    seas = [(sum(b) / len(b)) / overall if overall else 1.0 for b in (buckets[i] for i in range(season))]
    return [s if s > 0.05 else 0.05 for s in seas]


def _damped_holt(series: list[float], horizon: int, alpha: float, beta: float, phi: float, season: int) -> tuple[list[float], list[float]]:
    """Sönümlü trendli Holt (Gardner) + çarpımsal haftalık mevsimsellik. Döner: (tahmin, bir-adım hataları)."""
    n = len(series)
    seas = _seasonal_index(series, season)
    des = [v / seas[i % season] for i, v in enumerate(series)]
    level = sum(des[:7]) / min(7, n)
    trend = 0.0
    errs = []
    for i in range(1, n):
        pred = (level + phi * trend) * seas[i % season]
        errs.append(series[i] - pred)
        prev = level
        level = alpha * des[i] + (1 - alpha) * (level + phi * trend)
        trend = beta * (level - prev) + (1 - beta) * phi * trend
    fc, damp = [], 0.0
    for h in range(1, horizon + 1):
        damp += phi ** h
        fc.append(max(0.0, (level + damp * trend) * seas[(n + h - 1) % season]))
    return fc, errs


def _seasonal_mean(series: list[float], horizon: int, season: int, window: int = 28) -> list[float]:
    w = series[-window:]
    n0 = len(series) - len(w)
    by: dict[int, list[float]] = defaultdict(list)
    for i, v in enumerate(w):
        by[(n0 + i) % season].append(v)
    avg = sum(w) / len(w)
    return [sum(by[(len(series) + h) % season]) / len(by[(len(series) + h) % season]) if by[(len(series) + h) % season] else avg
            for h in range(horizon)]


def holt_forecast(series: list[float], horizon: int, alpha: float = 0.3, beta: float = 0.05, phi: float = 0.85,
                  season: int = 7) -> dict[str, Any]:
    """Tahmin: sönümlü Holt + haftalık mevsimsellik ile 28 günlük mevsimsel ortalama arasından, son 14 günlük
    geriye dönük testte (backtest) hatası düşük olan seçilir. Tahmindir, kesin değildir."""
    n = len(series)
    if n == 0:
        return {"forecast": [0.0] * horizon, "method": "no-data", "rmse": None}
    if n < 14:
        avg = sum(series[-7:]) / min(n, 7)
        return {"forecast": [round(avg, 2)] * horizon, "method": "hareketli ortalama (veri < 14 gün)", "rmse": None}
    cands = {
        "sönümlü Holt + haftalık mevsimsellik": lambda s, h: _damped_holt(s, h, alpha, beta, phi, season)[0],
        "28 günlük mevsimsel ortalama": lambda s, h: _seasonal_mean(s, h, season),
    }
    hold = 14 if n >= 42 else 7
    scores = {}
    for name, f in cands.items():
        pred = f(series[:-hold], hold)
        scores[name] = sum(abs(a - b) for a, b in zip(series[-hold:], pred)) / hold
    best = min(scores, key=scores.get)
    fc = cands[best](series, horizon)
    rmse = math.sqrt(sum((a - b) ** 2 for a, b in zip(series[-hold:], cands[best](series[:-hold], hold))) / hold)
    return {"forecast": [round(x, 2) for x in fc], "method": best, "rmse": round(rmse, 2),
            "backtest_mae": {k: round(v, 2) for k, v in scores.items()}, "backtest_days": hold}


def fmt_date(ms: int | None) -> str | None:
    d = from_ms(ms)
    return d.strftime("%d.%m.%Y %H:%M") if d else None

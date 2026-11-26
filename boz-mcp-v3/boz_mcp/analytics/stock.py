"""BOZ Stock Intelligence — stok, satış hızı, tükenme, üretim önerisi (tahminler kesin değildir)."""
from __future__ import annotations

import math
from datetime import timedelta
from typing import Any

from ..db import DB
from ..timeutil import now
from .common import CANCEL_STATUSES, mean_sd


def _velocity(db: DB, days: int) -> dict[str, dict[str, float]]:
    """Barkod başına günlük ortalama/std satış adedi (tek sorgu, tamamlanmış günler)."""
    from collections import defaultdict
    from ..timeutil import local_date
    from .common import to_ms_day
    end = now().date() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    rows = db.q(f"""SELECT barcode, order_date, quantity FROM order_lines
                    WHERE order_date BETWEEN ? AND ? AND package_status NOT IN {CANCEL_STATUSES}""",
                (to_ms_day(start), to_ms_day(end + timedelta(days=1)) - 1))
    per: dict[str, dict] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        per[r["barcode"]][local_date(r["order_date"])] += r["quantity"] or 0
    out: dict[str, dict[str, float]] = {}
    for bc, byday in per.items():
        ser = [byday.get(start + timedelta(days=i), 0.0) for i in range(days)]
        m, sd = mean_sd(ser)
        out[bc] = {"avg_daily": m, "sd_daily": sd, "units": sum(ser)}
    return out


def stock_table(db: DB, days: int = 30, thresholds: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    t = thresholds or {}
    sym = t.get("symbolic_stock_threshold", 9999)
    vel7, vel30 = _velocity(db, 7), _velocity(db, days)
    rows = []
    for p in db.q("SELECT barcode,title,category_name,stock_qty,sale_price,on_sale,archived,stock_code FROM products WHERE archived=0"):
        bc = p["barcode"]
        v30 = vel30.get(bc, {"avg_daily": 0.0, "sd_daily": 0.0, "units": 0})
        v7 = vel7.get(bc, {"avg_daily": 0.0, "units": 0})
        # son 7 günün ağırlığı daha yüksek (talep değişimine duyarlılık)
        rate = 0.6 * v7["avg_daily"] + 0.4 * v30["avg_daily"] if v30["units"] else v7["avg_daily"]
        qty = p["stock_qty"]
        symbolic = qty is not None and qty >= sym
        cover = None if (qty is None or symbolic or rate <= 0) else round(qty / rate, 1)
        rows.append({"barcode": bc, "stock_code": p["stock_code"], "name": p["title"], "category": p["category_name"],
                     "stock": qty, "symbolic_stock": symbolic, "on_sale": bool(p["on_sale"]),
                     "units_7d": int(v7["units"]), "units_30d": int(v30["units"]),
                     "daily_rate": round(rate, 3), "daily_sd": round(v30["sd_daily"], 3), "days_of_cover": cover,
                     "depletion_date": (now().date() + timedelta(days=int(cover))).isoformat() if cover is not None else None})
    return rows


def _cover_txt(days: float | None) -> str:
    if days is None:
        return "—"
    if days > 365:
        return "1 yıldan fazla"
    return f"~{days:.0f} gün"


def forecast_depletion(db: DB, days: int = 30, thresholds: dict[str, Any] | None = None, limit: int = 30) -> dict[str, Any]:
    t = thresholds or {}
    crit = t.get("critical_stock_days", 14)
    rows = [r for r in stock_table(db, days, t) if r["days_of_cover"] is not None or (r["stock"] == 0 and r["units_30d"])]
    rows.sort(key=lambda r: (r["days_of_cover"] if r["days_of_cover"] is not None else -1))
    md = [f"### Stok tükenme tahmini (satış hızı: son 7 gün ağırlıklı + son {days} gün)",
          "| Ürün | Stok | Günlük satış | Kalan gün | Tahmini tükenme |", "|---|---:|---:|---:|---|"]
    for r in rows[:limit]:
        flag = "🔴 " if (r["days_of_cover"] is not None and r["days_of_cover"] <= crit) or r["stock"] == 0 else ""
        md.append(f"| {flag}{(r['name'] or r['barcode'])[:55]} | {r['stock']} | {r['daily_rate']:.2f} | "
                  f"{_cover_txt(r['days_of_cover']) if r['days_of_cover'] is not None else 'tükendi'} | {r['depletion_date'] if r['days_of_cover'] is not None and r['days_of_cover'] <= 365 else '—'} |")
    sym = [r for r in stock_table(db, days, t) if r["symbolic_stock"]]
    warn = []
    if sym:
        warn.append(f"{len(sym)} ürünün stoğu ≥{t.get('symbolic_stock_threshold', 9999)} (sembolik/üretime göre stok olabilir); bu ürünler için tükenme tahmini yapılmadı.")
    md.append("\n> Tahminler geçmiş satış hızına dayanır, kesin değildir.")
    return {"items": rows[:limit], "critical_days": crit, "symbolic_stock_count": len(sym), "markdown": "\n".join(md),
            "warnings": warn, "is_estimate": True}


def stock_risks(db: DB, days: int = 30, thresholds: dict[str, Any] | None = None) -> dict[str, Any]:
    t = thresholds or {}
    crit, over = t.get("critical_stock_days", 14), t.get("overstock_days", 180)
    tab = stock_table(db, days, t)
    out_of_stock = [r for r in tab if r["stock"] is not None and r["stock"] <= 0 and (r["on_sale"] or r["units_30d"] > 0)]
    critical = [r for r in tab if r["days_of_cover"] is not None and r["days_of_cover"] <= crit and (r["stock"] or 0) > 0]
    overstock = [r for r in tab if r["days_of_cover"] is not None and r["days_of_cover"] >= over]
    slow = [r for r in tab if r["units_30d"] == 0 and (r["stock"] or 0) > 0 and r["on_sale"]]
    fast = sorted([r for r in tab if r["units_30d"] > 0], key=lambda r: r["daily_rate"], reverse=True)[:10]
    def lst(title: str, items: list[dict], fmt) -> list[str]:
        if not items:
            return [f"**{title}:** yok"]
        return [f"**{title} ({len(items)}):**"] + [f"- {fmt(r)}" for r in items[:15]]
    md = ["### Stok risk analizi"]
    md += lst("🔴 Kritik stok", critical, lambda r: f"{(r['name'] or '')[:60]} — stok {r['stock']}, ~{r['days_of_cover']} gün")
    md += lst("⛔ Stoksuz", out_of_stock, lambda r: f"{(r['name'] or '')[:60]} — son 30 gün {r['units_30d']} adet satmıştı"
              + ("" if r["on_sale"] else " (satışa kapalı)"))
    md += lst("🟡 Fazla stok", overstock, lambda r: f"{(r['name'] or '')[:60]} — stok {r['stock']}, {_cover_txt(r['days_of_cover'])}")
    md += lst("🐢 Yavaş (30 günde satış yok)", slow, lambda r: f"{(r['name'] or '')[:60]} — stok {r['stock']}")
    md += lst("🚀 Hızlı satanlar", fast, lambda r: f"{(r['name'] or '')[:60]} — günde ~{r['daily_rate']:.2f} adet")
    return {"critical": critical, "out_of_stock": out_of_stock, "overstock": overstock, "slow_movers": slow,
            "fast_movers": fast, "markdown": "\n".join(md), "warnings": [], "is_estimate": True}


def recommend_production(db: DB, horizon_days: int | None = None, thresholds: dict[str, Any] | None = None,
                         limit: int = 25) -> dict[str, Any]:
    t = thresholds or {}
    cover = horizon_days or t.get("target_cover_days", 30)
    z = t.get("safety_stock_service_z", 1.65)
    lead_default = t.get("default_lead_time_days")
    lead_map = t.get("lead_time_days_by_barcode", {}) or {}
    recs, missing_lead = [], 0
    for r in stock_table(db, 30, t):
        if r["daily_rate"] <= 0 or r["symbolic_stock"]:
            continue
        lead = lead_map.get(r["barcode"], lead_default)
        lt = lead if lead is not None else 0
        if lead is None:
            missing_lead += 1
        safety = math.ceil(z * r["daily_sd"] * math.sqrt(max(lt, 1)))
        need = math.ceil(r["daily_rate"] * (cover + lt)) + safety
        qty = max(0, need - (r["stock"] or 0))
        if qty <= 0:
            continue
        urgency = (r["days_of_cover"] if r["days_of_cover"] is not None else 0) - lt
        recs.append({**r, "lead_time_days": lead, "safety_stock": safety, "target_cover_days": cover,
                     "recommended_qty": qty, "urgency_days": round(urgency, 1),
                     "priority": "YÜKSEK" if urgency <= 7 else ("ORTA" if urgency <= 21 else "DÜŞÜK")})
    recs.sort(key=lambda r: (r["urgency_days"], -r["daily_rate"]))
    md = [f"### Üretim önerisi — hedef {cover} günlük stok + güvenlik stoğu (z={z})",
          "| Öncelik | Ürün | Stok | Günlük satış | Kalan gün | Önerilen üretim |", "|---|---|---:|---:|---:|---:|"]
    for r in recs[:limit]:
        md.append(f"| {r['priority']} | {(r['name'] or '')[:55]} | {r['stock']} | {r['daily_rate']:.2f} | "
                  f"{r['days_of_cover'] if r['days_of_cover'] is not None else 0} | **{r['recommended_qty']}** |")
    warn = []
    if missing_lead:
        warn.append(f"{missing_lead} ürün için üretim süresi (lead time) tanımlı değil; 0 gün varsayıldı. "
                    "`config/thresholds.json` → `default_lead_time_days` / `lead_time_days_by_barcode` ayarlanmalı. "
                    "Üretim kapasitesi bilgisi yok; öneriler kapasite sınırı içermez.")
    md.append("\n> Öneri istatistikseldir; kampanya planı, hammadde ve kapasite bilgisiyle birlikte değerlendirin. Stoklar otomatik DEĞİŞTİRİLMEZ.")
    return {"items": recs[:limit], "markdown": "\n".join(md), "warnings": warn, "is_estimate": True}


def seasonality(db: DB) -> dict[str, Any]:
    """Aylık satış dağılımı (cari hesap) — sezonluk hareketler."""
    from collections import defaultdict
    from ..timeutil import local_date
    agg: dict[int, float] = defaultdict(float)
    months = set()
    for r in db.q("SELECT transaction_date, credit FROM settlements WHERE transaction_type='Sale'"):
        d = local_date(r["transaction_date"])
        agg[d.month] += r["credit"] or 0
        months.add((d.year, d.month))
    total = sum(agg.values()) or 1
    names = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
    idx = {names[m - 1]: round(v / (total / max(len(agg), 1)), 2) for m, v in sorted(agg.items())}
    return {"monthly_index": idx, "months_covered": len(months),
            "note": "Endeks 1,0 = ortalama ay. 12 aydan kısa veri sezonluk yorumu sınırlar."}

"""BOZ Sales Intelligence — satış analizleri (gerçek sipariş + cari hesap verisi)."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from ..db import DB
from ..timeutil import local_date, now, period_bounds, previous_period, to_ms
from .common import (CANCEL_STATUSES, daily_series, holt_forecast, order_coverage, pct, robust_z,
                     sales_totals, settlement_totals, tl)

ORDER_FIELDS_NOTE = ("Sipariş verisi Trendyol sipariş paketlerinden gelir. Brüt = indirim öncesi satır tutarı, "
                     "Net = indirimler sonrası müşterinin ödediği tutar (KDV dahil). İptal/tedarik edilemeyen paketler hariç. "
                     "Komisyon sipariş satırındaki komisyon oranından TAHMİNİDİR; kesin tutar cari hesap ekstresindedir.")


def _cov_warning(db: DB, start_ms: int) -> list[str]:
    lo, _ = order_coverage(db)
    if lo is None:
        return ["Yerel veritabanında sipariş verisi yok; önce senkronizasyon gerekli."]
    if start_ms < lo - 86_400_000:
        return [f"İstenen dönemin bir kısmı sipariş verisi kapsamı dışında (kapsam başlangıcı {local_date(lo).strftime('%d.%m.%Y')}). "
                "Trendyol sipariş API'si yalnızca yakın geçmişi verir; eski dönemler için cari hesap (settlement) verisi kullanılır."]
    return []


def period_summary(db: DB, period: str) -> dict[str, Any]:
    s, e, label = period_bounds(period)
    ps, pe = previous_period(s, e, period)
    cur = sales_totals(db, to_ms(s), to_ms(e))
    prev = sales_totals(db, to_ms(ps), to_ms(pe))
    ch = {k: pct(cur.get(k) or 0, prev.get(k) or 0) for k in ("net", "gross", "units", "orders")}
    return {"label": label, "start": s.isoformat(timespec="minutes"), "end": e.isoformat(timespec="minutes"),
            "current": cur, "previous": prev, "change_pct": ch, "warnings": _cov_warning(db, to_ms(ps))}


def sales_trends(db: DB, granularity: str = "daily", period: str = "30d") -> dict[str, Any]:
    warnings: list[str] = []
    if granularity in ("daily", "weekly"):
        s, e, label = period_bounds(period)
        warnings += _cov_warning(db, to_ms(s))
        series = daily_series(db, s.date(), e.date(), metric="net")
        units = dict(daily_series(db, s.date(), e.date(), metric="units"))
        rows = [{"date": d.isoformat(), "net": v, "units": int(units.get(d, 0))} for d, v in series]
        if granularity == "weekly":
            agg: dict[str, dict[str, float]] = defaultdict(lambda: {"net": 0.0, "units": 0})
            for r in rows:
                d = date.fromisoformat(r["date"])
                wk = (d - timedelta(days=d.weekday())).isoformat()
                agg[wk]["net"] += r["net"]
                agg[wk]["units"] += r["units"]
            rows = [{"week_start": k, "net": round(v["net"], 2), "units": int(v["units"])} for k, v in sorted(agg.items())]
        total = sum(r["net"] for r in rows)
        md = [f"### Satış trendi — {label} ({'günlük' if granularity == 'daily' else 'haftalık'})",
              f"Toplam net satış: **{tl(total)}**", "", "| Dönem | Net satış | Adet |", "|---|---:|---:|"]
        md += [f"| {r.get('date') or r.get('week_start')} | {tl(r['net'])} | {r['units']} |" for r in rows[-62:]]
        return {"source": "orders", "rows": rows, "summary": period_summary(db, period), "markdown": "\n".join(md),
                "warnings": warnings, "note": ORDER_FIELDS_NOTE}
    # aylık / yıllık: cari hesap (settlement) verisi
    rows = db.q("""SELECT transaction_date, transaction_type, credit, debt, commission_amount FROM settlements""")
    if not rows:
        return {"source": "settlements", "rows": [], "markdown": "Cari hesap verisi yok; senkronizasyon gerekli.",
                "warnings": ["Settlement verisi yok."]}
    agg2: dict[str, dict[str, float]] = defaultdict(lambda: {"sale": 0.0, "return": 0.0, "commission": 0.0, "lines": 0})
    for r in rows:
        d = local_date(r["transaction_date"])
        key = f"{d.year}-{d.month:02d}" if granularity == "monthly" else str(d.year)
        if r["transaction_type"] == "Sale":
            agg2[key]["sale"] += r["credit"] or 0
            agg2[key]["commission"] += r["commission_amount"] or 0
            agg2[key]["lines"] += 1
        else:
            agg2[key]["return"] += r["debt"] or 0
            agg2[key]["commission"] += r["commission_amount"] or 0  # iade komisyonu negatif/iade
    out = [{"period": k, "sale_amount": round(v["sale"], 2), "return_amount": round(v["return"], 2),
            "net_after_returns": round(v["sale"] - v["return"], 2), "sale_lines": int(v["lines"])}
           for k, v in sorted(agg2.items())]
    for i in range(1, len(out)):
        out[i]["change_pct"] = pct(out[i]["sale_amount"], out[i - 1]["sale_amount"])
    md = [f"### Satış trendi ({'aylık' if granularity == 'monthly' else 'yıllık'}) — cari hesap ekstresi",
          "| Dönem | Satış | İade | Satış−İade | Değişim |", "|---|---:|---:|---:|---:|"]
    md += [f"| {r['period']} | {tl(r['sale_amount'])} | {tl(r['return_amount'])} | {tl(r['net_after_returns'])} | "
           f"{'' if r.get('change_pct') is None else str(r['change_pct']) + '%'} |" for r in out]
    first = out[0]["period"]
    warnings.append(f"Cari hesap verisi {first} döneminden itibaren mevcut; ilk ve son dönem kısmi olabilir.")
    return {"source": "settlements", "rows": out, "markdown": "\n".join(md), "warnings": warnings,
            "note": "Cari hesap 'Satış' kayıtları Trendyol'un hesabınıza işlediği satışlardır (işlem tarihi bazında); sipariş tarihinden farklı olabilir."}


def product_performance(db: DB, period: str = "30d", group_by: str = "product", sort: str = "best",
                        limit: int = 20, include_zero_sales: bool = True) -> dict[str, Any]:
    s, e, label = period_bounds(period)
    ps, pe = previous_period(s, e, period)
    key = "barcode" if group_by == "product" else "category_id"
    def agg(a: int, b: int) -> dict[Any, dict[str, Any]]:
        rows = db.q(f"""SELECT {key} k, MAX(product_name) name, SUM(quantity) units, SUM(unit_net*quantity) net,
                        COUNT(DISTINCT order_number) orders FROM order_lines
                        WHERE order_date BETWEEN ? AND ? AND package_status NOT IN {CANCEL_STATUSES} GROUP BY {key}""", (a, b))
        return {r["k"]: dict(r) for r in rows}
    cur, prev = agg(to_ms(s), to_ms(e)), agg(to_ms(ps), to_ms(pe))
    claims = {r["k"]: r["n"] for r in db.q(f"""SELECT {'c.barcode' if key == 'barcode' else 'p.category_id'} k, COUNT(*) n
                FROM claims c LEFT JOIN products p ON p.barcode=c.barcode WHERE c.claim_date BETWEEN ? AND ? GROUP BY k""",
                                            (to_ms(s), to_ms(e)))}
    prods = {r["barcode"]: dict(r) for r in db.q("SELECT barcode,title,category_name,category_id,stock_qty,sale_price,on_sale,archived FROM products")}
    cat_names = {p["category_id"]: p["category_name"] for p in prods.values()}
    items: list[dict[str, Any]] = []
    keys = set(cur)
    if include_zero_sales and group_by == "product":
        keys |= {b for b, p in prods.items() if not p["archived"]}
    for k in keys:
        c = cur.get(k, {})
        p = prev.get(k, {})
        meta = prods.get(k, {}) if group_by == "product" else {}
        units = int(c.get("units") or 0)
        items.append({
            "key": k,
            "name": (meta.get("title") or c.get("name") or p.get("name")) if group_by == "product" else cat_names.get(k, f"Kategori {k}"),
            "units": units, "net": round(c.get("net") or 0, 2), "orders": int(c.get("orders") or 0),
            "prev_units": int(p.get("units") or 0), "prev_net": round(p.get("net") or 0, 2),
            "change_pct": pct(c.get("net") or 0, p.get("net") or 0),
            "claims": int(claims.get(k, 0)),
            "claim_rate_pct": round(claims.get(k, 0) / units * 100, 1) if units else None,
            **({"stock": meta.get("stock_qty"), "price": meta.get("sale_price"), "on_sale": bool(meta.get("on_sale"))} if meta else {}),
        })
    rev = sort != "worst"
    items.sort(key=lambda x: (x["net"], x["units"]), reverse=rev)
    total = sum(i["net"] for i in items) or 1
    for i in items:
        i["share_pct"] = round(i["net"] / total * 100, 1)
    top = items[:limit]
    title = "En çok satan" if rev else "En az satan"
    md = [f"### {title} {'ürünler' if group_by == 'product' else 'kategoriler'} — {label}",
          "| # | Ad | Adet | Net satış | Pay | Önceki dönem | Değişim | İade/Şikâyet |", "|---:|---|---:|---:|---:|---:|---:|---:|"]
    for n, i in enumerate(top, 1):
        md.append(f"| {n} | {str(i['name'])[:60]} | {i['units']} | {tl(i['net'])} | %{i['share_pct']} | {tl(i['prev_net'])} | "
                  f"{'' if i['change_pct'] is None else str(i['change_pct']) + '%'} | {i['claims']} |")
    return {"period": label, "group_by": group_by, "items": top, "total_items": len(items),
            "markdown": "\n".join(md), "warnings": _cov_warning(db, to_ms(ps)), "note": ORDER_FIELDS_NOTE}


def detect_anomalies(db: DB, days: int = 60, threshold: float = 3.0, barcode: str | None = None) -> dict[str, Any]:
    end = now().date()
    start = end - timedelta(days=days - 1)
    series = daily_series(db, start, end - timedelta(days=0), barcode=barcode)
    # bugünü (tamamlanmamış gün) analizden çıkar
    series = series[:-1]
    vals = [v for _, v in series]
    z = robust_z(vals)
    # haftanın günü etkisini azaltmak için 7 günlük ortanca ile karşılaştır
    anomalies = []
    for i, ((d, v), zz) in enumerate(zip(series, z)):
        if abs(zz) >= threshold:
            window = [x for _, x in series[max(0, i - 14):i]]
            base = sorted(window)[len(window) // 2] if window else None
            anomalies.append({"date": d.isoformat(), "net": v, "robust_z": round(zz, 2),
                              "type": "ani artış" if zz > 0 else "ani düşüş", "baseline_median_14d": base})
    zero_streak = 0
    for _, v in reversed(series):
        if v == 0:
            zero_streak += 1
        else:
            break
    md = [f"### Olağan dışı satış hareketleri — son {days} gün", f"Eşik: robust z ≥ {threshold}"]
    if anomalies:
        md += ["| Tarih | Net satış | Tür | z | 14 gün ortanca |", "|---|---:|---|---:|---:|"]
        md += [f"| {a['date']} | {tl(a['net'])} | {a['type']} | {a['robust_z']} | {tl(a['baseline_median_14d'])} |" for a in anomalies]
    else:
        md.append("Eşiği aşan olağan dışı gün bulunmadı.")
    if zero_streak >= 2:
        md.append(f"⚠️ Son {zero_streak} tamamlanmış günde satış kaydı yok (veri senkronizasyonu doğrulanmalı).")
    return {"anomalies": anomalies, "zero_sales_streak_days": zero_streak, "series_days": len(series),
            "markdown": "\n".join(md), "warnings": _cov_warning(db, to_ms(now() - timedelta(days=days)))}


def forecast_sales(db: DB, horizon_days: int = 30, history_days: int = 60, barcode: str | None = None,
                   metric: str = "net") -> dict[str, Any]:
    end = now().date() - timedelta(days=1)
    start = end - timedelta(days=history_days - 1)
    lo, _ = order_coverage(db)
    if lo and local_date(lo) > start:
        start = local_date(lo) + timedelta(days=1)
    series = [v for _, v in daily_series(db, start, end, barcode=barcode, metric=metric)]
    fc = holt_forecast(series, horizon_days)
    total = round(sum(fc["forecast"]), 2)
    band = round(fc["rmse"] * (horizon_days ** 0.5), 2) if fc.get("rmse") else None
    unit = "TL" if metric == "net" else "adet"
    md = [f"### Satış tahmini — önümüzdeki {horizon_days} gün ({'ürün ' + barcode if barcode else 'mağaza geneli'})",
          f"Yöntem: {fc['method']} · geçmiş veri: {len(series)} gün",
          f"Tahmini toplam: **{tl(total) if metric == 'net' else f'{total:.0f} adet'}**" + (f" (± ~{tl(band) if metric == 'net' else f'{band:.0f} adet'}, kaba belirsizlik)" if band else ""),
          "", "> Bu bir istatistiksel tahmindir, kesin değildir. Kampanya, stok, fiyat ve sezon değişiklikleri sonucu etkiler."]
    weekly = [round(sum(fc["forecast"][i:i + 7]), 2) for i in range(0, horizon_days, 7)]
    if fc.get("backtest_mae"):
        md.insert(2, "Geriye dönük test (son {} gün, ort. mutlak hata/gün): ".format(fc["backtest_days"]) +
                  "; ".join(f"{k}: {tl(v) if metric == 'net' else f'{v:.1f} adet'}" for k, v in fc["backtest_mae"].items()))
    return {"history_days": len(series), "method": fc["method"], "backtest_mae": fc.get("backtest_mae"), "daily_forecast": fc["forecast"], "weekly_forecast": weekly,
            "total": total, "uncertainty_band": band, "metric": metric, "is_estimate": True, "markdown": "\n".join(md),
            "warnings": ["Geçmiş veri 28 günden az; tahmin güvenilirliği düşük."] if len(series) < 28 else []}


def sales_decline(db: DB, period: str = "7d", min_drop_pct: float = 20.0, limit: int = 15) -> dict[str, Any]:
    """Dönem karşılaştırmasıyla düşüş tespiti + erişilebilir verilerden OLASI nedenler."""
    s, e, label = period_bounds(period)
    ps, pe = previous_period(s, e, period)
    cur, prev = sales_totals(db, to_ms(s), to_ms(e)), sales_totals(db, to_ms(ps), to_ms(pe))
    perf = product_performance(db, period, "product", "best", limit=10_000, include_zero_sales=False)["items"]
    prev_rows = db.q(f"""SELECT barcode, MAX(product_name) name, SUM(quantity) units, SUM(unit_net*quantity) net FROM order_lines
                        WHERE order_date BETWEEN ? AND ? AND package_status NOT IN {CANCEL_STATUSES} GROUP BY barcode""",
                     (to_ms(ps), to_ms(pe)))
    cur_by = {i["key"]: i for i in perf}
    drivers = []
    for r in prev_rows:
        c = cur_by.get(r["barcode"], {"net": 0.0, "units": 0})
        diff = (c.get("net") or 0) - (r["net"] or 0)
        if diff < 0 and (r["net"] or 0) > 0:
            drop = round(-diff / r["net"] * 100, 1)
            if drop >= min_drop_pct:
                drivers.append({"barcode": r["barcode"], "name": r["name"], "prev_net": round(r["net"], 2),
                                "net": round(c.get("net") or 0, 2), "lost_net": round(-diff, 2), "drop_pct": drop,
                                "possible_causes": _possible_causes(db, r["barcode"], to_ms(s), to_ms(ps), to_ms(pe))})
    drivers.sort(key=lambda d: d["lost_net"], reverse=True)
    total_change = pct(cur["net"], prev["net"])
    md = [f"### Satış düşüşü analizi — {label} vs önceki dönem",
          f"Net satış: {tl(cur['net'])} (önceki {tl(prev['net'])}, değişim {total_change if total_change is not None else '—'}%)",
          f"Sipariş: {cur['orders']} (önceki {prev['orders']}) · Adet: {cur['units']} (önceki {prev['units']})", ""]
    if drivers:
        md += ["**Düşüşe en çok katkı veren ürünler ve OLASI nedenler** (kesin neden doğrulanamaz):", ""]
        for d in drivers[:limit]:
            md.append(f"- **{d['name'][:70]}** — {tl(d['prev_net'])} → {tl(d['net'])} (−%{d['drop_pct']})")
            for c in d["possible_causes"]:
                md.append(f"  - {c}")
    else:
        md.append(f"%{min_drop_pct} üzeri düşüş gösteren ürün yok.")
    md += ["", "_Ziyaretçi ve dönüşüm verisi Trendyol API'sinde olmadığından bu boyutlar değerlendirilemedi "
               "(Seller Center raporu içe aktarılırsa dahil edilir)._"]
    return {"period": label, "current": cur, "previous": prev, "change_pct": total_change, "drivers": drivers[:limit],
            "markdown": "\n".join(md), "warnings": _cov_warning(db, to_ms(ps)),
            "note": "Nedenler 'olası neden' olarak verilir; fiyat/stok/buybox/iade/soru/trafik verileri karşılaştırılmıştır."}


def _possible_causes(db: DB, barcode: str, cur_start: int, prev_start: int, prev_end: int) -> list[str]:
    out: list[str] = []
    snaps = db.q("SELECT ts, stock_qty, sale_price, on_sale FROM product_snapshots WHERE barcode=? ORDER BY ts", (barcode,))
    p = db.one("SELECT stock_qty, sale_price, on_sale, archived FROM products WHERE barcode=?", (barcode,))
    if p is not None:
        if not p["on_sale"] or p["archived"]:
            out.append("Ürün şu an satışta değil/arşivde görünüyor.")
        if p["stock_qty"] is not None and p["stock_qty"] <= 0:
            out.append("Güncel stok 0 — stoksuz kalma satışı durdurmuş olabilir.")
    before = [s for s in snaps if s["ts"] <= cur_start]
    after = [s for s in snaps if s["ts"] > cur_start]
    if before and after:
        bp, ap = before[-1]["sale_price"], after[-1]["sale_price"]
        if bp and ap and ap > bp * 1.02:
            out.append(f"Fiyat artışı tespit edildi: {tl(bp)} → {tl(ap)}.")
        if any((s["stock_qty"] or 0) <= 0 for s in after):
            out.append("Dönem içinde stok 0'a düşmüş.")
    elif not snaps or len(snaps) < 2:
        out.append("Fiyat/stok geçmişi henüz yetersiz (anlık görüntüler V3 kurulumundan itibaren birikir).")
    bb = db.q("SELECT ts,buybox_order,has_multiple_seller FROM buybox_history WHERE barcode=? ORDER BY ts DESC LIMIT 2", (barcode,))
    if bb and bb[0]["buybox_order"] and bb[0]["buybox_order"] > 1:
        out.append(f"Buybox sıranız {bb[0]['buybox_order']} — aynı üründe daha avantajlı satıcı var.")
    # sipariş fiyatı değişimi (snapshots yoksa siparişlerden)
    r = db.one(f"""SELECT AVG(CASE WHEN order_date>=? THEN unit_net END) cur, AVG(CASE WHEN order_date BETWEEN ? AND ? THEN unit_net END) prev
                   FROM order_lines WHERE barcode=? AND package_status NOT IN {CANCEL_STATUSES}""", (cur_start, prev_start, prev_end, barcode))
    if r and r["cur"] and r["prev"] and r["cur"] > r["prev"] * 1.05:
        out.append(f"Ortalama satış fiyatı yükselmiş: {tl(r['prev'])} → {tl(r['cur'])}.")
    rc = db.one("SELECT COUNT(CASE WHEN claim_date>=? THEN 1 END) cur, COUNT(CASE WHEN claim_date BETWEEN ? AND ? THEN 1 END) prev FROM claims WHERE barcode=?",
                (cur_start, prev_start, prev_end, barcode))
    if rc and rc["cur"] > rc["prev"]:
        out.append(f"İade talepleri artmış ({rc['prev']} → {rc['cur']}); olumsuz değerlendirmeler dönüşümü etkilemiş olabilir.")
    tm = db.q("SELECT day, visitors FROM traffic_metrics WHERE barcode=? ORDER BY day DESC LIMIT 28", (barcode,))
    if not tm:
        out.append("Ziyaretçi/dönüşüm verisi yok (API'de yok) — trafik kaybı ayrıca kontrol edilmeli.")
    if not out:
        out.append("Erişilebilir verilerde belirgin bir neden bulunamadı (rakip, sezon veya trafik etkisi olabilir).")
    return out


def conversion_analysis(db: DB, days: int = 30) -> dict[str, Any]:
    rows = db.q("""SELECT barcode, SUM(visitors) v, SUM(views) pv, SUM(add_to_cart) atc, SUM(favorites) fav, SUM(orders) o
                   FROM traffic_metrics WHERE day >= ? GROUP BY barcode""", ((now().date() - timedelta(days=days)).isoformat(),))
    if not rows:
        return {"supported": False, "items": [],
                "markdown": ("### Dönüşüm oranı analizi\nZiyaretçi/dönüşüm verisi Trendyol satıcı API'sinde **yok**. "
                             "Seller Center'dan indirilen ürün trafik raporunu `import_seller_center_metrics` aracıyla "
                             "içe aktarırsanız bu analiz gerçek verilerle çalışır. Tahmini değer üretilmez."),
                "warnings": ["Trafik verisi içe aktarılmamış."]}
    names = {r["barcode"]: r["title"] for r in db.q("SELECT barcode,title FROM products")}
    items = []
    for r in rows:
        v = r["v"] or 0
        items.append({"barcode": r["barcode"], "name": names.get(r["barcode"]), "visitors": v, "add_to_cart": r["atc"],
                      "favorites": r["fav"], "orders": r["o"],
                      "conversion_pct": round((r["o"] or 0) / v * 100, 2) if v else None,
                      "cart_rate_pct": round((r["atc"] or 0) / v * 100, 2) if v and r["atc"] is not None else None})
    items.sort(key=lambda x: (x["visitors"] or 0), reverse=True)
    conv = [i["conversion_pct"] for i in items if i["conversion_pct"] is not None]
    med = sorted(conv)[len(conv) // 2] if conv else None
    md = [f"### Dönüşüm oranı — son {days} gün (içe aktarılan Seller Center verisi)", f"Ortanca dönüşüm: %{med}",
          "| Ürün | Ziyaretçi | Sepet | Favori | Sipariş | Dönüşüm |", "|---|---:|---:|---:|---:|---:|"]
    for i in items[:30]:
        flag = " ⚠️" if med and i["conversion_pct"] is not None and i["visitors"] and i["visitors"] >= 100 and i["conversion_pct"] < med / 2 else ""
        md.append(f"| {(i['name'] or i['barcode'])[:50]} | {i['visitors']} | {i['add_to_cart'] or '—'} | {i['favorites'] or '—'} | {i['orders']} | %{i['conversion_pct']}{flag} |")
    return {"supported": True, "items": items, "median_conversion_pct": med, "markdown": "\n".join(md), "warnings": []}

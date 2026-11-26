"""BOZ Campaign Intelligence — sipariş satırlarındaki gerçek indirim/kampanya izleri üzerinden.
Kampanya listesi (aktif/yaklaşan/uygun) için resmi okuma API'si yoktur. Kârlılık hesaplanmaz."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from ..db import DB
from ..timeutil import TZ, now, to_ms
from .common import CANCEL_STATUSES, pct, sales_totals, tl
from .stock import stock_table

UNSUPPORTED = ("Aktif, yaklaşan ve katılıma uygun Trendyol kampanyalarının listesi, Trendyol destekli indirim teklifleri ve "
               "kampanya komisyon avantajları satıcı API'sinde belgelenmemiştir. Bu bilgiler Seller Center'dan (veya ChatGPT "
               "Seller Center eklentisinden) alınmalıdır.")


def analyze(db: DB, days: int = 30) -> dict[str, Any]:
    start = to_ms(now() - timedelta(days=days))
    disc = db.q("""SELECT d.name, COUNT(DISTINCT d.package_id) pk, SUM(d.amount) amt FROM order_discounts d
                   WHERE d.order_date >= ? GROUP BY d.name ORDER BY pk DESC""", (start,))
    pk_total = db.one(f"SELECT COUNT(DISTINCT package_id) n FROM order_lines WHERE order_date>=? AND package_status NOT IN {CANCEL_STATUSES}", (start,))["n"]
    disc_pk = db.one("SELECT COUNT(DISTINCT package_id) n FROM order_discounts WHERE order_date>=?", (start,))["n"]
    camp = db.q(f"""SELECT campaign_id, COUNT(DISTINCT order_number) orders, SUM(quantity) units, SUM(unit_net*quantity) net,
                    SUM(unit_ty_discount*quantity) ty, SUM(unit_seller_discount*quantity) seller
                    FROM order_lines WHERE order_date>=? AND package_status NOT IN {CANCEL_STATUSES} GROUP BY campaign_id ORDER BY net DESC""", (start,))
    t = sales_totals(db, start, to_ms(now()))
    md = [f"### Kampanya ve indirim analizi — son {days} gün (sipariş verisinden)",
          f"İndirimli paket oranı: **%{round(disc_pk / pk_total * 100, 1) if pk_total else 0}** ({disc_pk}/{pk_total})",
          f"Satıcı finansmanlı indirim: {tl(t['seller_discount'])} · Trendyol finansmanlı indirim: {tl(t['ty_discount'])}", "",
          "| İndirim / kupon adı | Paket | Toplam indirim |", "|---|---:|---:|"]
    md += [f"| {r['name'][:60]} | {r['pk']} | {tl(r['amt'])} |" for r in disc[:25]]
    md += ["", "| salesCampaignId | Sipariş | Adet | Net satış | TY indirim | Satıcı indirim |", "|---|---:|---:|---:|---:|---:|"]
    md += [f"| {r['campaign_id']} | {r['orders']} | {r['units']} | {tl(r['net'])} | {tl(r['ty'])} | {tl(r['seller'])} |" for r in camp[:15]]
    md += ["", f"> {UNSUPPORTED}"]
    return {"discounts": [dict(r) for r in disc], "campaign_ids": [dict(r) for r in camp], "discounted_package_share_pct":
            round(disc_pk / pk_total * 100, 1) if pk_total else None, "seller_funded_discount": t["seller_discount"],
            "trendyol_funded_discount": t["ty_discount"], "unsupported": UNSUPPORTED, "markdown": "\n".join(md), "warnings": []}


def performance(db: DB, start_date: str, end_date: str, discount_name: str | None = None, barcode: str | None = None) -> dict[str, Any]:
    s = datetime.fromisoformat(start_date).replace(tzinfo=TZ)
    e = datetime.fromisoformat(end_date).replace(tzinfo=TZ) + timedelta(days=1) - timedelta(milliseconds=1)
    span = e - s
    before = (s - span - timedelta(milliseconds=1), s - timedelta(milliseconds=1))
    after = (e + timedelta(milliseconds=1), e + span)
    def tot(a, b):
        return sales_totals(db, to_ms(a), to_ms(b), barcode)
    cur, bef, aft = tot(s, e), tot(*before), tot(*after)
    aft_complete = after[1] <= now()
    traffic = db.q("""SELECT CASE WHEN day < ? THEN 'before' WHEN day <= ? THEN 'during' ELSE 'after' END w,
                      SUM(visitors) v, SUM(orders) o FROM traffic_metrics WHERE day BETWEEN ? AND ? {} GROUP BY w""".format(
                      "AND barcode=?" if barcode else ""),
                   [s.date().isoformat(), e.date().isoformat(), before[0].date().isoformat(), after[1].date().isoformat()] + ([barcode] if barcode else []))
    tr = {r["w"]: {"visitors": r["v"], "orders": r["o"], "conversion_pct": round(r["o"] / r["v"] * 100, 2) if r["v"] else None} for r in traffic}
    dn = None
    if discount_name:
        dn = db.one("SELECT COUNT(DISTINCT package_id) pk, SUM(amount) amt FROM order_discounts WHERE name LIKE ? AND order_date BETWEEN ? AND ?",
                    (f"%{discount_name}%", to_ms(s), to_ms(e)))
    md = [f"### Kampanya performansı — {start_date} → {end_date}" + (f" · ürün {barcode}" if barcode else ""),
          "| Dönem | Net satış | Adet | Sipariş | Ziyaretçi | Dönüşüm |", "|---|---:|---:|---:|---:|---:|"]
    for lab, d, w in (("Önce", bef, "before"), ("Kampanya", cur, "during"), ("Sonra" + ("" if aft_complete else " (devam ediyor)"), aft, "after")):
        tw = tr.get(w, {})
        md.append(f"| {lab} | {tl(d['net'])} | {d['units']} | {d['orders']} | {tw.get('visitors', '—')} | {tw.get('conversion_pct', '—')} |")
    md.append(f"\nKampanya etkisi (önceye göre): net satış %{pct(cur['net'], bef['net'])}, adet %{pct(cur['units'], bef['units'])}")
    if dn:
        md.append(f"'{discount_name}' indirimi kullanılan paket: {dn['pk']} · toplam indirim {tl(dn['amt'])}")
    warn = [] if tr else ["Ziyaretçi/dönüşüm verisi API'de yok; Seller Center raporu içe aktarılmadıkça bu sütunlar boş kalır."]
    return {"before": bef, "during": cur, "after": aft, "after_complete": aft_complete, "traffic": tr,
            "uplift_net_pct": pct(cur["net"], bef["net"]), "uplift_units_pct": pct(cur["units"], bef["units"]),
            "discount_usage": dict(dn) if dn else None, "markdown": "\n".join(md), "warnings": warn}


def opportunities(db: DB, thresholds: dict[str, Any] | None = None) -> dict[str, Any]:
    tab = stock_table(db, 30, thresholds)
    over_days = (thresholds or {}).get("overstock_days", 180)
    slow = [r for r in tab if r["on_sale"] and (r["stock"] or 0) > 0 and not r["symbolic_stock"] and
            (r["units_30d"] == 0 or (r["days_of_cover"] or 0) >= over_days)]
    fast_ok = [r for r in tab if r["units_30d"] >= 5 and (r["symbolic_stock"] or (r["days_of_cover"] or 0) >= 30)]
    risky = [r for r in tab if r["units_30d"] >= 3 and r["days_of_cover"] is not None and r["days_of_cover"] < 21]
    claims = {r["barcode"]: r["n"] for r in db.q("SELECT barcode, COUNT(*) n FROM claims WHERE claim_date>=? GROUP BY barcode",
                                                (to_ms(now() - timedelta(days=90)),))}
    md = ["### Kampanya fırsatları (veriye dayalı aday listesi)", f"> {UNSUPPORTED}", "",
          "**İndirim/kampanya ile hızlandırılabilecek yavaş ürünler (stok var, satış düşük):**"]
    md += [f"- {(r['name'] or '')[:60]} — stok {r['stock']}, 30 günde {r['units_30d']} adet" for r in slow[:12]] or ["- yok"]
    md += ["", "**Kampanya görünürlüğünden yararlanabilecek, stoğu yeterli hızlı ürünler:**"]
    md += [f"- {(r['name'] or '')[:60]} — 30 günde {r['units_30d']} adet" + (f", iade {claims.get(r['barcode'])}" if claims.get(r['barcode']) else "") for r in fast_ok[:12]] or ["- yok"]
    md += ["", "**⚠️ Kampanya riski — stok kampanya talebini karşılamayabilir:**"]
    md += [f"- {(r['name'] or '')[:60]} — ~{r['days_of_cover']} günlük stok" for r in risky[:12]] or ["- yok"]
    md.append("\n_Kampanyaya katılma/çıkma ve fiyat değişikliği bu sistemden YAPILMAZ; karar ve işlem sizin onayınızla Seller Center'dan._")
    return {"slow_movers_for_discount": slow[:30], "fast_movers_with_stock": fast_ok[:30], "stock_risk_for_campaign": risky[:30],
            "unsupported": UNSUPPORTED, "markdown": "\n".join(md), "warnings": [], "is_recommendation": True}

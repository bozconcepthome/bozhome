"""Genel bakış, öneriler ve kapsamlı/haftalık iş raporu."""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from ..db import DB
from ..timeutil import iso, now, period_bounds, previous_period, to_ms
from . import campaigns, competitors, customer, market, sales, seo, stock
from .common import pct, sales_totals, settlement_totals, tl


def _freshness(db: DB) -> dict[str, Any]:
    out = {}
    for k in ("products", "orders", "claims", "questions", "settlements", "buybox", "watcher"):
        i = db.sync_info(k)
        out[k] = {"last_success": iso(i.get("last_success")) if i else None, "last_error": (i or {}).get("last_error")}
    return out


def overview(db: DB, thresholds: dict[str, Any]) -> dict[str, Any]:
    t, y, w, m = (sales.period_summary(db, p) for p in ("today", "yesterday", "7d", "30d"))
    pend = db.one("SELECT COUNT(*) n FROM questions WHERE status='WAITING_FOR_ANSWER'")["n"]
    risks = stock.stock_risks(db, 30, thresholds)
    cm = customer.complaints(db, 30)
    bb = competitors.buybox_status(db)
    lost = [b for b in bb if b["buybox_order"] and b["buybox_order"] > 1]
    prods = db.one("SELECT COUNT(*) n, SUM(on_sale) s FROM products WHERE archived=0")
    def line(p: dict) -> str:
        c = p["current"]
        ch = p["change_pct"]["net"]
        return (f"| {p['label']} | {tl(c['net'])} | {c['orders']} | {c['units']} | {tl(c['avg_order_value'])} | "
                f"{'' if ch is None else ('+' if ch > 0 else '') + str(ch) + '%'} |")
    md = [f"## Boz Concept Home — mağaza durumu ({now().strftime('%d.%m.%Y %H:%M')})",
          "| Dönem | Net satış | Sipariş | Adet | Ort. sepet | Önceki döneme göre |", "|---|---:|---:|---:|---:|---:|",
          line(t), line(y), line(w), line(m), "",
          f"- Aktif ürün: {prods['n']} (satışta {prods['s'] or 0})",
          f"- Cevap bekleyen müşteri sorusu: **{pend}** (son senkronizasyona göre)",
          f"- Kritik stok: {len(risks['critical'])} · Stoksuz: {len(risks['out_of_stock'])} · 30 günde satmayan: {len(risks['slow_movers'])}",
          f"- Son 30 gün iade talebi: {cm['claims']} (önceki {cm['previous_claims']})",
          f"- Buybox'ı kaybedilen ürün: {len(lost)} / {len(bb)}",
          f"- İptal edilen sipariş (30 gün): {m['current']['cancelled_orders']} ({tl(m['current']['cancelled_amount'])})",
          f"- Tahmini komisyon (30 gün, sipariş satırı oranlarıyla): {tl(m['current']['est_commission'])}"]
    warns = sorted(set(sum((p["warnings"] for p in (t, y, w, m)), [])))
    return {"today": t, "yesterday": y, "last_7d": w, "last_30d": m, "pending_questions": pend,
            "stock": {"critical": len(risks["critical"]), "out_of_stock": len(risks["out_of_stock"]), "slow": len(risks["slow_movers"])},
            "claims_30d": cm["claims"], "buybox_lost": len(lost), "freshness": _freshness(db), "markdown": "\n".join(md), "warnings": warns}


def recommendations(db: DB, thresholds: dict[str, Any], limit: int = 12) -> dict[str, Any]:
    recs: list[dict[str, Any]] = []
    def add(priority: int, area: str, action: str, evidence: str) -> None:
        recs.append({"priority": priority, "area": area, "action": action, "evidence": evidence})
    risks = stock.stock_risks(db, 30, thresholds)
    for r in risks["out_of_stock"][:3]:
        add(1, "Stok", f"'{(r['name'] or '')[:50]}' için üretim/stok girişi yapın.", f"Stok 0, son 30 günde {r['units_30d']} adet satmıştı.")
    for r in risks["critical"][:3]:
        add(1, "Stok", f"'{(r['name'] or '')[:50]}' üretimini önceliklendirin.", f"~{r['days_of_cover']} günlük stok kaldı.")
    dec = sales.sales_decline(db, "7d", 30, 5)
    for d in dec["drivers"][:3]:
        add(2, "Satış", f"'{d['name'][:50]}' düşüşünü inceleyin.", f"Net satış −%{d['drop_pct']}; olası: {d['possible_causes'][0]}")
    bb = [b for b in competitors.buybox_status(db) if b["buybox_order"] and b["buybox_order"] > 1]
    for b in bb[:3]:
        add(2, "Rekabet", f"'{(b['title'] or '')[:50]}' buybox kaybı — fiyat/teslimat süresini değerlendirin (fiyat değişikliği onayınızla).",
            f"Sıranız {b['buybox_order']}, buybox fiyatı {tl(b['buybox_price'])}, sizin {tl(b['my_price'])}.")
    cm = customer.complaints(db, 90)
    for p in cm["products"][:3]:
        if p["root_cause_hypotheses"]:
            add(2, "Müşteri", f"'{(p['name'] or '')[:50]}': {p['root_cause_hypotheses'][0]}", f"{p['claims']} iade (90 gün).")
    s = seo.analyze_catalog(db, limit=5)
    for p in s["products"][:3]:
        top = next((i["issue"] for i in p["issues"] if i["severity"] == "yüksek"), None)
        if top:
            add(3, "SEO", f"'{p['title'][:50]}' içeriğini iyileştirin: {top}", f"İçerik skoru {p['seo_score']}/100.")
    q = customer.analyze_questions(db, 60)
    for g in q["description_gaps"][:2]:
        add(3, "İçerik", f"'{g['product'][:50]}' açıklamasına ekleyin: {', '.join(g['recurring_topics'])}.", "Tekrarlanan müşteri soruları.")
    op = campaigns.opportunities(db, thresholds)
    for r in op["slow_movers_for_discount"][:2]:
        add(3, "Kampanya", f"'{(r['name'] or '')[:50]}' için kupon/indirim değerlendirin (karar sizde).", f"Stok {r['stock']}, 30 günde {r['units_30d']} satış.")
    co = market.co_purchases(db)
    for c in co[:2]:
        add(4, "Ürün", "Set/paket ürün oluşturmayı değerlendirin: " + " + ".join((n or "?")[:30] for n in c["products"]),
            f"{c['orders_together']} siparişte birlikte alındı.")
    recs.sort(key=lambda r: r["priority"])
    recs = recs[:limit]
    md = ["### Satış artırma önerileri (veriye dayalı)", "| Öncelik | Alan | Öneri | Kanıt |", "|---:|---|---|---|"]
    md += [f"| {r['priority']} | {r['area']} | {r['action']} | {r['evidence']} |" for r in recs]
    md.append("\n_Fiyat, stok, içerik ve kampanya değişiklikleri otomatik yapılmaz; her biri açık onayınızı gerektirir._")
    return {"recommendations": recs, "markdown": "\n".join(md), "warnings": []}


def business_report(db: DB, thresholds: dict[str, Any], period: str = "last_week") -> dict[str, Any]:
    s, e, label = period_bounds(period)
    ps, pe = previous_period(s, e, period)
    cur, prev = sales_totals(db, to_ms(s), to_ms(e)), sales_totals(db, to_ms(ps), to_ms(pe))
    st, stp = settlement_totals(db, to_ms(s), to_ms(e)), settlement_totals(db, to_ms(ps), to_ms(pe))
    claims_n = db.one("SELECT COUNT(*) n FROM claims WHERE claim_date BETWEEN ? AND ?", (to_ms(s), to_ms(e)))["n"]
    claims_p = db.one("SELECT COUNT(*) n FROM claims WHERE claim_date BETWEEN ? AND ?", (to_ms(ps), to_ms(pe)))["n"]
    days = max(1, (e - s).days + 1)
    top = sales.product_performance(db, period, "product", "best", 10, include_zero_sales=False)
    worst = sales.product_performance(db, period, "product", "worst", 10, include_zero_sales=True)
    risks = stock.stock_risks(db, 30, thresholds)
    comp = competitors.analyze(db, float(thresholds.get("competitor_price_drop_pct", 5)))
    camp = campaigns.opportunities(db, thresholds)
    seo_r = seo.analyze_catalog(db, limit=5)
    recs = recommendations(db, thresholds, 8)
    def ch(a, b):
        c = pct(a or 0, b or 0)
        return "—" if c is None else f"{'+' if c > 0 else ''}{c}%"
    md = [f"# Boz Concept Home — İş Raporu: {label}", f"_{s.strftime('%d.%m.%Y')} – {e.strftime('%d.%m.%Y')} · oluşturma: {now().strftime('%d.%m.%Y %H:%M')} (Europe/Istanbul) · para birimi TRY_", "",
          "## 1. Satış özeti", "| Metrik | Bu dönem | Önceki dönem | Değişim |", "|---|---:|---:|---:|",
          f"| Brüt satış (indirim öncesi) | {tl(cur['gross'])} | {tl(prev['gross'])} | {ch(cur['gross'], prev['gross'])} |",
          f"| Net satış (indirim sonrası) | {tl(cur['net'])} | {tl(prev['net'])} | {ch(cur['net'], prev['net'])} |",
          f"| Sipariş adedi | {cur['orders']} | {prev['orders']} | {ch(cur['orders'], prev['orders'])} |",
          f"| Satış adedi | {cur['units']} | {prev['units']} | {ch(cur['units'], prev['units'])} |",
          f"| Ortalama sepet | {tl(cur['avg_order_value'])} | {tl(prev['avg_order_value'])} | |",
          f"| İptal edilen sipariş | {cur['cancelled_orders']} | {prev['cancelled_orders']} | |",
          f"| İade talebi | {claims_n} | {claims_p} | {ch(claims_n, claims_p)} |",
          f"| Satıcı indirimi | {tl(cur['seller_discount'])} | {tl(prev['seller_discount'])} | |",
          f"| Trendyol indirimi | {tl(cur['ty_discount'])} | {tl(prev['ty_discount'])} | |",
          f"| Komisyon (cari hesap, satış) | {tl(st.get('sale_commission'))} | {tl(stp.get('sale_commission'))} | |",
          f"| Komisyon (tahmini, sipariş) | {tl(cur['est_commission'])} | {tl(prev['est_commission'])} | |",
          f"| Cari hesaba işlenen satış | {tl(st.get('sale_amount'))} | {tl(stp.get('sale_amount'))} | {ch(st.get('sale_amount'), stp.get('sale_amount'))} |",
          f"| Cari hesaba işlenen iade | {tl(st.get('return_amount'))} | {tl(stp.get('return_amount'))} | |",
          f"\nGünlük ortalama net satış: {tl(cur['net'] / days)}", "",
          "## 2. Ürün performansı", top["markdown"], "", worst["markdown"], "",
          "## 3. Stok riskleri", risks["markdown"], "",
          "## 4. Rakip ve buybox", comp["markdown"], "",
          "## 5. Kampanya fırsatları", camp["markdown"], "",
          "## 6. SEO önerileri", seo_r["markdown"], "",
          "## 7. Satış artırma önerileri", recs["markdown"], "",
          "## Veri notları", "- " + sales.ORDER_FIELDS_NOTE,
          "- Ziyaretçi, dönüşüm, favori ve kampanya listeleri Trendyol satıcı API'sinde yoktur; raporda yer almaz (içe aktarma ile eklenebilir).",
          "- Kârlılık/net kâr bu sürümün kapsamı dışındadır."]
    warns = sorted(set(top["warnings"] + comp["warnings"]))
    return {"period": label, "start": s.isoformat(), "end": e.isoformat(), "sales": cur, "previous_sales": prev,
            "settlements": st, "claims": claims_n, "markdown": "\n".join(md), "warnings": warns}

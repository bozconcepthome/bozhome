"""BOZ Competitor Intelligence — izinli kaynaklar: Trendyol Buybox API (resmi) + kullanıcı/ChatGPT
Seller Center eklentisinden aktarılan gözlemler. Trendyol sitesi KAZINMAZ (scraping yapılmaz)."""
from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlparse

from ..db import DB
from ..safety import clean, untrusted
from ..timeutil import iso, now_ms
from .common import pct, tl

ALLOWED_SOURCES = {"manual", "seller_center_plugin", "trendyol_buybox_api", "customer_report", "other_permitted"}


def add_competitor(db: DB, url: str, product_title: str | None = None, seller_name: str | None = None,
                   my_barcode: str | None = None, category: str | None = None, attributes: dict | None = None,
                   notes: str | None = None) -> dict[str, Any]:
    u = urlparse(url.strip())
    if u.scheme not in ("http", "https") or not u.netloc:
        raise ValueError("Geçerli bir ürün URL'si gerekli.")
    clean_url = f"{u.scheme}://{u.netloc}{u.path}"
    db.x("""INSERT INTO competitors(url,seller_name,product_title,my_barcode,category,attributes_json,notes,created_at)
            VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
            seller_name=COALESCE(excluded.seller_name,competitors.seller_name),
            product_title=COALESCE(excluded.product_title,competitors.product_title),
            my_barcode=COALESCE(excluded.my_barcode,competitors.my_barcode),
            category=COALESCE(excluded.category,competitors.category),
            attributes_json=COALESCE(excluded.attributes_json,competitors.attributes_json),
            notes=COALESCE(excluded.notes,competitors.notes)""",
         (clean_url, clean(seller_name, 120) or None, clean(product_title, 300) or None, my_barcode, clean(category, 120) or None,
          json.dumps(attributes, ensure_ascii=False) if attributes else None, clean(notes, 500) or None, now_ms()))
    r = db.one("SELECT id FROM competitors WHERE url=?", (clean_url,))
    return {"competitor_id": r["id"], "url": clean_url}


def observe(db: DB, competitor_id: int, price: float | None, rating: float | None = None, review_count: int | None = None,
            campaign_text: str | None = None, source: str = "manual", observed_at_ms: int | None = None) -> dict[str, Any]:
    if source not in ALLOWED_SOURCES:
        raise ValueError(f"Kaynak izinli listede değil: {sorted(ALLOWED_SOURCES)}")
    if db.one("SELECT 1 FROM competitors WHERE id=?", (competitor_id,)) is None:
        raise ValueError("Rakip bulunamadı.")
    if price is not None and not (0 < price < 10_000_000):
        raise ValueError("Fiyat geçersiz.")
    if rating is not None and not (0 <= rating <= 5):
        raise ValueError("Puan 0–5 olmalı.")
    ts = observed_at_ms or now_ms()
    last = db.one("SELECT price,rating,review_count FROM competitor_observations WHERE competitor_id=? ORDER BY observed_at DESC LIMIT 1",
                  (competitor_id,))
    if last and (last["price"], last["rating"], last["review_count"]) == (price, rating, review_count) and not campaign_text:
        return {"stored": False, "reason": "Son gözlemle aynı (mükerrer kayıt önlendi)."}
    db.x("INSERT OR IGNORE INTO competitor_observations VALUES(?,?,?,?,?,?,?)",
         (competitor_id, ts, price, rating, review_count, clean(campaign_text, 200) or None, source))
    return {"stored": True, "observed_at": iso(ts)}


def competitor_table(db: DB) -> list[dict[str, Any]]:
    out = []
    for c in db.q("SELECT * FROM competitors ORDER BY id"):
        obs = db.q("SELECT * FROM competitor_observations WHERE competitor_id=? ORDER BY observed_at DESC LIMIT 30", (c["id"],))
        last = obs[0] if obs else None
        prev = next((o for o in obs[1:] if o["price"] is not None), None)
        mine = db.one("SELECT title, sale_price FROM products WHERE barcode=?", (c["my_barcode"],)) if c["my_barcode"] else None
        out.append({
            "competitor_id": c["id"], "url": c["url"], "seller": c["seller_name"],
            "title": untrusted(c["product_title"], "rakip", 300) if c["product_title"] else None,
            "my_barcode": c["my_barcode"], "my_title": mine["title"] if mine else None, "my_price": mine["sale_price"] if mine else None,
            "price": last["price"] if last else None, "rating": last["rating"] if last else None,
            "review_count": last["review_count"] if last else None, "campaign": last["campaign_text"] if last else None,
            "observed_at": iso(last["observed_at"]) if last else None, "source": last["source"] if last else None,
            "price_change_pct": pct(last["price"], prev["price"]) if last and prev and last["price"] and prev["price"] else None,
            "price_gap_vs_mine_pct": pct(last["price"], mine["sale_price"]) if last and mine and last["price"] and mine["sale_price"] else None,
            "observations": len(obs)})
    return out


def price_drops(db: DB, threshold_pct: float = 5.0) -> list[dict[str, Any]]:
    return [c for c in competitor_table(db) if c["price_change_pct"] is not None and c["price_change_pct"] <= -threshold_pct]


def buybox_status(db: DB) -> list[dict[str, Any]]:
    rows = db.q("""SELECT b.*, p.title, p.sale_price FROM buybox_history b JOIN products p ON p.barcode=b.barcode
                   WHERE b.ts = (SELECT MAX(ts) FROM buybox_history WHERE barcode=b.barcode)""")
    return [{"barcode": r["barcode"], "title": r["title"], "my_price": r["sale_price"], "buybox_order": r["buybox_order"],
             "buybox_price": r["buybox_price"], "has_multiple_seller": bool(r["has_multiple_seller"]),
             "as_of": iso(r["ts"])} for r in rows]


def analyze(db: DB, threshold_pct: float = 5.0) -> dict[str, Any]:
    comps = competitor_table(db)
    bb = buybox_status(db)
    multi = [b for b in bb if b["has_multiple_seller"]]
    lost = [b for b in bb if b["buybox_order"] and b["buybox_order"] > 1]
    md = ["### Rakip analizi", "**Resmi kaynak — Buybox servisi (kendi barkodlarınız):**",
          f"- Kontrol edilen ürün: {len(bb)} · Aynı üründe birden çok satıcı: {len(multi)} · Buybox'ı kaybettiğiniz: {len(lost)}"]
    for b in lost[:15]:
        md.append(f"  - {(b['title'] or b['barcode'])[:60]} — sıranız {b['buybox_order']}, buybox fiyatı {tl(b['buybox_price'])} (sizin {tl(b['my_price'])})")
    md += ["", f"**Kayıtlı rakip ürünler ({len(comps)}):**"]
    strengths, weaknesses = [], []
    for c in comps:
        g = c["price_gap_vs_mine_pct"]
        line = f"- {c['seller'] or '?'} — {(c['title'] or {}).get('untrusted_text', '')[:60]} · fiyat {tl(c['price'])}"
        if g is not None:
            line += f" (sizden %{g:+.1f})"
        if c["rating"] is not None:
            line += f" · puan {c['rating']} ({c['review_count'] or 0} değerlendirme)"
        if c["price_change_pct"]:
            line += f" · son değişim %{c['price_change_pct']:+.1f}"
        md.append(line)
        if g is not None:
            (weaknesses if g < -5 else strengths if g > 5 else []).append(
                f"{c['my_title'] or c['my_barcode']}: rakip {'daha ucuz' if g < -5 else 'daha pahalı'} (%{g:+.1f})")
    if not comps:
        md.append("Henüz rakip kaydı yok. Rakip ürün linklerini ve gözlenen fiyatları `track_competitor_prices` ile ekleyin "
                  "(ör. ChatGPT Seller Center eklentisinden aldığınız verilerle). Otomatik site taraması yapılmaz.")
    drops = [c for c in comps if c["price_change_pct"] is not None and c["price_change_pct"] <= -threshold_pct]
    if drops:
        md += ["", f"**⚠️ Fiyat düşüren rakipler (≥%{threshold_pct}):**"] + [f"- {c['seller']}: %{c['price_change_pct']}" for c in drops]
    return {"buybox": bb, "buybox_lost": lost, "multi_seller": multi, "competitors": comps, "price_drops": drops,
            "relative_strengths": strengths, "relative_weaknesses": weaknesses, "markdown": "\n".join(md),
            "warnings": ["Rakip satış adetleri hiçbir resmi kaynakta yok; tahmin üretilmez."]}


def compare(db: DB, my_barcode: str, competitor_ids: list[int]) -> dict[str, Any]:
    p = db.one("SELECT * FROM products WHERE barcode=? OR product_main_id=?", (my_barcode, my_barcode))
    if p is None:
        return {"found": False}
    mine = {a["attributeName"]: a["attributeValue"] for a in json.loads(p["attributes_json"] or "[]") if a.get("attributeValue")}
    cols = []
    for cid in competitor_ids:
        c = db.one("SELECT * FROM competitors WHERE id=?", (cid,))
        if c is None:
            continue
        last = db.one("SELECT * FROM competitor_observations WHERE competitor_id=? ORDER BY observed_at DESC LIMIT 1", (cid,))
        cols.append({"id": cid, "seller": c["seller_name"], "title": c["product_title"],
                     "attributes": json.loads(c["attributes_json"] or "{}"),
                     "price": last["price"] if last else None, "rating": last["rating"] if last else None,
                     "reviews": last["review_count"] if last else None})
    keys = sorted(set(mine) | {k for c in cols for k in c["attributes"]})
    md = ["### Ürün karşılaştırma", "| Özellik | Sizin ürün | " + " | ".join(f"Rakip {c['id']} ({c['seller'] or '?'})" for c in cols) + " |",
          "|---|---|" + "---|" * len(cols),
          f"| Fiyat | {tl(p['sale_price'])} | " + " | ".join(tl(c["price"]) for c in cols) + " |",
          "| Puan | — (API'de yok) | " + " | ".join(f"{c['rating'] or '—'} ({c['reviews'] or 0})" for c in cols) + " |",
          f"| Görsel sayısı | {p['image_count']} | " + " | ".join("—" for _ in cols) + " |"]
    for k in keys:
        md.append(f"| {k} | {mine.get(k, '—')} | " + " | ".join(str(c["attributes"].get(k, "—")) for c in cols) + " |")
    gaps = [k for k in keys if k not in mine]
    if gaps:
        md.append(f"\n**Rakiplerde olup sizde tanımlı olmayan özellikler:** {', '.join(gaps)}")
    return {"found": True, "my_product": {"barcode": p["barcode"], "title": p["title"], "price": p["sale_price"], "attributes": mine},
            "competitors": cols, "attribute_gaps": gaps, "markdown": "\n".join(md),
            "warnings": [] if cols else ["Karşılaştırılacak kayıtlı rakip bulunamadı."]}

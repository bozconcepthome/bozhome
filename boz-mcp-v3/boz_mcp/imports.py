"""Kullanıcı tarafından sağlanan verilerin içe aktarımı (Seller Center raporları, yorumlar, ürün bilgileri).
Bunlar YEREL veritabanına yazılır; Trendyol'da hiçbir şey değiştirmez."""
from __future__ import annotations

import csv
import hashlib
import io
import json
from typing import Any

from .db import DB
from .safety import clean
from .timeutil import now_ms

TRAFFIC_COLS = {"day": ["day", "date", "tarih", "gün"], "barcode": ["barcode", "barkod"],
                "visitors": ["visitors", "ziyaretçi", "ziyaretci", "tekil ziyaretçi"], "views": ["views", "görüntülenme", "goruntulenme"],
                "add_to_cart": ["add_to_cart", "sepete ekleme", "sepet"], "favorites": ["favorites", "favori", "favoriye ekleme"],
                "orders": ["orders", "sipariş", "siparis", "satış adedi"]}


def _col(header: list[str], names: list[str]) -> int | None:
    h = [x.strip().lower() for x in header]
    for n in names:
        if n in h:
            return h.index(n)
    return None


def _num(v: str | None) -> int | None:
    if v is None or str(v).strip() == "":
        return None
    s = str(v).strip().replace(".", "").replace(",", ".")
    try:
        return int(float(s))
    except ValueError:
        return None


def import_traffic_csv(db: DB, csv_text: str, source: str = "seller_center_export") -> dict[str, Any]:
    if len(csv_text) > 5_000_000:
        raise ValueError("CSV çok büyük (5 MB sınırı).")
    sample = csv_text[:2000]
    delim = ";" if sample.count(";") > sample.count(",") else ","
    rows = list(csv.reader(io.StringIO(csv_text), delimiter=delim))
    if len(rows) < 2:
        raise ValueError("CSV başlık + en az 1 satır içermeli.")
    head = rows[0]
    idx = {k: _col(head, v) for k, v in TRAFFIC_COLS.items()}
    if idx["day"] is None or idx["barcode"] is None:
        raise ValueError(f"Zorunlu sütunlar bulunamadı: tarih ve barkod. Kabul edilen adlar: {TRAFFIC_COLS['day']} / {TRAFFIC_COLS['barcode']}")
    ok, bad = 0, 0
    ts = now_ms()
    with db.tx() as cx:
        for r in rows[1:]:
            try:
                day = r[idx["day"]].strip()[:10]
                if "." in day:
                    d, m, y = day.split(".")
                    day = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
                bc = r[idx["barcode"]].strip()
                vals = {k: (_num(r[i]) if i is not None and i < len(r) else None) for k, i in idx.items() if k not in ("day", "barcode")}
                cx.execute("""INSERT INTO traffic_metrics VALUES (?,?,?,?,?,?,?,?,?)
                              ON CONFLICT(day,barcode) DO UPDATE SET visitors=excluded.visitors, views=excluded.views,
                              add_to_cart=excluded.add_to_cart, favorites=excluded.favorites, orders=excluded.orders,
                              source=excluded.source, imported_at=excluded.imported_at""",
                           (day, bc, vals["visitors"], vals["views"], vals["add_to_cart"], vals["favorites"], vals["orders"], source, ts))
                ok += 1
            except (IndexError, ValueError):
                bad += 1
    return {"imported_rows": ok, "skipped_rows": bad, "columns_detected": {k: (head[i] if i is not None else None) for k, i in idx.items()}}


def import_reviews(db: DB, reviews: list[dict[str, Any]], source: str = "manual") -> dict[str, Any]:
    ok = dup = 0
    ts = now_ms()
    for rv in reviews[:2000]:
        text = clean(rv.get("text"), 2000)
        rating = rv.get("rating")
        if rating is not None and not (1 <= int(rating) <= 5):
            continue
        h = hashlib.sha256(f"{rv.get('barcode')}|{text}|{rv.get('date')}".encode()).hexdigest()
        n = db.x("INSERT OR IGNORE INTO reviews VALUES (?,?,?,?,?,?,?)",
                 (h, rv.get("barcode"), int(rating) if rating is not None else None, text, rv.get("date"), source, ts))
        if n:
            ok += 1
        else:
            dup += 1
    return {"imported": ok, "duplicates_skipped": dup, "note": "Yorumcu adı/kişisel veri saklanmaz."}


def save_fact(db: DB, product_key: str, fact_key: str, fact_value: str) -> dict[str, Any]:
    db.x("""INSERT INTO product_facts VALUES (?,?,?,?,?) ON CONFLICT(product_key,fact_key) DO UPDATE SET
            fact_value=excluded.fact_value, source=excluded.source, updated_at=excluded.updated_at""",
         (product_key.strip(), clean(fact_key, 100), clean(fact_value, 1000), "user_verified", now_ms()))
    return {"saved": True, "product_key": product_key, "fact_key": fact_key}


def save_proposal(db: DB, kind: str, target: str, payload: dict[str, Any]) -> dict[str, Any]:
    pj = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    db.x("INSERT OR IGNORE INTO proposals(kind,target,payload_json,status,created_at) VALUES(?,?,?,'pending_approval',?)",
         (kind, target, pj, now_ms()))
    r = db.one("SELECT id,status FROM proposals WHERE kind=? AND target=? AND payload_json=?", (kind, target, pj))
    return {"proposal_id": r["id"], "status": r["status"]}

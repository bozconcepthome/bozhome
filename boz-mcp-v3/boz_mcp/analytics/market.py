"""BOZ Market Intelligence — kendi satış/soru/iade verilerine dayalı pazar ve ürün fırsatları.
Pazar büyüklüğü/arama hacmi verisi yoktur; kanıt türü her öneride belirtilir."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from itertools import combinations
from typing import Any

from ..db import DB
from ..safety import untrusted
from ..timeutil import now, to_ms
from .common import CANCEL_STATUSES, pct, tl
from .textmine import norm

FOCUS = ["metal mobilya", "tel mobilya", "yan sehpa", "orta sehpa", "kitaplık", "banyo düzenleyici", "çamaşır makinesi rafı",
         "tv ünitesi", "çalışma masası", "ev dekorasyon", "depolama ve düzenleme"]

# Uzman hipotezi (veri değil): metal/tel üretimine yakın komşu ürün tipleri
ADJACENT = {
    "yan sehpa": ["zigon sehpa seti", "dergilikli yan sehpa", "tepsili yan sehpa", "C tipi laptop sehpası"],
    "orta sehpa": ["iki katlı raflı orta sehpa", "yuvarlak tel orta sehpa", "zigon set"],
    "kitaplık": ["merdiven tipi kitaplık", "dar köşe kitaplık", "çocuk odası tel kitaplık"],
    "banyo düzenleyici": ["klozet üstü raf", "köşe duş rafı", "havlu askılı raf", "tezgah üstü düzenleyici"],
    "çamaşır makinesi": ["çamaşır makinesi üstü raf", "katlanır kurutmalık", "deterjan düzenleyici"],
    "tv ünitesi": ["metal ayaklı tv sehpası", "duvar tipi tv rafı", "konsol"],
    "çalışma masası": ["katlanır duvar masası", "monitör yükseltici", "masa üstü düzenleyici"],
    "dolap içi düzenleyici": ["raylı çekmece sepet", "tencere kapak düzenleyici", "lavabo altı raf"],
    "mutfak": ["baharatlık", "mikrodalga üstü raf", "tezgah üstü 2 katlı raf"],
}
CRITERIA = ["türkiye_talebi", "trendyol_talebi", "rekabet_düşüklüğü", "üretilebilirlik", "metal_tel_uygunluğu",
            "kargo_desi_uygunluğu", "ambalaj_kolaylığı", "düşük_iade_riski", "farklılaşma", "fiyat_potansiyeli"]
WEIGHTS = {"türkiye_talebi": 1.0, "trendyol_talebi": 1.5, "rekabet_düşüklüğü": 1.0, "üretilebilirlik": 1.5,
           "metal_tel_uygunluğu": 1.5, "kargo_desi_uygunluğu": 1.0, "ambalaj_kolaylığı": 0.8, "düşük_iade_riski": 1.0,
           "farklılaşma": 1.2, "fiyat_potansiyeli": 1.0}


def category_landscape(db: DB, days: int = 90) -> list[dict[str, Any]]:
    s = to_ms(now() - timedelta(days=days))
    half = to_ms(now() - timedelta(days=days // 2))
    rows = db.q(f"""SELECT p.category_name cat, COUNT(DISTINCT p.barcode) skus FROM products p WHERE p.archived=0 GROUP BY cat""")
    skus = {r["cat"]: r["skus"] for r in rows}
    sales = db.q(f"""SELECT p.category_name cat,
                     SUM(CASE WHEN o.order_date>=? THEN o.unit_net*o.quantity ELSE 0 END) recent,
                     SUM(CASE WHEN o.order_date<? THEN o.unit_net*o.quantity ELSE 0 END) older,
                     SUM(o.quantity) units, AVG(o.unit_net) avg_price
                     FROM order_lines o JOIN products p ON p.barcode=o.barcode
                     WHERE o.order_date>=? AND o.package_status NOT IN {CANCEL_STATUSES} GROUP BY cat""", (half, half, s))
    claims = {r["cat"]: r["n"] for r in db.q("""SELECT p.category_name cat, COUNT(*) n FROM claims c JOIN products p ON p.barcode=c.barcode
                                               WHERE c.claim_date>=? GROUP BY cat""", (s,))}
    out = []
    for r in sales:
        u = r["units"] or 0
        out.append({"category": r["cat"], "skus": skus.get(r["cat"], 0), "units": u, "net": round((r["recent"] or 0) + (r["older"] or 0), 2),
                    "momentum_pct": pct(r["recent"] or 0, r["older"] or 0), "avg_unit_price": round(r["avg_price"] or 0, 2),
                    "claims": claims.get(r["cat"], 0), "claim_rate_pct": round(claims.get(r["cat"], 0) / u * 100, 1) if u else None,
                    "net_per_sku": round(((r["recent"] or 0) + (r["older"] or 0)) / max(skus.get(r["cat"], 1), 1), 2)})
    out.sort(key=lambda x: x["net"], reverse=True)
    return out


def variant_requests(db: DB, days: int = 180) -> list[dict[str, Any]]:
    """Müşterilerin sorduğu ama olmayan varyantlar (renk/ölçü/set) — gerçek talep sinyali."""
    pats = {"renk": ["başka renk", "farklı renk", "beyazı", "siyahı", "gold", "altın rengi", "rengi var mı", "renk seçeneği"],
            "ölçü": ["büyüğü", "küçüğü", "daha büyük", "daha küçük", "farklı ölçü", "geniş olan", "uzun olan", "kısa olan", "ölçüsü var mı"],
            "set/adet": ["takım", "set olarak", "ikili", "2'li", "üçlü"],
            "özel üretim": ["özel ölçü", "özel üretim", "sipariş üzerine", "kişiye özel"]}
    s = to_ms(now() - timedelta(days=days))
    agg: dict[tuple[str, str], list[str]] = defaultdict(list)
    for q in db.q("SELECT product_name, text FROM questions WHERE creation_date>=?", (s,)):
        t = norm(q["text"])
        for k, ps in pats.items():
            if any(p in t for p in ps):
                agg[(q["product_name"] or "?", k)].append(q["text"])
    out = [{"product": p, "request_type": k, "count": len(v), "examples": [untrusted(x, max_len=200) for x in v[:2]]}
           for (p, k), v in agg.items()]
    out.sort(key=lambda x: x["count"], reverse=True)
    return out


def co_purchases(db: DB, days: int = 60, min_count: int = 2) -> list[dict[str, Any]]:
    s = to_ms(now() - timedelta(days=days))
    orders: dict[str, set[str]] = defaultdict(set)
    names: dict[str, str] = {}
    for r in db.q(f"SELECT order_number, barcode, product_name FROM order_lines WHERE order_date>=? AND package_status NOT IN {CANCEL_STATUSES}", (s,)):
        orders[r["order_number"]].add(r["barcode"])
        names[r["barcode"]] = r["product_name"]
    pairs: Counter[tuple[str, str]] = Counter()
    for items in orders.values():
        for a, b in combinations(sorted(items), 2):
            pairs[(a, b)] += 1
    return [{"products": [names.get(a), names.get(b)], "barcodes": [a, b], "orders_together": n}
            for (a, b), n in pairs.most_common(20) if n >= min_count]


def market_opportunities(db: DB, days: int = 90) -> dict[str, Any]:
    land = category_landscape(db, days)
    var = variant_requests(db)
    co = co_purchases(db)
    md = [f"### Pazar fırsatları — kendi mağaza verisi (son {days} gün)",
          "> Pazar büyüklüğü ve Trendyol arama hacmi verisi erişilebilir değil. Aşağıdakiler mağazanızın gerçek satış, iade ve soru verisine dayanır.",
          "", "| Kategori | SKU | Adet | Net satış | Momentum | SKU başı satış | İade oranı |", "|---|---:|---:|---:|---:|---:|---:|"]
    for c in land[:15]:
        md.append(f"| {c['category']} | {c['skus']} | {c['units']} | {tl(c['net'])} | {'' if c['momentum_pct'] is None else str(c['momentum_pct']) + '%'} | "
                  f"{tl(c['net_per_sku'])} | {'' if c['claim_rate_pct'] is None else '%' + str(c['claim_rate_pct'])} |")
    strong = [c for c in land if (c["momentum_pct"] or 0) > 0 and (c["claim_rate_pct"] or 0) < 10][:5]
    if strong:
        md += ["", "**Büyüyen ve iadesi düşük kategoriler (genişletme adayı):** " + ", ".join(c["category"] for c in strong)]
    if var:
        md += ["", "**Müşterilerin istediği ama olmayan varyantlar (soru verisi):**"]
        md += [f"- {v['product'][:60]} — {v['request_type']} talebi {v['count']}×" for v in var[:10]]
    if co:
        md += ["", "**Birlikte satın alınan ürünler (set/paket fırsatı):**"]
        md += [f"- {' + '.join((n or '?')[:35] for n in c['products'])} — {c['orders_together']} sipariş" for c in co[:8]]
    return {"categories": land, "strong_categories": strong, "variant_requests": var[:30], "co_purchases": co,
            "markdown": "\n".join(md), "warnings": [], "evidence": "own_store_data"}


def score_idea(idea: dict[str, Any]) -> dict[str, Any]:
    scores = {k: idea.get(k) for k in CRITERIA}
    given = {k: float(v) for k, v in scores.items() if isinstance(v, (int, float)) and 1 <= float(v) <= 5}
    missing = [k for k in CRITERIA if k not in given]
    if not given:
        return {"name": idea.get("name"), "score": None, "missing_criteria": missing}
    w = sum(WEIGHTS[k] for k in given)
    s = sum(given[k] * WEIGHTS[k] for k in given) / w
    return {"name": idea.get("name"), "score": round(s / 5 * 100, 1), "criteria": given, "missing_criteria": missing,
            "confidence": "düşük" if len(missing) > 4 else ("orta" if missing else "yüksek")}


def discover_products(db: DB, ideas: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    land = category_landscape(db, 90)
    var = variant_requests(db)
    co = co_purchases(db)
    cands: list[dict[str, Any]] = []
    for v in var[:8]:
        cands.append({"name": f"{v['product'].split(',')[0][:50]} — yeni {v['request_type']} seçeneği",
                      "evidence": f"{v['count']} müşteri sorusu", "evidence_type": "gerçek veri (müşteri soruları)"})
    for c in co[:5]:
        cands.append({"name": "Set: " + " + ".join((n or "?").split(",")[0][:30] for n in c["products"]),
                      "evidence": f"{c['orders_together']} siparişte birlikte alındı", "evidence_type": "gerçek veri (siparişler)"})
    for c in land[:6]:
        key = norm(c["category"] or "")
        for k, adj in ADJACENT.items():
            if k in key:
                for a in adj:
                    cands.append({"name": a, "evidence": f"'{c['category']}' kategorisinde güçlü satış ({tl(c['net'])}, 90 gün)",
                                  "evidence_type": "uzman hipotezi + kategori satışı (talep doğrulanmalı)"})
    scored = [score_idea(i) | {"input": i} for i in (ideas or [])]
    scored.sort(key=lambda x: x["score"] or 0, reverse=True)
    md = ["### Yeni ürün fırsatları", "Önerilen adaylar özgün tasarım için başlangıç noktasıdır; rakip tasarımlarının kopyası önerilmez.", ""]
    md += [f"- **{c['name']}** — {c['evidence']} _({c['evidence_type']})_" for c in cands[:25]]
    md += ["", "**Değerlendirme kriterleri (1–5 puan verin, `ideas` parametresiyle):** " + ", ".join(CRITERIA),
           "Kargo/desi: düz paket (flat-pack) ve demonte tasarım desiyi düşürür; tel ürünlerde köşe koruma iade riskini azaltır."]
    if scored:
        md += ["", "| Fikir | Skor | Güven | Eksik kriter |", "|---|---:|---|---|"]
        md += [f"| {s['name']} | {s['score']} | {s.get('confidence', '—')} | {len(s['missing_criteria'])} |" for s in scored]
    return {"candidates": cands[:40], "scored_ideas": scored, "criteria": CRITERIA, "weights": WEIGHTS,
            "markdown": "\n".join(md), "warnings": ["Uzman hipotezi etiketli öneriler gerçek talep verisi değildir; Seller Center arama/kategori raporlarıyla doğrulanmalı."]}

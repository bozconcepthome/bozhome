"""BOZ SEO Intelligence — Trendyol ürün içeriği analizi ve öneri (onaysız değişiklik YOK).
Arama hacmi verisi yoktur ve uydurulmaz; anahtar kelimeler kaynak frekansıyla sıralanır."""
from __future__ import annotations

import json
import re
from collections import Counter
from typing import Any

from ..db import DB
from ..safety import strip_html
from .textmine import STOPWORDS, norm, ngrams, tokens

TITLE_MAX = 100  # Trendyol ürün başlığı üst sınırı
BRAND = "Boz Concept Home"
KEY_ATTRS = {
    "renk": ["Renk"],
    "malzeme": ["Materyal", "Malzeme", "Ana Malzeme"],
    "ölçü": ["Boyut/Ebat", "Ölçü", "Genişlik", "Yükseklik", "Derinlik", "Boy", "En"],
    "taşıma kapasitesi": ["Taşıma Kapasitesi", "Max. Taşıma Kapasitesi", "Maksimum Taşıma Kapasitesi"],
    "montaj": ["Montaj Durumu", "Kurulum", "Montaj"],
    "parça/kat": ["Parça Sayısı", "Raf Sayısı", "Kat Sayısı", "Adet"],
}
ROOMS = ["salon", "oturma odası", "yatak odası", "banyo", "mutfak", "çalışma odası", "ofis", "balkon", "antre", "çocuk odası", "genç odası"]
INTENT_MODIFIERS = ["modern", "dekoratif", "metal", "tel", "siyah", "beyaz", "gold", "gümüş", "raflı", "katlı", "ayaklı",
                    "minimalist", "lüks", "şık", "küçük", "geniş", "katlanır", "tekerlekli", "yapışkanlı", "delmeden"]


def _attrs(p) -> dict[str, str]:
    out: dict[str, str] = {}
    for a in json.loads(p["attributes_json"] or "[]"):
        n, v = a.get("attributeName"), a.get("attributeValue")
        if n and v and n not in out:
            out[n] = str(v)
    return out


def _find_attr(attrs: dict[str, str], names: list[str]) -> str | None:
    for n in names:
        for k, v in attrs.items():
            if k.lower() == n.lower():
                return v
    return None


def analyze_product(p) -> dict[str, Any]:
    title = p["title"] or ""
    attrs = _attrs(p)
    desc = strip_html(p["description_html"])
    issues: list[dict[str, str]] = []
    score = 100
    def add(sev: str, msg: str, pts: int, code: str = "diğer") -> None:
        nonlocal score
        issues.append({"severity": sev, "issue": msg, "code": code})
        score -= pts
    L = len(title)
    if L > TITLE_MAX:
        add("yüksek", f"Başlık {L} karakter (sınır {TITLE_MAX}).", 15, "başlık çok uzun")
    elif L < 35:
        add("orta", f"Başlık kısa ({L} karakter); ürün tipi + malzeme + renk + öne çıkan özellik eklenebilir.", 10, "başlık kısa")
    tk = tokens(title, stop=True)
    rep = [w for w, n in Counter(tk).items() if n >= 2 and len(w) > 2]
    if rep:
        add("orta", f"Tekrarlanan kelimeler (anahtar kelime doldurma algısı): {', '.join(rep)}.", 8, "başlıkta tekrarlanan kelime")
    codes = [w for w in re.findall(r"\b[A-ZÇĞİÖŞÜ0-9]{9,}\b", title) if not w.isdigit()]
    if codes:
        add("orta", f"Başlıkta stok/model kodu gibi görünen ifade: {', '.join(codes)} — müşteri için anlamsız olabilir.", 6, "başlıkta stok/model kodu")
    if title.isupper() and L > 10:
        add("düşük", "Başlık tamamen büyük harf.", 4, "büyük harf başlık")
    cat = (p["category_name"] or "").strip()
    cat_tokens = [t for t in tokens(cat) if t not in STOPWORDS]
    if cat_tokens and not any(ct[:5] in norm(title) for ct in cat_tokens):
        add("yüksek", f"Kategori ürün tipi ('{cat}') başlıkta geçmiyor.", 12, "kategori ürün tipi başlıkta yok")
    color = _find_attr(attrs, KEY_ATTRS["renk"])
    if color and norm(color) not in norm(title):
        add("düşük", f"Renk özniteliği ('{color}') başlıkta yok.", 3, "renk başlıkta yok")
    missing = [k for k, names in KEY_ATTRS.items() if not _find_attr(attrs, names)]
    for m in missing:
        add("orta" if m in ("ölçü", "malzeme") else "düşük", f"'{m}' özniteliği/ bilgisi tanımlı değil.", 5 if m in ("ölçü", "malzeme") else 3, f"eksik öznitelik: {m}")
    dlen = len(desc)
    if dlen < 200:
        add("yüksek", f"Açıklama çok kısa ({dlen} karakter metin).", 12, "açıklama çok kısa")
    elif dlen < 500:
        add("orta", f"Açıklama kısa ({dlen} karakter); kullanım, ölçü, bakım ve kutu içeriği eklenebilir.", 6, "açıklama kısa")
    nd = norm(desc)
    if not re.search(r"\d+\s*(cm|mm|x)", nd):
        add("orta", "Açıklamada sayısal ölçü (cm) bulunamadı.", 5, "açıklamada ölçü yok")
    if not any(w in nd for w in ("montaj", "kurulum", "demonte", "kurulu")):
        add("düşük", "Açıklamada montaj/kurulum bilgisi yok.", 3, "açıklamada montaj bilgisi yok")
    if not any(w in nd for w in ("temizl", "bakım")):
        add("düşük", "Açıklamada bakım/temizlik bilgisi yok.", 2, "açıklamada bakım bilgisi yok")
    ic = p["image_count"] or 0
    if ic < 4:
        add("yüksek" if ic < 2 else "orta", f"Görsel sayısı az ({ic}); ölçülü, ortam ve detay görselleri önerilir (ideal 6–8).", 10 if ic < 2 else 6, "az görsel")
    if "paslanmaz" in norm(title) and not any("paslanmaz" in norm(v) for v in attrs.values()):
        issues.append({"severity": "kontrol", "issue": "Başlıkta 'paslanmaz' iddiası var ancak özniteliklerde doğrulanmıyor — gerçekten paslanmaz çelik mi kontrol edin.", "code": "doğrulanmamış 'paslanmaz' iddiası"})
    return {"barcode": p["barcode"], "product_main_id": p["product_main_id"], "title": title, "title_length": L,
            "category": cat, "image_count": ic, "description_chars": dlen, "attributes_count": len(attrs),
            "missing_key_attributes": missing, "seo_score": max(0, score), "issues": issues}


def analyze_catalog(db: DB, barcode: str | None = None, limit: int = 20) -> dict[str, Any]:
    if barcode:
        rows = db.q("SELECT * FROM products WHERE barcode=? OR product_main_id=? OR stock_code=?", (barcode,) * 3)
    else:
        rows = db.q("""SELECT * FROM products WHERE archived=0 AND barcode IN
                       (SELECT MIN(barcode) FROM products WHERE archived=0 GROUP BY COALESCE(product_main_id, barcode))""")
    res = [analyze_product(p) for p in rows]
    res.sort(key=lambda r: r["seo_score"])
    avg = round(sum(r["seo_score"] for r in res) / len(res), 1) if res else None
    common = Counter(i.get("code", "diğer") for r in res for i in r["issues"])
    md = [f"### Trendyol SEO analizi — {len(res)} ürün (ana ürün bazında)", f"Ortalama içerik skoru: **{avg}/100**", "",
          "**En sık sorunlar (ürün sayısı):** " + "; ".join(f"{k} ({v})" for k, v in common.most_common(8)), "",
          "| Skor | Ürün | Başlık uz. | Görsel | Açıklama | Öne çıkan sorun |", "|---:|---|---:|---:|---:|---|"]
    for r in res[:limit]:
        top = next((i["issue"] for i in r["issues"] if i["severity"] == "yüksek"), r["issues"][0]["issue"] if r["issues"] else "—")
        md.append(f"| {r['seo_score']} | {r['title'][:50]} | {r['title_length']} | {r['image_count']} | {r['description_chars']} | {top[:70]} |")
    md.append("\n_Skor bu sistemin kural tabanlı içerik kalitesi ölçüsüdür; Trendyol'un sıralama algoritması değildir._")
    return {"average_score": avg, "products": res[:limit] if not barcode else res, "common_issues": common.most_common(),
            "markdown": "\n".join(md), "warnings": []}


def research_keywords(db: DB, seed: str | None = None, category: str | None = None, limit: int = 40) -> dict[str, Any]:
    q = "SELECT title, category_name, description_html FROM products WHERE archived=0"
    rows = db.q(q)
    if category:
        rows = [r for r in rows if norm(category) in norm(r["category_name"])]
    own_titles = [r["title"] or "" for r in rows]
    comp = [r["product_title"] for r in db.q("SELECT product_title FROM competitors WHERE product_title IS NOT NULL")]
    qtexts = [r["text"] for r in db.q("SELECT text FROM questions WHERE text IS NOT NULL")]
    if seed:
        s = norm(seed)
        own_titles = [t for t in own_titles if any(w in norm(t) for w in s.split())] or own_titles
        comp = [t for t in comp if any(w in norm(t) for w in s.split())] or comp
    cats = Counter(r["category_name"] for r in rows if r["category_name"])
    cands: Counter[str] = Counter()
    src: dict[str, set[str]] = {}
    for label, texts, w in (("kendi başlıklar", own_titles, 1), ("rakip başlıklar", comp, 2), ("müşteri soruları", qtexts, 1)):
        for n in (2, 3):
            for g, c in ngrams(texts, n, 300):
                if any(t.isdigit() for t in g.split()):
                    continue
                cands[g] += c * w
                src.setdefault(g, set()).add(label)
    long_tail = []
    for cat in cats:
        ct = norm(cat)
        for mod in INTENT_MODIFIERS:
            phrase = f"{mod} {ct}"
            if any(mod in norm(t) for t in own_titles + comp):
                long_tail.append(phrase)
        for room in ROOMS:
            if any(room in norm(t) for t in own_titles + comp + qtexts):
                long_tail.append(f"{room} için {ct}")
    kw = [{"keyword": k, "source_frequency": v, "sources": sorted(src.get(k, []))} for k, v in cands.most_common(limit)]
    md = [f"### Anahtar kelime araştırması{' — ' + seed if seed else ''}",
          "> ⚠️ Trendyol arama hacmi verisi API'de yok. Sıralama yalnızca kendi başlıklarınız, kayıtlı rakip başlıkları ve müşteri sorularındaki **geçiş sıklığına** göredir.",
          "", "| Anahtar kelime | Sıklık | Kaynak |", "|---|---:|---|"]
    md += [f"| {k['keyword']} | {k['source_frequency']} | {', '.join(k['sources'])} |" for k in kw]
    md += ["", "**Uzun kuyruklu öneriler (satın alma niyeti yüksek kalıplar):**"] + [f"- {x}" for x in sorted(set(long_tail))[:25]]
    warn = [] if comp else ["Kayıtlı rakip ürün yok; rakip başlık karşılaştırması için `track_competitor_prices` ile rakip ekleyin."]
    return {"keywords": kw, "long_tail": sorted(set(long_tail))[:40], "categories": cats.most_common(), "has_search_volume": False,
            "markdown": "\n".join(md), "warnings": warn}


def _clean_model_name(title: str, category: str) -> str:
    first = title.split(",")[0]
    words = first.split()
    cat_t = set(tokens(category))
    model = []
    for w in words:
        if norm(w) in cat_t or norm(w) in ("metal", "tel", "modern", "dekoratif"):
            break
        model.append(w)
    return " ".join(model[:2])


def propose_title(db: DB, barcode: str) -> dict[str, Any]:
    p = db.one("SELECT * FROM products WHERE barcode=? OR product_main_id=? OR stock_code=?", (barcode,) * 3)
    if p is None:
        return {"found": False}
    a = _attrs(p)
    title, cat = p["title"] or "", p["category_name"] or ""
    model = _clean_model_name(title, cat)
    color = _find_attr(a, KEY_ATTRS["renk"])
    material = _find_attr(a, KEY_ATTRS["malzeme"])
    size = _find_attr(a, KEY_ATTRS["ölçü"])
    parts = _find_attr(a, KEY_ATTRS["parça/kat"])
    style = a.get("Stil")
    nt = norm(title)
    feats = [m for m in INTENT_MODIFIERS if m in nt and m not in norm(" ".join(filter(None, [color, material, style])))][:3]
    rooms = [r for r in ROOMS if r in nt][:1]
    seg = [model, style if style and norm(style) in nt else None, " ".join(w.capitalize() for w in feats) or None,
           material if material and norm(material) not in norm(" ".join(feats)) else None, cat,
           color, f"{parts} Parça" if parts and parts not in ("1",) and "parça" in nt else None,
           f"{rooms[0].title()} İçin" if rooms else None]
    out, seen = [], set()
    for s in seg:
        if not s:
            continue
        k = norm(s)
        if k in seen:
            continue
        seen.add(k)
        out.append(s.strip())
    # Mevcut başlıktaki (satıcının yazdığı) anlamlı ek kelimeleri ve ölçüyü koru: ör. "Dergilik", "Plaklık", "50x30x60 cm"
    used = set(tokens(" ".join(out), stop=False))
    dims = re.findall(r"\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?(?:\s*[xX×]\s*\d+(?:[.,]\d+)?)?\s*(?:cm)?", title)
    extra = []
    for w in re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü]+", title):
        nw = norm(w)
        if len(nw) < 4 or nw in STOPWORDS or nw in used or (w.isupper() and len(w) > 8) or any(u.startswith(nw) for u in used):
            continue
        if any(nw in norm(d) for d in dims):
            continue
        used.add(nw)
        extra.append(w if not w.isupper() else w.capitalize())
    tail = extra[:4] + ([dims[0].replace(" ", "").replace("X", "x") + ("" if "cm" in dims[0] else " cm")] if dims else [])
    proposal = re.sub(r"\s+", " ", " ".join(out + tail)).strip()
    while len(proposal) > TITLE_MAX and tail:
        tail.pop(0 if len(tail) > 1 else -1)
        proposal = re.sub(r"\s+", " ", " ".join(out + tail)).strip()
    while len(proposal) > TITLE_MAX and len(out) > 2:
        out.pop()
        proposal = " ".join(out + tail)
    unverified = []
    if not material:
        unverified.append("malzeme özniteliği yok — başlığa malzeme eklenmedi")
    if not size:
        unverified.append("ölçü özniteliği yok")
    if "paslanmaz" in norm(proposal) and not any("paslanmaz" in norm(v) for v in a.values()):
        unverified.append("'paslanmaz' ifadesi mevcut başlıktan korundu ancak özniteliklerde doğrulanmıyor — gerçekten paslanmaz çelik değilse çıkarın")
    return {"found": True, "barcode": p["barcode"], "current_title": title, "proposed_title": proposal,
            "length": len(proposal), "used_attributes": {"renk": color, "malzeme": material, "stil": style, "ölçü": size},
            "unverified_or_missing": unverified, "requires_approval": True,
            "note": "Öneri yalnızca mevcut başlık ve Trendyol özniteliklerinden üretildi; yeni iddia eklenmedi. Trendyol'a GÖNDERİLMEZ."}


def propose_description(db: DB, barcode: str) -> dict[str, Any]:
    p = db.one("SELECT * FROM products WHERE barcode=? OR product_main_id=? OR stock_code=?", (barcode,) * 3)
    if p is None:
        return {"found": False}
    a = _attrs(p)
    current = strip_html(p["description_html"])
    faq = db.q("""SELECT text, answer_text FROM questions WHERE answer_text IS NOT NULL AND (product_main_id=? OR product_name LIKE ?)
                  ORDER BY creation_date DESC LIMIT 30""", (p["product_main_id"], f"{(p['title'] or '')[:30]}%"))
    placeholders = []
    def val(key: str) -> str:
        v = _find_attr(a, KEY_ATTRS[key])
        if v:
            return v
        placeholders.append(key)
        return f"[{key.upper()} — DOĞRULANMASI GEREKİYOR]"
    feats = "\n".join(f"<li><strong>{k}:</strong> {v}</li>" for k, v in a.items() if k not in ("Menşei",))
    lines = [f"<h2>{p['title']}</h2>",
             f"<p>{current[:600] if current else '[ÜRÜN TANITIM METNİ — SATICI TARAFINDAN YAZILMALI]'}</p>",
             "<h3>Ürün Özellikleri</h3>", f"<ul>{feats}</ul>",
             "<h3>Ölçüler ve Kapasite</h3>",
             f"<ul><li>Ölçü: {val('ölçü')}</li><li>Taşıma kapasitesi: {val('taşıma kapasitesi')}</li></ul>",
             "<h3>Malzeme ve Bakım</h3>", f"<ul><li>Malzeme: {val('malzeme')}</li><li>Bakım: [BAKIM TALİMATI — DOĞRULANMASI GEREKİYOR]</li></ul>",
             "<h3>Kutu İçeriği ve Montaj</h3>", f"<ul><li>Montaj: {val('montaj')}</li><li>Kutu içeriği: [DOĞRULANMASI GEREKİYOR]</li></ul>"]
    seen_q = []
    for r in faq:
        if len(seen_q) >= 4:
            break
        if r["answer_text"] and len(r["answer_text"]) > 20 and not any(norm(r["text"])[:40] == s for s in seen_q):
            seen_q.append(norm(r["text"])[:40])
    if seen_q:
        lines.append("<h3>Sık Sorulanlar</h3>")
        lines.append("<p>[Müşterilerin sık sorduğu konular: " + "; ".join(seen_q) + " — yanıtları doğrulanmış bilgiyle ekleyin]</p>")
    return {"found": True, "barcode": p["barcode"], "current_description_text": current[:2000], "proposed_html": "\n".join(lines),
            "placeholders_to_verify": placeholders + ["bakım talimatı", "kutu içeriği"], "requires_approval": True,
            "note": "Köşeli parantezli alanlar doğrulanmamış bilgidir; doldurulmadan yayınlanmamalı. Trendyol'a GÖNDERİLMEZ."}

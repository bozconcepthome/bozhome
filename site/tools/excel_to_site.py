#!/usr/bin/env python3
"""Trendyol ürün Excel'ini site kataloğuna dönüştürür.

Kullanım:
    python3 site/tools/excel_to_site.py <urunler.xlsx>

- Arşivlenmiş, çoklanan ve fiyatı girilmemiş ürünler atlanır.
- "Stok girmeniz gerekmektedir" durumundaki ürünler "Tükendi" olarak eklenir.
- Aynı Model Kodu'na sahip satırlar tek ürünün renk varyantları olur.
- Görseller orijinal çözünürlükte (1200x1800) indirilir, WebP'ye çevrilir (tam boy + kart boyu) ve site/assets/urun/ altına yazılır.
- Çıktı: site/assets/js/urunler.js
"""
import concurrent.futures as cf
import hashlib
import io
import json
import re
import sys
import urllib.request
import warnings
from pathlib import Path

import openpyxl
from PIL import Image

warnings.filterwarnings("ignore")
SITE = Path(__file__).resolve().parent.parent
IMG_DIR = SITE / "assets" / "urun"
OUT = SITE / "assets" / "js" / "urunler.js"
BUYUK = 1800   # uzun kenar: Trendyol orijinali 1200x1800, küçültülmeden saklanır
KUCUK = 720    # kart görselleri için genişlik

# Trendyol kategori adı -> sitedeki koleksiyon
KOLEKSIYON = {
    "Sehpalar": ["Yan Sehpa", "Orta Sehpa", "Zigon", "TV Sehpa & Ünitesi"],
    "Raf & Kitaplık": ["Kitaplık", "Duvar Rafı", "Dergilik & Gazetelik", "Çok Amaçlı Dolap", "Dolap ve Gardırop"],
    "Antre & Çalışma": ["Dresuar", "Portmanto", "Askılık", "Çalışma Masası"],
    "Banyo": ["Banyo Rafları", "Banyo Düzenleyici", "Banyo Askısı", "Banyo Seti", "Tuvalet Kağıtlığı", "Sabunluk",
              "Çamaşır Sepeti"],
    "Mutfak": ["Mutfak Rafı", "Baharatlık", "Peçetelik", "Kupa", "Dolap İçi Düzenleyici", "Ütü Masası ve Aksesuarı"],
    "Dekor": ["Vazo", "Abajur", "Saksılık", "Sepet", "Pano", "Vücut Spreyi"],
}
KAT2KOL = {k: kol for kol, ks in KOLEKSIYON.items() for k in ks}

# Renk adı -> görüntü rengi (seçici yuvarlakları için)
RENK = {
    "gümüş": "#c9ccd1", "siyah": "#1d1d1f", "bordo": "#7b1e2b", "turuncu": "#e2702f", "mint yeşili": "#9fd8c4",
    "kobalt mavi": "#1f4fbf", "lacivert": "#1d2b55", "altın": "#c9a24a", "gold": "#c9a24a", "beyaz": "#f6f4ef",
    "kırmızı": "#c3262e", "turkuaz": "#2fa7a0", "bej": "#d9c6a5", "mor": "#6d4a8a", "gri": "#8a8d91", "krom": "#d5d8dc",
    "boz yeşil": "#5f7a54", "boz kremit": "#b8573a", "boz mor": "#6d4a8a", "boz lacivert": "#24365e", "boz turkuaz": "#2e8f8a",
    "boz gold": "#c9a24a", "boz gümüş": "#c9ccd1", "boz gri": "#8a8d91", "çam": "#c79a62", "naturel": "#cfae7f",
    "ekru": "#efe6d2", "pembe": "#e8a3b5", "nardo gri": "#8d9093", "kehribar": "#c98a2a", "lavanta": "#a493c9",
    "şefhaf": "#e8eef2", "gold siyah": "#1d1d1f", "renkli": "#e2702f", "bonj": "#efe2c2", "bonj19": "#efe2c2",
}


def tr_lower(s):
    return s.replace("I", "ı").replace("İ", "i").lower()


def slug(s):
    s = tr_lower(s)
    for a, b in zip("çğıöşüâî", "cgiosuai"):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:70]


def temiz_ad(ad):
    ad = re.sub(r"\s+", " ", ad).strip()
    return ad


def kisa_ad(ad):
    """Uzun pazaryeri başlığından vitrin adı üretir (ilk virgül/ayraç öncesi)."""
    parca = re.split(r"[,|–]| - ", ad)[0].strip()
    parca = re.sub(r"\s*\d+\s*[x×]\s*\d+.*$", "", parca).strip()  # sondaki ölçüyü at
    parca = re.sub(r"\s+(cm|CM)$", "", parca).strip()
    return parca or ad


def renk_adi(r):
    r = (r or "").strip()
    if not r or r.isdigit():
        return ""
    r = re.sub(r"\d+$", "", r).strip()
    return tr_lower(r).title().replace("İ", "İ")


def gorsel_indir(url):
    h = hashlib.sha1(url.encode()).hexdigest()[:14]
    b, k = IMG_DIR / f"{h}.webp", IMG_DIR / f"{h}-k.webp"
    if b.exists() and k.exists():
        return h
    for deneme in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40) as r:
                veri = r.read()
            im = Image.open(io.BytesIO(veri)).convert("RGB")
            x = im.copy(); x.thumbnail((BUYUK, BUYUK), Image.LANCZOS); x.save(b, "WEBP", quality=90, method=6)
            y = im.copy(); y.thumbnail((KUCUK, KUCUK * 3), Image.LANCZOS); y.save(k, "WEBP", quality=82, method=6)
            return h
        except Exception as e:  # noqa
            hata = e
    print("  ! indirilemedi:", url, hata, file=sys.stderr)
    return None


def main(xlsx):
    wb = openpyxl.load_workbook(xlsx)
    ws = wb["Ürünler"]
    satirlar = list(ws.iter_rows(values_only=True))
    bas = [str(c) for c in satirlar[0]]
    I = {k: i for i, k in enumerate(bas)}
    v = lambda r, k: ("" if r[I[k]] is None else str(r[I[k]]).strip())

    gruplar = {}
    for r in satirlar[1:]:
        durum = v(r, "Durum")
        fiyat = float(v(r, "Trendyolda Satılacak Fiyat (KDV Dahil)") or 0)
        if "arşiv" in durum or "Çoklanan" in durum or "Fiyat girmeniz" in durum or fiyat <= 0:
            continue
        gruplar.setdefault(v(r, "Model Kodu"), []).append(r)

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    tum_url = sorted({v(r, f"Görsel {i}") for rs in gruplar.values() for r in rs for i in range(1, 9) if v(r, f"Görsel {i}")})
    print(f"{len(gruplar)} ürün, {len(tum_url)} görsel işleniyor…")
    with cf.ThreadPoolExecutor(12) as ex:
        harita = dict(zip(tum_url, ex.map(gorsel_indir, tum_url)))

    urunler, gorulen = [], set()
    for model, rs in gruplar.items():
        ilk = rs[0]
        ad = temiz_ad(v(ilk, "Ürün Adı"))
        kat = v(ilk, "Kategori İsmi")
        varyantlar = []
        renkler_gorulen = set()
        for r in rs:
            gors = [harita.get(v(r, f"Görsel {i}")) for i in range(1, 9) if v(r, f"Görsel {i}")]
            gors = [g for g in gors if g]
            if not gors:
                continue
            renk = renk_adi(v(r, "Ürün Rengi"))
            anahtar = renk or v(r, "Barkod")
            if anahtar in renkler_gorulen:
                continue
            renkler_gorulen.add(anahtar)
            stok = int(float(v(r, "Ürün Stok Adedi") or 0))
            varyantlar.append({
                "barkod": v(r, "Barkod"),
                "sku": v(r, "Tedarikçi Stok Kodu"),
                "renk": renk,
                "hex": RENK.get(tr_lower(renk), "#b9ad99") if renk else None,
                "fiyat": round(float(v(r, "Trendyolda Satılacak Fiyat (KDV Dahil)")), 2),
                "piyasa": round(float(v(r, "Piyasa Satış Fiyatı (KDV Dahil)") or 0), 2),
                "stok": stok > 0 and "Stok girmeniz" not in v(r, "Durum"),
                "gorseller": gors,
            })
        if not varyantlar:
            continue
        # stokta olan varyantları öne al
        varyantlar.sort(key=lambda x: (not x["stok"],))
        aciklama = [p.strip() for p in re.split(r";\s*|\n+", v(ilk, "Ürün Açıklaması")) if p.strip()]
        kid = slug(kisa_ad(ad)) or slug(model)
        while kid in gorulen:
            kid += "-2"
        gorulen.add(kid)
        urunler.append({
            "id": kid,
            "model": model,
            "ad": kisa_ad(ad),
            "tamAd": ad,
            "kategori": kat,
            "koleksiyon": KAT2KOL.get(kat, "Dekor"),
            "olcu": v(ilk, "Boyut/Ebat") if re.search(r"\d", v(ilk, "Boyut/Ebat")) else "",
            "aciklama": aciklama,
            "sevkiyat": int(float(v(ilk, "Sevkiyat Süresi") or 0)) or None,
            "trendyol": v(ilk, "Trendyol.com Linki").split("?")[0] or None,
            "varyantlar": varyantlar,
        })

    # Sıralama: koleksiyon sırası, sonra stokta olan, sonra görsel sayısı (vitrin kalitesi)
    sira = list(KOLEKSIYON)
    urunler.sort(key=lambda u: (sira.index(u["koleksiyon"]),
                                not any(x["stok"] for x in u["varyantlar"]),
                                -len(u["varyantlar"]), -len(u["varyantlar"][0]["gorseller"])))
    js = "/* Otomatik üretildi: site/tools/excel_to_site.py — elle düzenlemeyin, Excel'i güncelleyip betiği çalıştırın. */\n"
    js += "window.KOLEKSIYONLAR = " + json.dumps(sira, ensure_ascii=False) + ";\n"
    js += "window.URUNLER = " + json.dumps(urunler, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT.write_text(js, encoding="utf-8")

    kullanilan = {g for u in urunler for x in u["varyantlar"] for g in x["gorseller"]}
    for f in IMG_DIR.glob("*.webp"):
        if f.stem.removesuffix("-k") not in kullanilan:
            f.unlink()
    stokta = sum(any(x["stok"] for x in u["varyantlar"]) for u in urunler)
    print(f"Tamam: {len(urunler)} ürün ({stokta} stokta), {len(kullanilan)} görsel -> {OUT.relative_to(SITE.parent)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

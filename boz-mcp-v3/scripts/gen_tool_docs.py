"""MCP-TOOLS.md'yi sunucunun gerçek araç şemalarından üretir:  python scripts/gen_tool_docs.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from boz_mcp.config import Settings  # noqa: E402
from boz_mcp.db import DB  # noqa: E402
from boz_mcp.server import Engine, build_server  # noqa: E402

SOURCES = {
    "get_business_overview": "Sipariş, ürün, soru, iade, buybox API", "get_system_health": "Tüm API'lere hafif test isteği + yerel DB",
    "refresh_data": "Seçilen Trendyol API'leri", "analyze_sales_trends": "Sipariş (günlük/haftalık) · Cari hesap/settlement (aylık/yıllık)",
    "analyze_product_performance": "Sipariş + ürün + iade", "analyze_conversion_rate": "İçe aktarılmış Seller Center trafik raporu",
    "analyze_sales_decline": "Sipariş + ürün anlık görüntüleri + iade + buybox (+ trafik varsa)", "detect_sales_anomalies": "Sipariş",
    "forecast_sales": "Sipariş", "analyze_competitors": "Buybox API (resmi) + kayıtlı rakip gözlemleri", "track_competitor_prices": "Yerel DB (kullanıcı/eklenti girişi)",
    "compare_products": "Ürün + kayıtlı rakipler", "analyze_product_seo": "Ürün (v2 approved)", "research_keywords": "Ürün başlıkları + rakip başlıkları + müşteri soruları",
    "optimize_product_title": "Ürün öznitelikleri", "optimize_product_description": "Ürün + müşteri soruları", "forecast_stock_depletion": "Ürün stoğu + sipariş",
    "analyze_stock_risks": "Ürün stoğu + sipariş", "recommend_production": "Ürün stoğu + sipariş + cari hesap (sezon)", "analyze_campaigns": "Sipariş (discountDisplays, salesCampaignId)",
    "analyze_campaign_performance": "Sipariş (+ trafik varsa)", "find_campaign_opportunities": "Ürün + sipariş + iade", "analyze_customer_reviews": "İçe aktarılmış yorumlar / iade nedenleri",
    "analyze_customer_questions": "Soru API", "analyze_customer_complaints": "İade (claims) API + sipariş", "get_question_answer_context": "Soru + ürün + bilgi hafızası",
    "find_market_opportunities": "Sipariş + ürün + iade + soru", "discover_product_opportunities": "Sipariş + ürün + soru + puanlama kriterleri",
    "get_business_recommendations": "Tüm modüller", "generate_business_report": "Tüm modüller + cari hesap",
}


def fmt_schema(props: dict, required: list) -> str:
    if not props:
        return "_Parametre yok._"
    rows = ["| Parametre | Tür | Varsayılan | Kısıt / açıklama |", "|---|---|---|---|"]
    for k, v in props.items():
        t = v.get("type") or "/".join(x.get("type", "?") for x in v.get("anyOf", []))
        if v.get("enum"):
            t += " (" + ", ".join(map(str, v["enum"])) + ")"
        elif v.get("items", {}).get("enum"):
            t += " of (" + ", ".join(v["items"]["enum"]) + ")"
        cons = [f"{c}={v[c]}" for c in ("minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "pattern", "exclusiveMinimum", "exclusiveMaximum") if c in v]
        for alt in v.get("anyOf", []):
            cons += [f"{c}={alt[c]}" for c in ("minimum", "maximum", "maxLength", "exclusiveMinimum", "exclusiveMaximum") if c in alt]
        desc = v.get("description", "")
        req = " **(zorunlu)**" if k in required else ""
        rows.append(f"| `{k}`{req} | {t} | {v.get('default', '—') if 'default' in v else '—'} | {' '.join(cons)} {desc} |")
    return "\n".join(rows)


async def main() -> None:
    s = Settings(seller_id="0")
    mcp, _ = build_server(s, Engine(s, DB(":memory:")))
    tools = sorted(await mcp.list_tools(), key=lambda t: t.name)
    out = ["# MCP-TOOLS — BOZ MCP V3 araç başvurusu", "",
           "_Bu dosya `scripts/gen_tool_docs.py` ile sunucunun gerçek şemalarından otomatik üretilir._", "",
           f"Toplam **{len(tools)}** araç. Mevcut ChatGPT MCP sunucusundaki araçlar (ör. `list_pending_questions`) değiştirilmedi; V3 ayrı bir sunucudur ve aynı adı kullanmaz.", "",
           "## Ortak çıktı şeması (tüm araçlar)", "",
           "| Alan | Açıklama |", "|---|---|",
           "| `ok` | `false` ise veri alınamadı — **sıfır satış/soru olarak yorumlanmamalı** |",
           "| `tool`, `generated_at` | Araç adı, Europe/Istanbul zaman damgası |",
           "| `data_sources`, `data_as_of` | Kullanılan kaynaklar ve her birinin son başarılı senkronizasyon zamanı (güncelleme zamanı) |",
           "| `markdown` | Türkçe özet |", "| `data` | Yapılandırılmış sonuç |",
           "| `warnings`, `missing_data` | Eksik/eskimiş veri ve API'nin desteklemediği veriler |",
           "| `error` | Hata ayrıntısı (gizli bilgi içermez) |", "",
           "**Hata yönetimi:** API hatası → yeniden deneme (üstel geri çekilme, Retry-After), devre kesici; veri eskiyse son başarılı veri + uyarı; hiç veri yoksa `ok=false`. "
           "**Yetkilendirme:** HTTP'de Bearer token (veya izinliyse URL token'ı). Trendyol'a yazan hiçbir araç yoktur.", "",
           "## İçindekiler", ""]
    for t in tools:
        ro = "salt okunur" if t.annotations and t.annotations.read_only_hint else "yerel yazma"
        out.append(f"- [`{t.name}`](#{t.name}) — {ro}")
    for t in tools:
        a = t.annotations
        out += ["", f"## {t.name}", "", t.description or "", "",
                f"- **Veri kaynağı:** {SOURCES.get(t.name, 'Yerel veritabanı')}",
                f"- **Erişim:** {'salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)' if a and a.read_only_hint else 'yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez'}",
                f"- **Test:** `tests/` altında otomatik test edilir", "", "**Giriş şeması**", "",
                fmt_schema(t.input_schema.get("properties", {}), t.input_schema.get("required", []))]
    Path(__file__).resolve().parents[1].joinpath("MCP-TOOLS.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{len(tools)} araç yazıldı")


asyncio.run(main())

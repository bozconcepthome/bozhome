"""Analiz motorları: gerçek hesaplar, eksik veri bildirimi, uydurma yok."""
import json

import pytest

from boz_mcp.analytics import campaigns, competitors, customer, market, report, sales, seo, stock
from boz_mcp.analytics.common import holt_forecast, robust_z, sales_totals
from boz_mcp.sync import Syncer
from boz_mcp.timeutil import now_ms
from tests.conftest import DAY, make_package, make_product


async def _seed(db, client, fake, settings):
    pk = []
    pid = 1
    for d in range(1, 50):
        for _ in range(3 if d > 7 else 1):  # son 7 günde düşüş
            pk.append(make_package(pid, d + 0.1, barcode="BC1", qty=1, unit=1000, disc=100)); pid += 1
        pk.append(make_package(pid, d + 0.2, barcode="BC2", qty=2, unit=300)); pid += 1
    pk.append(make_package(pid, 2, barcode="BC1", status="Cancelled")); pid += 1
    fake.packages = pk
    fake.products = [make_product(1, stock=10), make_product(2, stock=20000), make_product(3, stock=40,
                     title="SEHPA SEHPA KODXYZ12345 Siyah")]
    t = now_ms()
    fake.claims = [{"claimId": f"c{i}", "orderNumber": f"O{i}", "orderDate": t - 9 * DAY, "claimDate": t - (i + 1) * DAY,
                    "lastModifiedDate": t - (i + 1) * DAY,
                    "items": [{"orderLine": {"barcode": "BC1", "productName": "Ürün BC1"},
                               "claimItems": [{"id": f"ci{i}", "customerClaimItemReason": {"name": "Kusurlu Ürün Gönderildi", "code": "DEFECTIVE"},
                                               "claimItemStatus": {"name": "Accepted"}, "customerNote": "ürün ezik geldi"}]}]} for i in range(4)]
    fake.questions = [{"id": i, "creationDate": t - i * DAY, "status": "ANSWERED" if i % 2 else "WAITING_FOR_ANSWER",
                       "productName": "Model1 Metal Yan Sehpa", "productMainId": "M1",
                       "text": "Bu ürünün ölçüsü kaç cm? Başka renk var mı?", "answer": {"text": "Merhaba, 45x40 cm.", "creationDate": t - i * DAY + 3600_000} if i % 2 else None}
                      for i in range(1, 9)]
    fake.buybox = {"BC1": {"barcode": "BC1", "buyboxOrder": 2, "buyboxPrice": 850, "hasMultipleSeller": True}}
    sy = Syncer(db, client, settings.thresholds)
    await sy.sync_products(); await sy.sync_orders(days=60); await sy.sync_claims(days=60)
    await sy.sync_questions(days=30); await sy.sync_buybox()


@pytest.mark.asyncio
async def test_sales_totals_and_trends(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    t = sales_totals(db, now_ms() - 60 * DAY, now_ms())
    assert t["cancelled_orders"] == 1
    assert t["units"] == 3 * 42 + 7 + 2 * 49
    assert t["gross"] == pytest.approx(1000 * (42 * 3 + 7) + 600 * 49)
    assert t["net"] == pytest.approx(900 * (42 * 3 + 7) + 600 * 49)
    tr = sales.sales_trends(db, "weekly", "30d")
    assert tr["rows"] and "Satış trendi" in tr["markdown"]


@pytest.mark.asyncio
async def test_decline_reports_possible_causes(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    r = sales.sales_decline(db, "7d", 20)
    assert r["change_pct"] < 0
    d = next(x for x in r["drivers"] if x["barcode"] == "BC1")
    assert any("Buybox" in c for c in d["possible_causes"])
    assert "OLASI" in r["markdown"]


@pytest.mark.asyncio
async def test_perf_anomaly_forecast(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    best = sales.product_performance(db, "30d", sort="best")
    assert best["items"][0]["key"] in ("BC1", "BC2")
    worst = sales.product_performance(db, "30d", sort="worst")
    assert worst["items"][0]["units"] == 0  # satışı olmayan aktif ürün dahil
    an = sales.detect_anomalies(db, 45, 3.0)
    assert "anomalies" in an
    fc = sales.forecast_sales(db, 14)
    assert fc["is_estimate"] and len(fc["daily_forecast"]) == 14 and fc["total"] > 0
    conv = sales.conversion_analysis(db)
    assert conv["supported"] is False and "yok" in conv["markdown"]


@pytest.mark.asyncio
async def test_stock_and_production(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    th = dict(settings.thresholds)
    dep = stock.forecast_depletion(db, 30, th)
    bc1 = next(i for i in dep["items"] if i["barcode"] == "BC1")
    assert bc1["days_of_cover"] is not None and bc1["days_of_cover"] < 14
    assert dep["symbolic_stock_count"] == 1  # 20000 sembolik stok
    risks = stock.stock_risks(db, 30, th)
    assert any(r["barcode"] == "BC1" for r in risks["critical"])
    prod = stock.recommend_production(db, 30, th)
    assert prod["items"][0]["barcode"] == "BC1" and prod["items"][0]["recommended_qty"] > 0
    assert any("üretim süresi" in w for w in prod["warnings"])


@pytest.mark.asyncio
async def test_customer_and_complaints(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    q = customer.analyze_questions(db, 30)
    assert q["pending"] == 4 and q["repeated_question_clusters"]
    assert any(t == "ölçü/boyut" for t, _ in q["topics"])
    c = customer.complaints(db, 30)
    assert c["categories"].get("hasarlı/kusurlu") == 4
    assert c["products"][0]["root_cause_hypotheses"]
    ctx = customer.answer_context(db, 2)
    assert ctx["found"] and ctx["question"]["note"].startswith("Bu metin dış kaynaklı")
    assert "Renk" in ctx["product_knowledge"]["verified_facts"]
    rv = customer.analyze_reviews(db)
    assert rv["supported"] is False


@pytest.mark.asyncio
async def test_seo(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    a = seo.analyze_catalog(db)
    bad = next(p for p in a["products"] if p["barcode"] == "BC3")
    issues = " ".join(i["issue"] for i in bad["issues"])
    assert "Tekrarlanan" in issues and "kod" in issues and "Görsel" in issues
    t = seo.propose_title(db, "BC1")
    assert t["requires_approval"] and len(t["proposed_title"]) <= 100 and "Siyah" in t["proposed_title"]
    d = seo.propose_description(db, "BC1")
    assert "DOĞRULANMASI GEREKİYOR" in d["proposed_html"]
    k = seo.research_keywords(db)
    assert k["has_search_volume"] is False and "hacmi" in k["markdown"]


@pytest.mark.asyncio
async def test_competitors_campaigns_market_report(db, client, fake, settings):
    await _seed(db, client, fake, settings)
    r = competitors.add_competitor(db, "https://www.trendyol.com/rakip/sehpa-p-1?boutiqueId=1", "Rakip Sehpa", "Rakip A", "BC1")
    cid = r["competitor_id"]
    assert competitors.observe(db, cid, 1100, 4.5, 100, source="manual", observed_at_ms=now_ms() - DAY)["stored"]
    assert competitors.observe(db, cid, 1100, 4.5, 100, source="manual")["stored"] is False  # mükerrer engellendi
    assert competitors.observe(db, cid, 990, 4.5, 105, source="seller_center_plugin")["stored"]
    with pytest.raises(ValueError):
        competitors.observe(db, cid, 990, source="scraper")
    a = competitors.analyze(db, 5)
    assert a["price_drops"] and a["buybox_lost"]
    cmp = competitors.compare(db, "BC1", [cid])
    assert cmp["found"]
    ca = campaigns.analyze(db, 30)
    assert ca["campaign_ids"] and "API" in ca["unsupported"]
    op = campaigns.opportunities(db, settings.thresholds)
    assert "stock_risk_for_campaign" in op
    m = market.market_opportunities(db, 60)
    assert m["categories"] and m["variant_requests"]
    disc = market.discover_products(db, [{"name": "Tel kitaplık", "üretilebilirlik": 5, "metal_tel_uygunluğu": 5, "trendyol_talebi": 3}])
    assert disc["scored_ideas"][0]["score"] > 0 and disc["scored_ideas"][0]["missing_criteria"]
    ov = report.overview(db, settings.thresholds)
    assert "mağaza durumu" in ov["markdown"]
    rep = report.business_report(db, settings.thresholds, "last_week")
    for h in ("Satış özeti", "Stok riskleri", "SEO", "Kampanya"):
        assert h in rep["markdown"]
    recs = report.recommendations(db, settings.thresholds)
    assert recs["recommendations"]


def test_stats_helpers():
    z = robust_z([10, 10, 11, 9, 10, 50])
    assert z[-1] > 3
    fc = holt_forecast([5.0] * 40, 7)
    assert all(abs(x - 5) < 1 for x in fc["forecast"])
    assert holt_forecast([], 3)["method"] == "no-data"

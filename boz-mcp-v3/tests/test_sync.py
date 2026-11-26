"""Senkronizasyon: PII saklanmaz, mükerrer kayıt yok, API pencere sınırlarına uyulur."""
import pytest

from boz_mcp.sync import Syncer, scrub
from tests.conftest import DAY, make_package

from boz_mcp.timeutil import now_ms


def _dump(db) -> str:
    return "\n".join("\n".join(map(str, conn)) for conn in db.conn.iterdump())


@pytest.mark.asyncio
async def test_orders_no_pii_and_idempotent(db, client, fake, settings):
    fake.packages = [make_package(1, 1, qty=2, unit=500, disc=50), make_package(2, 3, status="Cancelled"),
                     make_package(3, 20, discounts=[{"displayName": "Sepette %10", "discountAmount": 30}])]
    sy = Syncer(db, client, settings.thresholds)
    r1 = await sy.sync_orders(days=30)
    r2 = await sy.sync_orders(days=30)
    assert r1["rows"] == 3 == r2["rows"]
    assert db.one("SELECT COUNT(*) n FROM order_lines")["n"] == 3  # mükerrer yok
    row = db.one("SELECT * FROM order_lines WHERE package_id=1")
    assert row["quantity"] == 2 and row["unit_gross"] == 500 and row["unit_net"] == 450 and row["city"] == "İzmir"
    dump = _dump(db)
    for pii in ("Ayşe", "Yılmaz", "ayse@example.com", "12345678901", "05551234567", "Gizli Sok"):
        assert pii not in dump


@pytest.mark.asyncio
async def test_products_snapshots_only_on_change(db, client, fake, settings):
    sy = Syncer(db, client, settings.thresholds)
    await sy.sync_products()
    await sy.sync_products()
    assert db.one("SELECT COUNT(*) n FROM product_snapshots")["n"] == 3
    fake.products[0]["variants"][0]["stock"]["quantity"] = 7
    await sy.sync_products()
    assert db.one("SELECT COUNT(*) n FROM product_snapshots")["n"] == 4
    assert db.one("SELECT stock_qty FROM products WHERE barcode='BC1'")["stock_qty"] == 7


@pytest.mark.asyncio
async def test_questions_and_settlements_windows(db, client, fake, settings):
    t = now_ms()
    fake.questions = [{"id": i, "creationDate": t - i * DAY, "status": "WAITING_FOR_ANSWER", "productName": "P", "productMainId": "M1",
                       "text": f"Ölçüsü nedir? 05551234567 {i}"} for i in range(1, 40)]
    fake.settlements = [{"id": str(i), "_type": "Sale", "transactionDate": t - i * DAY, "barcode": "BC1", "orderNumber": "O",
                         "credit": 100.0, "debt": 0.0, "commissionRate": 22, "commissionAmount": 22.0, "sellerRevenue": 78.0} for i in range(1, 60)]
    sy = Syncer(db, client, settings.thresholds)
    await sy.sync_questions(days=45)
    await sy.sync_settlements(days=45)
    assert db.one("SELECT COUNT(*) n FROM questions")["n"] == 39
    assert "05551234567" not in db.one("SELECT text FROM questions WHERE id=1")["text"]
    assert db.one("SELECT COUNT(*) n FROM settlements")["n"] == 44


@pytest.mark.asyncio
async def test_failed_sync_marked_not_zero(db, client, fake, settings):
    from boz_mcp.trendyol.client import TrendyolError
    fake.timeout_paths.add("/v2/orders")
    sy = Syncer(db, client, settings.thresholds)
    with pytest.raises(TrendyolError):
        await sy.ensure("orders", force=True)
    info = db.sync_info("orders")
    assert info["last_error"] and info["last_success"] is None


def test_scrub():
    assert "[gizlendi]" in scrub("tel 0555 123 45 67 arayın")
    assert "[gizlendi]" in scrub("mail a.b@c.com")

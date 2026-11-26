"""Test altyapısı: gerçek API'ye ÇIKMAYAN sahte Trendyol sunucusu (httpx.MockTransport)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import parse_qs

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from boz_mcp.config import Settings  # noqa: E402
from boz_mcp.db import DB  # noqa: E402
from boz_mcp.timeutil import now_ms  # noqa: E402
from boz_mcp.trendyol.client import TrendyolClient  # noqa: E402

DAY = 86_400_000
SID = "999"


def make_product(i: int, stock: int = 50, price: float = 1000.0, title: str | None = None, cat: str = "Yan Sehpa"):
    return {
        "contentId": 1000 + i, "productMainId": f"M{i}", "brand": {"id": 1, "name": "boz concept home"},
        "category": {"id": 2114, "name": cat}, "title": title or f"Model{i} Metal Yan Sehpa Siyah", "lastModifiedDate": now_ms(),
        "description": "<div><p>Metal yan sehpa. 45 x 40 cm. Kolay montaj.</p></div>",
        "images": [{"url": f"https://cdn/x{i}_{k}.jpg"} for k in range(3)],
        "attributes": [{"attributeName": "Renk", "attributeValue": "Siyah"}, {"attributeName": "Materyal", "attributeValue": "Metal"}],
        "variants": [{"barcode": f"BC{i}", "stockCode": f"SK{i}", "onSale": True, "archived": False, "locked": False,
                      "commission": 22, "vatRate": 10, "deliveryOptions": {"deliveryDuration": 3},
                      "price": {"salePrice": price, "listPrice": price}, "stock": {"quantity": stock},
                      "productUrl": f"https://www.trendyol.com/x-p-{i}", "attributes": []}],
    }


def make_package(pid: int, day_offset: float, barcode: str = "BC1", qty: int = 1, unit: float = 1000.0, disc: float = 0.0,
                 status: str = "Delivered", campaign: int = 61, discounts=None):
    od = now_ms() - int(day_offset * DAY)
    return {
        "shipmentPackageId": pid, "id": pid, "orderNumber": f"O{pid}", "orderDate": od, "lastModifiedDate": od,
        "shipmentPackageStatus": status, "status": status,
        "customerFirstName": "Ayşe", "customerLastName": "Yılmaz", "customerEmail": "ayse@example.com", "identityNumber": "12345678901",
        "shipmentAddress": {"city": "İzmir", "fullName": "Ayşe Yılmaz", "fullAddress": "Gizli Sok. No:1", "phone": "05551234567"},
        "invoiceAddress": {"fullName": "Ayşe Yılmaz", "fullAddress": "Gizli Sok. No:1"},
        "discountDisplays": discounts or [],
        "lines": [{"lineId": pid * 10, "id": pid * 10, "barcode": barcode, "productName": f"Ürün {barcode}", "quantity": qty,
                   "amount": unit, "lineGrossAmount": unit, "discount": disc, "lineTotalDiscount": disc, "price": unit - disc,
                   "lineUnitPrice": unit - disc, "tyDiscount": 0.0, "lineSellerDiscount": disc, "commission": 22,
                   "salesCampaignId": campaign, "productCategoryId": 2114, "orderLineItemStatusName": status}],
    }


class FakeTrendyol:
    """Uç nokta davranışlarını taklit eder ve tüm çağrıları kaydeder."""

    def __init__(self):
        self.products = [make_product(i) for i in range(1, 4)]
        self.packages = []
        self.claims = []
        self.questions = []
        self.settlements = []
        self.buybox = {}
        self.calls: list[tuple[str, str, dict]] = []
        self.fail: dict[str, list[int]] = {}  # path parçası → sıralı durum kodları
        self.timeout_paths: set[str] = set()

    def _page(self, items, q, size_max):
        page = int(q.get("page", ["0"])[0])
        size = min(int(q.get("size", ["50"])[0]), size_max)
        chunk = items[page * size:(page + 1) * size]
        total = len(items)
        return {"page": page, "size": size, "totalElements": total, "totalPages": (total + size - 1) // size if size else 0, "content": chunk}

    def _in_range(self, items, q, field):
        if "startDate" not in q:
            return items
        s, e = int(q["startDate"][0]), int(q["endDate"][0])
        return [x for x in items if s <= x[field] <= e]

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        q = parse_qs(request.url.query.decode())
        if ("/v2/orders" in path or "/questions/filter" in path) and "startDate" not in q:  # belge: tarih yoksa son 7 gün
            q["endDate"] = [str(now_ms())]
            q["startDate"] = [str(now_ms() - 7 * DAY)]
        if path.endswith("/settlements") and "startDate" not in q:
            return httpx.Response(400, json={"errors": [{"message": "tarih zorunlu"}]})
        body = json.loads(request.content) if request.content else None
        self.calls.append((request.method, path, {k: v[0] for k, v in q.items()}))
        assert request.headers.get("User-Agent", "").startswith(f"{SID} - "), "User-Agent zorunlu"
        for frag in self.timeout_paths:
            if frag in path:
                raise httpx.ReadTimeout("timeout", request=request)
        for frag, codes in self.fail.items():
            if frag in path and codes:
                code = codes.pop(0)
                return httpx.Response(code, json={"errors": [{"message": f"fake {code}"}]}, headers={"Retry-After": "0"} if code == 429 else {})
        if request.method != "GET" and not path.endswith("/buybox-information"):
            raise AssertionError(f"Yazma isteği yapılmamalı: {request.method} {path}")
        if path.endswith("/products/approved"):
            if "nextPageToken" in q and "page" in q:
                return httpx.Response(400, json={"errors": [{"message": "nextPageToken ve page aynı anda olmaz"}]})
            size = int(q.get("size", ["100"])[0])
            start = int(q["nextPageToken"][0]) if "nextPageToken" in q else 0
            chunk = self.products[start:start + size]
            nxt = start + size
            return httpx.Response(200, json={"totalElements": len(self.products), "totalPages": (len(self.products) + size - 1) // size,
                                             "page": 0, "size": size, "content": chunk,
                                             "nextPageToken": str(nxt) if nxt < len(self.products) else None})
        if path.endswith("/v2/orders"):
            s, e = int(q["startDate"][0]), int(q["endDate"][0])
            assert e - s <= 14 * DAY, "sipariş penceresi 14 günü aşmamalı"
            return httpx.Response(200, json=self._page(self._in_range(self.packages, q, "orderDate"), q, 200))
        if path.endswith("/claims"):
            return httpx.Response(200, json=self._page(self._in_range(self.claims, q, "lastModifiedDate"), q, 200))
        if path.endswith("/questions/filter"):
            s, e = int(q["startDate"][0]), int(q["endDate"][0])
            assert e - s <= 14 * DAY
            items = self._in_range(self.questions, q, "creationDate")
            if "status" in q:
                items = [x for x in items if x["status"] == q["status"][0]]
            return httpx.Response(200, json=self._page(items, q, 50))
        if path.endswith("/settlements"):
            s, e = int(q["startDate"][0]), int(q["endDate"][0])
            assert e - s <= 15 * DAY
            assert q["size"][0] in ("500", "1000")
            items = [x for x in self._in_range(self.settlements, q, "transactionDate") if x["_type"] == q["transactionType"][0]]
            return httpx.Response(200, json=self._page(items, q, 1000))
        if path.endswith("/buybox-information"):
            bcs = body["barcodes"]
            assert len(bcs) <= 10
            return httpx.Response(200, json={"buyboxInfo": [self.buybox.get(b, {"barcode": b, "buyboxOrder": 1, "buyboxPrice": 1000,
                                                                                  "hasMultipleSeller": False}) for b in bcs]})
        return httpx.Response(404, json={"errors": [{"message": "not found"}]})


@pytest.fixture
def fake():
    return FakeTrendyol()


@pytest.fixture
def settings(tmp_path):
    s = Settings(seller_id=SID, api_key="k", api_secret="s", db_path=tmp_path / "t.sqlite3", backup_dir=tmp_path / "bk",
                 mcp_token="x" * 40)
    return s


@pytest.fixture
def db(settings):
    return DB(settings.db_path)


@pytest.fixture
def client(settings, fake):
    async def nosleep(_):
        return None
    return TrendyolClient(settings, transport=httpx.MockTransport(fake.handler), sleep=nosleep)

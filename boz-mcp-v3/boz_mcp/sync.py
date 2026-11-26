"""Trendyol → yerel veritabanı senkronizasyonu (salt okunur). PII kaydedilmez."""
from __future__ import annotations

import json
import re
from typing import Any

from . import logs
from .db import DB
from .safety import clean
from .timeutil import now_ms, windows
from .trendyol.client import TrendyolClient, TrendyolError

log = logs.get("sync")
DAY = 86_400_000
_PII = [re.compile(r"\b0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b"),  # TR cep telefonu
        re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), re.compile(r"\b\d{11}\b")]


def scrub(text: str | None, max_len: int = 500) -> str:
    s = clean(text, max_len)
    for p in _PII:
        s = p.sub("[gizlendi]", s)
    return s


class Syncer:
    def __init__(self, db: DB, client: TrendyolClient, thresholds: dict[str, Any]):
        self.db, self.c, self.t = db, client, thresholds

    def _ttl(self, kind: str) -> int:
        return int(self.t.get("cache_ttl_seconds", {}).get(kind, 900))

    def is_fresh(self, kind: str) -> bool:
        info = self.db.sync_info(kind)
        return bool(info and info.get("last_success") and now_ms() - info["last_success"] < self._ttl(kind) * 1000)

    async def ensure(self, kind: str, force: bool = False, **kw: Any) -> dict[str, Any]:
        """Veri tazeyse dokunmaz; değilse senkronize eder. Hata durumunda istisnayı yukarı taşır."""
        if not force and self.is_fresh(kind):
            return {"kind": kind, "skipped": "fresh"}
        fn = getattr(self, f"sync_{kind}")
        try:
            res = await fn(**kw)
        except TrendyolError as e:
            self.db.mark_sync(kind, False, error=str(e))
            raise
        return res

    # ------------------------------------------------------------ products
    async def sync_products(self) -> dict[str, Any]:
        ts = now_ms()
        n = 0
        try:
            source = "products_v2"
            items = [it async for it in self.c.paginate("products_v2", {}, max_pages=200)]
        except TrendyolError as e:
            if e.status in (404, 410):
                source = "products_v1"
                items = [it async for it in self.c.paginate("products_v1", {}, max_pages=200)]
            else:
                raise
        with self.db.tx() as cx:
            for p in items:
                variants = p.get("variants") if source == "products_v2" else [p]
                for v in variants or []:
                    bc = str(v.get("barcode") or "")
                    if not bc:
                        continue
                    price = v.get("price") or {}
                    stock = v.get("stock") or {}
                    sale = price.get("salePrice", v.get("salePrice"))
                    lst = price.get("listPrice", v.get("listPrice"))
                    qty = stock.get("quantity", v.get("quantity"))
                    cat = p.get("category") or {}
                    brand = p.get("brand") or {}
                    imgs = [i.get("url") for i in (p.get("images") or []) if i.get("url")]
                    row = (bc, p.get("contentId") or p.get("productContentId"), p.get("productMainId"), v.get("stockCode"),
                           p.get("title"), brand.get("name") if isinstance(brand, dict) else p.get("brand"),
                           cat.get("id") if isinstance(cat, dict) else p.get("pimCategoryId"),
                           cat.get("name") if isinstance(cat, dict) else p.get("categoryName"),
                           p.get("description"), len(imgs), json.dumps(imgs[:20]),
                           json.dumps((p.get("attributes") or []) + (v.get("attributes") or []), ensure_ascii=False),
                           sale, lst, qty, int(bool(v.get("onSale"))), int(bool(v.get("archived"))),
                           int(bool(v.get("locked"))), v.get("commission"), v.get("vatRate"),
                           (v.get("deliveryOptions") or {}).get("deliveryDuration"), v.get("productUrl"),
                           p.get("lastModifiedDate"), ts)
                    cx.execute("""INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                                  ON CONFLICT(barcode) DO UPDATE SET content_id=excluded.content_id,
                                  product_main_id=excluded.product_main_id, stock_code=excluded.stock_code, title=excluded.title,
                                  brand=excluded.brand, category_id=excluded.category_id, category_name=excluded.category_name,
                                  description_html=excluded.description_html, image_count=excluded.image_count,
                                  images_json=excluded.images_json, attributes_json=excluded.attributes_json,
                                  sale_price=excluded.sale_price, list_price=excluded.list_price, stock_qty=excluded.stock_qty,
                                  on_sale=excluded.on_sale, archived=excluded.archived, locked=excluded.locked,
                                  commission=excluded.commission, vat_rate=excluded.vat_rate, delivery_days=excluded.delivery_days,
                                  product_url=excluded.product_url, last_modified=excluded.last_modified, synced_at=excluded.synced_at""",
                               row)
                    last = cx.execute("SELECT stock_qty,sale_price,list_price,on_sale FROM product_snapshots WHERE barcode=? ORDER BY ts DESC LIMIT 1",
                                      (bc,)).fetchone()
                    cur = (qty, sale, lst, int(bool(v.get("onSale"))))
                    if last is None or tuple(last) != cur:  # yalnızca değişiklikte kaydet (mükerrer önleme)
                        cx.execute("INSERT OR IGNORE INTO product_snapshots VALUES (?,?,?,?,?,?)", (bc, ts, *cur))
                    n += 1
        self.db.mark_sync("products", True, n)
        self.db.x("INSERT OR REPLACE INTO meta(key,value) VALUES('products_source',?)", (source,))
        return {"kind": "products", "rows": n, "source": source}

    # -------------------------------------------------------------- orders
    async def sync_orders(self, days: int = 30) -> dict[str, Any]:
        end = now_ms()
        start = end - days * DAY
        ts = end
        n = 0
        partial: list[str] = []
        for ws, we in windows(start, end, 14):
            try:
                pkgs = [p async for p in self.c.paginate("orders_v2", {"startDate": ws, "endDate": we,
                                                                       "orderByField": "PackageLastModifiedDate",
                                                                       "orderByDirection": "DESC"}, max_pages=60)]
            except TrendyolError as e:
                if e.status == 400 and ws < end - 31 * DAY:  # API geçmiş sınırı (≈1 ay)
                    partial.append(f"{ws}-{we}: {e}")
                    continue
                raise
            with self.db.tx() as cx:
                for p in pkgs:
                    pid = p.get("shipmentPackageId") or p.get("id")
                    odate = p.get("orderDate")
                    city = (p.get("shipmentAddress") or {}).get("city")  # yalnızca il (anonim toplulaştırma)
                    for d in p.get("discountDisplays") or []:
                        cx.execute("INSERT OR REPLACE INTO order_discounts VALUES (?,?,?,?)",
                                   (pid, clean(d.get("displayName"), 120), d.get("discountAmount"), odate))
                    for ln in p.get("lines") or []:
                        q = int(ln.get("quantity") or 1)
                        gross_unit = float(ln.get("amount") or ln.get("lineGrossAmount") or 0)
                        net_unit = float(ln.get("lineUnitPrice") or ln.get("price") or 0)
                        disc = float(ln.get("discount") or ln.get("lineTotalDiscount") or 0)
                        cx.execute("""INSERT INTO order_lines VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                                      ON CONFLICT(line_id) DO UPDATE SET package_status=excluded.package_status,
                                      line_status=excluded.line_status, quantity=excluded.quantity, unit_gross=excluded.unit_gross,
                                      unit_net=excluded.unit_net, unit_discount=excluded.unit_discount,
                                      unit_ty_discount=excluded.unit_ty_discount, unit_seller_discount=excluded.unit_seller_discount,
                                      last_modified=excluded.last_modified, synced_at=excluded.synced_at""",
                                   (ln.get("lineId") or ln.get("id"), pid, str(p.get("orderNumber")), odate,
                                    p.get("shipmentPackageStatus") or p.get("status"), ln.get("orderLineItemStatusName"),
                                    str(ln.get("barcode") or ""), ln.get("productName"), ln.get("productCategoryId"), q,
                                    gross_unit, net_unit, disc,  # Trendyol: amount/discount/price birim başınadır (doğrulandı)
                                    float(ln.get("tyDiscount") or 0), float(ln.get("lineSellerDiscount") or ln.get("discount") or 0),
                                    ln.get("commission"), ln.get("salesCampaignId"), city, p.get("lastModifiedDate"), ts))
                        n += 1
        self.db.mark_sync("orders", True, n, covered_from=start)
        return {"kind": "orders", "rows": n, "days": days, "partial_errors": partial}

    # -------------------------------------------------------------- claims
    async def sync_claims(self, days: int | None = 60, full: bool = False) -> dict[str, Any]:
        ts = now_ms()
        params: dict[str, Any] = {}
        if not full and days:
            params = {"startDate": ts - days * DAY, "endDate": ts}
        n = 0
        claims = [c async for c in self.c.paginate("claims", params, size=50, max_pages=400)]
        with self.db.tx() as cx:
            for c in claims:
                for it in c.get("items") or []:
                    ol = it.get("orderLine") or {}
                    for ci in it.get("claimItems") or []:
                        r = ci.get("customerClaimItemReason") or ci.get("trendyolClaimItemReason") or {}
                        cx.execute("""INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                                      ON CONFLICT(claim_item_id) DO UPDATE SET status=excluded.status,
                                      last_modified=excluded.last_modified, synced_at=excluded.synced_at""",
                                   (str(ci.get("id")), c.get("claimId") or c.get("id"), str(c.get("orderNumber")),
                                    c.get("orderDate"), c.get("claimDate"), str(ol.get("barcode") or ""), ol.get("productName"),
                                    r.get("name"), r.get("code"), (ci.get("claimItemStatus") or {}).get("name"),
                                    scrub(ci.get("customerNote")), c.get("lastModifiedDate"), ts))
                        n += 1
        self.db.mark_sync("claims", True, n, covered_from=params.get("startDate", 0))
        return {"kind": "claims", "rows": n}

    # ----------------------------------------------------------- questions
    async def sync_questions(self, days: int = 30) -> dict[str, Any]:
        end = now_ms()
        start = end - days * DAY
        ts, n = end, 0
        for ws, we in windows(start, end, 14):
            qs = [q async for q in self.c.paginate("questions", {"startDate": ws, "endDate": we,
                                                               "orderByField": "CreatedDate", "orderByDirection": "DESC"},
                                                  max_pages=100)]
            with self.db.tx() as cx:
                for q in qs:
                    ans = q.get("answer") or {}
                    cx.execute("""INSERT INTO questions VALUES (?,?,?,?,?,?,?,?,?)
                                  ON CONFLICT(id) DO UPDATE SET status=excluded.status, answer_text=excluded.answer_text,
                                  answer_date=excluded.answer_date, synced_at=excluded.synced_at""",
                               (q.get("id"), q.get("creationDate"), q.get("status"), q.get("productName"),
                                q.get("productMainId"), scrub(q.get("text"), 2000), clean(ans.get("text"), 2000) or None,
                                ans.get("creationDate"), ts))
                    n += 1
        self.db.mark_sync("questions", True, n, covered_from=start)
        return {"kind": "questions", "rows": n}

    # --------------------------------------------------------- settlements
    async def sync_settlements(self, days: int = 90, types: tuple[str, ...] = ("Sale", "Return")) -> dict[str, Any]:
        end = now_ms()
        start = end - days * DAY
        ts, n = end, 0
        for tt in types:
            for ws, we in windows(start, end, 15):
                rows = [r async for r in self.c.paginate("settlements", {"transactionType": tt, "startDate": ws, "endDate": we},
                                                         size=1000, max_pages=50)]
                with self.db.tx() as cx:
                    for r in rows:
                        cx.execute("""INSERT INTO settlements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                                      ON CONFLICT(id) DO UPDATE SET payment_date=excluded.payment_date, synced_at=excluded.synced_at""",
                                   (str(r.get("id")), tt, r.get("transactionDate"), r.get("orderDate"), str(r.get("barcode") or ""),
                                    str(r.get("orderNumber") or ""), r.get("credit"), r.get("debt"), r.get("commissionRate"),
                                    r.get("commissionAmount"), r.get("sellerRevenue"), r.get("paymentDate"), ts))
                        n += 1
        self.db.mark_sync("settlements", True, n, covered_from=start)
        return {"kind": "settlements", "rows": n, "days": days}

    # -------------------------------------------------------------- buybox
    async def sync_buybox(self, barcodes: list[str] | None = None) -> dict[str, Any]:
        if barcodes is None:
            barcodes = [r[0] for r in self.db.q("SELECT barcode FROM products WHERE archived=0 AND on_sale=1")]
        ts, n = now_ms(), 0
        info = await self.c.buybox(barcodes)
        with self.db.tx() as cx:
            for b in info:
                bc = str(b.get("barcode"))
                cur = (b.get("buyboxOrder"), b.get("buyboxPrice"), int(bool(b.get("hasMultipleSeller"))))
                last = cx.execute("SELECT buybox_order,buybox_price,has_multiple_seller FROM buybox_history WHERE barcode=? ORDER BY ts DESC LIMIT 1",
                                  (bc,)).fetchone()
                if last is None or tuple(last) != cur:
                    cx.execute("INSERT OR IGNORE INTO buybox_history VALUES (?,?,?,?,?)", (bc, ts, *cur))
                n += 1
        self.db.mark_sync("buybox", True, n)
        return {"kind": "buybox", "rows": n}

    async def sync_all(self, force: bool = False) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for k in ("products", "orders", "claims", "questions", "settlements"):
            try:
                out[k] = await self.ensure(k, force=force)
            except TrendyolError as e:
                out[k] = {"error": str(e)}
        return out

"""Belgelenmiş Trendyol Marketplace uç noktaları kayıt defteri.

YALNIZCA burada tanımlı uç noktalar çağrılabilir. Hepsi salt okunurdur.
Yazma uç noktaları (fiyat/stok güncelleme, soru cevaplama, ürün güncelleme,
sipariş/iade işlemleri) bu sürümde BİLEREK yoktur; istemci bunları reddeder.
Kaynak: https://developers.trendyol.com/ (2026-11-26 tarihinde doğrulandı)
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Endpoint:
    key: str
    method: str
    path: str  # {seller_id} yer tutucusu
    group: str  # oran sınırı grubu
    per_minute: int  # muhafazakâr dakika bütçesi
    max_size: int
    max_days: int | None
    doc: str
    read_only: bool = True


ENDPOINTS: dict[str, Endpoint] = {e.key: e for e in [
    Endpoint("products_v2", "GET", "/integration/product/sellers/{seller_id}/products/approved", "product_read", 300, 100, None,
             "https://developers.trendyol.com/reference/filterapprovedproducts"),
    Endpoint("products_v1", "GET", "/integration/product/sellers/{seller_id}/products", "product_read", 300, 200, None,
             "https://developers.trendyol.com/docs/ürün-filtreleme-filterproducts (15.10.2026 itibarıyla emekliye ayrılıyor)"),
    Endpoint("orders_v2", "GET", "/integration/order/sellers/{seller_id}/v2/orders", "order_read", 60, 200, 14,
             "https://developers.trendyol.com/reference/getshipmentpackages"),
    Endpoint("claims", "GET", "/integration/order/sellers/{seller_id}/claims", "claim_read", 120, 200, None,
             "https://developers.trendyol.com/reference/getclaims"),
    Endpoint("questions", "GET", "/integration/qna/sellers/{seller_id}/questions/filter", "qna_read", 120, 50, 14,
             "https://developers.trendyol.com/reference/getquestionfilter"),
    Endpoint("question", "GET", "/integration/qna/sellers/{seller_id}/questions/{id}", "qna_read", 120, 1, None,
             "https://developers.trendyol.com/reference/getquestion"),
    Endpoint("settlements", "GET", "/integration/finance/che/sellers/{seller_id}/settlements", "finance", 60, 1000, 15,
             "https://developers.trendyol.com/reference/getsettlements"),
    Endpoint("otherfinancials", "GET", "/integration/finance/che/sellers/{seller_id}/otherfinancials", "finance", 60, 1000, 15,
             "https://developers.trendyol.com/reference/getotherfinancials"),
    # POST ama belgede salt okunur sorgu olarak tanımlı (en fazla 10 barkod)
    Endpoint("buybox", "POST", "/integration/product/sellers/{seller_id}/products/buybox-information", "buybox", 120, 10, None,
             "https://developers.trendyol.com/reference/getbuyboxinformation"),
]}

# Kesinlikle çağrılmayacak yazma yolları (savunma derinliği için ikinci kontrol)
FORBIDDEN_PATH_FRAGMENTS = (
    "price-and-inventory", "/answers", "/v2/products", "updateContent", "/archive", "/unlock",
    "/split", "/update-", "/shipment-packages/", "/claims/create", "/items/approve", "/issue",
    "/invoice", "/common-label", "/webhooks", "/delete",
)

UNSUPPORTED_BY_PUBLIC_API = {
    "product_reviews": "Ürün yorumları/değerlendirmeleri için belgelenmiş satıcı API uç noktası bulunamadı.",
    "campaigns_read": "Kampanya/promosyon listesi (aktif, yaklaşan, uygun kampanyalar) için belgelenmiş okuma uç noktası yok. Yalnızca sipariş satırlarında salesCampaignId ve indirim adları (discountDisplays) var.",
    "traffic": "Ziyaretçi, görüntülenme, dönüşüm oranı, sepete ekleme ve favori sayıları için belgelenmiş satıcı API uç noktası yok.",
    "competitor_catalog": "Rakip ürün/fiyat listesi için resmi API yok. Yalnızca kendi barkodlarınız için Buybox servisi (sıranız, buybox fiyatı, çok satıcı var mı) mevcut.",
    "keyword_volume": "Trendyol arama hacmi verisi API'de yok; anahtar kelime hacimleri uydurulmaz.",
    "competitor_sales": "Rakip satış adetleri hiçbir resmi kaynakta yok; tahmin gerçek veri gibi gösterilmez.",
}

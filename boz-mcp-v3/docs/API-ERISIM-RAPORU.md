# Trendyol API erişim raporu — desteklenen / desteklenmeyen özellikler

Kaynak: https://developers.trendyol.com/ (2026-11-26 tarihinde incelendi) + bu ortamdan yapılan **salt okunur** gerçek isteklerle doğrulama.
Satıcı ID'si ve API anahtarı bu raporda yer almaz.

## Doğrulanan, kullanılan uç noktalar (tamamı okuma)

| Uç nokta | Yöntem | Sonuç | Notlar |
|---|---|---|---|
| `/integration/product/sellers/{id}/products/approved` (v2) | GET | ✅ 200 | 175 varyant / 165 ana ürün. size ≤100, imleç `nextPageToken` (**page ile birlikte gönderilemez**) |
| `/integration/product/sellers/{id}/products` (v1) | GET | ✅ 200 (bugün) | Belgeye göre 15.10.2026 itibarıyla emekli; yalnızca v2 404/410 dönerse yedek olarak kullanılır |
| `/integration/order/sellers/{id}/v2/orders` | GET | ✅ 200 | Tarih aralığı ≤14 gün/istek, size ≤200. Belge "son 1 ay" diyor; 60 gün geriye kadar veri döndü. Birim fiyat alanları (`amount`, `discount`, `price`) **birim başınadır** (çok adetli siparişle doğrulandı) |
| `/integration/order/sellers/{id}/claims` | GET | ✅ 200 | 4.561+ iade talebi (2022'den beri). **Yavaş:** 50'lik sayfa 11–20 sn → tam geçmiş ≈25 dk |
| `/integration/qna/sellers/{id}/questions/filter` | GET | ✅ 200 | ≤14 gün/istek, size ≤50 |
| `/integration/finance/che/sellers/{id}/settlements` | GET | ✅ 200 | size yalnızca 500/1000, ≤15 gün/istek, **≈13 ay geçmiş** mevcut (aylık/yıllık analiz bunu kullanır), komisyon tutarları burada |
| `/integration/product/sellers/{id}/products/buybox-information` | POST (sorgu) | ✅ 200 | Belgede salt okunur sorgu; ≤10 barkod/istek. Buybox sırası, fiyatı, çok satıcı bilgisi |
| `/integration/inventory/.../price-and-inventory` | — | ⛔ kullanılmaz | **Yazma** uç noktası (fiyat/stok güncelleme). İstemci tarafından engellenir |

## API'de olmayan veriler (uydurulmaz)

| İstenen özellik | Durum | Sistemdeki karşılığı |
|---|---|---|
| Ziyaretçi, görüntülenme, dönüşüm oranı | ❌ Belgelenmiş satıcı uç noktası yok | `import_seller_center_metrics` ile Seller Center CSV'si içe aktarılırsa analiz edilir |
| Sepete ekleme, favori sayıları | ❌ | Aynı CSV içe aktarımı |
| Ürün yorumları / puanları | ❌ | `import_customer_reviews`; yoksa iade nedenleri vekil gösterge |
| Aktif / yaklaşan / uygun kampanya listesi | ❌ | Yalnızca sipariş satırlarındaki `salesCampaignId` ve indirim adları (`discountDisplays`) analiz edilir |
| Trendyol destekli indirim teklifleri, komisyon avantajları | ❌ | Sipariş satırındaki Trendyol finansmanlı indirim tutarı (`tyDiscount`) raporlanır |
| Rakip ürün kataloğu, fiyat listesi | ❌ | Resmi Buybox servisi (kendi barkodlarınız) + `track_competitor_prices` ile kullanıcı/eklenti gözlemleri |
| Rakip satış adetleri | ❌ Hiçbir resmi kaynakta yok | Tahmin üretilmez |
| Anahtar kelime arama hacmi | ❌ | Kaynak sıklığı gösterilir, hacim gösterilmez |
| Üretim süresi / kapasite | Sistemde tanımlı değil | `config/thresholds.json` → `default_lead_time_days`, `lead_time_days_by_barcode` |

## ChatGPT Trendyol Seller Center eklentisi

Eklenti ChatGPT içinde satış, kampanya, ziyaretçi, komisyon ve operasyon verilerini gösterebilir; ancak bu veriler **bu MCP
sunucusundan erişilebilir değildir** (eklentinin kendi yetkilendirmesi vardır, belgelenmiş bir API'si bulunmaz). Bu nedenle:
- Eklentiden alınan rakip fiyatları `track_competitor_prices(action="observe", source="seller_center_plugin")`,
- trafik raporları `import_seller_center_metrics`,
- yorumlar `import_customer_reviews` ile V3'e aktarılabilir. Böylece veri kaynağı her kayıtta açıkça etiketlenir.

## Oran sınırları (uygulanan)
- Uç nokta başına 50 istek / 10 sn (Trendyol kuralı; aşılırsa 429).
- Grup bütçeleri (muhafazakâr): sipariş 60/dk, finans 60/dk, ürün 300/dk, soru/iade 120/dk.
- Zorunlu `User-Agent: "{SellerId} - SelfIntegration"` (yoksa 403).

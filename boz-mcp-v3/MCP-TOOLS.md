# MCP-TOOLS — BOZ MCP V3 araç başvurusu

_Bu dosya `scripts/gen_tool_docs.py` ile sunucunun gerçek şemalarından otomatik üretilir._

Toplam **39** araç. Mevcut ChatGPT MCP sunucusundaki araçlar (ör. `list_pending_questions`) değiştirilmedi; V3 ayrı bir sunucudur ve aynı adı kullanmaz.

## Ortak çıktı şeması (tüm araçlar)

| Alan | Açıklama |
|---|---|
| `ok` | `false` ise veri alınamadı — **sıfır satış/soru olarak yorumlanmamalı** |
| `tool`, `generated_at` | Araç adı, Europe/Istanbul zaman damgası |
| `data_sources`, `data_as_of` | Kullanılan kaynaklar ve her birinin son başarılı senkronizasyon zamanı (güncelleme zamanı) |
| `markdown` | Türkçe özet |
| `data` | Yapılandırılmış sonuç |
| `warnings`, `missing_data` | Eksik/eskimiş veri ve API'nin desteklemediği veriler |
| `error` | Hata ayrıntısı (gizli bilgi içermez) |

**Hata yönetimi:** API hatası → yeniden deneme (üstel geri çekilme, Retry-After), devre kesici; veri eskiyse son başarılı veri + uyarı; hiç veri yoksa `ok=false`. **Yetkilendirme:** HTTP'de Bearer token (veya izinliyse URL token'ı). Trendyol'a yazan hiçbir araç yoktur.

## İçindekiler

- [`analyze_campaign_performance`](#analyze_campaign_performance) — salt okunur
- [`analyze_campaigns`](#analyze_campaigns) — salt okunur
- [`analyze_competitors`](#analyze_competitors) — salt okunur
- [`analyze_conversion_rate`](#analyze_conversion_rate) — salt okunur
- [`analyze_customer_complaints`](#analyze_customer_complaints) — salt okunur
- [`analyze_customer_questions`](#analyze_customer_questions) — salt okunur
- [`analyze_customer_reviews`](#analyze_customer_reviews) — salt okunur
- [`analyze_product_performance`](#analyze_product_performance) — salt okunur
- [`analyze_product_seo`](#analyze_product_seo) — salt okunur
- [`analyze_sales_decline`](#analyze_sales_decline) — salt okunur
- [`analyze_sales_trends`](#analyze_sales_trends) — salt okunur
- [`analyze_stock_risks`](#analyze_stock_risks) — salt okunur
- [`check_new_questions`](#check_new_questions) — yerel yazma
- [`compare_products`](#compare_products) — salt okunur
- [`detect_sales_anomalies`](#detect_sales_anomalies) — salt okunur
- [`discover_product_opportunities`](#discover_product_opportunities) — salt okunur
- [`evaluate_business_alerts`](#evaluate_business_alerts) — salt okunur
- [`find_campaign_opportunities`](#find_campaign_opportunities) — salt okunur
- [`find_market_opportunities`](#find_market_opportunities) — salt okunur
- [`forecast_sales`](#forecast_sales) — salt okunur
- [`forecast_stock_depletion`](#forecast_stock_depletion) — salt okunur
- [`generate_business_report`](#generate_business_report) — salt okunur
- [`get_api_limitations`](#get_api_limitations) — salt okunur
- [`get_business_overview`](#get_business_overview) — salt okunur
- [`get_business_recommendations`](#get_business_recommendations) — salt okunur
- [`get_product_knowledge`](#get_product_knowledge) — salt okunur
- [`get_question_answer_context`](#get_question_answer_context) — salt okunur
- [`get_system_health`](#get_system_health) — salt okunur
- [`import_customer_reviews`](#import_customer_reviews) — yerel yazma
- [`import_seller_center_metrics`](#import_seller_center_metrics) — yerel yazma
- [`list_approval_queue`](#list_approval_queue) — salt okunur
- [`optimize_product_description`](#optimize_product_description) — yerel yazma
- [`optimize_product_title`](#optimize_product_title) — yerel yazma
- [`recommend_production`](#recommend_production) — salt okunur
- [`refresh_data`](#refresh_data) — salt okunur
- [`research_keywords`](#research_keywords) — salt okunur
- [`save_answer_draft`](#save_answer_draft) — yerel yazma
- [`save_product_fact`](#save_product_fact) — yerel yazma
- [`track_competitor_prices`](#track_competitor_prices) — yerel yazma

## analyze_campaign_performance

Kampanya öncesi / sırası / sonrası karşılaştırması: net satış, adet, sipariş ve (içe aktarılmışsa) ziyaretçi/dönüşüm. Tarihler YYYY-MM-DD. İsteğe bağlı indirim adı veya barkod filtresi.

- **Veri kaynağı:** Sipariş (+ trafik varsa)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `start_date` **(zorunlu)** | string | — | pattern=^\d{4}-\d{2}-\d{2}$  |
| `end_date` **(zorunlu)** | string | — | pattern=^\d{4}-\d{2}-\d{2}$  |
| `discount_name` | string/null | None | maxLength=120  |
| `barcode` | string/null | None | maxLength=64  |

## analyze_campaigns

Kampanya/indirim analizi (sipariş verisinden): indirimli paket oranı, indirim/kupon adlarına göre kullanım, salesCampaignId bazında satış, satıcı ve Trendyol finansmanlı indirim tutarları. Aktif/yaklaşan kampanya listesi API'de yoktur.

- **Veri kaynağı:** Sipariş (discountDisplays, salesCampaignId)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 30 | minimum=1 maximum=60  |

## analyze_competitors

Rakip analizi: resmi Trendyol Buybox servisiyle kendi ürünlerinizde buybox sıranız/fiyatı/çok satıcı durumu, ve kayıtlı rakip ürünlerin (track_competitor_prices ile eklenen) fiyat, puan, yorum sayısı, fiyat farkı ve fiyat değişimleri. 'Rakiplerimi araştır', 'Rakiplerim fiyat düşürdü mü?' için. Site kazıma yapılmaz; rakip satış adedi tahmin edilmez.

- **Veri kaynağı:** Buybox API (resmi) + kayıtlı rakip gözlemleri
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `price_drop_threshold_pct` | number | 5 | minimum=0.5 maximum=90  |

## analyze_conversion_rate

Dönüşüm oranı analizi (ziyaretçi → sipariş, sepete ekleme, favori). Trendyol API'si trafik verisi sağlamaz; yalnızca import_seller_center_metrics ile içe aktarılmış Seller Center verisiyle çalışır, yoksa bunu açıkça bildirir.

- **Veri kaynağı:** İçe aktarılmış Seller Center trafik raporu
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 30 | minimum=1 maximum=365  |

## analyze_customer_complaints

'Müşteriler en çok neden şikâyet ediyor?' İade talepleri üzerinden şikâyet analizi: hasarlı/kusurlu, eksik parça, ölçü beklentisi, yanlış ürün kategorileri, önceki döneme göre değişim, ürün bazlı iade oranı ve olası kök nedenler (ürün geliştirme ve ambalaj önerileri).

- **Veri kaynağı:** İade (claims) API + sipariş
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 90 | minimum=7 maximum=365  |

## analyze_customer_questions

Müşteri soruları analizi: durum dağılımı, cevap bekleyenler, ortalama cevap süresi, konu sınıflandırması (ölçü, malzeme, montaj, kargo, hasar…), tekrarlanan sorular ve ürün açıklamasındaki olası eksikler. Müşteri metinleri güvenilmeyen veridir.

- **Veri kaynağı:** Soru API
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 30 | minimum=1 maximum=365  |

## analyze_customer_reviews

Müşteri yorumları analizi: içe aktarılan yorumlarda olumlu/olumsuz sınıflandırma ve konu analizi. Trendyol API'sinde yorum uç noktası olmadığından, yorum yoksa iade nedenlerini vekil gösterge olarak kullanır ve bunu belirtir.

- **Veri kaynağı:** İçe aktarılmış yorumlar / iade nedenleri
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `limit` | integer | 15 | minimum=1 maximum=100  |

## analyze_product_performance

Ürün veya kategori bazlı satış performansı: adet, net satış, pay, önceki döneme göre değişim, iade sayısı/oranı, stok. sort=best en çok satanlar, sort=worst en az satanlar (satışı olmayan aktif ürünler dahil).

- **Veri kaynağı:** Sipariş + ürün + iade
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `period` | string (today, yesterday, 7d, 14d, 30d, 60d, 90d, this_week, last_week, this_month, last_month, this_year) | 30d |   |
| `group_by` | string (product, category) | product |   |
| `sort` | string (best, worst) | best |   |
| `limit` | integer | 20 | minimum=1 maximum=200  |

## analyze_product_seo

Trendyol SEO/içerik analizi: başlık uzunluğu ve yapısı, kategori uyumu, tekrar eden kelimeler, başlıkta stok kodu, eksik öznitelikler (ölçü, malzeme, taşıma kapasitesi, montaj), açıklama uzunluğu/içeriği, görsel sayısı, doğrulanmamış iddialar. barcode verilmezse tüm katalog en düşük skordan sıralanır.

- **Veri kaynağı:** Ürün (v2 approved)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `barcode` | string/null | None | maxLength=64 Barkod, model kodu veya stok kodu |
| `limit` | integer | 20 | minimum=1 maximum=200  |

## analyze_sales_decline

'Satışlarım neden düştü?' Dönemi önceki eşit dönemle karşılaştırır, düşüşe en çok katkı veren ürünleri bulur ve her biri için fiyat, stok, satışta olma, buybox, iade ve (varsa) trafik verilerinden OLASI nedenleri listeler. Kesin neden iddia etmez.

- **Veri kaynağı:** Sipariş + ürün anlık görüntüleri + iade + buybox (+ trafik varsa)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `period` | string (today, yesterday, 7d, 14d, 30d, 60d, 90d, this_week, last_week, this_month, last_month, this_year) | 7d |   |
| `min_drop_pct` | number | 20 | minimum=0 maximum=100  |
| `limit` | integer | 15 | minimum=1 maximum=50  |

## analyze_sales_trends

Satış trendleri ve dönemsel karşılaştırma. granularity=daily/weekly: sipariş verisi (yakın geçmiş, ~1-2 ay); monthly/yearly: cari hesap ekstresi (≈13 ay geçmiş). 'Son 30 günlük performansım', 'aylık satışlarım' için.

- **Veri kaynağı:** Sipariş (günlük/haftalık) · Cari hesap/settlement (aylık/yıllık)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `granularity` | string (daily, weekly, monthly, yearly) | daily |   |
| `period` | string (today, yesterday, 7d, 14d, 30d, 60d, 90d, this_week, last_week, this_month, last_month, this_year) | 30d |   |

## analyze_stock_risks

Stok riskleri: kritik stok, stoksuz ama satışta, fazla stok, 30 günde satmayan (yavaş) ve hızlı satan ürünler.

- **Veri kaynağı:** Ürün stoğu + sipariş
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

_Parametre yok._

## check_new_questions

Yeni müşteri sorusu kontrolü (son 7 gün, tüm sayfalar, ID ile mükerrer önleme). Bildirim yalnızca sunucuda bir kanal etkinleştirilmişse gönderilir (varsayılan kapalı). Asla cevap göndermez. Bağlantı hatasını '0 soru' olarak bildirmez.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `lookback_days` | integer | 7 | minimum=1 maximum=14  |

## compare_products

Kendi ürününüzü kayıtlı rakip ürünlerle özellik özellik karşılaştırır (fiyat, puan, öznitelikler, eksik özellikler).

- **Veri kaynağı:** Ürün + kayıtlı rakipler
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `my_barcode` **(zorunlu)** | string | — | minLength=1 maxLength=64  |
| `competitor_ids` **(zorunlu)** | array | — | minItems=1 maxItems=10  |

## detect_sales_anomalies

Olağan dışı satış hareketleri: günlük net satışta robust z-skoru ile ani artış/düşüş günleri ve satışsız gün serileri.

- **Veri kaynağı:** Sipariş
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 60 | minimum=14 maximum=90  |
| `threshold` | number | 3.0 | minimum=1.5 maximum=6  |
| `barcode` | string/null | None | maxLength=64  |

## discover_product_opportunities

'Yeni ürün fırsatları bul.' Metal/tel mobilya ve düzenleme kategorilerinde özgün ürün adayları (müşteri varyant talepleri, birlikte alınan ürünler, güçlü kategorilere komşu ürün tipleri) ve isteğe bağlı fikir puanlama (ideas: her fikir için name + 1–5 arası kriter puanları: türkiye_talebi, trendyol_talebi, rekabet_düşüklüğü, üretilebilirlik, metal_tel_uygunluğu, kargo_desi_uygunluğu, ambalaj_kolaylığı, düşük_iade_riski, farklılaşma, fiyat_potansiyeli).

- **Veri kaynağı:** Sipariş + ürün + soru + puanlama kriterleri
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `ideas` | array/null | None |   |

## evaluate_business_alerts

Proaktif ticari uyarıları değerlendirir (ani satış düşüşü, kritik stok, rakip fiyat düşüşü, artan şikâyet, hasarlı ürün oranı, düşük dönüşüm, API hatası). Eşikler config/thresholds.json'da. Bu araç bildirim GÖNDERMEZ; yalnızca listeler.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

_Parametre yok._

## find_campaign_opportunities

'Hangi kampanyalara katılabilirim?' Veriye dayalı kampanya adayları: indirimle hızlandırılabilecek yavaş ürünler, stoğu yeterli hızlı ürünler ve kampanyada stok riski taşıyan ürünler. Kampanyaya katılma/çıkma YAPMAZ; uygun kampanya listesi API'de yok.

- **Veri kaynağı:** Ürün + sipariş + iade
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

_Parametre yok._

## find_market_opportunities

Pazar fırsatları (kendi mağaza verisi): kategori bazında satış, momentum, SKU başına satış ve iade oranı; müşterilerin sorduğu ama olmayan varyantlar (renk/ölçü/set); birlikte satın alınan ürünler. Pazar büyüklüğü verisi yok, uydurulmaz.

- **Veri kaynağı:** Sipariş + ürün + iade + soru
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `days` | integer | 90 | minimum=14 maximum=365  |

## forecast_sales

Satış tahmini (haftalık/aylık talep): Holt üstel düzeltme + haftalık mevsimsellik. Mağaza geneli veya tek barkod; metric=net (TL) veya units (adet). Sonuç istatistiksel TAHMİNDİR, belirsizlik bandıyla döner.

- **Veri kaynağı:** Sipariş
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `horizon_days` | integer | 30 | minimum=7 maximum=90  |
| `metric` | string (net, units) | net |   |
| `barcode` | string/null | None | maxLength=64  |

## forecast_stock_depletion

Stok tükenme tahmini: ürün bazlı satış hızı (son 7 gün ağırlıklı), kalan gün ve tahmini tükenme tarihi. 'Hangi ürünlerin stoğu tükenmek üzere?' için. Sembolik stoklar (≥9999) ayrıca belirtilir.

- **Veri kaynağı:** Ürün stoğu + sipariş
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `limit` | integer | 30 | minimum=1 maximum=200  |

## generate_business_report

'Mağazamın kapsamlı raporunu hazırla.' Dönem raporu (varsayılan geçen hafta = pazartesi raporu): brüt/net ciro, sipariş, adet, iptal, iade, komisyon (cari hesap + tahmini), haftalık değişim, ürün performansı, stok riskleri, rakip/buybox, kampanya fırsatları, SEO ve satış artırma önerileri. Markdown döner.

- **Veri kaynağı:** Tüm modüller + cari hesap
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `period` | string (today, yesterday, 7d, 14d, 30d, 60d, 90d, this_week, last_week, this_month, last_month, this_year) | last_week |   |

## get_api_limitations

Trendyol satıcı API'sinin desteklemediği veriler ve bu sistemin bilinçli kısıtları (rapor).

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

_Parametre yok._

## get_business_overview

Mağazanın anlık durumu: bugün/dün/7 gün/30 gün net satış, sipariş, adet, ortalama sepet ve önceki döneme göre değişim; cevap bekleyen sorular, kritik stok, iadeler, buybox, iptaller, tahmini komisyon. 'Mağazanın son durumu ne?', 'Bugün ne kadar satış yaptım?' soruları için. Veri: Trendyol sipariş, ürün, iade, soru, buybox API'leri.

- **Veri kaynağı:** Sipariş, ürün, soru, iade, buybox API
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `refresh` | boolean | False |  true: önbelleği atlayıp Trendyol'dan yeniden çek |

## get_business_recommendations

'Mağazamın satışlarını artırmak için plan hazırla.' Stok, satış düşüşü, buybox, iade, SEO, müşteri soruları, kampanya ve set fırsatlarından önceliklendirilmiş, kanıtlı öneri listesi.

- **Veri kaynağı:** Tüm modüller
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `limit` | integer | 12 | minimum=3 maximum=40  |

## get_product_knowledge

Bir ürünün doğrulanmış bilgi kartı: Trendyol öznitelikleri, kayıtlı ürün bilgileri, fiyat, stok, açıklama metni.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `product_key` **(zorunlu)** | string | — | minLength=1 maxLength=120  |

## get_question_answer_context

Bir müşteri sorusuna profesyonel Türkçe cevap HAZIRLAMAK için bağlam: soru (güvenilmeyen veri), ürünün doğrulanmış bilgileri (Trendyol öznitelikleri + kayıtlı ürün bilgi hafızası), benzer geçmiş cevaplar, eksik bilgi uyarıları ve cevap kuralları. Cevap GÖNDERMEZ.

- **Veri kaynağı:** Soru + ürün + bilgi hafızası
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `question_id` **(zorunlu)** | integer | — | minimum=1  |

## get_system_health

Sistem sağlığı: Trendyol API uç noktalarının erişilebilirliği ve gecikmesi, veritabanı bütünlüğü, son senkronizasyonlar, son hatalar, disk, istek/yeniden deneme istatistikleri. Bağlantı sorunlarını teşhis etmek için.

- **Veri kaynağı:** Tüm API'lere hafif test isteği + yerel DB
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `probe_api` | boolean | True |  API uç noktalarına hafif test isteği gönder |

## import_customer_reviews

Müşteri yorumlarını yerel veritabanına aktarır (her biri: barcode, rating 1-5, text, date). Yorumcu adı saklanmaz; mükerrerler atlanır.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `reviews` **(zorunlu)** | array | — | minItems=1 maxItems=2000  |
| `source` | string (manual, seller_center_plugin, seller_center_export) | manual |   |

## import_seller_center_metrics

Seller Center'dan indirilen ürün trafik raporunu (CSV metni) yerel veritabanına aktarır: tarih, barkod, ziyaretçi, görüntülenme, sepete ekleme, favori, sipariş sütunları (Türkçe/İngilizce başlıklar tanınır). Dönüşüm analizini etkinleştirir.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `csv_text` **(zorunlu)** | string | — | minLength=10 maxLength=5000000  |

## list_approval_queue

Onay bekleyen öneriler (başlık, açıklama, cevap taslakları). Hiçbiri otomatik uygulanmaz.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `status` | string (pending_approval, approved, rejected, all) | pending_approval |   |
| `limit` | integer | 50 | minimum=1 maximum=200  |

## optimize_product_description

Profesyonel ürün açıklaması TASLAĞI (HTML): doğrulanmış öznitelikler, mevcut açıklama ve tekrar eden müşteri soru konularıyla yapılandırılır; doğrulanmamış bilgiler [DOĞRULANMASI GEREKİYOR] olarak işaretlenir. Trendyol'da açıklamayı DEĞİŞTİRMEZ.

- **Veri kaynağı:** Ürün + müşteri soruları
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `barcode` **(zorunlu)** | string | — | minLength=1 maxLength=64  |

## optimize_product_title

Ürün başlığı optimizasyon ÖNERİSİ: yalnızca mevcut başlık ve doğrulanmış Trendyol özniteliklerinden (model, stil, malzeme, kategori, renk) 100 karakter sınırında başlık üretir ve onay kuyruğuna kaydeder. Trendyol'da başlığı DEĞİŞTİRMEZ.

- **Veri kaynağı:** Ürün öznitelikleri
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `barcode` **(zorunlu)** | string | — | minLength=1 maxLength=64  |

## recommend_production

'Hangi ürünlerden üretmeliyim?' Üretim önceliği ve önerilen üretim miktarı: satış hızı × (hedef stok günü + üretim süresi) + güvenlik stoğu − mevcut stok. Üretim süresi/kapasite tanımlı değilse bunu uyarı olarak bildirir. Stokları DEĞİŞTİRMEZ.

- **Veri kaynağı:** Ürün stoğu + sipariş + cari hesap (sezon)
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `target_cover_days` | integer/null | None | minimum=7 maximum=180  |
| `limit` | integer | 25 | minimum=1 maximum=200  |

## refresh_data

Trendyol'dan verileri yerel analiz veritabanına yeniden çeker (salt okunur). kinds: products, orders, claims, questions, settlements, buybox. Genelde gerekmez; analiz araçları veriyi otomatik tazeler.

- **Veri kaynağı:** Seçilen Trendyol API'leri
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `kinds` | array of (products, orders, claims, questions, settlements, buybox) | ['products', 'orders', 'questions'] | minItems=1 maxItems=6  |

## research_keywords

Anahtar kelime araştırması: kendi başlıklarınız, kayıtlı rakip başlıkları ve müşteri sorularından n-gram çıkarımı, uzun kuyruklu ve satın alma niyeti yüksek kalıplar. Arama hacmi verisi YOKTUR ve uydurulmaz (yalnızca kaynak sıklığı).

- **Veri kaynağı:** Ürün başlıkları + rakip başlıkları + müşteri soruları
- **Erişim:** salt okunur (Trendyol’da hiçbir değişiklik yapmaz; yalnızca yerel önbelleği/analiz günlüğünü günceller)
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `seed` | string/null | None | maxLength=80  |
| `category` | string/null | None | maxLength=80  |
| `limit` | integer | 40 | minimum=5 maximum=100  |

## save_answer_draft

Hazırlanan müşteri cevabı TASLAĞINI onay kuyruğuna kaydeder (yalnızca yerel). Trendyol'a GÖNDERMEZ. Gönderim, kullanıcının açık onayıyla mevcut cevap sisteminden yapılır.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `question_id` **(zorunlu)** | integer | — | minimum=1  |
| `answer_text` **(zorunlu)** | string | — | minLength=10 maxLength=2000  |

## save_product_fact

Kalıcı ürün bilgi hafızası: kullanıcının DOĞRULADIĞI ürün bilgisini kaydeder (ör. 'Taşıma Kapasitesi'='15 kg'). Cevap ve açıklama taslaklarında kaynak olarak kullanılır. Yalnızca kullanıcının açıkça verdiği bilgilerle çağırın.

- **Veri kaynağı:** Yerel veritabanı
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `product_key` **(zorunlu)** | string | — | minLength=1 maxLength=64 Barkod veya model kodu (productMainId) |
| `fact_key` **(zorunlu)** | string | — | minLength=1 maxLength=100  |
| `fact_value` **(zorunlu)** | string | — | minLength=1 maxLength=1000  |

## track_competitor_prices

Rakip fiyat geçmişi altyapısı (yalnızca yerel veritabanı). action=add: rakip ürün kaydı (url, başlık, satıcı, eşleşen barkodunuz, öznitelikler); action=observe: gözlenen fiyat/puan/yorum sayısı/kampanya kaydı (kaynak: manual, seller_center_plugin vb.); action=list: tüm rakipler ve son fiyat değişimleri; action=history: bir rakibin geçmişi. Trendyol'da hiçbir şey değiştirmez, otomatik site taraması yapmaz.

- **Veri kaynağı:** Yerel DB (kullanıcı/eklenti girişi)
- **Erişim:** yalnızca YEREL veritabanına yazar; Trendyol’da hiçbir şey değiştirmez
- **Test:** `tests/` altında otomatik test edilir

**Giriş şeması**

| Parametre | Tür | Varsayılan | Kısıt / açıklama |
|---|---|---|---|
| `action` | string (add, observe, list, history) | list |   |
| `url` | string/null | None | maxLength=600  |
| `competitor_id` | integer/null | None | minimum=1  |
| `product_title` | string/null | None | maxLength=300  |
| `seller_name` | string/null | None | maxLength=120  |
| `my_barcode` | string/null | None | maxLength=64  |
| `attributes` | object/null | None |   |
| `price` | number/null | None | exclusiveMinimum=0 exclusiveMaximum=10000000  |
| `rating` | number/null | None | minimum=0 maximum=5  |
| `review_count` | integer/null | None | minimum=0  |
| `campaign_text` | string/null | None | maxLength=200  |
| `source` | string (manual, seller_center_plugin, customer_report, other_permitted) | manual |   |

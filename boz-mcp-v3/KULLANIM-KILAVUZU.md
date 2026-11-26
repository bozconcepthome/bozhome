# BOZ MCP V3 — Türkçe Kullanım Kılavuzu

Bu kılavuz, BOZ MCP V3'ü ChatGPT üzerinden günlük olarak nasıl kullanacağınızı anlatır.

## 1. ChatGPT'de ne sorabilirim?

| Sorunuz | ChatGPT'nin kullanacağı araç | Ne alırsınız |
|---|---|---|
| "Mağazanın son durumu ne?" | `get_business_overview` | Bugün/dün/7/30 gün net satış, sipariş, adet, ort. sepet, değişim; bekleyen sorular, stok, iade, buybox, iptal, komisyon |
| "Bugün ne kadar satış yaptım?" | `get_business_overview` | Bugünkü ciro, dünün aynı saatine göre değişim |
| "Satışlarım neden düştü?" | `analyze_sales_decline` | Düşüşe en çok katkı veren ürünler ve **olası** nedenler |
| "En çok satan ürünlerimi göster." | `analyze_product_performance` | Adet, ciro, pay, değişim, iade |
| "Az satan ürünlerimi analiz et." | `analyze_product_performance` (worst) | Satışı düşük/olmayan aktif ürünler |
| "Rakiplerimi araştır." / "Rakiplerim fiyat düşürdü mü?" | `analyze_competitors` | Buybox durumu + kayıtlı rakip fiyat değişimleri |
| "Ürünlerimin SEO analizini yap." | `analyze_product_seo` | 0–100 içerik skoru ve sorun listesi |
| "Ürün başlıklarımı geliştir." | `optimize_product_title` | Öneri (onay kuyruğuna), **Trendyol'da değiştirilmez** |
| "Hangi ürünlerden üretmeliyim?" | `recommend_production` | Öncelik + önerilen adet |
| "Hangi ürünlerin stoğu tükenmek üzere?" | `forecast_stock_depletion` | Kalan gün, tahmini tükenme tarihi |
| "Hangi kampanyalara katılabilirim?" | `find_campaign_opportunities` | Veriye dayalı aday ürünler (kampanya listesi API'de yok) |
| "Müşteriler en çok neden şikâyet ediyor?" | `analyze_customer_complaints` | İade kategorileri, ürün bazlı oran, kök neden önerileri |
| "Yeni ürün fırsatları bul." | `discover_product_opportunities` | Kanıtlı adaylar + puanlama kriterleri |
| "Satışlarımı artırmak için plan hazırla." | `get_business_recommendations` | Öncelikli, kanıtlı eylem listesi |
| "Son 30 günlük performansımı analiz et." | `analyze_sales_trends` + `analyze_product_performance` | Günlük trend + ürünler |
| "Mağazamın kapsamlı raporunu hazırla." | `generate_business_report` | Tam rapor (satış, ürün, stok, rakip, kampanya, SEO, öneriler) |

İpucu: Bir analizin verisinin ne kadar güncel olduğunu sonuçtaki **"veri tarihi"** (data_as_of) gösterir. Taze veri için
"verileri yenile" deyin (`refresh_data`).

## 2. Sonuçları nasıl okumalı?
- **"Veriye erişilemedi"** → bağlantı sorunudur, satışınız 0 değildir. `get_system_health` ile kontrol edin.
- **Uyarılar** (ör. "üretim süresi tanımlı değil", "trafik verisi yok") eksik bilgiyi gösterir; sonuçları buna göre yorumlayın.
- **"Olası neden"** kesin neden değildir; karar vermeden önce Seller Center'da doğrulayın.
- **Tahminler** (satış, stok tükenme, üretim) istatistikseldir; kampanya ve sezon etkisini sizin bilginiz tamamlar.

## 3. Onay gerektiren işlemler
V3 aşağıdakileri **hiçbir zaman kendisi yapmaz**:
müşteriye cevap gönderme · fiyat değiştirme · stok değiştirme · başlık/açıklama değiştirme · kampanyaya katılma/çıkma ·
sipariş iptali · veri silme · canlı sürüme geçiş.

Başlık, açıklama ve müşteri cevabı **taslakları** onay kuyruğuna kaydedilir: "Onay bekleyenleri göster" → `list_approval_queue`.
Uygulamayı Seller Center'dan (veya cevaplar için mevcut cevap sisteminizden) siz yaparsınız.

## 4. Müşteri sorusu cevaplama akışı
1. "Bekleyen soruları göster" → mevcut `list_pending_questions` (eski connector) veya `analyze_customer_questions`.
2. "Şu soruya cevap hazırla: <soru no>" → `get_question_answer_context`: soru, ürünün doğrulanmış bilgileri, benzer eski cevaplar.
3. ChatGPT taslak yazar → "taslağı kaydet" → `save_answer_draft` (gönderilmez).
4. Siz onaylayıp gönderirsiniz.

Ürün hakkında doğruladığınız bilgileri kalıcı hafızaya ekleyin, sonraki cevaplarda kullanılır:
"Paris yan sehpanın taşıma kapasitesi 10 kg, bunu kaydet" → `save_product_fact`.

## 5. Rakip fiyat takibi
Trendyol sitesi otomatik taranmaz. Rakipleri siz eklersiniz (ChatGPT Seller Center eklentisinden veya ürün sayfasından gördüğünüz değerlerle):
- "Bu rakip ürünü ekle: <link>, satıcı X, benim ürünüm <barkod>, fiyat 1.250 TL, puan 4,6, 320 değerlendirme" → `track_competitor_prices(action=add)`
- Sonraki gözlemler: "Rakip 3'ün fiyatı bugün 1.149 TL" → `action=observe`
- Fiyat geçmişi kalıcı saklanır; %5'ten fazla düşüş uyarı üretir (eşik ayarlanabilir).
Kendi ürünlerinizdeki rekabet (buybox sırası, buybox fiyatı) resmi API'den otomatik gelir.

## 6. Ziyaretçi/dönüşüm ve yorum verisi
Trendyol API'si bu verileri vermez. Seller Center'dan indirdiğiniz trafik raporunu (CSV) ChatGPT'ye yapıştırıp
"bunu içe aktar" deyin → `import_seller_center_metrics` (sütunlar: tarih, barkod, ziyaretçi, görüntülenme, sepete ekleme, favori, sipariş).
Yorumlar için `import_customer_reviews`.

## 7. Ayarlar (`config/thresholds.json`)
| Ayar | Varsayılan | Anlamı |
|---|---|---|
| `critical_stock_days` | 14 | Bu kadar günden az stok = kritik |
| `overstock_days` | 180 | Bu kadar günden fazla stok = fazla stok |
| `target_cover_days` | 30 | Üretim önerisinde hedef stok günü |
| `default_lead_time_days` | null | **Üretim süreniz** (gün) — doldurmanız önerilir |
| `lead_time_days_by_barcode` | {} | Ürüne özel üretim süresi |
| `sales_drop_pct` | 30 | Dünkü satış 28 gün ortalamasının bu kadar altındaysa uyarı |
| `competitor_price_drop_pct` | 5 | Rakip fiyat düşüşü uyarı eşiği |
| `damaged_rate_alert_pct` | 3 | Hasarlı iade oranı uyarı eşiği |
| `alert_cooldown_minutes` | 360 | Aynı uyarının tekrar gönderilmeme süresi |
Değişiklikten sonra: `sudo systemctl restart boz-mcp-v3`.

## 8. Otomasyonlar
- **Saatlik ChatGPT soru takibi ve pazartesi 09:00 raporu:** olduğu gibi çalışmaya devam eder.
- **V3 15 dk veri senkronu ve günlük yedek:** kurulumla açılır (yalnızca okuma).
- **V3 5 dk soru bildirimi ve ticari uyarılar:** varsayılan **kapalı**; açmak için DEPLOYMENT.md Aşama 6 ve onayınız gerekir.

## 9. Sorun giderme
| Belirti | Ne yapmalı |
|---|---|
| "Veriye erişilemedi" | `get_system_health`; API anahtarı/IP kısıtı/Trendyol kesintisi kontrolü |
| "güncellemesi arka planda sürüyor" | Trendyol yavaş yanıt veriyor; birkaç dakika sonra tekrar sorun |
| İade karşılaştırması yok | Tam iade geçmişi için sunucuda: `python -m boz_mcp sync --full-claims` |
| ChatGPT yeni aracı görmüyor | Connector ayarlarında araçları yenileyin |

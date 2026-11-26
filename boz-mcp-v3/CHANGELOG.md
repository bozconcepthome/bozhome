# CHANGELOG

## 3.0.0 — 2026-11-26 (canlıya alınmadı, onay bekliyor)

### Eklendi
- İzole yeni MCP sunucusu **BOZ MCP V3 — Business Intelligence Engine** (Python, MCP SDK 2.x, Streamable HTTP + stdio).
- 28 hedef araç + 11 yardımcı araç (toplam 39); tümünde ortak çıktı şeması, giriş doğrulama, veri tazeliği ve eksik veri bildirimi.
- Salt okunur Trendyol istemcisi: uç nokta beyaz listesi, yazma yolu engeli, uç nokta başına 50 istek/10 sn + grup bütçesi,
  üstel geri çekilme + Retry-After, devre kesici, imleç (nextPageToken) ve sayfa tabanlı sayfalama, TTL önbellek.
- Trendyol **v2** sipariş (`/v2/orders`) ve ürün (`/products/approved`) uç noktaları (v1 15.10.2026'da emekliye ayrıldı).
- SQLite kalıcı depolama (WAL): ürün + stok/fiyat geçmişi (yalnızca değişimde), sipariş satırları, iadeler, sorular,
  bildirilmiş soru ID'leri, cari hesap, buybox geçmişi, rakip gözlem geçmişi, trafik/yorum içe aktarma, ürün bilgi hafızası,
  onay kuyruğu, analiz sonuçları, hata günlüğü, uyarı durumu. **Müşteri kişisel verisi saklanmaz.**
- 5 dakikalık bağımsız soru takibi (ID bazlı mükerrer önleme, hata bildirimi bekleme süresi) — varsayılan kapalı.
- Proaktif ticari uyarı motoru (yapılandırılabilir eşikler) — varsayılan kapalı.
- systemd servis ve zamanlayıcıları (kaynak sınırlı, sıkılaştırılmış), kurulum betiği, Caddy/Nginx örnekleri.
- 64 otomatik test + MCP Inspector protokol testleri.

### Gerçek veride bulunup düzeltilen hatalar
- v2 ürün API'si `page` + `nextPageToken` birlikte gönderilince HTTP 400 → imleç kullanılırken `page` gönderilmiyor.
- İade API'si sayfa başına 11–20 sn: araç içi senkronizasyona süre bütçesi (arka planda devam), tam geçmiş yalnızca CLI ile.
- Satış tahmini sönümsüz trend yüzünden %60 düşük tahmin ediyordu → sönümlü Holt + mevsimsel ortalama, geriye dönük testle seçim.
- "Bugün" karşılaştırması yanlış pencereyle yapılıyordu → dünün aynı saat aralığıyla karşılaştırılıyor.
- Önceki dönem iade verisi eksikken yanıltıcı artış yüzdesi → kapsama kontrolü ve uyarı.
- Log maskeleme `Basic <base64>` değerini sızdırabiliyordu ve "Token ve" gibi metinleri bozuyordu → desen sırası ve ayraç kuralı düzeltildi.
- systemd `EnvironmentFile` satır içi yorumları değere katıyordu → `.env.example` düzeltildi, değer temizleniyor.
- Kurulum betiği `rsync` gerektiriyordu → `tar` ile kopyalama.

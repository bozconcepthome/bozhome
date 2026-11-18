# Oran Hareketleri Analiz Ajanı (masaüstü)

Maçı yazarsın (ev sahibi, deplasman, tarih), uygulama:

1. **The Odds API** üzerinden maçı bulur ve açılıştan maç saatine kadar gerçek, zaman damgalı oran
   anlık görüntülerini çeker (MS 1X2, çifte şans, İY sonucu, Asya handikap, beraberlikte iade,
   alt/üst ve alternatif çizgiler, İY/2Y alt/üst, takım golleri, KG, korner alt/üst ve handikap,
   kart alt/üst; bahis şirketinin sunmadığı marketler otomatik atlanır).
2. **Claude web ajanı** ile promptta istenen 10 kaynağı (OddsPortal, Oddschecker, Betwatch,
   KickoffScore, xG.Football, BetArchives, Footiqo, The Odds API, 5DollarFootballAPI, SockOdds)
   ve gerekirse alternatifleri tarar. Kaynağa erişimi, bulunan marketleri ve maç sayfası bağlantılarını
   raporlar. Kesin skor, İY/MS gibi API'de olmayan marketleri web'den toplar.
3. Bütün hesapları **kendi kodu** ile yapar (yapay zekâya hesap yaptırmaz):
   - Oran değişimi % = (Son − İlk) / İlk × 100
   - Örtük olasılık = 100 / oran, çok seçenekli marketlerde marjı arındırılmış olasılık değişimi (yp)
   - Son 24 / 12 / 6 / 1 saat değişimi (yalnızca o pencerede gerçek kayıt varsa)
   - En yüksek / en düşük oran, aynı yönde hareket eden bağımsız şirket sayısı, ilk hareket eden şirket
   - Yalnızca aynı şirket + aynı market + aynı seçim + aynı çizgi karşılaştırılır; maç öncesi ve canlı ayrı tutulur
4. Sonuçları sekmelerde gösterir: **Sonuç raporu**, **A – En sert düşen 15**, **B – En sert yükselen 15**,
   **Tüm marketler sıralaması**, **Kaynak doğrulaması**, **Grafikler** (MS 1-X-2, Alt/Üst 2.5, KG,
   en sert düşen/yükselen 5, korner), **Web ajanı raporu**, **İşlem günlüğü**.
   Anormal hareketler (kısa sürede ≥%10 düşüş, açılışa göre >%20, çok şirkette ortak düşüş,
   alternatiflerin yükselmesi, önce düşüp sonra yükselme, kesin skor sıçramaları, MS sakinken
   gol/korner sert hareketi) ayrıca listelenir. **HTML rapor kaydet** ile grafikli rapor tarayıcıda açılır.

Veri yoksa uydurmaz: “Doğrulanamadı” yazar, grafikte ara nokta üretmez.

## Kurulum (Windows)

1. [python.org](https://www.python.org/downloads/) üzerinden Python 3.10+ kur (kurulumda *Add to PATH* işaretle).
2. `oran_analiz` klasöründeki **BASLAT.bat** dosyasına çift tıkla. İlk açılışta gerekli paketleri kurar.
3. İstersen **EXE_OLUSTUR.bat** ile tek tıkla açılan `dist\OranAnaliz\OranAnaliz.exe` üret.

macOS / Linux: `./baslat.sh`

## Anahtarlar

| Anahtar | Nereden | Ne için |
|---|---|---|
| The Odds API | https://the-odds-api.com | Gerçek oran geçmişi. **Geçmiş (historical) oranlar ücretli planda** çalışır; ücretsiz anahtar yalnızca güncel oranı verir. |
| Anthropic API | https://console.anthropic.com | 10 kaynağın web taraması ve rapor (Claude Opus 5.5, web arama). |

Anahtarlar yalnızca senin bilgisayarında `~/.oran_analiz/ayarlar.json` içinde saklanır.
Biri olmadan da çalışır: sadece The Odds API ya da sadece web ajanı seçilebilir.

## Kullanım ipuçları

- Takım adlarını İngilizce yazmak eşleşmeyi kolaylaştırır (ör. *Galatasaray*, *Fenerbahce*).
- Lig anahtarını girersen (ör. `soccer_turkey_super_league`) arama hızlanır ve geçmiş maçta kredi azalır.
  **Ligleri listele** düğmesi tüm anahtarları gösterir (kredi harcamaz).
- **Anlık görüntü planı**: Ekonomik 5, Standart 9, Detaylı 15 zaman noktası. The Odds API geçmiş uç noktası
  her nokta için market × bölge başına kredi harcar. Çekilen her nokta `~/.oran_analiz/cache` içine
  kaydedilir; aynı maçı tekrar analiz etmek kredi harcamaz, yaklaşan maçı farklı saatlerde tekrar
  çalıştırmak kendi oran geçmişini biriktirir.
- Claude web ajanı bir maç için birkaç dakika sürebilir ve API ücreti doğurur. Efor `high` önerilir.
  Model bir isteği güvenlik nedeniyle reddederse sunucu tarafı yedek model devreye girer (`fallbacks: "default"`).

## Sınırlamalar

- OddsPortal, Oddschecker gibi siteler botları engelleyebilir ya da üyelik isteyebilir; bu durumda
  rapor “Erişilemedi / Ücretli” olarak işaretler.
- bet365 The Odds API'de bulunmayabilir; Pinnacle, Betfair, 1xBet, Unibet vb. bölge ayarına bağlıdır.
- Sıralama yalnızca erişilebilen marketleri kapsar. Oran hareketi maç sonucu tahmini değildir.

## Test

```bash
python -m pytest tests
```

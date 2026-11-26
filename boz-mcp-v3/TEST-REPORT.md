# TEST-REPORT — BOZ MCP V3 (2026-11-26)

## Özet
| Test grubu | Sonuç |
|---|---|
| Otomatik birim/entegrasyon testleri (pytest, sahte Trendyol API) | **64 / 64 geçti** (15 sn) |
| Gerçek Trendyol verisiyle tüm araçlar (salt okunur) | **30 / 30 çağrı `ok=true`** |
| MCP Inspector v2.16.0 — stdio | ✅ `tools/list` (39 araç, tümünde outputSchema), `tools/call`, geçersiz parametre reddi |
| MCP Inspector — Streamable HTTP | ✅ Bearer token ve URL token ile bağlantı, `tools/list`, `tools/call` |
| HTTP güvenlik | ✅ token yok → 401, yanlış token → 401, sahte Host → 421, `/healthz` → 200, loglarda token yok |
| Performans | ✅ 20 eşzamanlı araç çağrısı 1,5 sn (en yavaş 1,47 sn), bellek ≈ 87 MB RSS |
| Servis yeniden başlatma | ✅ Yeniden başlatma sonrası veriler kalıcı |
| Yedekten geri dönüş | ✅ Yedek → değişiklik → geri yükleme; bozuk yedek reddedildi |
| Kurulum betiği | ✅ İzole dizine 2 kez kuruldu (idempotent, `.env` 600, data 700, token korunur, kod yedeği) |
| Bağımlılık güvenliği (pip-audit) | ✅ `requirements.txt` ve `requirements.lock`: bilinen açık yok |
| Canlı sistemde kesinti oluşturan test | Yapılmadı (gerek yok; V3 izole) |
| Gerçek müşteriye mesaj / sipariş-mağaza verisi değişikliği | **Yapılmadı.** Tüm testlerde yalnızca GET + Buybox sorgusu |

## Otomatik testlerin kapsamı
| Dosya | Test | Kapsam |
|---|---:|---|
| `test_client.py` | 9 | Yazma uç noktası engeli, 429/500 yeniden deneme + Retry-After, 400'de yeniden denememe, bağlantı kesintisi (hata ≠ boş veri), devre kesici, imleç sayfalama (page+token asla birlikte değil, 250 ürün), önbellek, eksik kimlik bilgisi |
| `test_sync.py` | 5 | **PII saklanmadığı** (DB dökümünde ad/e-posta/TC/telefon/adres aranır), mükerrer kayıt yok (2 kez senkron), stok anlık görüntüsü yalnızca değişimde, soru 14 / cari hesap 15 günlük pencere sınırları, başarısız senkron "0" değil hata olarak işaretlenir, telefon/e-posta maskeleme |
| `test_analytics.py` | 8 | Brüt/net/iptal hesapları (çok adetli satır), haftalık trend, düşüş + olası neden (buybox), en çok/az satan, anomali, tahmin, dönüşüm "desteklenmiyor" bildirimi, stok tükenme + sembolik stok + üretim önerisi + lead time uyarısı, soru konuları/tekrarlar, şikâyet kategorileri + kök neden, cevap bağlamı (güvenilmeyen veri etiketi), SEO sorunları + başlık ≤100 + açıklama yer tutucuları + arama hacmi yok, rakip mükerrer gözlem önleme + izinsiz kaynak reddi + fiyat düşüşü, kampanya, pazar, fikir puanlama, rapor bölümleri |
| `test_server_watcher.py` | 42 | 28 hedef aracın kayıtlı olduğu, açıklama/giriş/çıktı şeması, salt okunur anotasyonlar, tehlikeli araçların **yokluğu**, `list_pending_questions` ile çakışma olmaması; 30 aracın uçtan uca çalışması; API kesintisinde `ok=false`; eski veriyle uyarılı devam; geçersiz parametre; prompt injection bayrağı; taslak mükerrerliği; soru takibi (75 soru/2 sayfa, ikinci çalıştırmada bildirim yok, yalnızca yeni ID, hata bildirimi bekleme süresi); bildirim kanalı varsayılan kapalı; HTTP kimlik doğrulama; kısa token reddi; yedek/geri yükleme; log maskeleme; yavaş API'de arka plan senkronu |

## Gerçek veride bulunan ve düzeltilen hatalar (kök neden → düzeltme → yeniden test)
1. **v2 ürün sayfalaması HTTP 400** — `page` ve `nextPageToken` birlikte gönderiliyordu → imleç varken `page` gönderilmiyor → ✅ 175 ürün çekildi, test eklendi.
2. **İade API zaman aşımı** — 200'lük sayfa ReadTimeout; 50'lik sayfa 11–20 sn → sayfa 50, zaman aşımı 60 sn, araç içinde 25 sn senkron bütçesi (arka planda devam), tam geçmiş yalnızca CLI → ✅ 5.332 iade kalemi, 0 hata; test eklendi.
3. **Satış tahmini %60 düşük** — sönümsüz trend son haftanın düşüşünü 30 güne uzatıyordu → sönümlü Holt + 28 günlük mevsimsel ortalama, son 14 günde geriye dönük testle seçim → ✅ tahmin 1,53 M TL (gerçekleşen son 30 gün 1,50 M TL).
4. **"Bugün" yanlış karşılaştırma penceresi** → dünün aynı saat aralığı.
5. **Önceki dönem iade verisi yokken %3242 artış** → kapsama kontrolü; tam veriyle doğru değer +%27.
6. **SEO "en sık sorunlar" boş etiket** → sorun kodlarıyla gruplama.
7. **Stoksuz ürünler "kritik"te, "149.850 gün" gösterimi** → ayrı "stoksuz" grubu, ">1 yıl" gösterimi; stoksuz ürünler için uyarı eklendi.
8. **Başlık önerisi mevcut anahtar kelimeleri/ölçüyü düşürüyordu** → satıcının yazdığı anlamlı kelimeler ve ölçü korunuyor; doğrulanmamış "paslanmaz" uyarısı.
9. **Log maskeleme** `Basic <base64>` sızdırıyordu → desen sırası düzeltildi, test eklendi.
10. **systemd EnvironmentFile satır içi yorum** → `.env.example` düzeltildi.
11. **Kurulum betiği rsync bağımlılığı** → tar.

## Başarısız / yapılamayan testler
| Test | Durum | Neden |
|---|---|---|
| Mevcut MCP araçlarının çalışması ve ChatGPT geriye dönük uyumluluğu | ⏸️ Yapılamadı | Mevcut sunucuya ve ChatGPT connector'ına erişim yok. V3 mevcut sisteme dokunmadığı için uyumluluk riski yok; ChatGPT'de ikinci connector olarak eklendiğinde Aşama 5 doğrulaması yapılmalı. |
| ChatGPT istemcisiyle uçtan uca test | ⏸️ Yapılamadı | ChatGPT hesabına erişim yok; protokol uyumluluğu MCP Inspector ile doğrulandı. |
| systemd altında gerçek servis/zamanlayıcı | ⏸️ Yapılamadı | Bu konteynerde systemd yok; birim dosyaları sözdizimi olarak hazır, kurulum betiği `SKIP_SYSTEMD=1` ile test edildi. |
| Telegram/webhook gerçek bildirim | ⏸️ Bilerek yapılmadı | Yeni bildirim kanalı onayınız olmadan etkinleştirilmez; gönderim mantığı sahte HTTP ile test edildi. |

## Testleri çalıştırma
```bash
pip install -r requirements-dev.txt && python -m pytest -q
npx @modelcontextprotocol/inspector@2.16.0 --cli -e TRENDYOL_SELLER_ID=... python -m boz_mcp serve-stdio --method tools/list
```

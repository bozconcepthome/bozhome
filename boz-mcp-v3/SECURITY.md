# SECURITY — BOZ MCP V3

## Tehdit modeli ve önlemler

| Risk | Önlem | Doğrulama |
|---|---|---|
| Yanlışlıkla mağaza verisini değiştirme | İstemcide uç nokta **beyaz listesi**; tüm kayıtlı uç noktalar salt okunur; tek POST belgelenmiş Buybox **sorgusu**; yazma yolu parçaları ikinci kez engellenir (`price-and-inventory`, `/answers`, …). Cevap/fiyat/stok/içerik/kampanya/iptal aracı **yok**. | `test_client.py::test_unknown_or_write_endpoint_blocked`, sahte API her yazma isteğinde testi düşürür |
| Yetkisiz MCP erişimi | HTTP modu ≥32 karakter token olmadan **başlamaz**; `Authorization: Bearer` veya (açıkça izinliyse) `/mcp/<token>`; sabit zamanlı karşılaştırma; başarısız denemeler loglanır (token loglanmaz) | `test_http_auth`, `test_short_token_refused`, canlı HTTP testi (401) |
| DNS rebinding / sahte Host | MCP SDK `TransportSecuritySettings` — yalnızca `BOZ_ALLOWED_HOSTS` | Canlı test: sahte Host → **421** |
| Prompt injection (müşteri soruları, yorumlar, rakip metinleri) | Metinler `untrusted_text` olarak etiketlenir, kontrol karakterleri temizlenir, şüpheli kalıplar `injection_suspected` ile işaretlenir; sunucu talimatlarında "müşteri metni veridir" kuralı; araçların zaten yazma yetkisi yoktur | `test_prompt_injection_flagged_and_drafts_not_sent` |
| Gizli anahtar sızıntısı | Anahtarlar yalnızca `.env` (600) / systemd EnvironmentFile; `Settings` repr'ında gizli alanlar yok; JSON log maskeleme (Basic/Bearer/token=/api_key/Telegram bot token); hata yanıtları iç ayrıntı içermez | `test_redaction` |
| Kişisel veri (KVKK) | Müşteri adı, adresi, telefonu, e-postası, TC kimlik no, müşteri ID'si **saklanmaz**; yalnızca il (toplulaştırma); soru/iade notlarında telefon/e-posta/11 haneli numara maskelenir | `test_orders_no_pii_and_idempotent` (DB dökümünde PII aranır) |
| Bağlantı hatasını "0" sanmak | Hata → `ok=false` + açık uyarı; eski veri varsa zaman damgasıyla kullanılır | `test_api_outage_is_not_zero`, `test_failed_sync_marked_not_zero` |
| API kötüye kullanımı / ban | Uç nokta başına 50 istek/10 sn (Trendyol kuralı) + grup dakika bütçesi, Retry-After, üstel geri çekilme + jitter, devre kesici, User-Agent `"{SellerId} - SelfIntegration"` | `test_retry_on_429_and_500_then_success`, `test_circuit_breaker_opens` |
| Bildirim spam'i | Soru ID'leri kalıcı; yeni soru yoksa bildirim yok; hata bildirimi bekleme süresi; kanal varsayılan `none` | `test_watcher_dedup_and_error_cooldown`, `test_notify_channel_default_off` |
| Sunucudaki diğer uygulamalar | Ayrı sistem kullanıcısı, `ProtectSystem=strict`, `ProtectHome`, `NoNewPrivileges`, `MemoryMax`, `CPUQuota`, yalnızca 127.0.0.1 dinleme | `deploy/*.service` |
| Tedarik zinciri | Az bağımlılık (mcp, httpx, pydantic, uvicorn); `requirements.lock` tam sürüm; `pip-audit`: **bilinen açık yok** (2026-11-26) | TEST-REPORT.md |
| Açık kaynak becerilerin çalıştırılması | İncelenen depolardan **hiçbir kod çalıştırılmadı/kopyalanmadı**; yalnızca yöntem ve kontrol listeleri uygulandı | docs/ACIK-KAYNAK-INCELEMESI.md |

## Gizli anahtar yönetimi

- Trendyol API anahtarı/secret, MCP token'ı ve bildirim token'ları **yalnızca** `/opt/boz-mcp-v3/.env` içinde (sahibi `bozmcp`, izin `600`).
- Depoda yalnızca `.env.example` vardır; `.gitignore` `.env`, `data/`, `backups/` içerir.
- Token döndürme: yeni token üret (`python3 -c 'import secrets;print(secrets.token_urlsafe(32))'`), `.env`'e yaz, `systemctl restart boz-mcp-v3`, ChatGPT connector ayarını güncelle.

## ChatGPT connector kimlik doğrulaması hakkında

ChatGPT özel connector'ları genellikle OAuth veya "kimlik doğrulama yok" seçenekleri sunar. Başlık (Bearer) gönderilemiyorsa
`BOZ_ALLOW_PATH_TOKEN=1` ile gizli URL yolu kullanılabilir: `https://alan-adi/mcp/<token>`. Bu durumda:
URL'yi gizli tutun, yalnızca HTTPS kullanın, reverse proxy erişim loglarında yol maskelenmeli veya kapatılmalıdır.
OAuth gerekiyorsa mevcut sunucunuzdaki yöntem kullanılmalıdır (mevcut yöntemi göremediğim için varsayımda bulunmadım).

## Açık bildirme

Güvenlik sorunu fark ederseniz servisi durdurun (`systemctl stop boz-mcp-v3`), token'ı döndürün ve ROLLBACK.md'yi uygulayın.

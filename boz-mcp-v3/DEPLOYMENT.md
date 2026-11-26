# DEPLOYMENT — Canlıya geçiş planı (ONAYINIZI BEKLİYOR)

> Bu adımlar **henüz uygulanmadı.** Sunucunuza erişimim olmadığı için kurulum sizin tarafınızdan (veya erişim verirseniz
> benim tarafımdan) yapılacaktır. Her aşama geri alınabilir; mevcut MCP sunucusu hiçbir aşamada durdurulmaz veya değiştirilmez.

## Ön koşullar
- Linux sunucu, Python ≥ 3.11 (`python3 --version`), systemd, reverse proxy (Caddy/Nginx) ve HTTPS alan adı/alt yolu.
- Trendyol API bilgileri (mevcut MCP sunucunuzun kullandığı **aynı salt okunur** bilgiler kullanılabilir).
- Boş port (varsayılan **8765**, yalnızca 127.0.0.1). Kontrol: `ss -ltnp | grep 8765` boş olmalı.

## Aşama 0 — Yedek (mevcut sistem)
```bash
sudo tar czf /root/yedek_mevcut_mcp_$(date +%F).tgz <MEVCUT_MCP_KLASORU> /etc/systemd/system/<mevcut-servis>* /etc/caddy /etc/nginx 2>/dev/null
```

## Aşama 1 — İzole kurulum (servisler başlatılmaz)
```bash
git clone -b claude/boz-mcp-v3-intelligence-7ifhtw https://github.com/bozconcepthome/bozhome.git /tmp/bozhome
cd /tmp/bozhome/boz-mcp-v3 && sudo bash deploy/install.sh
sudo nano /opt/boz-mcp-v3/.env      # TRENDYOL_SELLER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET, BOZ_ALLOWED_HOSTS=alan-adiniz,127.0.0.1:*
```

## Aşama 2 — Duman testi (salt okunur)
```bash
cd /opt/boz-mcp-v3
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env health
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env sync                 # ~3-5 dk
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env sync --full-claims   # isteğe bağlı, ~25 dk (tam iade geçmişi)
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env report --period last_week | head -40
```

## Aşama 3 — HTTP servisi + zamanlayıcılar (yalnızca güvenli olanlar)
```bash
sudo systemctl enable --now boz-mcp-v3.service
sudo systemctl enable --now boz-mcp-v3-sync.timer boz-mcp-v3-backup.timer
curl -s http://127.0.0.1:8765/healthz        # {"status":"ok"}
```
**Soru takibi (`boz-mcp-v3-questions.timer`) ve uyarılar (`boz-mcp-v3-alerts.timer`) ETKİNLEŞTİRİLMEZ** — ayrı onayınızla Aşama 6'da.

## Aşama 4 — Reverse proxy
`deploy/Caddyfile.example` veya `deploy/nginx.conf.example` — **mevcut MCP konumuna dokunmadan** yeni alt alan adı/yol ekleyin.
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://ALAN/mcp            # 401 beklenir
```

## Aşama 5 — ChatGPT'ye ikinci connector olarak ekleme
1. ChatGPT → Ayarlar → Connectors (Uygulamalar) → Geliştirici modu → **Yeni connector oluştur**.
2. Ad: `BOZ MCP V3`, URL: `https://ALAN/mcp` (Bearer desteklenmiyorsa `BOZ_ALLOW_PATH_TOKEN=1` + `https://ALAN/mcp/<token>`).
3. **Mevcut BOZ Trendyol connector'ı silinmez/değiştirilmez.** Mevcut otomasyonlar eski connector'ı kullanmaya devam eder.
4. Araç listesi yenilemesi: connector sayfasında "Yenile/Refresh" (araçlar değiştiğinde her sürümde tekrarlanır).
5. Doğrulama: "Mağazanın son durumu ne?" → `get_business_overview` çağrılmalı.

## Aşama 6 — (Ayrı onay) Bildirimli 5 dk soru takibi
Mükerrer bildirimi önlemek için: mevcut saatlik ChatGPT otomasyonu **farklı kanala** bildirir; V3 yalnızca seçtiğiniz kanala
(Telegram/webhook) yazar. İlk etkinleştirmede mevcut bekleyen sorular **tek seferde** bildirilir, sonra yalnızca yeni ID'ler.
```bash
# .env: BOZ_NOTIFY_CHANNEL=telegram, BOZ_TELEGRAM_BOT_TOKEN=..., BOZ_TELEGRAM_CHAT_ID=...
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env watch-questions   # tek seferlik deneme
sudo systemctl enable --now boz-mcp-v3-questions.timer
```
Uyarılar için aynı şekilde `boz-mcp-v3-alerts.timer` (eşikler: `config/thresholds.json`).

## Haftalık pazartesi 09:00 raporu
Mevcut ChatGPT otomasyonu korunur. Otomasyon istemine "BOZ MCP V3 `generate_business_report` aracını `period=last_week`
ile kullan" eklenirse rapor brüt/net ciro, sipariş, iptal, iade, komisyon, haftalık değişim, ürün performansı, stok riskleri,
rakip/buybox, kampanya fırsatları, SEO ve satış artırma önerilerini içerir. (Bu değişikliği ChatGPT'de siz yaparsınız.)

## Bakım
- Güncelleme: yeni sürümü çek → `sudo bash deploy/install.sh` (kod + DB yedeği otomatik) → `systemctl restart boz-mcp-v3`.
- Loglar: `journalctl -u boz-mcp-v3 -f` (JSON). Yedekler: `/opt/boz-mcp-v3/backups` (14 gün saklanır).

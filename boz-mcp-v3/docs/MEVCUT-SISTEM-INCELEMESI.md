# Mevcut sistemin incelenmesi — ne görüldü, ne görülemedi

> Erişemediğim sistemi incelemiş gibi davranmıyorum. Aşağıdaki tablo bu çalışma ortamının gerçek erişimini gösterir.

| İncelenmesi istenen | Durum | Ayrıntı |
|---|---|---|
| MCP kaynak kodu | ❌ Erişilemedi | `bozconcepthome/bozhome` deposunun hiçbir dalında BOZ Trendyol MCP sunucusu kodu yok (dallar: video/animasyon, site, oran analizi, JARVIS, Boz Agent). Kod sunucunuzda duruyor olmalı. |
| Programlama dili, mimari, servisler, Docker, cron | ❌ Erişilemedi | Sunucunuza SSH/uzak klasör bağlantısı bu oturumda yok. |
| Mevcut MCP araçları | Kısmen | Yalnızca sizin belirttiğiniz `list_pending_questions` biliniyor. V3 bu adı **kullanmaz**. |
| ChatGPT bağlantısı / otomasyonlar | ❌ Erişilemedi | Saatlik soru takibi ve pazartesi 09:00 raporu ChatGPT tarafında; dokunulmadı. |
| Trendyol API yetkileri | ✅ Doğrulandı | Bu ortamda proxy üzerinden kimlik bilgisi enjekte edilmiş Trendyol erişimi var; tüm okuma uç noktaları test edildi (bkz. API-ERISIM-RAPORU.md). Yazma uç noktası **çağrılmadı**. |
| Veritabanı | ❌ Mevcut DB görülemedi | V3 kendi ayrı SQLite veritabanını kullanır; mevcut DB'ye bağlanmaz. |
| Güvenlik mekanizmaları | ❌ Mevcut görülemedi | V3'ün kendi mekanizmaları SECURITY.md'de. |
| Depodaki ilgili bulgular | ✅ | `agent/codex_bridge.py` (Boz Agent dalı) Codex için MCP araç onay modunu "approve" yapıyor — bu PC kontrol aracı içindir, Trendyol MCP ile ilgisi yok. |

## Bu nedenle seçilen yaklaşım

Mevcut sunucuyu göremediğim için **değiştirmek yerine yanına** kurulacak izole bir V3 geliştirdim:
- Mevcut connector, araç adları/parametreleri, `list_pending_questions`, otomasyonlar: **dokunulmadı**.
- V3 ChatGPT'ye **ikinci connector** olarak eklenir (DEPLOYMENT.md, Aşama 5).
- İleride mevcut kodu paylaşırsanız (depoya ekleyerek veya sunucu klasörü erişimi vererek) V3 araçları mevcut sunucuya
  modül olarak da entegre edilebilir; o zaman eski araçların şemaları birebir korunarak geriye dönük uyumluluk testleri eklenir.

## Erişim verilirse yapılacak kontroller
`systemctl list-units --type=service`, `docker ps`, `crontab -l`, mevcut MCP klasöründe dil/çerçeve, araç listesi
(`tools/list` ile Inspector), reverse proxy yapılandırması, port kullanımı, kaynak tüketimi ve log dosyaları.

# BOZ MCP V3 — kaynak arşivi

> **Durum (2026-11-26): Bu klasör kaynak arşividir; canlıda bu klasör çalışmıyor.** V3, mevcut Boz Trendyol MCP sunucusuna
> entegre edilerek canlıya alındı:
> - Depo: `bozconcepthome/trendyol-cli` · dal `claude/boz-mcp-v3-intelligence-7ifhtw` · canlı commit `74025ed`
> - Proje hafızası ve devam rehberi: o depodaki **`BOZ-MCP-MASTER.md`**
>
> Bu klasör kullanıcı talimatıyla korunur — **silmeyin**. Buradaki "ayrı servis / ikinci connector / systemd HTTP servisi"
> kurulum adımları (`DEPLOYMENT.md`, `deploy/`) **artık geçerli değildir**; canlı kurulum ve geri dönüş için trendyol-cli
> deposundaki `docs/boz-v3/` belgelerini kullanın.

## İçerik
Boz Concept Home'un Trendyol mağazası için salt okunur ticari zekâ motorunun ilk bağımsız geliştirmesi: salt okunur Trendyol
istemcisi, SQLite depolama (kişisel veri yok), satış/stok/SEO/rakip/kampanya/müşteri/pazar analizleri, 39 MCP aracı ve 64 test.
Aynı kod tabanı trendyol-cli deposunda `boz_mcp/` paketi olarak, MCP SDK 1.x uyumluluk katmanıyla birlikte kullanılmaktadır.

## Testleri çalıştırma (geliştirme)
```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
```

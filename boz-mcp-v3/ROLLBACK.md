# ROLLBACK — Geri dönüş planı

V3 mevcut sistemden tamamen bağımsız olduğu için geri dönüş = **V3'ü durdurmak**. Mevcut MCP sunucusu, ChatGPT bağlantısı ve
otomasyonlar hiçbir aşamada etkilenmez.

## Seviye 1 — Bildirim/otomasyonları kapat (saniyeler)
```bash
sudo systemctl disable --now boz-mcp-v3-questions.timer boz-mcp-v3-alerts.timer
sudo sed -i 's/^BOZ_NOTIFY_CHANNEL=.*/BOZ_NOTIFY_CHANNEL=none/' /opt/boz-mcp-v3/.env
```

## Seviye 2 — V3'ü tamamen durdur (saniyeler)
```bash
sudo systemctl disable --now boz-mcp-v3.service boz-mcp-v3-sync.timer boz-mcp-v3-backup.timer
```
ChatGPT'de `BOZ MCP V3` connector'ını devre dışı bırakın. Eski connector olduğu gibi çalışır.

## Seviye 3 — Önceki V3 sürümüne dön
```bash
cd /opt/boz-mcp-v3
ls backups/                                   # code_YYYYMMDD_HHMMSS.tgz, boz_v3_*.sqlite3, pre_install_*.sqlite3
sudo systemctl stop boz-mcp-v3
sudo -u bozmcp tar xzf backups/code_<TARİH>.tgz -C /opt/boz-mcp-v3
sudo -u bozmcp .venv/bin/python -m boz_mcp --env .env restore backups/boz_v3_<TARİH>.sqlite3   # bütünlük kontrollü
sudo systemctl start boz-mcp-v3
```

## Seviye 4 — Tam kaldırma
```bash
sudo systemctl disable --now 'boz-mcp-v3*'
sudo rm /etc/systemd/system/boz-mcp-v3*.service /etc/systemd/system/boz-mcp-v3*.timer && sudo systemctl daemon-reload
sudo tar czf /root/boz-mcp-v3-son-yedek.tgz /opt/boz-mcp-v3      # veri silmeden önce yedek
# Veri silme ayrı onayınızı gerektirir: sudo rm -rf /opt/boz-mcp-v3 && sudo userdel bozmcp
```
Reverse proxy'ye eklenen V3 bloğunu kaldırıp proxy'yi yeniden yükleyin.

## Test edilen geri dönüş adımları
- DB yedeği/geri yükleme (bütünlük kontrolü, bozuk yedeği reddetme): `test_backup_restore` ✅
- Kurulum betiğinin tekrar çalıştırılması (idempotent, kod yedeği oluşturur, `.env`/token korunur): izole dizinde 2 kez çalıştırıldı ✅
- Servis yeniden başlatma sonrası veri kalıcılığı: canlı HTTP testi ✅

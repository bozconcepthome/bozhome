#!/usr/bin/env bash
# BOZ MCP V3 kurulum betiği — İZOLE kurulum (/opt/boz-mcp-v3, ayrı kullanıcı, ayrı port).
# Mevcut MCP sunucusuna, ChatGPT bağlantısına ve otomasyonlara DOKUNMAZ.
# Kullanım: sudo bash deploy/install.sh   (depo kökünden, boz-mcp-v3 klasöründe)
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST=${BOZ_DEST:-/opt/boz-mcp-v3}
PY=${PYTHON:-python3}

$PY -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ gerekli"'
if [ "${SKIP_USER:-0}" != "1" ]; then
  id bozmcp >/dev/null 2>&1 || /usr/sbin/useradd --system --home-dir "$DEST" --no-create-home --shell /usr/sbin/nologin bozmcp
fi
mkdir -p "$DEST" "$DEST/data" "$DEST/backups"
if [ -f "$DEST/data/boz_v3.sqlite3" ]; then
  cp -a "$DEST/data/boz_v3.sqlite3" "$DEST/backups/pre_install_$(date +%Y%m%d_%H%M%S).sqlite3"
fi
if [ -d "$DEST/boz_mcp" ]; then
  tar czf "$DEST/backups/code_$(date +%Y%m%d_%H%M%S).tgz" -C "$DEST" boz_mcp config requirements.lock 2>/dev/null || true
fi
# Kod kopyalama (rsync gerektirmez): eski kod klasörleri silinir, .env/data/backups/.venv korunur
rm -rf "$DEST/boz_mcp" "$DEST/config.new"
(cd "$SRC" && tar cf - --exclude=.env --exclude=data --exclude=backups --exclude=.venv --exclude=__pycache__ --exclude=.pytest_cache --exclude=tests .) \
  | (cd "$DEST" && tar xf - --no-same-owner)
[ -d "$DEST/.venv" ] || $PY -m venv "$DEST/.venv"
"$DEST/.venv/bin/pip" install --quiet --upgrade pip
"$DEST/.venv/bin/pip" install --quiet --require-virtualenv -r "$DEST/requirements.lock"
if [ ! -f "$DEST/.env" ]; then
  cp "$DEST/.env.example" "$DEST/.env"
  TOKEN=$($PY -c 'import secrets; print(secrets.token_urlsafe(32))')
  sed -i "s|^BOZ_MCP_TOKEN=.*|BOZ_MCP_TOKEN=$TOKEN|" "$DEST/.env"
  sed -i "s|^BOZ_DB_PATH=.*|BOZ_DB_PATH=$DEST/data/boz_v3.sqlite3|; s|^BOZ_BACKUP_DIR=.*|BOZ_BACKUP_DIR=$DEST/backups|; s|^BOZ_CONFIG_FILE=.*|BOZ_CONFIG_FILE=$DEST/config/thresholds.json|" "$DEST/.env"
  echo ">> $DEST/.env oluşturuldu. Trendyol bilgilerini girin (TRENDYOL_SELLER_ID / API_KEY / API_SECRET)."
fi
[ "${SKIP_USER:-0}" = "1" ] || chown -R bozmcp:bozmcp "$DEST"
chmod 600 "$DEST/.env"
chmod 700 "$DEST/data" "$DEST/backups"
if [ "${SKIP_SYSTEMD:-0}" != "1" ]; then
  install -m 644 "$DEST"/deploy/boz-mcp-v3*.service "$DEST"/deploy/boz-mcp-v3*.timer /etc/systemd/system/
  systemctl daemon-reload
fi
echo ">> Kurulum tamam. Servisler BAŞLATILMADI. Sonraki adımlar için DEPLOYMENT.md'ye bakın."

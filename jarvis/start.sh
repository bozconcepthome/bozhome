#!/usr/bin/env bash
# macOS / Linux başlatıcı
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
[ -f .env ] || { cp .env.example .env; echo ".env oluşturuldu — ANTHROPIC_API_KEY'i yaz ve tekrar çalıştır."; exit 1; }
python server.py "$@"

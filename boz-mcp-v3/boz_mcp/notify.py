"""Bildirim kanalları. VARSAYILAN: 'none' (yalnızca log, hiçbir yere gönderilmez).
Kanal yalnızca kullanıcı onayıyla .env üzerinden açılır."""
from __future__ import annotations

from typing import Any

import httpx

from . import logs
from .config import Settings

log = logs.get("notify")


async def send(settings: Settings, title: str, body: str, transport: httpx.AsyncBaseTransport | None = None) -> dict[str, Any]:
    ch = settings.notify_channel
    text = f"{title}\n\n{body}"[:3800]
    if ch == "none":
        log.info("notification (dry-run, channel=none)", extra={"ctx": {"title": title}})
        return {"sent": False, "channel": "none", "dry_run": True}
    async with httpx.AsyncClient(timeout=20, transport=transport) as c:
        if ch == "telegram":
            if not (settings.telegram_bot_token and settings.telegram_chat_id):
                return {"sent": False, "channel": ch, "error": "Telegram ayarları eksik"}
            r = await c.post(f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                             json={"chat_id": settings.telegram_chat_id, "text": text, "disable_web_page_preview": True})
        elif ch == "webhook":
            if not settings.webhook_url.startswith("https://"):
                return {"sent": False, "channel": ch, "error": "Webhook URL https olmalı"}
            r = await c.post(settings.webhook_url, json={"title": title, "text": body})
        else:
            return {"sent": False, "channel": ch, "error": "Bilinmeyen kanal"}
    ok = 200 <= r.status_code < 300
    if not ok:
        log.warning("notification failed", extra={"ctx": {"channel": ch, "status": r.status_code}})
    return {"sent": ok, "channel": ch, "status": r.status_code}

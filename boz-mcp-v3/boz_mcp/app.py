"""HTTP (Streamable HTTP) uygulaması: kimlik doğrulama + DNS rebinding koruması + sağlık uç noktası."""
from __future__ import annotations

import hmac
from typing import Any

from mcp.server.transport_security import TransportSecuritySettings

from . import logs
from .config import Settings
from .server import build_server

log = logs.get("app")


class TokenAuth:
    """ASGI ara katmanı. Kabul: 'Authorization: Bearer <token>' veya (izinliyse) '/mcp/<token>' yolu.
    Sabit zamanlı karşılaştırma; başarısız denemeler loglanır (token loglanmaz)."""

    def __init__(self, app: Any, settings: Settings):
        self.app, self.s = app, settings
        self.base = settings.http_path.rstrip("/") or "/mcp"

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path: str = scope.get("path", "")
        if path == "/healthz":
            return await self._plain(send, 200, b'{"status":"ok"}')
        token = self.s.mcp_token
        ok = False
        hdrs = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        auth = hdrs.get("authorization", "")
        if auth.lower().startswith("bearer ") and hmac.compare_digest(auth[7:].strip(), token):
            ok = path == self.base
        if self.s.allow_path_token and path.startswith(self.base + "/"):
            supplied = path[len(self.base) + 1:].split("/", 1)[0]
            if hmac.compare_digest(supplied, token):
                ok = True
                scope = dict(scope)
                scope["path"] = self.base
                scope["raw_path"] = self.base.encode()
        if not ok:
            log.warning("unauthorized request", extra={"ctx": {"path": path[:len(self.base) + 1] + "…", "client": (scope.get("client") or ["?"])[0]}})
            return await self._plain(send, 401, b'{"error":"unauthorized"}')
        return await self.app(scope, receive, send)

    @staticmethod
    async def _plain(send: Any, status: int, body: bytes) -> None:
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json"), (b"cache-control", b"no-store")]})
        await send({"type": "http.response.body", "body": body})


def create_app(settings: Settings):
    if len(settings.mcp_token) < 32:
        raise SystemExit("BOZ_MCP_TOKEN en az 32 karakter olmalı (HTTP modu kimlik doğrulamasız başlatılmaz).")
    mcp, eng = build_server(settings)
    sec = TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=settings.allowed_hosts,
                                    allowed_origins=["https://chatgpt.com", "https://chat.openai.com"] +
                                    [f"https://{h.split(':')[0]}" for h in settings.allowed_hosts])
    inner = mcp.streamable_http_app(streamable_http_path=settings.http_path, stateless_http=True, json_response=True,
                                    transport_security=sec, host=settings.http_host)
    return TokenAuth(inner, settings), eng

"""Salt okunur, oran sınırlı, yeniden denemeli, önbellekli Trendyol API istemcisi."""
from __future__ import annotations

import asyncio
import base64
import json
import random
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

from .. import logs
from ..config import Settings
from .endpoints import ENDPOINTS, FORBIDDEN_PATH_FRAGMENTS, Endpoint

log = logs.get("trendyol")


class TrendyolError(Exception):
    """API erişim hatası. ASLA 'sıfır veri' olarak yorumlanmamalı."""

    def __init__(self, message: str, *, status: int | None = None, endpoint: str = "", retryable: bool = False):
        super().__init__(message)
        self.status = status
        self.endpoint = endpoint
        self.retryable = retryable

    def to_dict(self) -> dict[str, Any]:
        return {"error": str(self), "status": self.status, "endpoint": self.endpoint, "retryable": self.retryable}


class WriteBlocked(TrendyolError):
    pass


class _RateLimiter:
    """Uç nokta başına 10 sn'de 50 istek (Trendyol kuralı) + grup başına dakika bütçesi."""

    def __init__(self) -> None:
        self._win: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def acquire(self, key: str, limit: int, period: float) -> None:
        while True:
            async with self._lock:
                q = self._win.setdefault(key, deque())
                t = time.monotonic()
                while q and t - q[0] >= period:
                    q.popleft()
                if len(q) < limit:
                    q.append(t)
                    return
                wait = period - (t - q[0]) + 0.01
            await asyncio.sleep(min(wait, period))


@dataclass
class CircuitState:
    failures: int = 0
    open_until: float = 0.0


class TrendyolClient:
    MAX_RETRIES = 4
    BASE_BACKOFF = 1.0

    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None,
                 sleep=asyncio.sleep) -> None:
        self.s = settings
        headers = {"User-Agent": settings.user_agent, "Accept": "application/json"}
        if settings.api_key and settings.api_secret and not settings.auth_injected:
            tok = base64.b64encode(f"{settings.api_key}:{settings.api_secret}".encode()).decode()
            headers["Authorization"] = f"Basic {tok}"
        self._http = httpx.AsyncClient(base_url=settings.base_url, headers=headers,
                                       timeout=httpx.Timeout(60.0, connect=10.0), transport=transport)
        self._rl = _RateLimiter()
        self._cache: dict[str, tuple[float, Any]] = {}
        self._circuit: dict[str, CircuitState] = {}
        self._sleep = sleep
        self.stats = {"requests": 0, "retries": 0, "errors": 0, "cache_hits": 0, "last_error": None}

    async def aclose(self) -> None:
        await self._http.aclose()

    # ------------------------------------------------------------------ core
    def _path(self, ep: Endpoint, **path_params: Any) -> str:
        p = ep.path.format(seller_id=self.s.seller_id, **path_params)
        if any(f in p for f in FORBIDDEN_PATH_FRAGMENTS):
            raise WriteBlocked(f"Yazma uç noktası engellendi: {p}", endpoint=ep.key)
        return p

    async def request(self, key: str, params: dict[str, Any] | None = None, json_body: Any = None,
                      cache_ttl: float = 0, **path_params: Any) -> Any:
        ep = ENDPOINTS.get(key)
        if ep is None:
            raise WriteBlocked(f"Kayıtlı olmayan uç nokta reddedildi: {key}", endpoint=key)
        if not ep.read_only:
            raise WriteBlocked(f"Bu sürüm yazma işlemi yapmaz: {key}", endpoint=key)
        if ep.method == "POST" and key != "buybox":
            raise WriteBlocked(f"POST yalnızca belgelenmiş salt okunur sorgular için: {key}", endpoint=key)
        if not self.s.seller_id or not self.s.has_credentials:
            raise TrendyolError("Trendyol kimlik bilgileri yapılandırılmamış.", endpoint=key)
        path = self._path(ep, **path_params)
        params = {k: v for k, v in (params or {}).items() if v is not None}
        ck = f"{ep.method} {path} {json.dumps(params, sort_keys=True)} {json.dumps(json_body, sort_keys=True)}"
        if cache_ttl:
            hit = self._cache.get(ck)
            if hit and hit[0] > time.monotonic():
                self.stats["cache_hits"] += 1
                return hit[1]
        cs = self._circuit.setdefault(ep.group, CircuitState())
        if cs.open_until > time.monotonic():
            raise TrendyolError(f"{ep.group} için devre kesici açık (art arda hatalar); {int(cs.open_until - time.monotonic())} sn sonra tekrar denenecek.",
                                endpoint=key, retryable=True)

        last: TrendyolError | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            await self._rl.acquire(f"ep:{key}", 50, 10.0)
            await self._rl.acquire(f"grp:{ep.group}", ep.per_minute, 60.0)
            self.stats["requests"] += 1
            try:
                r = await self._http.request(ep.method, path, params=params, json=json_body)
            except httpx.HTTPError as e:
                last = TrendyolError(f"Bağlantı hatası: {type(e).__name__}", endpoint=key, retryable=True)
            else:
                if r.status_code == 200:
                    cs.failures = 0
                    try:
                        data = r.json()
                    except ValueError:
                        raise TrendyolError("API geçersiz JSON döndürdü", status=200, endpoint=key)
                    if cache_ttl:
                        self._cache[ck] = (time.monotonic() + cache_ttl, data)
                    return data
                msg = self._error_message(r)
                retryable = r.status_code in (429, 500, 502, 503, 504)
                last = TrendyolError(msg, status=r.status_code, endpoint=key, retryable=retryable)
                if not retryable:
                    break
                ra = r.headers.get("Retry-After")
                if ra and ra.isdigit() and attempt < self.MAX_RETRIES:
                    self.stats["retries"] += 1
                    await self._sleep(min(int(ra), 60))
                    continue
            if attempt < self.MAX_RETRIES and last and last.retryable:
                self.stats["retries"] += 1
                await self._sleep(self.BASE_BACKOFF * (2 ** attempt) + random.uniform(0, 0.5))
                continue
            break
        assert last is not None
        self.stats["errors"] += 1
        self.stats["last_error"] = last.to_dict()
        if last.retryable:
            cs.failures += 1
            if cs.failures >= 3:
                cs.open_until = time.monotonic() + 60 * min(cs.failures, 10)
        log.warning("trendyol request failed", extra={"ctx": last.to_dict()})
        raise last

    @staticmethod
    def _error_message(r: httpx.Response) -> str:
        try:
            body = r.json()
            errs = body.get("errors") or []
            if errs:
                return f"HTTP {r.status_code}: " + "; ".join(str(e.get("message") or e.get("key")) for e in errs)[:300]
            return f"HTTP {r.status_code}: {str(body)[:200]}"
        except ValueError:
            return f"HTTP {r.status_code}"

    # ------------------------------------------------------------- pagination
    async def paginate(self, key: str, params: dict[str, Any] | None = None, *, size: int | None = None,
                       max_pages: int = 500, cache_ttl: float = 0) -> AsyncIterator[dict]:
        """Sayfa sayfa tüm içerik kayıtlarını verir (page/size veya nextPageToken)."""
        ep = ENDPOINTS[key]
        size = min(size or ep.max_size, ep.max_size)
        page, token = 0, None
        params = dict(params or {})
        while page < max_pages:
            # Trendyol: nextPageToken ile page aynı anda gönderilemez (HTTP 400)
            q = {**params, "size": size, **({"nextPageToken": token} if token else {"page": page})}
            data = await self.request(key, q, cache_ttl=cache_ttl)
            items = data.get("content") or []
            for it in items:
                yield it
            total_pages = data.get("totalPages")
            token = data.get("nextPageToken") if key == "products_v2" else None
            page += 1
            if not items or (total_pages is not None and page >= total_pages):
                return
        log.warning("pagination cap reached", extra={"ctx": {"endpoint": key, "max_pages": max_pages}})

    # ---------------------------------------------------------- helpers
    async def buybox(self, barcodes: list[str]) -> list[dict]:
        out: list[dict] = []
        for i in range(0, len(barcodes), 10):
            chunk = barcodes[i:i + 10]
            data = await self.request("buybox", json_body={"barcodes": chunk}, cache_ttl=600)
            out.extend(data.get("buyboxInfo") or [])
        return out

    async def ping(self, key: str) -> dict:
        """Hafif sağlık kontrolü: 1 kayıtlık istek."""
        t = time.monotonic()
        params: dict[str, Any] = {"page": 0, "size": 1}
        if key == "settlements":
            from ..timeutil import now_ms
            params = {"page": 0, "size": 500, "transactionType": "Sale", "startDate": now_ms() - 86_400_000, "endDate": now_ms()}
        try:
            data = await self.request(key, params)
            return {"endpoint": key, "ok": True, "latency_ms": int((time.monotonic() - t) * 1000),
                    "total": data.get("totalElements")}
        except TrendyolError as e:
            return {"endpoint": key, "ok": False, "latency_ms": int((time.monotonic() - t) * 1000), **e.to_dict()}

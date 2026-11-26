"""BOZ System Guardian — sistem sağlığı."""
from __future__ import annotations

import os
import shutil
import time
from typing import Any

from . import __version__
from .config import Settings
from .db import DB
from .timeutil import iso, now_ms
from .trendyol.client import TrendyolClient

_START = time.time()


async def system_health(db: DB, client: TrendyolClient, settings: Settings, probe_api: bool = True) -> dict[str, Any]:
    checks: dict[str, Any] = {}
    if probe_api:
        for k in ("products_v2", "orders_v2", "questions", "claims", "settlements"):
            checks[k] = await client.ping(k)
    integ = db.integrity()
    sync = {r["kind"]: {"last_success": iso(r["last_success"]), "last_attempt": iso(r["last_attempt"]),
                        "last_error": r["last_error"], "rows": r["rows"]} for r in db.q("SELECT * FROM sync_state")}
    errs = [dict(r) for r in db.q("SELECT ts, component, error_type, message FROM error_log ORDER BY id DESC LIMIT 10")]
    for e in errs:
        e["ts"] = iso(e["ts"])
    du = shutil.disk_usage(str(settings.db_path.parent if settings.db_path.parent.exists() else "."))
    size = settings.db_path.stat().st_size if settings.db_path.exists() else None
    api_ok = all(c.get("ok") for c in checks.values()) if checks else None
    stale = [k for k, v in sync.items() if v["last_error"]]
    status = "ok" if (api_ok in (True, None) and integ == "ok" and not stale) else ("degraded" if integ == "ok" else "error")
    try:
        load = os.getloadavg()
    except OSError:
        load = None
    md = [f"### Sistem sağlığı: **{status.upper()}** (BOZ MCP V3 {__version__})",
          "| Bileşen | Durum | Ayrıntı |", "|---|---|---|"]
    for k, c in checks.items():
        md.append(f"| API {k} | {'✅' if c.get('ok') else '❌'} | {c.get('latency_ms')} ms" + (f" · {c.get('error')}" if not c.get("ok") else "") + " |")
    md.append(f"| Veritabanı | {'✅' if integ == 'ok' else '❌'} | bütünlük: {integ}, boyut: {round(size / 1e6, 1) if size else '—'} MB |")
    for k, v in sync.items():
        md.append(f"| Senkron {k} | {'⚠️' if v['last_error'] else '✅'} | son başarı {v['last_success'] or '—'}" + (f" · hata: {v['last_error'][:80]}" if v["last_error"] else "") + " |")
    md.append(f"| Disk | {'⚠️' if du.free < 1e9 else '✅'} | boş {round(du.free / 1e9, 1)} GB |")
    md.append(f"| İstemci | ℹ️ | istek {client.stats['requests']}, yeniden deneme {client.stats['retries']}, hata {client.stats['errors']}, önbellek isabeti {client.stats['cache_hits']} |")
    return {"status": status, "version": __version__, "uptime_s": int(time.time() - _START), "api": checks,
            "database": {"integrity": integ, "size_bytes": size}, "sync": sync, "recent_errors": errs,
            "disk_free_gb": round(du.free / 1e9, 2), "load_avg": load, "client_stats": client.stats,
            "config": settings.public_view(), "markdown": "\n".join(md),
            "warnings": (["API erişim hatası var: sonuçlar eksik olabilir, satış/soru 0 olarak yorumlanmamalı."] if api_ok is False else [])}

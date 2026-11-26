"""Komut satırı: sunucu, senkronizasyon, soru takibi, uyarılar, rapor, yedekleme.

  python -m boz_mcp serve-http          # ChatGPT connector için Streamable HTTP
  python -m boz_mcp serve-stdio         # yerel istemciler / MCP Inspector
  python -m boz_mcp sync [--force]
  python -m boz_mcp watch-questions [--loop 300]
  python -m boz_mcp alerts [--send]
  python -m boz_mcp report [--period last_week] [--out rapor.md]
  python -m boz_mcp health
  python -m boz_mcp backup | restore <dosya>
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from . import logs
from .config import load_settings


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="boz_mcp")
    ap.add_argument("--env", default=None, help=".env dosyası")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("serve-http")
    sub.add_parser("serve-stdio")
    s = sub.add_parser("sync")
    s.add_argument("--force", action="store_true")
    s.add_argument("--full-claims", action="store_true", help="tüm iade geçmişini çek (yavaş, ~25 dk)")
    w = sub.add_parser("watch-questions")
    w.add_argument("--loop", type=int, default=0, help="saniye; 0 = tek sefer (systemd timer/cron için)")
    a = sub.add_parser("alerts")
    a.add_argument("--send", action="store_true", help="kanal etkinse bildirim gönder (varsayılan: yalnızca listele)")
    r = sub.add_parser("report")
    r.add_argument("--period", default="last_week")
    r.add_argument("--out", default=None)
    sub.add_parser("health")
    sub.add_parser("backup")
    rs = sub.add_parser("restore")
    rs.add_argument("file")
    args = ap.parse_args(argv)

    settings = load_settings(args.env)
    logs.setup_logging(settings.log_level)

    if args.cmd == "serve-http":
        import uvicorn
        from .app import create_app
        app, _ = create_app(settings)
        uvicorn.run(app, host=settings.http_host, port=settings.http_port, log_level="warning", proxy_headers=True,
                    forwarded_allow_ips="127.0.0.1")
        return 0
    if args.cmd == "serve-stdio":
        from .server import build_server
        mcp, _ = build_server(settings)
        mcp.run("stdio")
        return 0
    if args.cmd == "restore":
        from .db import DB
        DB.restore(args.file, settings.db_path)
        print(f"Geri yüklendi: {args.file} → {settings.db_path}")
        return 0
    return asyncio.run(_async(args, settings))


async def _async(args, settings) -> int:
    from .db import DB
    from .server import Engine
    eng = Engine(settings)
    try:
        if args.cmd == "sync":
            res = {}
            for k in ("products", "orders", "questions", "settlements", "claims"):
                try:
                    kw = eng._sync_kwargs(k)
                    if k == "claims" and args.full_claims:
                        kw = {"full": True}
                    res[k] = await eng.sync.ensure(k, force=args.force or (k == "claims" and args.full_claims), **kw)
                except Exception as e:
                    res[k] = {"error": str(e)}
            try:
                res["buybox"] = await eng.sync.ensure("buybox", force=args.force)
            except Exception as e:  # buybox isteğe bağlı
                res["buybox"] = {"error": str(e)}
            print(json.dumps(res, ensure_ascii=False, indent=1, default=str))
            return 0 if not any("error" in v for v in res.values() if isinstance(v, dict)) else 2
        if args.cmd == "watch-questions":
            from .watcher import check_questions
            while True:
                res = await check_questions(eng.db, eng.client, settings)
                print(json.dumps({k: v for k, v in res.items() if k != "new_ids"} | {"new_ids": res.get("new_ids", [])[:20]},
                                 ensure_ascii=False, default=str), flush=True)
                if not args.loop:
                    return 0 if res.get("ok") else 2
                await asyncio.sleep(max(60, args.loop))
        if args.cmd == "alerts":
            from .watcher import evaluate_alerts
            await eng.ensure(["orders", "products", "claims"])
            res = await evaluate_alerts(eng.db, settings, send_notifications=args.send)
            print(json.dumps(res, ensure_ascii=False, indent=1, default=str))
            return 0
        if args.cmd == "report":
            from .analytics.report import business_report
            await eng.ensure(["orders", "products", "claims", "questions", "settlements", "buybox"])
            res = business_report(eng.db, settings.thresholds, args.period)
            if args.out:
                Path(args.out).write_text(res["markdown"], encoding="utf-8")
                print(f"Rapor yazıldı: {args.out}")
            else:
                print(res["markdown"])
            return 0
        if args.cmd == "health":
            from .health import system_health
            res = await system_health(eng.db, eng.client, settings)
            print(res["markdown"])
            return 0 if res["status"] == "ok" else 1
        if args.cmd == "backup":
            p = eng.db.backup(settings.backup_dir)
            print(f"Yedek: {p}")
            return 0
    finally:
        await eng.client.aclose()
    return 1


if __name__ == "__main__":
    sys.exit(main())

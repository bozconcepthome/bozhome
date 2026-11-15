"""
Codex app-server istemcisi: hesap bilgisi, model listesi ve kullanım limitleri.

`codex app-server` arka planda sürekli açık tutulur ve JSON-RPC (satır başına bir
JSON) ile konuşulur. Kullanılan çağrılar:
    initialize, model/list, account/read, account/rateLimits/read
Bildirim:
    account/rateLimits/updated  -> limitler değişince kendiliğinden gelir
"""
from __future__ import annotations

import json
import subprocess
import threading
import time
from typing import Callable

from codex_bridge import IS_WIN, NO_WINDOW


class CodexAccount:
    def __init__(self, cmd_prefix: list[str] | None, on_notify: Callable[[str, dict], None]):
        self.cmd_prefix = cmd_prefix
        self.on_notify = on_notify
        self.proc: subprocess.Popen | None = None
        self._id = 0
        self._pending: dict[int, tuple[threading.Event, dict]] = {}
        self._lock = threading.Lock()
        self._models_cache: list[dict] | None = None

    # ------------------------------------------------------------ süreç
    def _ensure(self) -> bool:
        if self.proc and self.proc.poll() is None:
            return True
        if not self.cmd_prefix:
            return False
        try:
            self.proc = subprocess.Popen(
                self.cmd_prefix + ["app-server"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL, text=True, encoding="utf-8", errors="replace",
                bufsize=1, creationflags=NO_WINDOW,
            )
        except Exception:
            self.proc = None
            return False
        threading.Thread(target=self._reader, args=(self.proc,), daemon=True).start()
        res = self._call_raw("initialize", {"clientInfo": {"name": "boz_agent", "title": "Boz Agent", "version": "1.1"}}, 30)
        if res is None or "error" in res:
            return False
        self._send({"method": "initialized"})
        return True

    def _reader(self, proc: subprocess.Popen) -> None:
        for line in proc.stdout:
            try:
                msg = json.loads(line)
            except Exception:
                continue
            if "id" in msg and ("result" in msg or "error" in msg):
                waiter = self._pending.pop(msg["id"], None)
                if waiter:
                    waiter[1].update(msg)
                    waiter[0].set()
            elif "method" in msg and "id" not in msg:
                try:
                    self.on_notify(msg["method"], msg.get("params") or {})
                except Exception:
                    pass
            elif "method" in msg and "id" in msg:
                # sunucu bizden bir şey isterse (beklenmez) reddet
                self._send({"id": msg["id"], "error": {"code": -32601, "message": "not supported"}})

    def _send(self, obj: dict) -> None:
        with self._lock:
            if self.proc and self.proc.stdin:
                self.proc.stdin.write(json.dumps(obj) + "\n")
                self.proc.stdin.flush()

    def _call_raw(self, method: str, params: dict | None, timeout: float) -> dict | None:
        with self._lock:
            self._id += 1
            rid = self._id
        ev, box = threading.Event(), {}
        self._pending[rid] = (ev, box)
        msg = {"id": rid, "method": method}
        if params is not None:
            msg["params"] = params
        try:
            self._send(msg)
        except Exception:
            self._pending.pop(rid, None)
            return None
        if not ev.wait(timeout):
            self._pending.pop(rid, None)
            return None
        return box

    def call(self, method: str, params: dict | None = None, timeout: float = 30) -> dict:
        if not self._ensure():
            return {"error": {"message": "Codex app-server başlatılamadı"}}
        res = self._call_raw(method, params, timeout)
        if res is None:
            return {"error": {"message": "Codex yanıt vermedi"}}
        return res

    def close(self) -> None:
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.kill()
            except Exception:
                pass

    # ------------------------------------------------------------ yüksek seviye
    def models(self, refresh: bool = False) -> list[dict]:
        if self._models_cache and not refresh:
            return self._models_cache
        out: list[dict] = []
        cursor = None
        for _ in range(5):
            params = {"cursor": cursor} if cursor else {}
            r = self.call("model/list", params)
            res = r.get("result") or {}
            for m in res.get("data", []):
                if m.get("hidden"):
                    continue
                out.append({
                    "id": m.get("model") or m.get("id"),
                    "name": m.get("displayName") or m.get("id"),
                    "description": m.get("description", ""),
                    "isDefault": bool(m.get("isDefault")),
                    "efforts": [e.get("reasoningEffort") for e in m.get("supportedReasoningEfforts", [])],
                    "defaultEffort": m.get("defaultReasoningEffort"),
                    "tiers": [{"id": t.get("id"), "name": t.get("name"), "description": t.get("description", "")}
                              for t in m.get("serviceTiers", [])],
                    "images": "image" in (m.get("inputModalities") or ["image"]),
                })
            cursor = res.get("nextCursor")
            if not cursor:
                break
        if out:
            self._models_cache = out
        return out

    def account(self) -> dict:
        r = self.call("account/read", {})
        acc = (r.get("result") or {}).get("account") or {}
        return {
            "type": acc.get("type"),
            "email": acc.get("email"),
            "plan": acc.get("planType"),
            "workspace": acc.get("workspaceName"),
        }

    def rate_limits(self) -> dict:
        r = self.call("account/rateLimits/read")
        if "error" in r:
            return {"ok": False, "error": (r["error"] or {}).get("message", "")}
        res = r.get("result") or {}
        snap = res.get("rateLimits") or {}
        by_id = res.get("rateLimitsByLimitId") or {}
        if "codex" in by_id:
            snap = by_id["codex"] or snap
        return {"ok": True, "fetchedAt": int(time.time()), **simplify_snapshot(snap),
                "allowed": res.get("ordinaryUsageAllowed")}


def simplify_snapshot(snap: dict) -> dict:
    def win(w):
        if not w:
            return None
        return {"used": w.get("usedPercent", 0), "mins": w.get("windowDurationMins"), "resetsAt": w.get("resetsAt")}

    credits = snap.get("credits") or {}
    return {
        "plan": snap.get("planType"),
        "primary": win(snap.get("primary")),
        "secondary": win(snap.get("secondary")),
        "reached": snap.get("rateLimitReachedType"),
        "credits": credits.get("balance") if credits.get("hasCredits") else None,
        "unlimited": bool(credits.get("unlimited")),
    }

"""
Boz Agent — ChatGPT (Codex CLI) ile çalışan, animasyonlu bilgisayar asistanı.

Başlatmak için: baslat.bat  (veya:  pythonw app.py)
"""
from __future__ import annotations

import json
import secrets
import shutil
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import webview

from codex_account import CodexAccount, simplify_snapshot
from codex_bridge import CodexBridge, normalize_mode

HERE = Path(__file__).resolve().parent
HOME = Path.home() / "BozAgent"
WORKDIR = HOME / "calisma"
SETTINGS_FILE = HOME / "ayarlar.json"

DEFAULT_SETTINGS = {
    "mode": "akilli",   # akilli | hepsi | serbest
    "voice": False,
    "model": "",        # boş = hesabın varsayılan modeli
    "effort": "",       # boş = modelin varsayılan düşünme seviyesi
    "fast": False,      # hızlı mod (service_tier=priority)
    "mini": False,
}

W, H = 400, 640
MINI_W, MINI_H = 170, 190
ASK_TIMEOUT = 300  # sn; izin kartı cevaplanmazsa reddedilir


def load_settings() -> dict:
    try:
        s = {**DEFAULT_SETTINGS, **json.loads(SETTINGS_FILE.read_text("utf-8"))}
    except Exception:
        s = dict(DEFAULT_SETTINGS)
    s["mode"] = normalize_mode(s.get("mode"))
    return s


def save_settings(s: dict) -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(s, ensure_ascii=False, indent=2), "utf-8")


def prepare_workdir() -> None:
    WORKDIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(HERE / "AGENTS.md", WORKDIR / "AGENTS.md")


class PermissionServer:
    """pc_tools_server'ın izin sorularını Boz arayüzüne taşıyan küçük yerel HTTP sunucusu.
    Sadece 127.0.0.1'i dinler ve rastgele bir anahtar ister."""

    def __init__(self, on_ask):
        self.on_ask = on_ask
        self.token = secrets.token_urlsafe(24)
        self.waiting: dict[str, tuple[threading.Event, dict]] = {}
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):  # konsola yazma
                pass

            def do_POST(self):
                if self.path != "/ask" or self.headers.get("X-Boz-Token") != outer.token:
                    self.send_response(403)
                    self.end_headers()
                    return
                n = int(self.headers.get("Content-Length") or 0)
                try:
                    body = json.loads(self.rfile.read(n) or b"{}")
                except Exception:
                    body = {}
                answer = outer.ask(str(body.get("action", "")), bool(body.get("risky")))
                data = json.dumps({"answer": answer}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def ask(self, action: str, risky: bool) -> str:
        rid = uuid.uuid4().hex[:10]
        ev, box = threading.Event(), {}
        self.waiting[rid] = (ev, box)
        self.on_ask({"type": "ask", "id": rid, "action": action, "risky": risky, "timeout": ASK_TIMEOUT})
        ok = ev.wait(ASK_TIMEOUT)
        self.waiting.pop(rid, None)
        if not ok:
            self.on_ask({"type": "ask_closed", "id": rid})
            return "deny"
        return box.get("answer", "deny")

    def answer(self, rid: str, answer: str) -> None:
        w = self.waiting.get(rid)
        if w:
            w[1]["answer"] = answer if answer in ("once", "always", "deny") else "deny"
            w[0].set()

    def deny_all(self) -> None:
        for rid in list(self.waiting):
            self.answer(rid, "deny")


class Api:
    """JavaScript tarafından çağrılan fonksiyonlar (window.pywebview.api.*).
    DİKKAT: pywebview bu sınıfın alt çizgisiz tüm özelliklerini tarar;
    pencere gibi nesneler mutlaka _ ile başlamalı (yoksa uygulama donar)."""

    def __init__(self) -> None:
        self._window: webview.Window | None = None
        self._settings = load_settings()
        self._bridge = CodexBridge(self._on_bridge_event, WORKDIR)
        self._perm = PermissionServer(self._emit)
        self._bridge.ui_url, self._bridge.ui_token = self._perm.url, self._perm.token
        self._account = CodexAccount(self._bridge.cmd_prefix, self._on_notify)
        self._last_usage: dict | None = None

    # ---------------------------------------------------- Python -> JS
    def _emit(self, ev: dict) -> None:
        if self._window:
            try:
                self._window.evaluate_js(f"window.onAgentEvent({json.dumps(ev, ensure_ascii=False)})")
            except Exception:
                pass

    def _on_bridge_event(self, ev: dict) -> None:
        self._emit(ev)
        if ev.get("type") in ("done", "error", "stopped"):
            self._perm.deny_all()
            threading.Thread(target=self._push_usage, daemon=True).start()

    def _on_notify(self, method: str, params: dict) -> None:
        if method == "account/rateLimits/updated" and params.get("rateLimits"):
            usage = {"ok": True, "fetchedAt": int(time.time()), **simplify_snapshot(params["rateLimits"])}
            if self._last_usage:  # bildirim bazen sadece değişen pencereyi içerir
                for k in ("primary", "secondary", "plan"):
                    if usage.get(k) is None:
                        usage[k] = self._last_usage.get(k)
            self._last_usage = usage
            self._emit({"type": "usage", **usage})

    def _push_usage(self) -> None:
        usage = self._account.rate_limits()
        if usage.get("ok"):
            self._last_usage = usage
        self._emit({"type": "usage", **usage})

    # ---------------------------------------------------- JS -> Python
    def init(self) -> dict:
        def boot():
            st = self._bridge.check()
            self._emit({"type": "status", **st})
            if st.get("ok"):
                self._emit({"type": "account", **self._account.account()})
                self._emit({"type": "models", "models": self._account.models()})
                self._push_usage()

        threading.Thread(target=boot, daemon=True).start()
        threading.Thread(target=self._usage_loop, daemon=True).start()
        return self._settings

    def _usage_loop(self) -> None:
        while True:
            time.sleep(120)
            if not self._bridge.busy:
                try:
                    self._push_usage()
                except Exception:
                    pass

    def send(self, text: str) -> None:
        text = (text or "").strip()
        if text:
            self._bridge.send(text, self._settings)

    def stop(self) -> None:
        self._perm.deny_all()
        self._bridge.stop()

    def answer(self, rid: str, answer: str) -> None:
        self._perm.answer(rid, answer)

    def new_chat(self) -> None:
        self._bridge.new_chat()

    def login(self) -> None:
        self._bridge.login()

    def recheck(self) -> None:
        threading.Thread(target=lambda: (self._emit({"type": "status", **self._bridge.check()}),
                                         self.refresh_all()), daemon=True).start()

    def refresh_all(self) -> None:
        self._emit({"type": "account", **self._account.account()})
        self._emit({"type": "models", "models": self._account.models(refresh=True)})
        self._push_usage()

    def refresh_usage(self) -> None:
        threading.Thread(target=self._push_usage, daemon=True).start()

    def set_setting(self, key: str, value) -> dict:
        if key in DEFAULT_SETTINGS:
            if key == "mode":
                value = normalize_mode(value)
            self._settings[key] = value
            save_settings(self._settings)
        return self._settings

    def set_mini(self, mini: bool) -> None:
        if not self._window:
            return
        self._settings["mini"] = bool(mini)
        save_settings(self._settings)
        self._window.resize(MINI_W, MINI_H) if mini else self._window.resize(W, H)

    def minimize(self) -> None:
        if self._window:
            self._window.minimize()

    def quit(self) -> None:
        self._perm.deny_all()
        self._bridge.stop()
        self._account.close()
        if self._window:
            self._window.destroy()


def main() -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    if sys.stderr is None or "pythonw" in sys.executable.lower():
        # pythonw konsol açmaz; hataları dosyaya yaz ki sorun olursa görülebilsin
        log = open(HOME / "hata.log", "w", encoding="utf-8", buffering=1)
        sys.stdout = sys.stderr = log
    prepare_workdir()
    api = Api()
    x = y = None
    try:
        scr = webview.screens[0]
        x, y = scr.width - W - 24, scr.height - H - 64
    except Exception:
        pass
    mini = api._settings.get("mini")
    win = webview.create_window(
        "Boz Agent",
        url=str(HERE / "ui" / "index.html"),
        js_api=api,
        width=MINI_W if mini else W,
        height=MINI_H if mini else H,
        x=x, y=y,
        frameless=True,
        easy_drag=False,
        on_top=True,
        resizable=False,
        background_color="#0b0f1e",
    )
    api._window = win
    win.events.closed += lambda: (api._account.close(), api._bridge.stop())
    webview.start(debug="--debug" in sys.argv)


if __name__ == "__main__":
    main()

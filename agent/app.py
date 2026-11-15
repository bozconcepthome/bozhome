"""
Boz Agent — ChatGPT (Codex CLI) ile çalışan, animasyonlu bilgisayar asistanı.

Başlatmak için: baslat.bat  (veya:  pythonw app.py)
"""
from __future__ import annotations

import json
import shutil
import sys
import threading
from pathlib import Path

import webview

from codex_bridge import CodexBridge

HERE = Path(__file__).resolve().parent
HOME = Path.home() / "BozAgent"
WORKDIR = HOME / "calisma"
SETTINGS_FILE = HOME / "ayarlar.json"

DEFAULT_SETTINGS = {"mode": "onayli", "voice": False, "model": "", "mini": False}

W, H = 400, 620
MINI_W, MINI_H = 170, 190


def load_settings() -> dict:
    try:
        return {**DEFAULT_SETTINGS, **json.loads(SETTINGS_FILE.read_text("utf-8"))}
    except Exception:
        return dict(DEFAULT_SETTINGS)


def save_settings(s: dict) -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(s, ensure_ascii=False, indent=2), "utf-8")


def prepare_workdir() -> None:
    WORKDIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(HERE / "AGENTS.md", WORKDIR / "AGENTS.md")


class Api:
    """JavaScript tarafından çağrılan fonksiyonlar (window.pywebview.api.*)."""

    def __init__(self) -> None:
        self.window: webview.Window | None = None
        self.settings = load_settings()
        self.bridge = CodexBridge(self._emit, WORKDIR)

    # Python -> JS
    def _emit(self, ev: dict) -> None:
        if self.window:
            try:
                self.window.evaluate_js(f"window.onAgentEvent({json.dumps(ev, ensure_ascii=False)})")
            except Exception:
                pass

    # JS -> Python
    def init(self) -> dict:
        threading.Thread(target=lambda: self._emit({"type": "status", **self.bridge.check()}),
                         daemon=True).start()
        return self.settings

    def send(self, text: str) -> None:
        text = (text or "").strip()
        if text:
            self.bridge.send(text, self.settings)

    def stop(self) -> None:
        self.bridge.stop()

    def new_chat(self) -> None:
        self.bridge.new_chat()

    def login(self) -> None:
        self.bridge.login()

    def recheck(self) -> None:
        self._emit({"type": "status", **self.bridge.check()})

    def set_setting(self, key: str, value) -> dict:
        if key in DEFAULT_SETTINGS:
            self.settings[key] = value
            save_settings(self.settings)
        return self.settings

    def set_mini(self, mini: bool) -> None:
        if not self.window:
            return
        self.settings["mini"] = bool(mini)
        save_settings(self.settings)
        if mini:
            self.window.resize(MINI_W, MINI_H)
        else:
            self.window.resize(W, H)

    def minimize(self) -> None:
        if self.window:
            self.window.minimize()

    def quit(self) -> None:
        self.bridge.stop()
        if self.window:
            self.window.destroy()


def main() -> None:
    prepare_workdir()
    api = Api()
    x = y = None
    try:
        scr = webview.screens[0]
        x, y = scr.width - W - 24, scr.height - H - 64
    except Exception:
        pass
    mini = api.settings.get("mini")
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
    api.window = win
    webview.start(debug="--debug" in sys.argv)


if __name__ == "__main__":
    main()

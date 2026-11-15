"""
Codex CLI köprüsü.

ChatGPT Plus/Pro aboneliğinle giriş yapılmış `codex` komutunu arka planda
çalıştırır (`codex exec --json`), çıktısındaki olayları okur ve arayüze
basit olaylara çevirerek iletir:

    thinking / tool / command / message / done / error / log
"""
from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import sys
import threading
from pathlib import Path
from typing import Callable

IS_WIN = sys.platform == "win32"
NO_WINDOW = 0x08000000 if IS_WIN else 0  # CREATE_NO_WINDOW: siyah konsol açılmasın

HERE = Path(__file__).resolve().parent


def _toml_str(s: str) -> str:
    """Python string -> TOML string (JSON kaçışları TOML ile uyumludur)."""
    return json.dumps(s, ensure_ascii=False)


def find_codex() -> list[str] | None:
    """codex'i çalıştırmak için komut önekini bulur.
    Windows'ta .cmd yerine doğrudan node + codex.js kullanılır (daha güvenilir)."""
    node = shutil.which("node")
    candidates: list[Path] = []
    if IS_WIN and os.environ.get("APPDATA"):
        candidates.append(Path(os.environ["APPDATA"]) / "npm/node_modules/@openai/codex/bin/codex.js")
    try:
        npm = shutil.which("npm")
        if npm:
            root = subprocess.run(
                [npm, "root", "-g"], capture_output=True, text=True, timeout=20,
                creationflags=NO_WINDOW, shell=IS_WIN,
            ).stdout.strip()
            if root:
                candidates.append(Path(root) / "@openai/codex/bin/codex.js")
    except Exception:
        pass
    if node:
        for c in candidates:
            if c.exists():
                return [node, str(c)]
    exe = shutil.which("codex")
    return [exe] if exe else None


class CodexBridge:
    def __init__(self, emit: Callable[[dict], None], workdir: Path):
        self.emit = emit
        self.workdir = workdir
        self.thread_id: str | None = None
        self.proc: subprocess.Popen | None = None
        self.cmd_prefix = find_codex()
        self._lock = threading.Lock()
        self._stopped = False

    # ------------------------------------------------------------ durum
    @property
    def busy(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def check(self) -> dict:
        """Codex kurulu mu, giriş yapılmış mı?"""
        if not self.cmd_prefix:
            self.cmd_prefix = find_codex()
        if not self.cmd_prefix:
            return {"ok": False, "reason": "codex_missing"}
        try:
            r = subprocess.run(
                self.cmd_prefix + ["login", "status"], capture_output=True, text=True,
                timeout=30, creationflags=NO_WINDOW, encoding="utf-8", errors="replace",
            )
            out = (r.stdout + r.stderr).strip()
            if r.returncode != 0 or "not logged in" in out.lower():
                return {"ok": False, "reason": "not_logged_in", "detail": out}
            return {"ok": True, "detail": out}
        except Exception as e:
            return {"ok": False, "reason": "error", "detail": str(e)}

    def login(self) -> None:
        """Tarayıcıda ChatGPT girişi açan `codex login` komutunu görünür bir pencerede başlatır."""
        if not self.cmd_prefix:
            return
        if IS_WIN:
            subprocess.Popen(
                ["cmd", "/c", "start", "Boz Agent - ChatGPT girisi", "cmd", "/k"]
                + self.cmd_prefix + ["login"]
            )
        else:
            subprocess.Popen(self.cmd_prefix + ["login"])

    def new_chat(self) -> None:
        self.thread_id = None

    # ------------------------------------------------------------ komut
    def _build_cmd(self, settings: dict, resume: bool) -> list[str]:
        safe = settings.get("mode", "onayli") == "onayli"
        py = Path(sys.executable)
        if IS_WIN and (py.parent / "pythonw.exe").exists():
            py = py.parent / "pythonw.exe"  # MCP sunucusu konsol penceresi açmasın
        server = str(HERE / "pc_tools_server.py")
        server_args = [server] + (["--confirm"] if safe else [])

        cfg = [
            f"mcp_servers.pc.command={_toml_str(str(py))}",
            "mcp_servers.pc.args=[" + ",".join(_toml_str(a) for a in server_args) + "]",
            "mcp_servers.pc.startup_timeout_sec=40",
            "mcp_servers.pc.tool_timeout_sec=600",
            'approval_policy="never"',
            'sandbox_mode="workspace-write"' if safe else 'sandbox_mode="danger-full-access"',
            "sandbox_workspace_write.network_access=true",
        ]
        if settings.get("model"):
            cfg.append(f"model={_toml_str(settings['model'])}")

        cmd = list(self.cmd_prefix) + ["exec", "--json", "--skip-git-repo-check"]
        for c in cfg:
            cmd += ["-c", c]
        if resume and self.thread_id:
            cmd += ["resume", self.thread_id, "-"]
        else:
            cmd += ["-C", str(self.workdir), "-"]
        return cmd

    def send(self, text: str, settings: dict) -> None:
        with self._lock:
            if self.busy:
                self.emit({"type": "error", "text": "Hâlâ önceki görev üzerinde çalışıyorum."})
                return
            if not self.cmd_prefix:
                self.emit({"type": "error", "text": "Codex bulunamadı. Önce kur.bat'ı çalıştır."})
                return
            threading.Thread(target=self._run, args=(text, settings), daemon=True).start()

    def stop(self) -> None:
        p = self.proc
        if not p or p.poll() is not None:
            return
        self._stopped = True
        try:
            if IS_WIN:  # tüm alt süreç ağacını kapat (codex + MCP sunucusu)
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)],
                               capture_output=True, creationflags=NO_WINDOW)
            else:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        except Exception:
            p.kill()
        self.emit({"type": "stopped"})

    def _run(self, text: str, settings: dict, allow_retry: bool = True) -> None:
        resume = self.thread_id is not None
        cmd = self._build_cmd(settings, resume)
        self._stopped = False
        self.emit({"type": "thinking", "text": "Düşünüyorum..."})
        try:
            self.proc = subprocess.Popen(
                cmd, cwd=str(self.workdir), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
                creationflags=NO_WINDOW, start_new_session=not IS_WIN, bufsize=1,
            )
        except Exception as e:
            self.emit({"type": "error", "text": f"Codex başlatılamadı: {e}"})
            return

        try:
            self.proc.stdin.write(text)
            self.proc.stdin.close()
        except Exception:
            pass

        stderr_lines: list[str] = []
        threading.Thread(target=lambda: stderr_lines.extend(self.proc.stderr), daemon=True).start()

        got_event = False
        finished = False
        for line in self.proc.stdout:
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            got_event = True
            finished |= self._handle(ev)

        code = self.proc.wait()
        self.proc = None
        if self._stopped:
            return
        if code != 0 and not finished:
            err = "".join(stderr_lines[-15:]).strip()
            if resume and allow_retry and not got_event:
                # eski oturum açılamadıysa yeni sohbetle tekrar dene
                self.thread_id = None
                self.emit({"type": "log", "text": "Önceki sohbet açılamadı, yeni sohbet başlatıyorum."})
                return self._run(text, settings, allow_retry=False)
            self.emit({"type": "error", "text": _friendly_error(err) or f"Codex hata kodu {code}"})
        elif not finished:
            self.emit({"type": "done", "text": ""})

    # ------------------------------------------------------------ olaylar
    def _handle(self, ev: dict) -> bool:
        t = ev.get("type", "")
        if t == "thread.started":
            self.thread_id = ev.get("thread_id") or self.thread_id
        elif t == "turn.started":
            self.emit({"type": "thinking", "text": "Düşünüyorum..."})
        elif t in ("item.started", "item.updated", "item.completed"):
            self._handle_item(t.split(".")[1], ev.get("item") or {})
        elif t == "turn.completed":
            self.emit({"type": "done", "usage": ev.get("usage")})
            return True
        elif t == "turn.failed":
            msg = (ev.get("error") or {}).get("message", "Görev başarısız oldu")
            self.emit({"type": "error", "text": _friendly_error(msg)})
            return True
        elif t == "error":
            self.emit({"type": "error", "text": _friendly_error(ev.get("message", "Bilinmeyen hata"))})
        return False

    def _handle_item(self, phase: str, item: dict) -> None:
        it = item.get("type") or item.get("item_type") or ""
        if it == "agent_message" and phase == "completed":
            self.emit({"type": "message", "text": item.get("text", "")})
        elif it == "reasoning":
            lines = [l.strip().strip("*#").strip() for l in (item.get("text") or "").splitlines()]
            txt = next((l for l in lines if l), "")
            if txt:
                self.emit({"type": "thinking", "text": txt[:140]})
        elif it == "command_execution":
            self.emit({
                "type": "command", "phase": phase,
                "command": item.get("command", ""),
                "exit_code": item.get("exit_code"),
            })
        elif it == "mcp_tool_call":
            self.emit({
                "type": "tool", "phase": phase,
                "tool": item.get("tool", ""),
                "args": item.get("arguments") or {},
                "status": item.get("status"),
            })
        elif it == "file_change" and phase == "completed":
            files = [c.get("path", "") for c in item.get("changes", [])]
            self.emit({"type": "log", "text": "Dosya değişti: " + ", ".join(files)})
        elif it == "web_search" and phase == "started":
            self.emit({"type": "tool", "phase": "started", "tool": "web_search",
                       "args": {"query": item.get("query", "")}})
        elif it == "todo_list":
            items = item.get("items", [])
            self.emit({"type": "todo", "items": items})
        elif it == "error":
            self.emit({"type": "log", "text": item.get("message", "")})


def _friendly_error(msg: str) -> str:
    low = (msg or "").lower()
    if "not logged in" in low or "401" in low or "unauthorized" in low:
        return "ChatGPT hesabına giriş yapılmamış. Ayarlar → 'ChatGPT ile giriş yap'."
    if "usage limit" in low or "rate limit" in low or "429" in low:
        return "ChatGPT kullanım limitine ulaşıldı. Biraz bekleyip tekrar dene."
    return msg

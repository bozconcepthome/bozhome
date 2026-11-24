"""JARVIS araçları: bilgisayar ve telefon üzerinde gerçek işlemler.

Her araç bir JSON şeması (Claude'a gönderilir) ve bir Python fonksiyonu
(yerelde çalışır) içerir. `dangerous=True` olan araçlar, otomatik onay
kapalıysa çalışmadan önce arayüzden kullanıcı onayı ister.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import platform
import shutil
import subprocess
import time
import webbrowser
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

MAX_OUT = 20_000
DATA_DIR = Path(os.environ.get("JARVIS_DATA_DIR", Path.home() / ".jarvis"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_FILE = DATA_DIR / "memory.json"
SYSTEM = platform.system()  # "Windows" | "Darwin" | "Linux"

# Ekran görüntüsü küçültüldüğünde fare koordinatlarını geri ölçeklemek için
_screen_scale = 1.0


def _trim(text: str, limit: int = MAX_OUT) -> str:
    if len(text) <= limit:
        return text
    half = limit // 2
    return f"{text[:half]}\n\n... [{len(text) - limit} karakter kırpıldı] ...\n\n{text[-half:]}"


async def _run(cmd: str | list[str], timeout: int = 60, shell: bool = False) -> str:
    def go() -> str:
        try:
            p = subprocess.run(
                cmd, shell=shell, capture_output=True, text=True,
                timeout=timeout, encoding="utf-8", errors="replace",
            )
        except subprocess.TimeoutExpired:
            return f"[zaman aşımı: {timeout} sn]"
        except FileNotFoundError as e:
            return f"[komut bulunamadı: {e}]"
        out = (p.stdout or "") + (("\n[stderr]\n" + p.stderr) if p.stderr else "")
        return _trim(f"[çıkış kodu {p.returncode}]\n{out.strip()}")

    return await asyncio.to_thread(go)


# ---------------------------------------------------------------- bilgisayar

async def run_shell(command: str, timeout: int = 60) -> str:
    return await _run(command, timeout=min(max(timeout, 1), 600), shell=True)


async def read_file(path: str, max_chars: int = MAX_OUT) -> str:
    p = Path(path).expanduser()
    if not p.exists():
        return f"Dosya yok: {p}"
    if p.is_dir():
        return f"Bu bir klasör: {p} (list_dir kullan)"
    return _trim(p.read_text(encoding="utf-8", errors="replace"), max_chars)


async def write_file(path: str, content: str, append: bool = False) -> str:
    p = Path(path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a" if append else "w", encoding="utf-8") as f:
        f.write(content)
    return f"{'Eklendi' if append else 'Yazıldı'}: {p} ({len(content)} karakter)"


async def list_dir(path: str = "~") -> str:
    p = Path(path).expanduser()
    if not p.is_dir():
        return f"Klasör yok: {p}"
    rows = []
    for child in sorted(p.iterdir(), key=lambda c: (not c.is_dir(), c.name.lower()))[:500]:
        try:
            size = "" if child.is_dir() else f"{child.stat().st_size:>12,}"
        except OSError:
            size = "?"
        rows.append(f"{'📁' if child.is_dir() else '📄'} {child.name}  {size}")
    return f"{p}\n" + "\n".join(rows)


async def open_target(target: str) -> str:
    """URL, dosya, klasör ya da uygulama aç."""
    if target.startswith(("http://", "https://")):
        webbrowser.open(target)
        return f"Tarayıcıda açıldı: {target}"
    if SYSTEM == "Windows":
        try:
            os.startfile(target)  # type: ignore[attr-defined]
            return f"Açıldı: {target}"
        except OSError:
            return await _run(f'start "" "{target}"', shell=True)
    if SYSTEM == "Darwin":
        if Path(target).expanduser().exists():
            return await _run(["open", str(Path(target).expanduser())])
        return await _run(["open", "-a", target])
    if Path(target).expanduser().exists():
        return await _run(["xdg-open", str(Path(target).expanduser())])
    exe = shutil.which(target)
    if exe:
        subprocess.Popen([exe], start_new_session=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return f"Başlatıldı: {exe}"
    return f"Bulunamadı: {target}"


async def screenshot() -> list[dict[str, Any]] | str:
    """Ekranın görüntüsünü al; Claude görerek analiz eder."""
    global _screen_scale
    try:
        import mss
        from PIL import Image
    except ImportError:
        return "Ekran görüntüsü için: pip install mss pillow"

    def grab() -> tuple[str, int, int, float]:
        with mss.mss() as sct:
            shot = sct.grab(sct.monitors[1])
            img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        scale = min(1.0, 1366 / img.width)
        if scale < 1:
            img = img.resize((int(img.width * scale), int(img.height * scale)))
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode(), img.width, img.height, scale

    data, w, h, scale = await asyncio.to_thread(grab)
    _screen_scale = scale
    return [
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}},
        {"type": "text", "text": f"Ekran görüntüsü {w}x{h}. Fare koordinatlarını bu görüntüye göre ver."},
    ]


async def computer_control(action: str, x: int | None = None, y: int | None = None,
                           text: str | None = None, keys: list[str] | None = None,
                           amount: int = 3) -> str:
    """Fare ve klavye kontrolü (pyautogui)."""
    try:
        import pyautogui
    except ImportError:
        return "Fare/klavye kontrolü için: pip install pyautogui"
    pyautogui.FAILSAFE = True
    s = _screen_scale or 1.0

    def real(v: int | None) -> int | None:
        return None if v is None else int(v / s)

    def go() -> str:
        if action in ("click", "double_click", "right_click", "move"):
            if x is None or y is None:
                return "x ve y gerekli"
            rx, ry = real(x), real(y)
            {"click": pyautogui.click, "double_click": pyautogui.doubleClick,
             "right_click": pyautogui.rightClick, "move": pyautogui.moveTo}[action](rx, ry)
            return f"{action} ({rx},{ry})"
        if action == "type":
            pyautogui.write(text or "", interval=0.01)
            return f"Yazıldı: {text!r}"
        if action == "hotkey":
            pyautogui.hotkey(*(keys or []))
            return f"Tuşlar: {'+'.join(keys or [])}"
        if action == "scroll":
            pyautogui.scroll(amount * 100)
            return f"Kaydırıldı: {amount}"
        return f"Bilinmeyen eylem: {action}"

    out = await asyncio.to_thread(go)
    await asyncio.sleep(0.4)
    return out


async def system_status() -> str:
    return json.dumps(get_stats(detailed=True), ensure_ascii=False, indent=1)


def get_stats(detailed: bool = False) -> dict[str, Any]:
    try:
        import psutil
    except ImportError:
        return {"hata": "pip install psutil"}
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage(str(Path.home().anchor or "/"))
    bat = psutil.sensors_battery() if hasattr(psutil, "sensors_battery") else None
    stats: dict[str, Any] = {
        "os": f"{SYSTEM} {platform.release()}",
        "host": platform.node(),
        "cpu": psutil.cpu_percent(interval=None),
        "cores": psutil.cpu_count(),
        "ram": vm.percent,
        "ram_gb": round(vm.total / 1e9, 1),
        "disk": disk.percent,
        "disk_free_gb": round(disk.free / 1e9, 1),
        "battery": None if bat is None else round(bat.percent),
        "plugged": None if bat is None else bat.power_plugged,
        "uptime_h": round((time.time() - psutil.boot_time()) / 3600, 1),
    }
    if detailed:
        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            procs.append(p.info)
        procs.sort(key=lambda i: i.get("memory_percent") or 0, reverse=True)
        stats["top_processes"] = [
            {"pid": p["pid"], "name": p["name"], "mem%": round(p["memory_percent"] or 0, 1)}
            for p in procs[:12]
        ]
    return stats


async def clipboard(action: str, text: str | None = None) -> str:
    try:
        import pyperclip
    except ImportError:
        return "Pano için: pip install pyperclip"
    if action == "read":
        return _trim(pyperclip.paste() or "(pano boş)")
    pyperclip.copy(text or "")
    return "Panoya kopyalandı."


# ---------------------------------------------------------------- hafıza

def load_memories() -> list[dict[str, str]]:
    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []


async def remember(fact: str) -> str:
    mem = load_memories()
    mem.append({"fact": fact, "at": time.strftime("%Y-%m-%d %H:%M")})
    MEMORY_FILE.write_text(json.dumps(mem, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"Hafızaya kaydedildi ({len(mem)} kayıt)."


async def recall(query: str = "") -> str:
    mem = load_memories()
    q = query.lower().strip()
    hits = [m for m in mem if not q or any(w in m["fact"].lower() for w in q.split())]
    if not hits:
        return "Eşleşen anı yok."
    return "\n".join(f"- [{m['at']}] {m['fact']}" for m in hits[-50:])


async def forget(query: str) -> str:
    mem = load_memories()
    kept = [m for m in mem if query.lower() not in m["fact"].lower()]
    MEMORY_FILE.write_text(json.dumps(kept, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"{len(mem) - len(kept)} kayıt silindi."


# ---------------------------------------------------------------- telefon (Android / ADB)

def _adb() -> str | None:
    return shutil.which("adb")


async def phone(action: str, command: str | None = None, x: int | None = None,
                y: int | None = None, x2: int | None = None, y2: int | None = None,
                text: str | None = None, package: str | None = None,
                number: str | None = None) -> Any:
    adb = _adb()
    if not adb:
        return ("ADB bulunamadı. Android Platform Tools kur, telefonda USB/Kablosuz hata "
                "ayıklamayı aç, sonra `adb devices` ile bağlan.")
    if action == "devices":
        return await _run([adb, "devices", "-l"])
    if action == "shell":
        return await _run([adb, "shell", command or "echo"], timeout=60)
    if action == "screenshot":
        def grab() -> bytes:
            return subprocess.run([adb, "exec-out", "screencap", "-p"],
                                  capture_output=True, timeout=30).stdout
        raw = await asyncio.to_thread(grab)
        if not raw:
            return "Telefon ekran görüntüsü alınamadı."
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(raw))
            scale = min(1.0, 900 / img.height)
            note = f"Görüntü %{round(scale * 100)} küçültüldü; tap için koordinatları {1 / scale:.3f} ile çarp."
            if scale < 1:
                img = img.resize((int(img.width * scale), int(img.height * scale)))
            buf = io.BytesIO()
            img.convert("RGB").save(buf, format="PNG", optimize=True)
            raw = buf.getvalue()
        except ImportError:
            note = "Orijinal çözünürlük."
        return [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                         "data": base64.b64encode(raw).decode()}},
            {"type": "text", "text": f"Telefon ekranı. {note}"},
        ]
    if action == "tap":
        return await _run([adb, "shell", "input", "tap", str(x), str(y)])
    if action == "swipe":
        return await _run([adb, "shell", "input", "swipe", str(x), str(y), str(x2), str(y2), "300"])
    if action == "type":
        safe = (text or "").replace(" ", "%s")
        return await _run([adb, "shell", "input", "text", safe])
    if action == "key":
        return await _run([adb, "shell", "input", "keyevent", command or "KEYCODE_HOME"])
    if action == "open_app":
        return await _run([adb, "shell", "monkey", "-p", package or "", "-c",
                           "android.intent.category.LAUNCHER", "1"])
    if action == "list_apps":
        return await _run([adb, "shell", "pm", "list", "packages", "-3"])
    if action == "notifications":
        out = await _run([adb, "shell", "dumpsys", "notification", "--noredact"], timeout=30)
        lines = [ln.strip() for ln in out.splitlines()
                 if "android.title=" in ln or "android.text=" in ln or "pkg=" in ln]
        return _trim("\n".join(lines) or out, 8000)
    if action == "battery":
        return await _run([adb, "shell", "dumpsys", "battery"])
    if action == "call":
        return await _run([adb, "shell", "am", "start", "-a", "android.intent.action.CALL",
                           "-d", f"tel:{number}"])
    if action == "sms":
        return await _run([adb, "shell", "am", "start", "-a", "android.intent.action.SENDTO",
                           "-d", f"sms:{number}", "--es", "sms_body", text or ""])
    return f"Bilinmeyen telefon eylemi: {action}"


# ---------------------------------------------------------------- kayıt

@dataclass
class Tool:
    name: str
    description: str
    schema: dict[str, Any]
    fn: Callable[..., Awaitable[Any]]
    dangerous: bool = False

    def spec(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.schema,
            "eager_input_streaming": True,
        }


def _obj(props: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {"type": "object", "properties": props, "required": required or []}


S = {"type": "string"}
I = {"type": "integer"}

TOOLS: list[Tool] = [
    Tool("run_shell",
         "Kullanıcının bilgisayarında bir kabuk komutu çalıştırır (Windows'ta cmd, "
         "macOS/Linux'ta sh). Program kurmak, dosya aramak, git, ağ bilgisi, betik "
         "çalıştırmak vb. için kullan. Çıktı ve çıkış kodu döner.",
         _obj({"command": S, "timeout": {**I, "description": "saniye, varsayılan 60"}}, ["command"]),
         run_shell, dangerous=True),
    Tool("read_file", "Bir metin dosyasını okur.", _obj({"path": S}, ["path"]), read_file),
    Tool("write_file", "Bir dosyaya metin yazar (veya append=true ile sonuna ekler).",
         _obj({"path": S, "content": S, "append": {"type": "boolean"}}, ["path", "content"]),
         write_file, dangerous=True),
    Tool("list_dir", "Bir klasördeki dosya ve klasörleri listeler.", _obj({"path": S}), list_dir),
    Tool("open_target",
         "Bir web adresini, dosyayı, klasörü ya da uygulamayı açar "
         "(ör. 'https://youtube.com', 'spotify', 'notepad', '~/Belgeler').",
         _obj({"target": S}, ["target"]), open_target),
    Tool("screenshot",
         "Bilgisayar ekranının görüntüsünü alır, böylece ekranda ne olduğunu görebilirsin. "
         "computer_control'den önce ve sonra kullan.", _obj({}), screenshot),
    Tool("computer_control",
         "Fare ve klavyeyi kontrol eder. action: click | double_click | right_click | move "
         "(x,y gerekir; son ekran görüntüsünün koordinatları), type (text), "
         "hotkey (keys, ör. ['ctrl','c']), scroll (amount; negatif = aşağı).",
         _obj({"action": {"type": "string", "enum": ["click", "double_click", "right_click",
                                                      "move", "type", "hotkey", "scroll"]},
               "x": I, "y": I, "text": S, "keys": {"type": "array", "items": S}, "amount": I},
              ["action"]),
         computer_control, dangerous=True),
    Tool("system_status",
         "CPU, RAM, disk, pil, çalışma süresi ve en çok bellek kullanan işlemleri verir.",
         _obj({}), system_status),
    Tool("clipboard", "Panoyu okur (action=read) veya panoya yazar (action=write, text).",
         _obj({"action": {"type": "string", "enum": ["read", "write"]}, "text": S}, ["action"]),
         clipboard),
    Tool("remember",
         "Kullanıcı hakkında kalıcı bir bilgiyi uzun süreli hafızaya kaydeder "
         "(tercihler, isimler, projeler, rutinler). Önemli bir şey öğrendiğinde kendiliğinden kullan.",
         _obj({"fact": S}, ["fact"]), remember),
    Tool("recall", "Uzun süreli hafızada arama yapar (boş sorgu = hepsi).", _obj({"query": S}), recall),
    Tool("forget", "Sorguyu içeren anıları hafızadan siler.", _obj({"query": S}, ["query"]),
         forget, dangerous=True),
    Tool("phone",
         "Kullanıcının Android telefonunu ADB ile kontrol eder. action: devices | screenshot | "
         "tap (x,y) | swipe (x,y,x2,y2) | type (text) | key (command=KEYCODE_HOME/BACK/...) | "
         "open_app (package) | list_apps | notifications | battery | shell (command) | "
         "call (number) | sms (number, text — mesaj ekranını açar).",
         _obj({"action": {"type": "string", "enum": [
             "devices", "screenshot", "tap", "swipe", "type", "key", "open_app", "list_apps",
             "notifications", "battery", "shell", "call", "sms"]},
               "command": S, "x": I, "y": I, "x2": I, "y2": I, "text": S, "package": S, "number": S},
              ["action"]),
         phone, dangerous=True),
]

TOOL_MAP = {t.name: t for t in TOOLS}

# Telefon eylemlerinden yalnızca bunlar onaysız çalışır
SAFE_PHONE_ACTIONS = {"devices", "screenshot", "list_apps", "notifications", "battery"}


def needs_approval(name: str, args: dict[str, Any]) -> bool:
    tool = TOOL_MAP.get(name)
    if not tool or not tool.dangerous:
        return False
    if name == "phone" and args.get("action") in SAFE_PHONE_ACTIONS:
        return False
    return True


_PY_TYPES = {"string": str, "integer": int, "number": (int, float), "boolean": bool,
             "array": list, "object": dict}


def validate(name: str, args: Any) -> str | None:
    """Akışla gelen araç girdisini şemaya karşı doğrula. Hata metni ya da None döner."""
    tool = TOOL_MAP.get(name)
    if tool is None:
        return f"Bilinmeyen araç: {name}"
    if not isinstance(args, dict):
        return "Girdi bir JSON nesnesi değil"
    props = tool.schema.get("properties", {})
    for key in tool.schema.get("required", []):
        if key not in args:
            return f"Eksik alan: {key}"
    for key, val in args.items():
        spec = props.get(key)
        if spec is None or val is None:
            continue
        want = _PY_TYPES.get(spec.get("type", ""))
        if want and (not isinstance(val, want) or (spec["type"] == "integer" and isinstance(val, bool))):
            return f"'{key}' alanı {spec['type']} olmalı"
        if "enum" in spec and val not in spec["enum"]:
            return f"'{key}' geçersiz: {val}"
    return None


async def execute(name: str, args: dict[str, Any]) -> Any:
    return await TOOL_MAP[name].fn(**args)

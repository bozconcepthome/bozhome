"""
Boz Agent - Bilgisayar kontrol araçları (MCP sunucusu)

Codex CLI bu sunucuyu kendisi başlatır ve şu araçları kullanır:
ekran görüntüsü, tıklama, yazma, kısayol tuşu, kaydırma, pencere listesi...

Güvenlik:
  * --confirm ile başlatılırsa her fare/klavye işleminden önce
    ekranda "İzin ver / Reddet" penceresi açılır.
  * Fareyi ekranın SOL ÜST köşesine hızla götürmek tüm işlemleri durdurur
    (pyautogui failsafe).
"""
from __future__ import annotations

import argparse
import base64
import io
import os
import subprocess
import sys
import time

# --- Windows: gerçek piksel koordinatlarını kullan (ekran ölçekleme %125/%150 vb.)
if sys.platform == "win32":
    try:
        import ctypes

        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

import mss
import pyautogui
from PIL import Image as PILImage, ImageDraw, ImageFont

try:  # mcp 2.x
    from mcp.server.mcpserver import Image, MCPServer as _Server
except ImportError:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP as _Server, Image

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.08

parser = argparse.ArgumentParser()
parser.add_argument("--confirm", action="store_true", help="Her işlemden önce onay iste")
parser.add_argument("--max-width", type=int, default=1366)
ARGS, _ = parser.parse_known_args()

# Ekran görüntüsü küçültülerek gönderilir; koordinatlar bu ölçekle geri çevrilir.
_scale = {"x": 1.0, "y": 1.0, "left": 0, "top": 0}

mcp = _Server(
    "boz-pc",
    instructions=(
        "Windows bilgisayarı kontrol eden araçlar. Her zaman önce screenshot al, "
        "koordinatları SON ekran görüntüsündeki piksel değerleriyle ver. "
        "İşlemden sonra sonucu görmek için tekrar screenshot al."
    ),
)


# ---------------------------------------------------------------- yardımcılar
def _ask_permission(action: str) -> bool:
    """Onay modunda kullanıcıya küçük, her zaman üstte bir pencere gösterir."""
    if not ARGS.confirm:
        return True
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        ok = messagebox.askyesno(
            "Boz Agent izin istiyor",
            f"Boz şu işlemi yapmak istiyor:\n\n{action}\n\nİzin veriyor musun?",
            parent=root,
        )
        root.destroy()
        return bool(ok)
    except Exception:
        return False


def _denied(action: str) -> str:
    return f"KULLANICI REDDETTİ: '{action}' yapılmadı. Kullanıcıya ne yapmak istediğini sor."


def _to_screen(x: float, y: float) -> tuple[int, int]:
    return (
        int(round(_scale["left"] + x * _scale["x"])),
        int(round(_scale["top"] + y * _scale["y"])),
    )


def _draw_grid(img: PILImage.Image, step: int = 100) -> None:
    d = ImageDraw.Draw(img, "RGBA")
    try:
        font = ImageFont.truetype("arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    w, h = img.size
    for x in range(step, w, step):
        d.line([(x, 0), (x, h)], fill=(255, 0, 255, 70), width=1)
        d.text((x + 2, 2), str(x), fill=(255, 0, 255, 220), font=font)
    for y in range(step, h, step):
        d.line([(0, y), (w, y)], fill=(255, 0, 255, 70), width=1)
        d.text((2, y + 2), str(y), fill=(255, 0, 255, 220), font=font)


# ---------------------------------------------------------------- araçlar
@mcp.tool()
def screenshot(grid: bool = True) -> list:
    """Ana ekranın görüntüsünü alır. grid=True ise her 100 pikselde koordinat çizgileri çizer.
    Diğer araçlara vereceğin x,y değerleri BU görüntüdeki piksellerdir."""
    with (getattr(mss, "MSS", None) or mss.mss)() as sct:
        mon = sct.monitors[1]
        raw = sct.grab(mon)
        img = PILImage.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
    w, h = img.size
    ratio = min(1.0, ARGS.max_width / w)
    if ratio < 1.0:
        img = img.resize((int(w * ratio), int(h * ratio)), PILImage.LANCZOS)
    _scale.update(x=w / img.size[0], y=h / img.size[1], left=mon["left"], top=mon["top"])
    # fare imlecinin yerini kırmızı halka ile göster
    mx, my = pyautogui.position()
    cx, cy = (mx - mon["left"]) / _scale["x"], (my - mon["top"]) / _scale["y"]
    if grid:
        _draw_grid(img)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=(255, 40, 40), width=3)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    info = (
        f"Ekran görüntüsü {img.size[0]}x{img.size[1]} (gerçek ekran {w}x{h}). "
        f"Fare imleci yaklaşık ({int(cx)},{int(cy)}) - kırmızı halka."
    )
    return [info, Image(data=buf.getvalue(), format="jpeg")]


@mcp.tool()
def click(x: int, y: int, button: str = "left", clicks: int = 1) -> str:
    """Verilen koordinata tıklar. button: left | right | middle. clicks=2 çift tıklama."""
    action = f"({x},{y}) noktasına {clicks}x {button} tıklama"
    if not _ask_permission(action):
        return _denied(action)
    sx, sy = _to_screen(x, y)
    pyautogui.moveTo(sx, sy, duration=0.25, tween=pyautogui.easeOutQuad)
    pyautogui.click(sx, sy, clicks=clicks, interval=0.1, button=button)
    return f"Tıklandı: {action}"


@mcp.tool()
def move_mouse(x: int, y: int) -> str:
    """Fareyi verilen koordinata götürür (tıklamadan)."""
    sx, sy = _to_screen(x, y)
    pyautogui.moveTo(sx, sy, duration=0.3, tween=pyautogui.easeInOutQuad)
    return f"Fare ({x},{y}) noktasına taşındı"


@mcp.tool()
def drag(from_x: int, from_y: int, to_x: int, to_y: int) -> str:
    """Sol tuşa basılı tutarak bir noktadan diğerine sürükler."""
    action = f"({from_x},{from_y}) → ({to_x},{to_y}) sürükleme"
    if not _ask_permission(action):
        return _denied(action)
    pyautogui.moveTo(*_to_screen(from_x, from_y), duration=0.2)
    pyautogui.dragTo(*_to_screen(to_x, to_y), duration=0.6, button="left")
    return f"Sürüklendi: {action}"


@mcp.tool()
def type_text(text: str, press_enter: bool = False) -> str:
    """Odaktaki alana metin yazar. Türkçe karakterler (ç ğ ı ö ş ü) desteklenir."""
    preview = text if len(text) < 80 else text[:77] + "..."
    action = f'Yazı yazma: "{preview}"' + (" + Enter" if press_enter else "")
    if not _ask_permission(action):
        return _denied(action)
    if text.isascii():
        pyautogui.write(text, interval=0.02)
    else:  # ASCII dışı karakterler için pano üzerinden yapıştır
        import pyperclip

        old = None
        try:
            old = pyperclip.paste()
        except Exception:
            pass
        pyperclip.copy(text)
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.15)
        if old is not None:
            try:
                pyperclip.copy(old)
            except Exception:
                pass
    if press_enter:
        pyautogui.press("enter")
    return f"Yazıldı: {action}"


@mcp.tool()
def press_keys(keys: list[str]) -> str:
    """Kısayol tuşuna basar. Örnek: ["ctrl","c"], ["win","r"], ["alt","tab"], ["enter"]."""
    action = "Tuş: " + "+".join(keys)
    if not _ask_permission(action):
        return _denied(action)
    keys = [k.lower() for k in keys]
    if len(keys) == 1:
        pyautogui.press(keys[0])
    else:
        pyautogui.hotkey(*keys)
    return f"Basıldı: {action}"


@mcp.tool()
def scroll(amount: int, x: int | None = None, y: int | None = None) -> str:
    """Fare tekerleğini çevirir. Pozitif = yukarı, negatif = aşağı (ör. -5)."""
    if x is not None and y is not None:
        pyautogui.moveTo(*_to_screen(x, y), duration=0.15)
    pyautogui.scroll(amount * 120 if sys.platform == "win32" else amount)
    return f"Kaydırıldı: {amount}"


@mcp.tool()
def list_windows() -> str:
    """Açık pencerelerin başlıklarını listeler."""
    try:
        import pygetwindow as gw

        titles = [t for t in gw.getAllTitles() if t.strip()]
        return "Açık pencereler:\n" + "\n".join(f"- {t}" for t in titles[:60])
    except Exception as e:
        return f"Pencere listesi alınamadı: {e}"


@mcp.tool()
def focus_window(title_contains: str) -> str:
    """Başlığında verilen metin geçen pencereyi öne getirir."""
    try:
        import pygetwindow as gw

        wins = [w for w in gw.getAllWindows() if title_contains.lower() in w.title.lower()]
        if not wins:
            return f"'{title_contains}' içeren pencere bulunamadı"
        w = wins[0]
        if w.isMinimized:
            w.restore()
        try:
            w.activate()
        except Exception:
            pyautogui.press("alt")  # Windows odak kısıtlamasını aşmak için
            w.activate()
        return f"Öne getirildi: {w.title}"
    except Exception as e:
        return f"Pencere öne getirilemedi: {e}"


@mcp.tool()
def open_app_or_url(target: str) -> str:
    """Program, dosya, klasör veya web adresi açar. Örnek: "notepad", "calc",
    "https://youtube.com", "C:\\Users\\...\\Belgeler"."""
    action = f"Açma: {target}"
    if not _ask_permission(action):
        return _denied(action)
    if sys.platform == "win32":
        os.startfile(target) if os.path.exists(target) or "://" in target else subprocess.Popen(
            ["cmd", "/c", "start", "", target], shell=False
        )
    else:
        subprocess.Popen(["xdg-open", target])
    time.sleep(1.0)
    return f"Açıldı: {target}"


@mcp.tool()
def wait(seconds: float = 1.0) -> str:
    """Bir şeyin yüklenmesi için bekler (en fazla 15 sn)."""
    time.sleep(max(0.0, min(15.0, seconds)))
    return f"{seconds} sn beklendi"


if __name__ == "__main__":
    mcp.run()

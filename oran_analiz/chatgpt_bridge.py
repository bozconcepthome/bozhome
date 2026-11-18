"""ChatGPT koprusu (sifresiz, kurallara uygun).

Hazir promptu panoya kopyalar ve kullanicinin tarayicisinda chatgpt.com'u acar.
Kisa promptlar adres cubugundan (?q=) otomatik yazilir; uzun olanlar icin Ctrl+V yeterli.
Kullanicinin hesabi/sifresi bu uygulamaya hic girmez.
"""
from __future__ import annotations

import urllib.parse
import webbrowser
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent / "prompt_sablon.txt"
CHATGPT = "https://chatgpt.com/"
MAX_URL = 7000  # cok uzun adresler sunucu tarafindan reddedilebilir


def build_prompt(home: str, away: str, date: str, data_summary: str = "") -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    text = text.replace("{EV}", home).replace("{DEP}", away).replace("{TARIH}", date)
    if data_summary:
        text += ("\n\nEK VERI - Uygulamanin The Odds API'den cektigi ve kendi hesapladigi GERCEK oran "
                 "hareketleri (bunlari capraz kontrol icin kullan, degistirme):\n" + data_summary)
    return text


def open_chatgpt(prompt: str) -> bool:
    """Tarayicida ChatGPT'yi acar. True = prompt adrese yazildi, False = Ctrl+V gerekir."""
    url = CHATGPT + "?q=" + urllib.parse.quote(prompt)
    if len(url) <= MAX_URL:
        webbrowser.open(url)
        return True
    webbrowser.open(CHATGPT)
    return False

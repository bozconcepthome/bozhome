"""Claude web arastirma ajani.

10 kaynagi (OddsPortal, Oddschecker, Betwatch ...) web aramasi ve sayfa okuma ile
tarar, rapor metnini yazar ve buldugu GERCEK oran kayitlarini yapilandirilmis JSON
olarak dondurur. Yuzde/olasilik hesaplari ajana birakilmaz; uygulamanin kendi
analysis.py modulu yapar.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Callable

import anthropic

MODEL = "claude-opus-5-5"
FALLBACK_BETA = "server-side-fallback-2026-07-01"

SOURCES = [
    ("OddsPortal", "https://www.oddsportal.com/"),
    ("Oddschecker", "https://www.oddschecker.com/market-movers/football"),
    ("Betwatch", "https://betwatch.io/odds/soccer"),
    ("KickoffScore", "https://kickoffscore.com/dropping-odds"),
    ("xG.Football", "https://xg.football/dropping-odds"),
    ("BetArchives", "https://betarchives.com/"),
    ("Footiqo", "https://footiqo.com/premium/historical-football-odds/"),
    ("The Odds API", "https://the-odds-api.com/historical-odds-data/"),
    ("5DollarFootballAPI", "https://5dollarfootballapi.com/docs/odds-history"),
    ("SockOdds", "https://sockodds.com/use-cases/historical-odds-data-api/"),
]

MARKETS = [
    "MS", "Cifte Sans", "IY Sonuc", "IY/MS", "Asya Handikap", "Avrupa Handikap", "Beraberlikte Iade",
    "Alt/Ust", "IY Alt/Ust", "2Y Alt/Ust", "Ev Gol Alt/Ust", "Dep Gol Alt/Ust",
    "KG", "IY KG", "MS+KG", "Kesin Skor",
    "Korner Alt/Ust", "IY Korner Alt/Ust", "Ev Korner Alt/Ust", "Dep Korner Alt/Ust", "Korner Handikap",
    "En Cok Korner", "Kart Alt/Ust", "Kirmizi Kart", "Ev Kart Alt/Ust", "Dep Kart Alt/Ust",
    "Sut Alt/Ust", "Isabetli Sut Alt/Ust", "Ilk Gol", "Gol Zamani", "Diger",
]

SYSTEM = """Sen profesyonel bir futbol bahis piyasasi veri analistisin. Amacin mac tahmini yapmak DEGIL;
bahis sirketlerinin acilistan itibaren hangi marketlerde oran dusurdugunu/yukselttigini gercek verilerle
ortaya cikarmaktir.

KESIN KURALLAR
- Gercek internet arastirmasi yap (web_search ve web_fetch araclarini kullan).
- Oranlari, saatleri veya tarihleri ASLA uydurma. Sayfada gormedigin bir degeri yazma.
- Erisilemeyen bilgiye "Dogrulanamadi" yaz. Ucretli/giris gerektiren veriyi belirt.
- Mac oncesi ve canli oranlari ayri tut. Bitmis maclarda acilis/kapanis oranlarini esas al.
- Ayni bahis sirketinin ayni market, ayni secim ve ayni cizgi icin verdigi oranlari karsilastir.
  Farkli sirketlerin farkli zamanlardaki oranlarini tek hareket sayma. 2.5 ust ile 3.5 ustu karistirma.
- Ayni saglayicidan kopyalanmis oranlari bagimsiz dogrulama sayma.
- Manipulasyon, sike, iceriden bilgi veya garanti sonuc iddiasinda bulunma; hareketleri mac sonucu
  tahmini olarak yorumlama.
- Tum marketler incelenemediyse "tum marketler" sonucunu kesinmis gibi sunma.
- Tum saatleri Turkiye saati (UTC+3) ile ver.
"""

USER_TEMPLATE = """ANALIZ EDILECEK MAC: {home} vs {away}
MAC TARIHI: {date}
{league_line}
ANALIZ ZAMANI (Turkiye saati): {now}

1. KAYNAK ARASTIRMASI - su 10 kaynagi bu mac icin denetle; her birinin ilgili mac, bahis sirketi,
market ve tarih icin gercek oran gecmisi sunup sunmadigini belirle. Mumkunse dogrudan mac sayfasini bul
(ozellikle OddsPortal mac sayfasi ve market sekmeleri, Oddschecker market movers, dropping-odds sayfalari):
{sources}
Bir kaynaga erisilemiyorsa alternatif guvenilir kaynak ara (or. Flashscore oran gecmisi, BetExplorer,
Betfair borsa hacimleri). Ucretli veriye erisimin yoksa belirt.

2. TUM BAHIS MARKETLERINI TARA: MS 1/X/2, cifte sans, IY sonucu, IY/MS, Asya/Avrupa handikap,
toplam gol 0.5-5.5, IY ve 2Y alt/ust, takim gol alt/ust, KG var/yok, IY KG, MS+KG, kesin skorlar,
korner (toplam 6.5-12.5, takim, IY, handikap, en cok korner), kart, kirmizi kart, sut/isabetli sut,
ilk gol, gol zaman araliklari ve diger ozel marketler. Hicbir marketin mevcut oldugunu varsayma.
Gecmis orani bulunamayan marketleri ayrica listele.

3. Buldugun her market/secim/bahis sirketi icin: ilk kaydedilen acilis orani ve zamani, son/kapanis
orani ve zamani, varsa ara kayitlar, en yuksek/en dusuk.

{odds_api_note}

RAPOR (Turkce, Markdown) su sirayla:
## MAC BILGILERI
## KAYNAK DOGRULAMASI  (kaynak | erisim durumu | bulunan marketler | dogrudan baglanti)
## WEBDE BULUNAN ORAN HAREKETLERI  (market | secim | sirket | acilis (saat) | son (saat) | kaynak linki)
## BAHIS SIRKETLERI ARASINDA KARSILASTIRMA  (hangi sirket ilk hareket etti - yalniz zaman damgasi varsa)
## DIKKAT CEKEN HAREKETLER  (yalniz gozlemlenen veri)
## VERI KALITESI  (kaynak farklari, eksik marketler, zaman uyusmazliklari, erisim sinirlari)
Yuzde degisim ve olasilik hesaplarini uygulama ayrica yapacak; sen ham degerleri eksiksiz ve kaynakli ver.
"""

EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "match": {
            "type": "object",
            "properties": {
                "home": {"type": "string"}, "away": {"type": "string"}, "league": {"type": "string"},
                "kickoff_tr": {"type": "string"}, "status": {"type": "string"},
            },
            "required": ["home", "away", "league", "kickoff_tr", "status"],
            "additionalProperties": False,
        },
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "url": {"type": "string"},
                    "status": {"type": "string", "enum": ["Erisildi - veri var", "Erisildi - mac verisi yok",
                                                          "Ucretli / giris gerekli", "Erisilemedi"]},
                    "markets_found": {"type": "string"},
                    "note": {"type": "string"},
                },
                "required": ["name", "url", "status", "markets_found", "note"],
                "additionalProperties": False,
            },
        },
        "records": {
            "type": "array",
            "description": "Kaynakta GORULEN oran kayitlari. Her kayit tek sirket/market/secim/cizgi icin "
                           "zaman sirali en az iki oran icermeli. Uydurma yok.",
            "items": {
                "type": "object",
                "properties": {
                    "market": {"type": "string", "enum": MARKETS},
                    "selection": {"type": "string", "description": "1, X, 2, 1X, Ust, Alt, Var, Yok, 2-1, Ev, Dep..."},
                    "line": {"type": "string", "description": "2.5 gibi; cizgisizse bos"},
                    "bookmaker": {"type": "string"},
                    "phase": {"type": "string", "enum": ["pre", "live"]},
                    "points": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time_utc": {"type": "string", "description": "ISO 8601 UTC; bilinmiyorsa bos"},
                                "price": {"type": "number"},
                            },
                            "required": ["time_utc", "price"],
                            "additionalProperties": False,
                        },
                    },
                    "source": {"type": "string"},
                    "url": {"type": "string"},
                },
                "required": ["market", "selection", "line", "bookmaker", "phase", "points", "source", "url"],
                "additionalProperties": False,
            },
        },
        "unavailable_markets": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["match", "sources", "records", "unavailable_markets"],
    "additionalProperties": False,
}


class AgentError(Exception):
    pass


def _client(api_key: str) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key.strip()) if api_key.strip() else anthropic.Anthropic()


def research(api_key: str, home: str, away: str, date: str, league: str, odds_api_summary: str,
             log: Callable[[str], None], stream_text: Callable[[str], None],
             stop_flag: Callable[[], bool] = lambda: False, effort: str = "high") -> str:
    client = _client(api_key)
    now = datetime.now(timezone.utc).astimezone().strftime("%d.%m.%Y %H:%M")
    sources = "\n".join(f"{i}. {n} - {u}" for i, (n, u) in enumerate(SOURCES, 1))
    note = ("Uygulama The Odds API'den su gercek verileri zaten cekti (bunlari tekrar uydurma, "
            "web kaynaklariyla capraz kontrol icin kullan):\n" + odds_api_summary) if odds_api_summary else \
        "Uygulama The Odds API verisi cekemedi; tum veriyi web kaynaklarindan bul."
    user = USER_TEMPLATE.format(home=home, away=away, date=date,
                                league_line=f"LIG: {league}" if league else "",
                                now=now, sources=sources, odds_api_note=note)
    messages: list = [{"role": "user", "content": user}]
    tools = [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": 40},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 40},
    ]
    final_text = ""
    for turn in range(12):
        if stop_flag():
            raise AgentError("Kullanici durdurdu.")
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=64000,
            system=SYSTEM,
            messages=messages,
            tools=tools,
            thinking={"type": "adaptive"},
            output_config={"effort": effort},
            betas=[FALLBACK_BETA],
            fallbacks="default",
        ) as stream:
            for event in stream:
                if stop_flag():
                    raise AgentError("Kullanici durdurdu.")
                if event.type == "content_block_start":
                    blk = event.content_block
                    if blk.type == "server_tool_use":
                        log(f"  [{blk.name}] calisiyor...")
                elif event.type == "content_block_stop":
                    blk = getattr(event, "content_block", None)
                    if blk is not None and getattr(blk, "type", "") == "server_tool_use":
                        inp = blk.input or {}
                        log(f"  [{blk.name}] {inp.get('query') or inp.get('url') or ''}")
                elif event.type == "text":
                    stream_text(event.text)
            response = stream.get_final_message()

        if response.stop_reason == "refusal":
            raise AgentError("Model istegi reddetti (refusal).")
        messages.append({"role": "assistant", "content": response.content})
        text = "".join(b.text for b in response.content if b.type == "text")
        final_text += text
        if response.stop_reason == "pause_turn":
            log("  (arastirma devam ediyor...)")
            continue
        break
    return final_text


def extract_records(api_key: str, report: str, log: Callable[[str], None]) -> dict:
    """Rapor metnindeki gercek oran kayitlarini sema ile JSON'a cevirir."""
    client = _client(api_key)
    prompt = ("Asagidaki arastirma raporunda GECEN oran kayitlarini ve kaynak durumlarini JSON'a aktar. "
              "Raporda olmayan hicbir sayi, saat veya sirket ekleme. Saatler Turkiye saatiyse UTC'ye cevir "
              "(3 saat cikar). Tek noktalik kayitlari (sadece guncel oran) records'a ekleme.\n\n" + report)
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=64000,
        messages=[{"role": "user", "content": prompt}],
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": EXTRACT_SCHEMA}},
        betas=[FALLBACK_BETA],
        fallbacks="default",
    ) as stream:
        response = stream.get_final_message()
    if response.stop_reason == "refusal":
        raise AgentError("Model JSON cikarimini reddetti.")
    text = next((b.text for b in response.content if b.type == "text"), "")
    try:
        data = json.loads(text)
    except ValueError as e:
        raise AgentError(f"JSON cozulmedi: {e}") from e
    log(f"Web kaynaklarindan {len(data.get('records', []))} oran serisi cikarildi.")
    return data

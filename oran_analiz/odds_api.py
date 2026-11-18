"""The Odds API (https://the-odds-api.com) istemcisi.

Gercek, zaman damgali oran gecmisi icin kullanilir. Gecmis (historical) uc noktalar
ucretli planlarda calisir; ucretsiz anahtar sadece guncel oranlari verir.
Tum cekilen anlik goruntuler yerel diske kaydedilir, boylece ayni mac tekrar
analiz edildiginde kredi harcanmaz ve uygulama zamanla kendi oran gecmisini biriktirir.
"""
from __future__ import annotations

import difflib
import json
import os
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

import requests

from analysis import OddsPoint, SeriesKey

BASE = "https://api.the-odds-api.com"
SOURCE = "The Odds API"
CACHE_DIR = Path(os.path.expanduser("~")) / ".oran_analiz" / "cache"

# Futbol icin istenen marketler. Desteklenmeyenler otomatik atlanir.
DEFAULT_MARKETS = [
    "h2h", "totals", "btts", "spreads", "draw_no_bet", "double_chance",
    "h2h_h1", "totals_h1", "totals_h2", "alternate_totals", "team_totals",
    "alternate_totals_corners", "alternate_spreads_corners", "alternate_totals_cards",
]

# Mac saatine gore anlik goruntu (snapshot) zamanlari
SNAPSHOT_PLANS = {
    "Ekonomik (5 nokta)": [-72, -24, -6, -1, 0],
    "Standart (9 nokta)": [-168, -72, -48, -24, -12, -6, -3, -1, 0],
    "Detayli (15 nokta)": [-336, -168, -96, -72, -48, -36, -24, -18, -12, -9, -6, -3, -2, -1, 0],
}

Log = Callable[[str], None]


class OddsApiError(Exception):
    pass


@dataclass
class Event:
    id: str
    sport_key: str
    sport_title: str
    home: str
    away: str
    commence: datetime
    score: float = 0.0

    @property
    def url(self) -> str:
        return f"{BASE}/v4/sports/{self.sport_key}/events/{self.id}/odds"


def _norm(s: str) -> str:
    s = s.lower()
    s = s.replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\b(fc|sk|cf|ac|afc|as|sc|fk|jk|spor kulubu|club|cd|ud|sv|bk|if)\b", " ", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def name_similarity(a: str, b: str) -> float:
    na, nb = _norm(a), _norm(b)
    if not na or not nb:
        return 0.0
    if na in nb or nb in na:
        return 0.95
    return difflib.SequenceMatcher(None, na, nb).ratio()


def _parse_time(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class OddsApiClient:
    def __init__(self, api_key: str, regions: str = "eu,uk", log: Log | None = None):
        self.api_key = api_key.strip()
        self.regions = regions
        self.log = log or (lambda s: None)
        self.remaining: str | None = None
        self.used: str | None = None
        self.session = requests.Session()

    # ------------------------------------------------------------------
    def _get(self, path: str, **params) -> dict | list:
        params["apiKey"] = self.api_key
        r = self.session.get(BASE + path, params=params, timeout=40)
        self.remaining = r.headers.get("x-requests-remaining", self.remaining)
        self.used = r.headers.get("x-requests-used", self.used)
        if r.status_code != 200:
            try:
                body = r.json()
            except ValueError:
                body = {"message": r.text[:300]}
            raise OddsApiError(f"HTTP {r.status_code}: {body.get('message', body)} "
                               f"[{body.get('error_code', '')}]")
        return r.json()

    # ------------------------------------------------------------------
    def soccer_sports(self) -> list[dict]:
        data = self._get("/v4/sports", all="true")
        return [s for s in data if s.get("group", "").lower() == "soccer"]

    def find_event(self, home: str, away: str, date: datetime, sport_key: str | None = None) -> Event:
        """Takim adlarina ve tarihe gore maci bulur."""
        now = datetime.now(timezone.utc)
        if sport_key:
            sports = [{"key": sport_key, "title": sport_key}]
        else:
            sports = self.soccer_sports()
        upcoming = date.date() >= now.date()
        self.log(f"{len(sports)} futbol ligi taraniyor ({'guncel' if upcoming else 'gecmis'} etkinlik listesi)...")

        def fetch(sport: dict) -> list[Event]:
            try:
                if upcoming:
                    data = self._get(f"/v4/sports/{sport['key']}/events")
                else:
                    snap = self._get(f"/v4/historical/sports/{sport['key']}/events",
                                     date=_iso(datetime.combine(date.date(), datetime.min.time(),
                                                                tzinfo=timezone.utc)))
                    data = snap.get("data", [])
            except OddsApiError as e:
                if "HISTORICAL" in str(e).upper() or "401" in str(e):
                    raise
                return []
            evs = []
            for d in data:
                evs.append(Event(d["id"], d.get("sport_key", sport["key"]), d.get("sport_title", sport.get("title", "")),
                                 d["home_team"], d["away_team"], _parse_time(d["commence_time"])))
            return evs

        events: list[Event] = []
        with ThreadPoolExecutor(max_workers=8) as ex:
            for evs in ex.map(fetch, sports):
                events.extend(evs)

        best: Event | None = None
        for ev in events:
            day_gap = abs((ev.commence.date() - date.date()).days)
            if day_gap > 1:
                continue
            s = (name_similarity(home, ev.home) + name_similarity(away, ev.away)) / 2
            s -= 0.1 * day_gap
            ev.score = s
            if best is None or s > best.score:
                best = ev
        if best is None or best.score < 0.55:
            raise OddsApiError("Mac The Odds API etkinlik listesinde bulunamadi. Lig secerek veya takim "
                               "adlarini Ingilizce yazarak tekrar deneyin.")
        self.log(f"Bulunan mac: {best.home} - {best.away} ({best.sport_title}), "
                 f"baslama {best.commence.isoformat()} [esleme skoru {best.score:.2f}]")
        return best

    # ------------------------------------------------------------------
    def _event_odds(self, ev: Event, markets: list[str], when: datetime | None) -> dict:
        """when=None -> guncel oranlar; aksi halde gecmis anlik goruntu."""
        params = dict(regions=self.regions, markets=",".join(markets), oddsFormat="decimal", dateFormat="iso")
        if when is None:
            data = self._get(f"/v4/sports/{ev.sport_key}/events/{ev.id}/odds", **params)
            return {"timestamp": _iso(datetime.now(timezone.utc)), "data": data}
        params["date"] = _iso(when)
        return self._get(f"/v4/historical/sports/{ev.sport_key}/events/{ev.id}/odds", **params)

    def _event_odds_tolerant(self, ev: Event, markets: list[str], when: datetime | None) -> dict | None:
        try:
            return self._event_odds(ev, markets, when)
        except OddsApiError as e:
            msg = str(e)
            if "INVALID_MARKET" in msg.upper() or "422" in msg:
                # marketleri tek tek dene, desteklenmeyenleri at
                merged: dict | None = None
                for mk in markets:
                    try:
                        snap = self._event_odds(ev, [mk], when)
                    except OddsApiError:
                        continue
                    if merged is None:
                        merged = snap
                    else:
                        _merge_snapshot(merged, snap)
                return merged
            if "404" in msg or "EVENT_NOT_FOUND" in msg.upper():
                return None  # o tarihte etkinlik henuz listelenmemis
            raise

    def collect_snapshots(self, ev: Event, markets: list[str], offsets_h: list[int]) -> list[dict]:
        cache = load_cache(ev.id)
        have = {s["timestamp"] for s in cache}
        now = datetime.now(timezone.utc)
        todo: list[datetime | None] = []
        for h in offsets_h:
            t = ev.commence + timedelta(hours=h)
            if t > now - timedelta(minutes=10):
                continue
            if any(abs((_parse_time(x) - t).total_seconds()) < 600 for x in have):
                continue
            todo.append(t)
        if ev.commence > now:
            todo.append(None)  # guncel oran (mac oncesi)
        self.log(f"{len(todo)} yeni anlik goruntu cekilecek (onbellekte {len(cache)} var).")
        for t in todo:
            label = "guncel" if t is None else _iso(t)
            try:
                snap = self._event_odds_tolerant(ev, markets, t)
            except OddsApiError as e:
                self.log(f"  ! {label}: {e}")
                if "HISTORICAL" in str(e).upper() or "UNAUTHORIZED" in str(e).upper():
                    self.log("  ! Gecmis oran icin ucretli The Odds API plani gerekir. Kalan noktalar atlandi.")
                    break
                continue
            if not snap or not snap.get("data"):
                self.log(f"  - {label}: veri yok")
                continue
            # Oranlar mac basladiktan sonra canli olur; mac oncesi seriye sokma.
            ts = _parse_time(snap["timestamp"])
            snap["phase"] = "pre" if ts < ev.commence else "live"
            cache.append(snap)
            nb = len(snap["data"].get("bookmakers", []))
            self.log(f"  + {label}: {nb} bahis sirketi")
        cache.sort(key=lambda s: s["timestamp"])
        save_cache(ev.id, cache)
        self.log(f"API kredisi: kullanilan {self.used}, kalan {self.remaining}")
        return cache


# ----------------------------------------------------------------------
# Onbellek
# ----------------------------------------------------------------------

def load_cache(event_id: str) -> list[dict]:
    p = CACHE_DIR / f"{event_id}.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return []
    return []


def save_cache(event_id: str, snaps: list[dict]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{event_id}.json").write_text(json.dumps(snaps, ensure_ascii=False), encoding="utf-8")


def _merge_snapshot(base: dict, extra: dict) -> None:
    books = {b["key"]: b for b in base["data"].get("bookmakers", [])}
    for b in extra["data"].get("bookmakers", []):
        if b["key"] in books:
            books[b["key"]]["markets"].extend(b.get("markets", []))
        else:
            base["data"].setdefault("bookmakers", []).append(b)
            books[b["key"]] = b


# ----------------------------------------------------------------------
# Donusum: API cikisi -> SeriesKey/OddsPoint
# ----------------------------------------------------------------------

def _fmt_line(p) -> str:
    if p is None:
        return ""
    return f"{float(p):g}"


def _side(name: str, home: str, away: str) -> str | None:
    if name == home:
        return "1"
    if name == away:
        return "2"
    if name.lower() == "draw":
        return "X"
    return None


def _double_chance(name: str, home: str, away: str) -> str | None:
    parts = [p.strip() for p in re.split(r"/| or ", name)]
    sym = []
    for p in parts:
        if p == home or p.lower() == "home":
            sym.append("1")
        elif p == away or p.lower() == "away":
            sym.append("2")
        elif p.lower() in ("draw", "tie"):
            sym.append("X")
    if len(sym) != 2:
        return None
    order = {"1": 0, "X": 1, "2": 2}
    sym.sort(key=order.get)
    return "".join(sym)


def translate(market: str, outcome: dict, home: str, away: str) -> tuple[str, str, str] | None:
    """(market, secim, cizgi) Turkce karsiligi. Bilinmeyenler None."""
    name = outcome.get("name", "")
    point = outcome.get("point")
    desc = outcome.get("description", "")
    ou = {"over": "Ust", "under": "Alt"}.get(name.lower())

    if market == "h2h":
        s = _side(name, home, away)
        return ("MS", s, "") if s else None
    if market == "h2h_h1":
        s = _side(name, home, away)
        return ("IY Sonuc", s, "") if s else None
    if market == "h2h_h2":
        s = _side(name, home, away)
        return ("2Y Sonuc", s, "") if s else None
    if market == "draw_no_bet":
        s = _side(name, home, away)
        return ("Beraberlikte Iade", s, "") if s in ("1", "2") else None
    if market == "double_chance":
        s = _double_chance(name, home, away)
        return ("Cifte Sans", s, "") if s else None
    if market in ("totals", "alternate_totals") and ou:
        return ("Alt/Ust", ou, _fmt_line(point))
    if market == "totals_h1" and ou:
        return ("IY Alt/Ust", ou, _fmt_line(point))
    if market == "totals_h2" and ou:
        return ("2Y Alt/Ust", ou, _fmt_line(point))
    if market == "btts":
        v = {"yes": "Var", "no": "Yok"}.get(name.lower())
        return ("KG", v, "") if v else None
    if market in ("spreads", "alternate_spreads"):
        s = _side(name, home, away)
        if s not in ("1", "2") or point is None:
            return None
        # cizgiyi her zaman ev sahibi perspektifinden yaz ki iki taraf ayni seri grubunda olsun
        home_line = float(point) if s == "1" else -float(point)
        return ("Asya Handikap", "Ev" if s == "1" else "Dep", f"{home_line:+g}")
    if market in ("team_totals", "alternate_team_totals") and ou:
        if desc == home:
            return ("Ev Gol Alt/Ust", ou, _fmt_line(point))
        if desc == away:
            return ("Dep Gol Alt/Ust", ou, _fmt_line(point))
        return None
    if market in ("alternate_totals_corners", "totals_corners") and ou:
        return ("Korner Alt/Ust", ou, _fmt_line(point))
    if market in ("alternate_spreads_corners", "spreads_corners"):
        s = _side(name, home, away)
        if s not in ("1", "2") or point is None:
            return None
        home_line = float(point) if s == "1" else -float(point)
        return ("Korner Handikap", "Ev" if s == "1" else "Dep", f"{home_line:+g}")
    if market in ("alternate_totals_cards", "totals_cards") and ou:
        return ("Kart Alt/Ust", ou, _fmt_line(point))
    return None


def snapshots_to_series(snaps: list[dict], ev: Event) -> tuple[dict[SeriesKey, list[OddsPoint]], dict[SeriesKey, str], set[str]]:
    series: dict[SeriesKey, list[OddsPoint]] = {}
    urls: dict[SeriesKey, str] = {}
    markets_seen: set[str] = set()
    for snap in snaps:
        data = snap.get("data") or {}
        phase = snap.get("phase", "pre")
        home = data.get("home_team", ev.home)
        away = data.get("away_team", ev.away)
        for bk in data.get("bookmakers", []):
            for mk in bk.get("markets", []):
                # bahis sirketinin bu marketi en son guncelledigi an = oranin gecerlilik zamani
                t = _parse_time(mk.get("last_update") or bk.get("last_update") or snap["timestamp"])
                for oc in mk.get("outcomes", []):
                    tr = translate(mk["key"], oc, home, away)
                    if not tr or not oc.get("price"):
                        continue
                    markets_seen.add(mk["key"])
                    key = SeriesKey(bk.get("title", bk["key"]), tr[0], tr[1], tr[2], phase, SOURCE)
                    series.setdefault(key, []).append(OddsPoint(t, float(oc["price"])))
                    urls.setdefault(key, ev.url)
    return series, urls, markets_seen

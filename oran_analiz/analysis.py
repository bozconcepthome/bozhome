"""Oran hareketi hesaplamalari.

Bu modul sadece gercek kayitlardan (OddsPoint listeleri) hesap yapar.
Ara nokta, tahmin veya interpolasyon uretmez.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable

# --------------------------------------------------------------------------
# Veri modelleri
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class SeriesKey:
    """Ayni bahis sirketi + ayni market + ayni secim + ayni cizgi = tek seri."""

    bookmaker: str
    market: str          # ornek: "MS", "Alt/Ust", "KG", "Kesin Skor", "Korner Alt/Ust"
    selection: str       # ornek: "1", "X", "2", "Ust", "Var", "2-1"
    line: str = ""       # ornek: "2.5" ; cizgisiz marketler icin ""
    phase: str = "pre"   # "pre" = mac oncesi, "live" = canli (asla karistirilmaz)
    source: str = ""     # verinin geldigi kaynak (The Odds API, OddsPortal ...)

    @property
    def selection_id(self) -> tuple:
        """Bahis sirketinden bagimsiz secim kimligi (konsensus icin)."""
        return (self.market, self.selection, self.line, self.phase)

    @property
    def label(self) -> str:
        line = f" {self.line}" if self.line else ""
        return f"{self.market}{line} / {self.selection}"


@dataclass
class OddsPoint:
    time: datetime
    price: float


@dataclass
class Movement:
    key: SeriesKey
    points: list[OddsPoint]
    source_url: str = ""
    windows: dict[str, float | None] = field(default_factory=dict)
    fair_open: float | None = None   # marji arindirilmis olasilik (%)
    fair_last: float | None = None

    # ---- temel olcumler ------------------------------------------------
    @property
    def opening(self) -> OddsPoint:
        return self.points[0]

    @property
    def last(self) -> OddsPoint:
        return self.points[-1]

    @property
    def high(self) -> OddsPoint:
        return max(self.points, key=lambda p: p.price)

    @property
    def low(self) -> OddsPoint:
        return min(self.points, key=lambda p: p.price)

    @property
    def pct_change(self) -> float:
        return pct_change(self.opening.price, self.last.price)

    @property
    def implied_open(self) -> float:
        return implied(self.opening.price)

    @property
    def implied_last(self) -> float:
        return implied(self.last.price)

    @property
    def implied_delta(self) -> float:
        """Ham ortuk olasilik degisimi (yuzde puan)."""
        return self.implied_last - self.implied_open

    @property
    def fair_delta(self) -> float | None:
        if self.fair_open is None or self.fair_last is None:
            return None
        return self.fair_last - self.fair_open

    @property
    def direction(self) -> int:
        if self.last.price < self.opening.price:
            return -1
        if self.last.price > self.opening.price:
            return 1
        return 0

    @property
    def reversed_after_drop(self) -> bool:
        """Once dusup sonra tekrar yukselen oran (ya da tersi)."""
        if len(self.points) < 3:
            return False
        lo = self.low
        hi = self.high
        dropped_then_rose = lo.price < self.opening.price and self.last.price > lo.price * 1.03 \
            and lo.time not in (self.opening.time, self.last.time)
        rose_then_dropped = hi.price > self.opening.price and self.last.price < hi.price / 1.03 \
            and hi.time not in (self.opening.time, self.last.time)
        return dropped_then_rose or rose_then_dropped

    def max_short_drop(self, within: timedelta = timedelta(hours=6)) -> tuple[float, OddsPoint, OddsPoint] | None:
        """Belirtilen sure icindeki ardisik kayitlar arasindaki en sert dusus."""
        best = None
        for i, a in enumerate(self.points):
            for b in self.points[i + 1:]:
                if b.time - a.time > within:
                    break
                ch = pct_change(a.price, b.price)
                if best is None or ch < best[0]:
                    best = (ch, a, b)
        return best


# --------------------------------------------------------------------------
# Yardimci fonksiyonlar
# --------------------------------------------------------------------------


def pct_change(first: float, last: float) -> float:
    """(Son oran - Ilk oran) / Ilk oran x 100"""
    return (last - first) / first * 100.0


def implied(price: float) -> float:
    """Ortuk olasilik (%) = 100 / ondalik oran"""
    return 100.0 / price


def remove_margin(prices: list[float]) -> list[float]:
    """Cok secenekli markette marji oransal yontemle arindirir (toplam = %100)."""
    raw = [1.0 / p for p in prices]
    total = sum(raw)
    return [r / total * 100.0 for r in raw]


def margin(prices: list[float]) -> float:
    return (sum(1.0 / p for p in prices) - 1.0) * 100.0


# Marji arindirmak icin hangi secimlerin birlikte tam market olusturdugu
COMPLETE_MARKETS = {
    "MS": {"1", "X", "2"},
    "IY Sonuc": {"1", "X", "2"},
    "Alt/Ust": {"Alt", "Ust"},
    "IY Alt/Ust": {"Alt", "Ust"},
    "KG": {"Var", "Yok"},
    "Cifte Sans": None,     # cifte sans tam (toplami 100) bir market degil
    "Asya Handikap": {"Ev", "Dep"},
    "Korner Alt/Ust": {"Alt", "Ust"},
    "Kart Alt/Ust": {"Alt", "Ust"},
    "Ev Gol Alt/Ust": {"Alt", "Ust"},
    "Dep Gol Alt/Ust": {"Alt", "Ust"},
    "Beraberlikte Iade": {"1", "2"},
}


def build_movements(series: dict[SeriesKey, list[OddsPoint]], urls: dict[SeriesKey, str] | None = None,
                    kickoff: datetime | None = None) -> list[Movement]:
    urls = urls or {}
    out: list[Movement] = []
    for key, pts in series.items():
        pts = sorted((p for p in pts if p.price and p.price > 1.0), key=lambda p: p.time)
        # ayni zamana ait tekrarlari temizle
        dedup: list[OddsPoint] = []
        for p in pts:
            if dedup and dedup[-1].time == p.time:
                dedup[-1] = p
            else:
                dedup.append(p)
        if len(dedup) < 2:
            continue
        m = Movement(key=key, points=dedup, source_url=urls.get(key, ""))
        if kickoff is not None and all(p.time.year >= 2000 for p in dedup):
            ref = min(kickoff, datetime.now(timezone.utc))
            m.windows = window_changes(dedup, ref)
        out.append(m)
    _attach_fair_probabilities(out)
    return out


def window_changes(points: list[OddsPoint], ref: datetime) -> dict[str, float | None]:
    """Son 24/12/6/1 saatteki degisim. Sadece gercek kayit varsa hesaplanir."""
    end = [p for p in points if p.time <= ref]
    if not end:
        return {k: None for k in ("24s", "12s", "6s", "1s")}
    last = end[-1]
    res: dict[str, float | None] = {}
    for label, hours in (("24s", 24), ("12s", 12), ("6s", 6), ("1s", 1)):
        start_time = ref - timedelta(hours=hours)
        # pencere baslangicinda gecerli olan son kayit (tam o anda ya da oncesinde)
        before = [p for p in points if p.time <= start_time]
        # pencere icinde hic gozlem yoksa ya da pencere oncesi kayit yoksa hesaplanamaz
        if not before or last.time <= start_time:
            res[label] = None
            continue
        res[label] = pct_change(before[-1].price, last.price)
    return res


def _attach_fair_probabilities(moves: list[Movement]) -> None:
    """Ayni bahis sirketi/market/cizgi icin tum secimler varsa marjsiz olasilik hesapla."""
    groups: dict[tuple, dict[str, Movement]] = {}
    for m in moves:
        k = m.key
        groups.setdefault((k.bookmaker, k.market, k.line, k.phase, k.source), {})[k.selection] = m
    for (bk, market, line, phase, src), sel in groups.items():
        need = COMPLETE_MARKETS.get(market)
        if not need or set(sel) != need:
            continue
        order = sorted(need)
        open_prices = [sel[s].opening.price for s in order]
        last_prices = [sel[s].last.price for s in order]
        fo = remove_margin(open_prices)
        fl = remove_margin(last_prices)
        for s, a, b in zip(order, fo, fl):
            sel[s].fair_open = a
            sel[s].fair_last = b


# --------------------------------------------------------------------------
# Konsensus / siralama / anomali
# --------------------------------------------------------------------------


@dataclass
class Consensus:
    selection_id: tuple
    label: str
    category: str
    n_books: int
    n_down: int
    n_up: int
    median_pct: float
    median_prob_delta: float
    best: Movement            # en buyuk mutlak degisimi olan seri
    first_mover: str | None   # ilk hareket eden sirket (veri varsa)
    members: list[Movement]


def category_of(market: str) -> str:
    m = market.lower()
    if "korner" in m:
        return "Korner"
    if "kart" in m:
        return "Kart"
    if "kesin skor" in m:
        return "Kesin Skor"
    if m.startswith("kg") or "kg " in m or "karsilikli" in m:
        return "KG"
    if "alt/ust" in m or "gol" in m:
        return "Gol"
    if m in ("ms", "cifte sans", "iy sonuc", "iy/ms", "asya handikap", "avrupa handikap",
             "beraberlikte iade") or "handikap" in m:
        return "Mac Sonucu"
    return "Diger"


def _median(xs: list[float]) -> float:
    s = sorted(xs)
    n = len(s)
    if n == 0:
        return 0.0
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def first_mover(members: list[Movement], direction: int) -> str | None:
    """Ilk kez opening'den belirgin (%2+) ayni yone hareket eden sirket.

    Sadece en az iki sirketin zaman damgali kaydi varsa dondurulur."""
    if direction == 0 or len(members) < 2:
        return None
    first: tuple[datetime, str] | None = None
    for m in members:
        for p in m.points[1:]:
            ch = pct_change(m.opening.price, p.price)
            if (direction < 0 and ch <= -2) or (direction > 0 and ch >= 2):
                if first is None or p.time < first[0]:
                    first = (p.time, m.key.bookmaker)
                break
    return first[1] if first else None


def consensus(moves: list[Movement]) -> list[Consensus]:
    groups: dict[tuple, list[Movement]] = {}
    for m in moves:
        groups.setdefault(m.key.selection_id, []).append(m)
    out = []
    for sid, members in groups.items():
        # ayni sirket farkli kaynaklardan gelse bile tek sayilir (bagimsiz dogrulama degil)
        down = len({m.key.bookmaker for m in members if m.direction < 0})
        up = len({m.key.bookmaker for m in members if m.direction > 0})
        med = _median([m.pct_change for m in members])
        deltas = [m.fair_delta if m.fair_delta is not None else m.implied_delta for m in members]
        best = max(members, key=lambda m: abs(m.pct_change))
        direction = -1 if med < 0 else (1 if med > 0 else 0)
        out.append(Consensus(
            selection_id=sid, label=members[0].key.label, category=category_of(sid[0]),
            n_books=len({m.key.bookmaker for m in members}), n_down=down, n_up=up,
            median_pct=med, median_prob_delta=_median(deltas), best=best,
            first_mover=first_mover(members, direction), members=members,
        ))
    return out


def top_drops(moves: list[Movement], n: int = 15) -> list[Movement]:
    return sorted([m for m in moves if m.pct_change < 0], key=lambda m: m.pct_change)[:n]


def top_rises(moves: list[Movement], n: int = 15) -> list[Movement]:
    return sorted([m for m in moves if m.pct_change > 0], key=lambda m: -m.pct_change)[:n]


def prob_delta(m: Movement) -> float:
    return m.fair_delta if m.fair_delta is not None else m.implied_delta


@dataclass
class Anomaly:
    kind: str
    text: str
    movement: Movement | None = None


def find_anomalies(moves: list[Movement], cons: list[Consensus]) -> list[Anomaly]:
    out: list[Anomaly] = []
    for m in moves:
        sd = m.max_short_drop(timedelta(hours=6))
        if sd and sd[0] <= -10:
            out.append(Anomaly("Kisa surede >=%10 dusus",
                               f"{m.key.label} [{m.key.bookmaker}] {sd[1].price:.2f} -> {sd[2].price:.2f} "
                               f"({sd[0]:+.1f}%) {fmt_time(sd[1].time)} - {fmt_time(sd[2].time)}", m))
        if abs(m.pct_change) > 20:
            out.append(Anomaly("Acilisa gore >%20 hareket",
                               f"{m.key.label} [{m.key.bookmaker}] {m.opening.price:.2f} -> {m.last.price:.2f} "
                               f"({m.pct_change:+.1f}%, olasilik {prob_delta(m):+.1f} yp)", m))
        if m.reversed_after_drop:
            out.append(Anomaly("Once dusup sonra yukselen / tersi",
                               f"{m.key.label} [{m.key.bookmaker}] acilis {m.opening.price:.2f}, "
                               f"en dusuk {m.low.price:.2f}, en yuksek {m.high.price:.2f}, son {m.last.price:.2f}", m))
        if m.key.market == "Kesin Skor" and abs(m.pct_change) >= 15:
            out.append(Anomaly("Kesin skorda buyuk degisim",
                               f"{m.key.label} [{m.key.bookmaker}] {m.opening.price:.2f} -> {m.last.price:.2f} "
                               f"({m.pct_change:+.1f}%, olasilik {prob_delta(m):+.2f} yp)", m))

    for c in cons:
        if c.n_books >= 2 and c.n_down >= 2 and c.n_down / c.n_books >= 0.75 and c.median_pct <= -5:
            out.append(Anomaly("Birden fazla sirkette ortak dusus",
                               f"{c.label}: {c.n_down}/{c.n_books} sirket dusurdu, medyan {c.median_pct:+.1f}%"))

    # Oran duserken alternatiflerin yukselmesi (ayni sirket, ayni market/cizgi)
    groups: dict[tuple, list[Movement]] = {}
    for m in moves:
        groups.setdefault((m.key.bookmaker, m.key.market, m.key.line, m.key.phase), []).append(m)
    for (bk, market, line, _), ms in groups.items():
        if len(ms) < 2:
            continue
        dropper = min(ms, key=lambda m: m.pct_change)
        others = [o for o in ms if o is not dropper]
        if dropper.pct_change <= -5 and all(o.pct_change > 0 for o in others):
            alt = ", ".join(f"{o.key.selection} {o.pct_change:+.1f}%" for o in others)
            out.append(Anomaly("Dusen secime karsi alternatifler yukseldi",
                               f"[{bk}] {dropper.key.label} {dropper.pct_change:+.1f}% | {alt}", dropper))

    # MS sinirli hareket ederken gol/korner sert hareketi
    ms = [c for c in cons if c.category == "Mac Sonucu" and c.selection_id[0] == "MS"]
    if ms:
        ms_max = max(abs(c.median_pct) for c in ms)
        if ms_max < 5:
            for c in cons:
                if c.category in ("Gol", "Korner", "KG") and abs(c.median_pct) >= 10:
                    out.append(Anomaly("MS sinirliyken gol/korner/KG sert hareketi",
                                       f"MS maks. medyan hareket {ms_max:.1f}%; {c.label} medyan {c.median_pct:+.1f}% "
                                       f"({c.n_books} sirket)"))
    return out


def fmt_time(t: datetime) -> str:
    """Turkiye saati (UTC+3) ile gosterim."""
    if t.year < 2000:
        return "zaman bilinmiyor"
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return t.astimezone(timezone(timedelta(hours=3))).strftime("%d.%m.%Y %H:%M")


def leaders_by_category(cons: list[Consensus]) -> dict[str, dict[str, Consensus | None]]:
    out: dict[str, dict[str, Consensus | None]] = {}
    for cat in ("Mac Sonucu", "Gol", "KG", "Kesin Skor", "Korner", "Kart", "Diger"):
        cs = [c for c in cons if c.category == cat]
        if not cs:
            continue
        drop = min(cs, key=lambda c: c.best.pct_change)
        rise = max(cs, key=lambda c: c.best.pct_change)
        out[cat] = {"dusus": drop if drop.best.pct_change < 0 else None,
                    "yukselis": rise if rise.best.pct_change > 0 else None}
    return out


def merge_series(*dicts: Iterable) -> dict:
    out: dict = {}
    for d in dicts:
        for k, v in d.items():
            out.setdefault(k, []).extend(v)
    return out

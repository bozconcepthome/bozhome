"""Analiz akisi: The Odds API + Claude web ajani -> hesaplama -> rapor."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

from analysis import OddsPoint, SeriesKey, build_movements, merge_series, top_drops, top_rises
from report import AnalysisResult

Log = Callable[[str], None]


@dataclass
class Params:
    home: str
    away: str
    date: str               # GG.AA.YYYY
    league_key: str = ""    # The Odds API lig anahtari (bos = otomatik)
    odds_key: str = ""
    anthropic_key: str = ""
    use_odds_api: bool = True
    use_web_agent: bool = True
    plan: str = "Standart (9 nokta)"
    regions: str = "eu,uk"
    effort: str = "high"


def parse_date(s: str) -> datetime:
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError("Tarih bicimi GG.AA.YYYY olmali (ornek 22.11.2026)")


def _parse_t(s: str, idx: int) -> datetime:
    if s:
        try:
            t = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    # zaman bilgisi yok: sirayi korumak icin isaretli (yil 1) zaman; raporda "zaman bilinmiyor" yazar
    return datetime(1, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=idx)


def web_records_to_series(data: dict) -> tuple[dict, dict]:
    series: dict[SeriesKey, list[OddsPoint]] = {}
    urls: dict[SeriesKey, str] = {}
    for rec in data.get("records", []):
        pts = [OddsPoint(_parse_t(p.get("time_utc", ""), i), float(p["price"]))
               for i, p in enumerate(rec.get("points", [])) if p.get("price")]
        if len(pts) < 2:
            continue
        key = SeriesKey(rec["bookmaker"].strip(), rec["market"], rec["selection"].strip(),
                        rec.get("line", "").strip(), rec.get("phase", "pre"), rec.get("source", "Web").strip())
        series.setdefault(key, []).extend(pts)
        if rec.get("url"):
            urls[key] = rec["url"]
    return series, urls


def _summary(moves) -> str:
    lines = []
    for title, lst in (("Dusenler", top_drops(moves, 10)), ("Yukselenler", top_rises(moves, 10))):
        lines.append(title + ":")
        for m in lst:
            lines.append(f"  {m.key.label} [{m.key.bookmaker}] {m.opening.price:.2f} -> {m.last.price:.2f} "
                         f"({m.pct_change:+.1f}%)")
    return "\n".join(lines)


def run(p: Params, log: Log, stream_text: Callable[[str], None],
        stop_flag: Callable[[], bool] = lambda: False) -> AnalysisResult:
    date = parse_date(p.date)
    series: dict = {}
    urls: dict = {}
    kickoff = None
    league = ""
    status = "Dogrulanamadi"
    home, away = p.home, p.away
    api_markets: set[str] = set()
    sources: list[dict] = []
    unavailable: list[str] = []
    web_text = ""
    logs: list[str] = []

    def L(s: str):
        logs.append(s)
        log(s)

    # ---------------- 1) The Odds API ----------------
    if p.use_odds_api and p.odds_key:
        from odds_api import SNAPSHOT_PLANS, DEFAULT_MARKETS, OddsApiClient, OddsApiError, snapshots_to_series
        L("== The Odds API: mac araniyor ==")
        try:
            cli = OddsApiClient(p.odds_key, p.regions, L)
            ev = cli.find_event(p.home, p.away, date, p.league_key or None)
            home, away, kickoff, league = ev.home, ev.away, ev.commence, ev.sport_title
            now = datetime.now(timezone.utc)
            status = ("Baslamadi" if kickoff > now else
                      "Oynaniyor / yeni bitti" if now - kickoff < timedelta(hours=2.5) else "Bitti")
            snaps = cli.collect_snapshots(ev, DEFAULT_MARKETS, SNAPSHOT_PLANS[p.plan])
            s, u, api_markets = snapshots_to_series(snaps, ev)
            series, urls = merge_series(series, s), {**urls, **u}
            L(f"The Odds API: {len(s)} seri, {len({k.bookmaker for k in s})} bahis sirketi.")
        except OddsApiError as e:
            L(f"The Odds API hatasi: {e}")
        except Exception as e:  # ag hatasi vb.
            L(f"The Odds API beklenmeyen hata: {e!r}")
    elif p.use_odds_api:
        L("The Odds API anahtari girilmedi; bu adim atlandi.")

    if stop_flag():
        raise RuntimeError("Durduruldu")

    # ---------------- 2) Claude web arastirma ajani ----------------
    if p.use_web_agent:
        import web_agent
        L("== Web arastirma ajani: 10 kaynak taraniyor (birkac dakika surebilir) ==")
        pre_moves = build_movements(series, urls, kickoff)
        try:
            web_text = web_agent.research(p.anthropic_key, home, away, p.date, league,
                                          _summary([m for m in pre_moves if m.key.phase == "pre"]) if pre_moves else "",
                                          L, stream_text, stop_flag, p.effort)
            L("== Web raporundaki oran kayitlari ayiklaniyor ==")
            data = web_agent.extract_records(p.anthropic_key, web_text, L)
            s, u = web_records_to_series(data)
            series = merge_series(series, s)
            urls.update(u)
            sources = data.get("sources", [])
            unavailable = data.get("unavailable_markets", [])
            mt = data.get("match", {})
            league = league or mt.get("league", "")
            if status == "Dogrulanamadi" and mt.get("status"):
                status = mt["status"]
        except Exception as e:
            L(f"Web ajani hatasi: {e!r}")

    moves = build_movements(series, urls, kickoff)
    L(f"Toplam {len(moves)} hesaplanabilir seri (en az iki gercek kayit).")
    res = AnalysisResult(home=home, away=away, league=league, kickoff=kickoff, status=status, moves=moves,
                         sources=sources, unavailable=unavailable, web_report=web_text, log=logs,
                         odds_api_markets=api_markets)
    if p.use_odds_api and p.odds_key and not any(s.get("name") == "The Odds API" for s in res.sources):
        res.sources.insert(0, {"name": "The Odds API (dogrudan API)",
                               "url": "https://the-odds-api.com/historical-odds-data/",
                               "status": "Erisildi - veri var" if api_markets else "Erisildi - mac verisi yok",
                               "markets_found": ", ".join(sorted(api_markets)), "note": "Uygulama tarafindan cekildi"})
    return res

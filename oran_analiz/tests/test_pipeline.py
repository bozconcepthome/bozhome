"""Hesaplama ve donusum testleri (sentetik test verisi; uygulamada kullanilmaz)."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from analysis import pct_change, remove_margin  # noqa: E402
from engine import web_records_to_series  # noqa: E402
from odds_api import Event, snapshots_to_series  # noqa: E402
from analysis import build_movements, merge_series  # noqa: E402
from report import AnalysisResult, charts, html_report, text_report  # noqa: E402

KO = datetime(2026, 11, 22, 17, 0, tzinfo=timezone.utc)


def snap(hours_before, books):
    t = KO - timedelta(hours=hours_before)
    iso = t.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"timestamp": iso, "phase": "pre", "data": {
        "home_team": "Galatasaray", "away_team": "Fenerbahce",
        "bookmakers": [{"key": k, "title": k, "last_update": iso, "markets": [
            {"key": "h2h", "last_update": iso, "outcomes": [
                {"name": "Galatasaray", "price": h}, {"name": "Draw", "price": d}, {"name": "Fenerbahce", "price": a}]},
            {"key": "totals", "last_update": iso, "outcomes": [
                {"name": "Over", "price": o, "point": 2.5}, {"name": "Under", "price": u, "point": 2.5}]},
            {"key": "btts", "last_update": iso, "outcomes": [
                {"name": "Yes", "price": 1.70}, {"name": "No", "price": 2.10}]},
        ]} for k, (h, d, a, o, u) in books.items()]}}


def test_math():
    assert round(pct_change(2.0, 1.5), 2) == -25.0
    fair = remove_margin([2.0, 3.5, 4.0])
    assert abs(sum(fair) - 100) < 1e-9


def test_full_pipeline(tmp_path=None):
    snaps = [
        snap(72, {"Pinnacle": (2.10, 3.40, 3.50, 1.90, 1.95), "Unibet": (2.05, 3.30, 3.45, 1.85, 1.95)}),
        snap(24, {"Pinnacle": (1.95, 3.50, 3.90, 1.80, 2.05), "Unibet": (2.00, 3.40, 3.60, 1.83, 1.97)}),
        snap(3, {"Pinnacle": (1.75, 3.70, 4.60, 1.72, 2.15), "Unibet": (1.80, 3.60, 4.30, 1.75, 2.10)}),
    ]
    ev = Event("x", "soccer_turkey_super_league", "Super Lig", "Galatasaray", "Fenerbahce", KO)
    s, u, mk = snapshots_to_series(snaps, ev)
    assert {"h2h", "totals", "btts"} <= mk
    web = {"records": [{"market": "Korner Alt/Ust", "selection": "Ust", "line": "9.5", "bookmaker": "bet365",
                        "phase": "pre", "source": "OddsPortal", "url": "https://www.oddsportal.com/x",
                        "points": [{"time_utc": "2026-11-20T10:00:00Z", "price": 1.9},
                                   {"time_utc": "2026-11-22T15:00:00Z", "price": 1.66}]}]}
    ws, wu = web_records_to_series(web)
    moves = build_movements(merge_series(s, ws), {**u, **wu}, KO)
    r = AnalysisResult("Galatasaray", "Fenerbahce", "Super Lig", KO, "Baslamadi", moves)
    assert r.drops[0].key.market == "MS" and r.drops[0].key.selection == "1"
    assert r.drops[0].fair_delta is not None
    assert r.rises[0].key.selection == "2"
    txt = text_report(r)
    assert "EN BUYUK ORAN DUSUSU" in txt and "Korner" in txt
    figs = charts(r)
    assert len(figs) >= 5
    h = html_report(r, figs)
    assert "data:image/png;base64" in h
    assert txt


if __name__ == "__main__":
    test_math()
    test_full_pipeline()
    print("ok")

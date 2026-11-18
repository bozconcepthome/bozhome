"""Rapor (metin + HTML) ve grafik uretimi."""
from __future__ import annotations

import base64
import html
import io
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

from analysis import (Consensus, Movement, consensus, find_anomalies, fmt_time,  # noqa: E402
                      leaders_by_category, prob_delta, top_drops, top_rises)

TR = timezone(timedelta(hours=3))
PREFERRED_BOOKS = ["Pinnacle", "Betfair", "bet365", "1xBet", "Unibet", "Bwin", "William Hill", "Marathon Bet"]


@dataclass
class AnalysisResult:
    home: str
    away: str
    league: str
    kickoff: datetime | None
    status: str
    moves: list[Movement]
    sources: list[dict] = field(default_factory=list)
    unavailable: list[str] = field(default_factory=list)
    web_report: str = ""
    log: list[str] = field(default_factory=list)
    odds_api_markets: set[str] = field(default_factory=set)

    def __post_init__(self):
        pre = [m for m in self.moves if m.key.phase == "pre"]
        self.pre = pre
        self.live = [m for m in self.moves if m.key.phase == "live"]
        self.cons: list[Consensus] = consensus(pre)
        self.drops = top_drops(pre)
        self.rises = top_rises(pre)
        self.anomalies = find_anomalies(pre, self.cons)
        self.leaders = leaders_by_category(self.cons)


# ----------------------------------------------------------------------
# Metin tablolari
# ----------------------------------------------------------------------

def row(m: Movement) -> list[str]:
    fd = prob_delta(m)
    return [
        m.key.label, m.key.bookmaker,
        f"{m.opening.price:.2f}", fmt_time(m.opening.time),
        f"{m.last.price:.2f}", fmt_time(m.last.time),
        f"{m.pct_change:+.1f}%",
        f"{m.implied_open:.1f}% -> {m.implied_last:.1f}%",
        f"{fd:+.2f} yp" + (" (marjsiz)" if m.fair_delta is not None else " (ham)"),
        f"{m.high.price:.2f} / {m.low.price:.2f}",
        m.key.source,
    ]


ROW_HEADERS = ["Market / Secim", "Sirket", "Acilis", "Acilis zamani", "Son", "Son zamani", "Degisim",
               "Ortuk olasilik", "Olasilik degisimi", "En yuksek / dusuk", "Kaynak"]


def _cons_text(c: Consensus) -> str:
    fm = f", ilk hareket eden: {c.first_mover}" if c.first_mover else ""
    return (f"{c.label} | en sert: {c.best.key.bookmaker} {c.best.opening.price:.2f} -> {c.best.last.price:.2f} "
            f"({c.best.pct_change:+.1f}%), olasilik {prob_delta(c.best):+.2f} yp | "
            f"{c.n_books} sirket: {c.n_down} dusurdu / {c.n_up} yukseltti, medyan {c.median_pct:+.1f}%{fm}")


def text_report(r: AnalysisResult) -> str:
    L: list[str] = []
    now = datetime.now(TR).strftime("%d.%m.%Y %H:%M")
    L.append("=" * 90)
    L.append("MAC BILGILERI")
    L.append(f"  {r.home} - {r.away} | Lig: {r.league or 'Dogrulanamadi'}")
    L.append(f"  Baslama: {fmt_time(r.kickoff) if r.kickoff else 'Dogrulanamadi'} (TR) | Durum: {r.status}")
    L.append(f"  Analiz zamani: {now} (TR)")
    L.append("")
    L.append("KAYNAK DOGRULAMASI")
    if r.sources:
        for s in r.sources:
            L.append(f"  - {s['name']}: {s['status']} | marketler: {s.get('markets_found') or '-'} | {s['url']}")
            if s.get("note"):
                L.append(f"      not: {s['note']}")
    else:
        L.append("  Web arastirmasi calistirilmadi.")
    L.append("")
    if not r.pre:
        L.append("Mac oncesi icin en az iki zaman damgali oran kaydi bulunamadi. Hareket hesaplanamadi.")
        return "\n".join(L)

    books = {m.key.bookmaker for m in r.pre}
    L.append(f"Incelenen seri: {len(r.pre)} (mac oncesi) | bahis sirketi: {len(books)} | "
             f"market: {len({m.key.market for m in r.pre})}")
    L.append("")

    def headline(title: str, m: Movement | None):
        L.append(title)
        if m is None:
            L.append("  Dogrulanamadi.")
            return
        c = next(c for c in r.cons if c.selection_id == m.key.selection_id)
        L.append(f"  {m.key.label} [{m.key.bookmaker}] {m.opening.price:.2f} ({fmt_time(m.opening.time)}) -> "
                 f"{m.last.price:.2f} ({fmt_time(m.last.time)}) = {m.pct_change:+.1f}%")
        L.append(f"  Olasilik: {m.implied_open:.1f}% -> {m.implied_last:.1f}% ({prob_delta(m):+.2f} yp)")
        same = c.n_down if m.direction < 0 else c.n_up
        L.append(f"  Ayni yonde hareket eden bagimsiz sirket: {same}/{c.n_books} "
                 f"({', '.join(sorted({x.key.bookmaker for x in c.members if x.direction == m.direction}))})")

    headline("EN BUYUK ORAN DUSUSU", r.drops[0] if r.drops else None)
    L.append("")
    headline("EN BUYUK ORAN YUKSELISI", r.rises[0] if r.rises else None)
    L.append("")

    if r.cons:
        most = max(r.cons, key=lambda c: max(c.n_down, c.n_up))
        L.append("EN FAZLA SIRKETIN AYNI YONDE HAREKET ETTIGI SECIM")
        L.append("  " + _cons_text(most))
        biggest = max(r.pre, key=prob_delta)
        L.append("EN BUYUK ORTUK OLASILIK ARTISI")
        L.append(f"  {biggest.key.label} [{biggest.key.bookmaker}] {prob_delta(biggest):+.2f} yp "
                 f"({biggest.opening.price:.2f} -> {biggest.last.price:.2f})")
        L.append("")

    L.append("KATEGORI LIDERLERI")
    for cat, d in r.leaders.items():
        dd = d["dusus"]
        yy = d["yukselis"]
        L.append(f"  {cat}:")
        L.append(f"     dusus   : {_cons_text(dd) if dd else '-'}")
        L.append(f"     yukselis: {_cons_text(yy) if yy else '-'}")
    L.append("")

    for title, lst in (("A - EN SERT DUSEN 15 SECIM", r.drops), ("B - EN SERT YUKSELEN 15 SECIM", r.rises)):
        L.append(title)
        for i, m in enumerate(lst, 1):
            rw = row(m)
            L.append(f"  {i:>2}. {rw[0]:<28} {rw[1]:<16} {rw[2]:>6} -> {rw[4]:>6} {rw[6]:>8}  {rw[8]}  [{rw[10]}]")
        L.append("")

    L.append("ZAMAN PENCERELERI (son 24s / 12s / 6s / 1s, mac saatine gore; yalniz gercek kayit varsa)")
    for m in (r.drops[:5] + r.rises[:5]):
        w = m.windows or {}
        f = lambda v: "-" if v is None else f"{v:+.1f}%"  # noqa: E731
        L.append(f"  {m.key.label} [{m.key.bookmaker}]  24s {f(w.get('24s'))}  12s {f(w.get('12s'))}  "
                 f"6s {f(w.get('6s'))}  1s {f(w.get('1s'))}")
    L.append("")

    L.append("DIKKAT CEKEN / ANORMAL HAREKETLER (yalniz gozlemlenen veri)")
    if r.anomalies:
        for a in r.anomalies[:60]:
            L.append(f"  [{a.kind}] {a.text}")
    else:
        L.append("  Esik degerlerini asan hareket yok.")
    L.append("")

    L.append("VERI KALITESI")
    single = [c for c in r.cons if c.n_books == 1]
    L.append(f"  Tek sirkette gorulen secim sayisi: {len(single)} / {len(r.cons)} (bunlar bagimsiz dogrulanmadi)")
    if r.odds_api_markets:
        L.append(f"  The Odds API'den alinan marketler: {', '.join(sorted(r.odds_api_markets))}")
    if r.unavailable:
        L.append(f"  Gecmis orani bulunamayan marketler: {', '.join(r.unavailable)}")
    L.append("  Siralama yalnizca erisilebilen marketleri kapsar; 'tum marketler' icin kesin sonuc degildir.")
    if r.live:
        L.append(f"  Canli oranlar ({len(r.live)} seri) mac oncesi siralamaya katilmadi.")
    L.append("")

    L.append("NIHAI DEGERLENDIRME")
    if r.drops:
        d = r.drops[0]
        c = next(c for c in r.cons if c.selection_id == d.key.selection_id)
        L.append(f"  En buyuk fiyat dususu: {d.key.label} ({d.pct_change:+.1f}%, {d.key.bookmaker}); "
                 f"{c.n_down}/{c.n_books} sirkette ayni yon.")
    if r.rises:
        u = r.rises[0]
        c = next(c for c in r.cons if c.selection_id == u.key.selection_id)
        L.append(f"  En buyuk fiyat yukselisi: {u.key.label} ({u.pct_change:+.1f}%, {u.key.bookmaker}); "
                 f"{c.n_up}/{c.n_books} sirkette ayni yon.")
    if r.pre:
        b = max(r.pre, key=prob_delta)
        L.append(f"  En yuksek olasilik artisi: {b.key.label} {prob_delta(b):+.2f} yp ({b.key.bookmaker}).")
    L.append("  Not: Oran hareketleri mac sonucu tahmini degildir.")
    return "\n".join(L)


# ----------------------------------------------------------------------
# Grafikler
# ----------------------------------------------------------------------

def _pick_book(moves: list[Movement]) -> str | None:
    books = {m.key.bookmaker for m in moves}
    for p in PREFERRED_BOOKS:
        for b in books:
            if p.lower() in b.lower():
                return b
    if not books:
        return None
    return max(books, key=lambda b: sum(len(m.points) for m in moves if m.key.bookmaker == b))


def _plot_series(ax, ms: list[Movement], title: str, pct: bool = False):
    for m in ms:
        xs = [p.time.astimezone(TR) for p in m.points]
        if pct:
            ys = [(p.price - m.opening.price) / m.opening.price * 100 for p in m.points]
        else:
            ys = [p.price for p in m.points]
        lbl = (f"{m.key.label} [{m.key.bookmaker}] {m.opening.price:.2f}->{m.last.price:.2f}"
               if pct else f"{m.key.selection} {m.opening.price:.2f}->{m.last.price:.2f}")
        ax.plot(xs, ys, marker="o", markersize=3, linewidth=1.6, label=lbl)
    ax.set_title(title, fontsize=10)
    ax.grid(alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d.%m %H:%M", tz=TR))
    ax.tick_params(axis="x", labelrotation=30, labelsize=7)
    ax.tick_params(axis="y", labelsize=8)
    ax.set_ylabel("Degisim % (acilisa gore)" if pct else "Ondalik oran", fontsize=8)
    ax.legend(fontsize=7, loc="best")


def charts(r: AnalysisResult) -> list[tuple[str, "plt.Figure"]]:
    out = []
    pre = r.pre

    def market_chart(title: str, market: str, line: str | None):
        ms = [m for m in pre if m.key.market == market and (line is None or m.key.line == line)]
        if line is None and ms:
            # en yaygin cizgiyi sec
            lines = [m.key.line for m in ms]
            common = max(set(lines), key=lines.count)
            ms = [m for m in ms if m.key.line == common]
            title = f"{title} {common}".strip()
        book = _pick_book(ms)
        ms = [m for m in ms if m.key.bookmaker == book]
        if not ms:
            return
        fig, ax = plt.subplots(figsize=(8, 3.6), dpi=100)
        _plot_series(ax, sorted(ms, key=lambda m: m.key.selection), f"{title} - {book} ({ms[0].key.source})")
        fig.tight_layout()
        out.append((title, fig))

    market_chart("MS 1-X-2", "MS", "")
    market_chart("Alt/Ust 2.5", "Alt/Ust", "2.5")
    market_chart("KG Var/Yok", "KG", "")
    for title, lst in (("En sert dusen 5", r.drops[:5]), ("En sert yukselen 5", r.rises[:5])):
        if lst:
            fig, ax = plt.subplots(figsize=(8, 3.6), dpi=100)
            _plot_series(ax, lst, title, pct=True)
            fig.tight_layout()
            out.append((title, fig))
    market_chart("Korner Alt/Ust", "Korner Alt/Ust", None)
    return out


def fig_png_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110)
    return base64.b64encode(buf.getvalue()).decode()


# ----------------------------------------------------------------------
# HTML
# ----------------------------------------------------------------------

CSS = """
:root{--bg:#f7f7f5;--fg:#1d1d1b;--mut:#6b6b66;--line:#ddd;--card:#fff;--neg:#0a7d3b;--pos:#b42318}
@media (prefers-color-scheme: dark){:root{--bg:#161615;--fg:#eee;--mut:#9a9a94;--line:#333;--card:#1f1f1d;--neg:#4ade80;--pos:#f87171}}
body{background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,Segoe UI,sans-serif;margin:0;padding:16px}
main{max-width:1150px;margin:auto}h1{font-size:22px}h2{font-size:17px;border-bottom:1px solid var(--line);padding-bottom:4px;margin-top:28px}
table{border-collapse:collapse;width:100%;font-size:12.5px;background:var(--card)}th,td{border:1px solid var(--line);padding:4px 6px;text-align:left}
th{background:var(--line)}.neg{color:var(--neg);font-weight:600}.pos{color:var(--pos);font-weight:600}
.wrap{overflow-x:auto}.mut{color:var(--mut)}img{max-width:100%;background:#fff;border-radius:6px;margin:8px 0}
pre{white-space:pre-wrap;background:var(--card);padding:12px;border:1px solid var(--line);border-radius:6px}
"""


def _table(rows: list[list[str]], headers: list[str]) -> str:
    h = "".join(f"<th>{html.escape(x)}</th>" for x in headers)
    body = []
    for rw in rows:
        cells = []
        for i, c in enumerate(rw):
            cls = ""
            if headers[i] == "Degisim":
                cls = ' class="neg"' if c.startswith("-") else ' class="pos"'
            if c.startswith("http"):
                c_html = f'<a href="{html.escape(c)}">link</a>'
            else:
                c_html = html.escape(c)
            cells.append(f"<td{cls}>{c_html}</td>")
        body.append("<tr>" + "".join(cells) + "</tr>")
    return f'<div class="wrap"><table><tr>{h}</tr>{"".join(body)}</table></div>'


def _md(text: str) -> str:
    try:
        import markdown  # type: ignore
        return markdown.markdown(text, extensions=["tables"])
    except Exception:
        return f"<pre>{html.escape(text)}</pre>"


def html_report(r: AnalysisResult, figs: list[tuple[str, object]]) -> str:
    parts = [f"<!doctype html><html lang='tr'><head><meta charset='utf-8'>"
             f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
             f"<title>Oran Hareketleri</title><style>{CSS}</style></head><body><main>",
             f"<h1>{html.escape(r.home)} - {html.escape(r.away)} | Oran Hareketleri Analizi</h1>"]
    parts.append(f"<pre>{html.escape(text_report(r))}</pre>")
    if r.sources:
        parts.append("<h2>Kaynak dogrulamasi</h2>")
        parts.append(_table([[s["name"], s["status"], s.get("markets_found", ""), s.get("note", ""), s["url"]]
                             for s in r.sources], ["Kaynak", "Durum", "Marketler", "Not", "Baglanti"]))
    parts.append("<h2>A - En sert dusen 15 secim</h2>")
    parts.append(_table([row(m) for m in r.drops], ROW_HEADERS))
    parts.append("<h2>B - En sert yukselen 15 secim</h2>")
    parts.append(_table([row(m) for m in r.rises], ROW_HEADERS))
    parts.append("<h2>Tum marketlerin siralamasi (en cok dusenden en cok yukselene)</h2>")
    parts.append(_table([row(m) for m in sorted(r.pre, key=lambda m: m.pct_change)], ROW_HEADERS))
    if figs:
        parts.append("<h2>Oran degisim grafikleri</h2><p class='mut'>Sadece gercek kayit noktalari cizilmistir; "
                     "ara nokta uretilmemistir. Saatler Turkiye saatidir.</p>")
        for title, fig in figs:
            parts.append(f"<h3>{html.escape(title)}</h3><img alt='{html.escape(title)}' "
                         f"src='data:image/png;base64,{fig_png_b64(fig)}'>")
    if r.web_report:
        parts.append("<h2>Web arastirma ajani raporu</h2>")
        parts.append(_md(r.web_report))
    if r.live:
        parts.append("<h2>Canli oranlar (ayri tutuldu)</h2>")
        parts.append(_table([row(m) for m in sorted(r.live, key=lambda m: m.pct_change)], ROW_HEADERS))
    parts.append("<p class='mut'>Bu rapor oran hareketlerini belgeler; mac sonucu tahmini degildir.</p>")
    parts.append("</main></body></html>")
    return "".join(parts)

"""Oran Hareketleri Analiz - masaustu uygulamasi (Tkinter).

Calistirma:  python app.py
"""
from __future__ import annotations

import json
import os
import queue
import sys
import threading
import tkinter as tk
import webbrowser
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

sys.path.insert(0, str(Path(__file__).resolve().parent))

import engine  # noqa: E402
from report import ROW_HEADERS, charts, html_report, row, text_report  # noqa: E402

CONF_DIR = Path(os.path.expanduser("~")) / ".oran_analiz"
CONF = CONF_DIR / "ayarlar.json"
REPORT_DIR = Path(os.path.expanduser("~")) / "Documents" / "OranAnaliz"


def load_conf() -> dict:
    try:
        return json.loads(CONF.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_conf(d: dict) -> None:
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    CONF.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Oran Hareketleri Analiz Ajani")
        self.geometry("1280x820")
        self.minsize(980, 640)
        self.q: queue.Queue = queue.Queue()
        self.stop = threading.Event()
        self.result = None
        self.figs = []
        self.conf = load_conf()
        self._style()
        self._build()
        self.after(100, self._drain)

    # ------------------------------------------------------------------
    def _style(self):
        st = ttk.Style(self)
        try:
            st.theme_use("clam")
        except tk.TclError:
            pass
        st.configure("Treeview", rowheight=22, font=("Segoe UI", 9))
        st.configure("Treeview.Heading", font=("Segoe UI", 9, "bold"))
        st.configure("Big.TButton", font=("Segoe UI", 11, "bold"), padding=8)

    def _build(self):
        top = ttk.Frame(self, padding=10)
        top.pack(fill="x")

        f = ttk.LabelFrame(top, text="Mac", padding=8)
        f.pack(side="left", fill="y")
        self.v_home = tk.StringVar(value=self.conf.get("home", ""))
        self.v_away = tk.StringVar(value=self.conf.get("away", ""))
        self.v_date = tk.StringVar(value=self.conf.get("date", datetime.now().strftime("%d.%m.%Y")))
        self.v_league = tk.StringVar(value=self.conf.get("league", ""))
        for r, (lbl, var, w) in enumerate((("Ev sahibi", self.v_home, 26), ("Deplasman", self.v_away, 26),
                                            ("Tarih (GG.AA.YYYY)", self.v_date, 14),
                                            ("Lig anahtari (ops.)", self.v_league, 26))):
            ttk.Label(f, text=lbl).grid(row=r, column=0, sticky="w", pady=2)
            ttk.Entry(f, textvariable=var, width=w).grid(row=r, column=1, sticky="w", pady=2, padx=4)
        ttk.Label(f, text="Lig ornek: soccer_turkey_super_league, soccer_epl", foreground="#777").grid(
            row=4, column=0, columnspan=2, sticky="w")

        g = ttk.LabelFrame(top, text="Veri kaynaklari ve anahtarlar", padding=8)
        g.pack(side="left", fill="both", expand=True, padx=10)
        self.v_odds = tk.StringVar(value=self.conf.get("odds_key", ""))
        self.v_ant = tk.StringVar(value=self.conf.get("anthropic_key", ""))
        self.v_use_odds = tk.BooleanVar(value=self.conf.get("use_odds", True))
        self.v_use_web = tk.BooleanVar(value=self.conf.get("use_web", False))
        self.v_plan = tk.StringVar(value=self.conf.get("plan", "Standart (9 nokta)"))
        self.v_regions = tk.StringVar(value=self.conf.get("regions", "eu,uk"))
        self.v_effort = tk.StringVar(value=self.conf.get("effort", "high"))
        ttk.Checkbutton(g, text="The Odds API (gercek oran gecmisi)", variable=self.v_use_odds).grid(
            row=0, column=0, sticky="w")
        ttk.Entry(g, textvariable=self.v_odds, width=40, show="*").grid(row=0, column=1, sticky="w", padx=4)
        ttk.Checkbutton(g, text="Claude web ajani (10 kaynak taramasi)", variable=self.v_use_web).grid(
            row=1, column=0, sticky="w")
        ttk.Entry(g, textvariable=self.v_ant, width=40, show="*").grid(row=1, column=1, sticky="w", padx=4)
        ttk.Label(g, text="Anlik goruntu plani").grid(row=2, column=0, sticky="w")
        from odds_api import SNAPSHOT_PLANS
        ttk.Combobox(g, textvariable=self.v_plan, values=list(SNAPSHOT_PLANS), width=22, state="readonly").grid(
            row=2, column=1, sticky="w", padx=4)
        ttk.Label(g, text="Bolgeler / ajan eforu").grid(row=3, column=0, sticky="w")
        h = ttk.Frame(g)
        h.grid(row=3, column=1, sticky="w", padx=4)
        ttk.Combobox(h, textvariable=self.v_regions, values=["eu", "eu,uk", "eu,uk,us", "uk"], width=10).pack(side="left")
        ttk.Combobox(h, textvariable=self.v_effort, values=["low", "medium", "high", "xhigh"], width=8,
                     state="readonly").pack(side="left", padx=6)
        ttk.Label(g, text="Anahtarlar sadece bu bilgisayarda ~/.oran_analiz/ayarlar.json icinde saklanir.",
                  foreground="#777").grid(row=4, column=0, columnspan=2, sticky="w")

        b = ttk.Frame(top)
        b.pack(side="left", fill="y")
        self.btn_run = ttk.Button(b, text="ANALIZ ET", style="Big.TButton", command=self.start)
        self.btn_run.pack(fill="x")
        self.btn_stop = ttk.Button(b, text="Durdur", command=self.stop.set, state="disabled")
        self.btn_stop.pack(fill="x", pady=4)
        ttk.Button(b, text="ChatGPT ile arastir", command=self.ask_chatgpt).pack(fill="x", pady=4)
        ttk.Button(b, text="HTML rapor kaydet", command=self.save_html).pack(fill="x", pady=4)
        ttk.Button(b, text="Ligleri listele", command=self.list_leagues).pack(fill="x")

        self.status = tk.StringVar(value="Hazir.")
        ttk.Label(self, textvariable=self.status, padding=(10, 0)).pack(fill="x")
        self.pb = ttk.Progressbar(self, mode="indeterminate")
        self.pb.pack(fill="x", padx=10)

        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=10, pady=8)
        self.t_report = self._text_tab("Sonuc raporu")
        self.tree_drop = self._tree_tab("A - En sert dusen 15")
        self.tree_rise = self._tree_tab("B - En sert yukselen 15")
        self.tree_all = self._tree_tab("Tum marketler siralamasi")
        self.tree_src = self._tree_tab("Kaynak dogrulamasi",
                                       ["Kaynak", "Durum", "Marketler", "Not", "Baglanti"])
        self.chart_frame = self._scroll_tab("Grafikler")
        self.t_web = self._text_tab("Web ajani raporu")
        self.t_log = self._text_tab("Islem gunlugu")

    def _text_tab(self, title):
        fr = ttk.Frame(self.nb)
        self.nb.add(fr, text=title)
        t = tk.Text(fr, wrap="word", font=("Consolas", 10))
        sb = ttk.Scrollbar(fr, command=t.yview)
        t.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        t.pack(fill="both", expand=True)
        return t

    def _tree_tab(self, title, cols=None):
        cols = cols or ROW_HEADERS
        fr = ttk.Frame(self.nb)
        self.nb.add(fr, text=title)
        tv = ttk.Treeview(fr, columns=cols, show="headings")
        widths = {"Market / Secim": 190, "Sirket": 120, "Ortuk olasilik": 130, "Olasilik degisimi": 140,
                  "Acilis zamani": 115, "Son zamani": 115, "Not": 300, "Baglanti": 280, "Marketler": 220}
        for c in cols:
            tv.heading(c, text=c)
            tv.column(c, width=widths.get(c, 80), anchor="w")
        tv.tag_configure("neg", foreground="#0a7d3b")
        tv.tag_configure("pos", foreground="#b42318")
        ys = ttk.Scrollbar(fr, orient="vertical", command=tv.yview)
        xs = ttk.Scrollbar(fr, orient="horizontal", command=tv.xview)
        tv.configure(yscrollcommand=ys.set, xscrollcommand=xs.set)
        ys.pack(side="right", fill="y")
        xs.pack(side="bottom", fill="x")
        tv.pack(fill="both", expand=True)
        tv.bind("<Double-1>", lambda e, tv=tv: self._open_link(tv))
        return tv

    def _scroll_tab(self, title):
        fr = ttk.Frame(self.nb)
        self.nb.add(fr, text=title)
        cv = tk.Canvas(fr, highlightthickness=0)
        sb = ttk.Scrollbar(fr, command=cv.yview)
        inner = ttk.Frame(cv)
        inner.bind("<Configure>", lambda e: cv.configure(scrollregion=cv.bbox("all")))
        cv.create_window((0, 0), window=inner, anchor="nw")
        cv.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        cv.pack(fill="both", expand=True)
        cv.bind_all("<MouseWheel>", lambda e: cv.yview_scroll(int(-e.delta / 120), "units"))
        return inner

    def _open_link(self, tv):
        sel = tv.selection()
        if not sel:
            return
        for v in tv.item(sel[0], "values"):
            if str(v).startswith("http"):
                webbrowser.open(v)
                return

    # ------------------------------------------------------------------
    def _save(self):
        self.conf.update(home=self.v_home.get(), away=self.v_away.get(), date=self.v_date.get(),
                         league=self.v_league.get(), odds_key=self.v_odds.get(), anthropic_key=self.v_ant.get(),
                         use_odds=self.v_use_odds.get(), use_web=self.v_use_web.get(), plan=self.v_plan.get(),
                         regions=self.v_regions.get(), effort=self.v_effort.get())
        save_conf(self.conf)

    def start(self):
        if not self.v_home.get().strip() or not self.v_away.get().strip():
            messagebox.showwarning("Eksik", "Ev sahibi ve deplasman takimini yazin.")
            return
        try:
            engine.parse_date(self.v_date.get())
        except ValueError as e:
            messagebox.showwarning("Tarih", str(e))
            return
        if not (self.v_use_odds.get() or self.v_use_web.get()):
            messagebox.showwarning("Kaynak", "En az bir veri kaynagi secin.")
            return
        if self.v_use_web.get() and not self.v_ant.get().strip() and not os.environ.get("ANTHROPIC_API_KEY"):
            messagebox.showwarning("Anahtar", "Claude web ajani icin Anthropic API anahtari gerekli.\n"
                                   "Anahtarin yoksa kutunun isaretini kaldir; arastirma icin "
                                   "'ChatGPT ile arastir' dugmesini kullan.")
            return
        self._save()
        for t in (self.t_report, self.t_web, self.t_log):
            t.delete("1.0", "end")
        for tv in (self.tree_drop, self.tree_rise, self.tree_all, self.tree_src):
            tv.delete(*tv.get_children())
        for w in self.chart_frame.winfo_children():
            w.destroy()
        self.stop.clear()
        self.btn_run.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.pb.start(12)
        self.status.set("Analiz suruyor...")
        p = engine.Params(home=self.v_home.get().strip(), away=self.v_away.get().strip(),
                          date=self.v_date.get().strip(), league_key=self.v_league.get().strip(),
                          odds_key=self.v_odds.get(), anthropic_key=self.v_ant.get(),
                          use_odds_api=self.v_use_odds.get(), use_web_agent=self.v_use_web.get(),
                          plan=self.v_plan.get(), regions=self.v_regions.get(), effort=self.v_effort.get())
        threading.Thread(target=self._worker, args=(p,), daemon=True).start()

    def _worker(self, p):
        try:
            res = engine.run(p, lambda s: self.q.put(("log", s)), lambda s: self.q.put(("web", s)),
                             self.stop.is_set)
            figs = charts(res)
            self.q.put(("done", (res, figs)))
        except Exception as e:  # noqa: BLE001
            self.q.put(("error", repr(e)))

    def _drain(self):
        try:
            while True:
                kind, val = self.q.get_nowait()
                if kind == "log":
                    self.t_log.insert("end", val + "\n")
                    self.t_log.see("end")
                    self.status.set(val[:160])
                elif kind == "web":
                    self.t_web.insert("end", val)
                    self.t_web.see("end")
                elif kind == "done":
                    self._show(*val)
                elif kind == "error":
                    self._finish()
                    messagebox.showerror("Hata", val)
        except queue.Empty:
            pass
        self.after(100, self._drain)

    def _finish(self):
        self.pb.stop()
        self.btn_run.configure(state="normal")
        self.btn_stop.configure(state="disabled")

    def _fill(self, tv, moves):
        for m in moves:
            tv.insert("", "end", values=row(m) + [m.source_url], tags=("neg" if m.pct_change < 0 else "pos",))

    def _show(self, res, figs):
        self._finish()
        self.result, self.figs = res, figs
        self.t_report.insert("1.0", text_report(res))
        self._fill(self.tree_drop, res.drops)
        self._fill(self.tree_rise, res.rises)
        self._fill(self.tree_all, sorted(res.pre, key=lambda m: m.pct_change) +
                   sorted(res.live, key=lambda m: m.pct_change))
        for s in res.sources:
            self.tree_src.insert("", "end", values=[s.get("name", ""), s.get("status", ""),
                                                    s.get("markets_found", ""), s.get("note", ""), s.get("url", "")])
        if figs:
            from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
            for title, fig in figs:
                ttk.Label(self.chart_frame, text=title, font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(8, 0))
                FigureCanvasTkAgg(fig, master=self.chart_frame).get_tk_widget().pack(anchor="w")
        else:
            ttk.Label(self.chart_frame, text="Grafik icin yeterli gercek kayit yok (veri uydurulmaz).").pack()
        self.status.set(f"Bitti: {len(res.pre)} mac oncesi seri, {len(res.live)} canli seri. "
                        f"HTML raporu kaydedebilirsiniz.")
        self.nb.select(0)

    def ask_chatgpt(self):
        """Promptu (varsa gercek oran verisiyle) panoya kopyalar ve ChatGPT'yi tarayicida acar."""
        import chatgpt_bridge
        home, away, date = self.v_home.get().strip(), self.v_away.get().strip(), self.v_date.get().strip()
        if not home or not away:
            messagebox.showwarning("Eksik", "Ev sahibi ve deplasman takimini yazin.")
            return
        summary = ""
        if self.result and self.result.pre:
            summary = engine._summary(self.result.pre)
        prompt = chatgpt_bridge.build_prompt(home, away, date, summary)
        self.clipboard_clear()
        self.clipboard_append(prompt)
        self.update()
        auto = chatgpt_bridge.open_chatgpt(prompt)
        extra = "" if summary else ("\n\nIpucu: Once The Odds API ile ANALIZ ET calistirirsan gercek oran "
                                    "verileri de ChatGPT'ye eklenir.")
        if auto:
            msg = "ChatGPT tarayicida acildi ve prompt yazildi. Gonder tusuna basman yeterli."
        else:
            msg = ("ChatGPT tarayicida acildi. Prompt panoya kopyalandi:\n"
                   "mesaj kutusuna tikla, Ctrl+V ile yapistir ve gonder.")
        messagebox.showinfo("ChatGPT", msg + "\n\nChatGPT'de web aramasinin acik oldugundan emin ol." + extra)

    def save_html(self):
        if not self.result:
            messagebox.showinfo("Rapor", "Once analiz calistirin.")
            return
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        name = f"{self.result.home}_{self.result.away}_{datetime.now():%Y%m%d_%H%M}.html".replace(" ", "_")
        path = filedialog.asksaveasfilename(initialdir=REPORT_DIR, initialfile=name, defaultextension=".html",
                                            filetypes=[("HTML", "*.html")])
        if not path:
            return
        Path(path).write_text(html_report(self.result, self.figs), encoding="utf-8")
        webbrowser.open(Path(path).as_uri())

    def list_leagues(self):
        key = self.v_odds.get().strip()
        if not key:
            messagebox.showinfo("Ligler", "The Odds API anahtari girin (lig listesi kredi harcamaz).")
            return
        from odds_api import OddsApiClient
        try:
            sports = OddsApiClient(key).soccer_sports()
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("Hata", str(e))
            return
        self.t_log.delete("1.0", "end")
        for s in sports:
            self.t_log.insert("end", f"{s['key']:<45} {s['title']}\n")
        self.nb.select(self.nb.index("end") - 1)


if __name__ == "__main__":
    App().mainloop()

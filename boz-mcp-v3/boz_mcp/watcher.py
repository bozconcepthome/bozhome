"""5 dakikalık bağımsız soru takibi + proaktif uyarılar (mevcut saatlik ChatGPT otomasyonunu ETKİLEMEZ).

- Son N günün (varsayılan 7) WAITING_FOR_ANSWER sorularını TÜM sayfalarıyla tarar.
- Yeni soruları ID ile ayırt eder (notified_questions); aynı soru için ikinci bildirim yok.
- Yeni soru yoksa bildirim yok.
- Bağlantı hatası "0 soru" sayılmaz; hata bildirimi bekleme süresiyle (cooldown) sınırlandırılır.
- Asla müşteriye cevap göndermez.
"""
from __future__ import annotations

import json
from typing import Any

from . import logs
from .config import Settings
from .db import DB
from .notify import send
from .safety import clean
from .timeutil import iso, now_ms
from .trendyol.client import TrendyolClient, TrendyolError

log = logs.get("watcher")
DAY = 86_400_000


def _cooldown_ok(db: DB, key: str, minutes: int) -> bool:
    r = db.one("SELECT last_sent FROM alert_state WHERE key=?", (key,))
    return not (r and r["last_sent"] and now_ms() - r["last_sent"] < minutes * 60_000)


def _touch_alert(db: DB, key: str, kind: str, sent: bool, payload: dict | None = None) -> None:
    t = now_ms()
    db.x("""INSERT INTO alert_state(key,kind,first_seen,last_seen,last_sent,count,payload_json) VALUES(?,?,?,?,?,1,?)
            ON CONFLICT(key) DO UPDATE SET last_seen=excluded.last_seen, count=alert_state.count+1,
            last_sent=CASE WHEN ? THEN excluded.last_seen ELSE alert_state.last_sent END, payload_json=excluded.payload_json""",
         (key, kind, t, t, t if sent else None, json.dumps(payload or {}, ensure_ascii=False, default=str), 1 if sent else 0))


def _clear_alert(db: DB, key: str) -> None:
    db.x("DELETE FROM alert_state WHERE key=?", (key,))


async def check_questions(db: DB, client: TrendyolClient, settings: Settings, lookback_days: int | None = None) -> dict[str, Any]:
    t = settings.thresholds
    days = lookback_days or int(t.get("question_lookback_days", 7))
    end = now_ms()
    start = end - days * DAY
    try:
        waiting = [q async for q in client.paginate("questions", {"status": "WAITING_FOR_ANSWER", "startDate": start, "endDate": end,
                                                                "orderByField": "CreatedDate", "orderByDirection": "DESC"}, max_pages=100)]
    except TrendyolError as e:
        key = "watcher.api_error"
        cd = int(t.get("error_alert_cooldown_minutes", 60))
        notified = False
        if _cooldown_ok(db, key, cd):
            res = await send(settings, "⚠️ BOZ MCP: Trendyol soru API'sine erişilemedi",
                             f"Hata: {e}\nBu bir bağlantı hatasıdır; '0 soru' anlamına gelmez. Tekrarlanırsa {cd} dk içinde yeniden bildirilmez.")
            notified = res.get("sent", False) or res.get("dry_run", False)
        _touch_alert(db, key, "api_error", notified, e.to_dict())
        db.log_error("watcher", "TrendyolError", str(e))
        return {"ok": False, "error": e.to_dict(), "error_notified": notified,
                "note": "Bağlantı hatası — soru sayısı BİLİNMİYOR (0 değildir)."}
    if db.one("SELECT 1 FROM alert_state WHERE key='watcher.api_error'"):
        await send(settings, "✅ BOZ MCP: Trendyol soru API'si yeniden erişilebilir", "Bağlantı düzeldi.")
        _clear_alert(db, "watcher.api_error")
    new = []
    for q in waiting:
        qid = q.get("id")
        if qid is None:
            continue
        if db.one("SELECT 1 FROM notified_questions WHERE id=?", (qid,)):
            continue
        new.append(q)
    sent_info: dict[str, Any] = {"sent": False, "skipped": "yeni soru yok"}
    if new:
        lines = [f"• [{q.get('id')}] {clean(q.get('productName'), 70)}\n  “{clean(q.get('text'), 300)}”\n  ({iso(q.get('creationDate'))})" for q in new[:20]]
        body = "\n".join(lines) + (f"\n… ve {len(new) - 20} soru daha" if len(new) > 20 else "") + \
            "\n\nCevaplar otomatik gönderilmez; ChatGPT üzerinden taslak hazırlayıp onaylayarak gönderin."
        sent_info = await send(settings, f"🛎️ Boz Concept Home: {len(new)} yeni müşteri sorusu", body)
        delivered = sent_info.get("sent") or sent_info.get("dry_run")
        if delivered:
            ts = now_ms()
            with db.tx() as cx:
                for q in new:
                    cx.execute("INSERT OR IGNORE INTO notified_questions(id,first_seen,notified_at,channel) VALUES(?,?,?,?)",
                               (q.get("id"), ts, ts if sent_info.get("sent") else None, sent_info.get("channel")))
    db.mark_sync("watcher", True, len(waiting))
    return {"ok": True, "waiting_total": len(waiting), "new": len(new), "new_ids": [q.get("id") for q in new],
            "notification": sent_info, "lookback_days": days}


async def evaluate_alerts(db: DB, settings: Settings, send_notifications: bool = False) -> dict[str, Any]:
    """Ticari uyarı koşullarını değerlendirir. Gönderim varsayılan KAPALI (send_notifications=False)."""
    from .analytics import competitors, customer, stock
    from .analytics.common import pct, sales_totals
    from .timeutil import now, to_ms
    from datetime import timedelta
    t = settings.thresholds
    alerts: list[dict[str, Any]] = []
    n = now()
    y_s = n.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    y = sales_totals(db, to_ms(y_s), to_ms(y_s + timedelta(days=1)) - 1)
    base = sales_totals(db, to_ms(y_s - timedelta(days=28)), to_ms(y_s) - 1)
    avg = (base["net"] or 0) / 28
    if avg > 0:
        ch = pct(y["net"], avg)
        if ch is not None and ch <= -float(t.get("sales_drop_pct", 30)):
            alerts.append({"key": f"sales_drop:{y_s.date()}", "kind": "ani satış düşüşü",
                           "message": f"Dün net satış {y['net']:.0f} TL; 28 gün ortalamasının %{-ch:.0f} altında."})
    sr = stock.stock_risks(db, 30, t)
    for r in sr["out_of_stock"]:
        alerts.append({"key": f"out_of_stock:{r['barcode']}", "kind": "stoksuz ürün",
                       "message": f"{(r['name'] or '')[:60]}: stok 0, son 30 günde {r['units_30d']} adet satmıştı."})
    for r in sr["critical"]:
        alerts.append({"key": f"critical_stock:{r['barcode']}", "kind": "kritik stok",
                       "message": f"{(r['name'] or '')[:60]}: stok {r['stock']}, ~{r['days_of_cover']} gün."})
    for c in competitors.price_drops(db, float(t.get("competitor_price_drop_pct", 5))):
        alerts.append({"key": f"comp_drop:{c['competitor_id']}:{c['observed_at']}", "kind": "rakip fiyat düşüşü",
                       "message": f"{c['seller']}: fiyat %{c['price_change_pct']} değişti ({c['price']} TL)."})
    cm = customer.complaints(db, 30)
    if cm["previous_claims"] and pct(cm["claims"], cm["previous_claims"]) and pct(cm["claims"], cm["previous_claims"]) >= float(t.get("complaint_rate_increase_pct", 50)):
        alerts.append({"key": f"complaints_up:{n.date().isocalendar()[1]}", "kind": "artan şikâyet",
                       "message": f"Son 30 gün iade talebi {cm['claims']} (önceki {cm['previous_claims']})."})
    if cm["damaged_rate_pct"] is not None and cm["damaged_rate_pct"] >= float(t.get("damaged_rate_alert_pct", 3.0)):
        alerts.append({"key": f"damaged:{n.date().isocalendar()[1]}", "kind": "hasarlı ürün oranı",
                       "message": f"Hasarlı/kusurlu iade oranı %{cm['damaged_rate_pct']} (eşik %{t.get('damaged_rate_alert_pct')})."})
    conv = db.q("SELECT barcode, SUM(visitors) v, SUM(orders) o FROM traffic_metrics WHERE day >= ? GROUP BY barcode HAVING v >= 200",
                ((n.date() - timedelta(days=14)).isoformat(),))
    for r in conv:
        if r["v"] and (r["o"] or 0) / r["v"] < 0.005:
            alerts.append({"key": f"low_conv:{r['barcode']}", "kind": "düşük dönüşüm",
                           "message": f"{r['barcode']}: 14 günde {r['v']} ziyaretçi, {r['o']} sipariş."})
    for k in ("orders", "products", "questions", "watcher"):
        info = db.sync_info(k)
        if info and info.get("last_error") and (not info.get("last_success") or info["last_attempt"] > info["last_success"]):
            alerts.append({"key": f"api_error:{k}", "kind": "API bağlantı hatası", "message": f"{k}: {info['last_error'][:150]}"})
    cd = int(t.get("alert_cooldown_minutes", 360))
    to_send = []
    for a in alerts:
        fresh = _cooldown_ok(db, a["key"], cd)
        a["new"] = fresh
        if fresh:
            to_send.append(a)
    result: dict[str, Any] = {"alerts": alerts, "new_alerts": len(to_send), "sent": False}
    if send_notifications and to_send:
        body = "\n".join(f"• {a['kind']}: {a['message']}" for a in to_send[:25])
        res = await send(settings, f"📊 BOZ ticari uyarılar ({len(to_send)})", body)
        result["notification"] = res
        result["sent"] = res.get("sent", False)
        for a in to_send:
            _touch_alert(db, a["key"], a["kind"], True, a)
    return result

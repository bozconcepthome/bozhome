"""SQLite kalıcı depolama (WAL). Kişisel veri saklanmaz: müşteri adı, adresi,
telefonu, e-postası, kimlik numarası, müşteri ID'si TUTULMAZ."""
from __future__ import annotations

import json
import shutil
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Iterator

from .timeutil import now_ms

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS products (
  barcode TEXT PRIMARY KEY, content_id INTEGER, product_main_id TEXT, stock_code TEXT,
  title TEXT, brand TEXT, category_id INTEGER, category_name TEXT,
  description_html TEXT, image_count INTEGER, images_json TEXT, attributes_json TEXT,
  sale_price REAL, list_price REAL, stock_qty INTEGER, on_sale INTEGER, archived INTEGER,
  locked INTEGER, commission REAL, vat_rate REAL, delivery_days INTEGER, product_url TEXT,
  last_modified INTEGER, synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_products_main ON products(product_main_id);

CREATE TABLE IF NOT EXISTS product_snapshots (
  barcode TEXT NOT NULL, ts INTEGER NOT NULL, stock_qty INTEGER, sale_price REAL, list_price REAL, on_sale INTEGER,
  PRIMARY KEY (barcode, ts)
);

CREATE TABLE IF NOT EXISTS order_lines (
  line_id INTEGER PRIMARY KEY, package_id INTEGER NOT NULL, order_number TEXT NOT NULL,
  order_date INTEGER NOT NULL, package_status TEXT, line_status TEXT, barcode TEXT, product_name TEXT,
  category_id INTEGER, quantity INTEGER, unit_gross REAL, unit_net REAL, unit_discount REAL,
  unit_ty_discount REAL, unit_seller_discount REAL, commission_rate REAL, campaign_id INTEGER,
  city TEXT, last_modified INTEGER, synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ol_date ON order_lines(order_date);
CREATE INDEX IF NOT EXISTS ix_ol_barcode ON order_lines(barcode);

CREATE TABLE IF NOT EXISTS order_discounts (
  package_id INTEGER NOT NULL, name TEXT NOT NULL, amount REAL, order_date INTEGER,
  PRIMARY KEY (package_id, name)
);

CREATE TABLE IF NOT EXISTS claims (
  claim_item_id TEXT PRIMARY KEY, claim_id TEXT, order_number TEXT, order_date INTEGER, claim_date INTEGER,
  barcode TEXT, product_name TEXT, reason_name TEXT, reason_code TEXT, status TEXT,
  customer_note TEXT, last_modified INTEGER, synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_claims_date ON claims(claim_date);
CREATE INDEX IF NOT EXISTS ix_claims_barcode ON claims(barcode);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY, creation_date INTEGER, status TEXT, product_name TEXT, product_main_id TEXT,
  text TEXT, answer_text TEXT, answer_date INTEGER, synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_q_date ON questions(creation_date);

CREATE TABLE IF NOT EXISTS notified_questions (
  id INTEGER PRIMARY KEY, first_seen INTEGER NOT NULL, notified_at INTEGER, channel TEXT
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY, transaction_type TEXT, transaction_date INTEGER, order_date INTEGER, barcode TEXT,
  order_number TEXT, credit REAL, debt REAL, commission_rate REAL, commission_amount REAL,
  seller_revenue REAL, payment_date INTEGER, synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_st_date ON settlements(transaction_date);

CREATE TABLE IF NOT EXISTS buybox_history (
  barcode TEXT NOT NULL, ts INTEGER NOT NULL, buybox_order INTEGER, buybox_price REAL, has_multiple_seller INTEGER,
  PRIMARY KEY (barcode, ts)
);

CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE, seller_name TEXT, product_title TEXT,
  my_barcode TEXT, category TEXT, attributes_json TEXT, notes TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS competitor_observations (
  competitor_id INTEGER NOT NULL REFERENCES competitors(id), observed_at INTEGER NOT NULL,
  price REAL, rating REAL, review_count INTEGER, campaign_text TEXT, source TEXT NOT NULL,
  PRIMARY KEY (competitor_id, observed_at)
);

CREATE TABLE IF NOT EXISTS traffic_metrics (
  day TEXT NOT NULL, barcode TEXT NOT NULL, visitors INTEGER, views INTEGER, add_to_cart INTEGER,
  favorites INTEGER, orders INTEGER, source TEXT NOT NULL, imported_at INTEGER NOT NULL,
  PRIMARY KEY (day, barcode)
);

CREATE TABLE IF NOT EXISTS reviews (
  hash TEXT PRIMARY KEY, barcode TEXT, rating INTEGER, text TEXT, review_date TEXT, source TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_facts (
  product_key TEXT NOT NULL, fact_key TEXT NOT NULL, fact_value TEXT NOT NULL,
  source TEXT NOT NULL, updated_at INTEGER NOT NULL,
  PRIMARY KEY (product_key, fact_key)
);

CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, target TEXT NOT NULL, payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval', created_at INTEGER NOT NULL, decided_at INTEGER,
  UNIQUE (kind, target, payload_json)
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tool TEXT NOT NULL, params_json TEXT, summary_json TEXT, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
  kind TEXT PRIMARY KEY, last_success INTEGER, last_attempt INTEGER, last_error TEXT, rows INTEGER, covered_from INTEGER
);

CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, component TEXT, error_type TEXT, message TEXT
);

CREATE TABLE IF NOT EXISTS alert_state (
  key TEXT PRIMARY KEY, kind TEXT, first_seen INTEGER, last_seen INTEGER, last_sent INTEGER, count INTEGER DEFAULT 0,
  payload_json TEXT
);
"""


class DB:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        if str(self.path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self.conn = sqlite3.connect(str(self.path), check_same_thread=False, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.execute("PRAGMA busy_timeout=5000")
        self.conn.executescript(SCHEMA)
        self.conn.execute("INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version', ?)", (str(SCHEMA_VERSION),))

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self.conn.execute("BEGIN IMMEDIATE")
            try:
                yield self.conn
            except BaseException:
                self.conn.execute("ROLLBACK")
                raise
            else:
                self.conn.execute("COMMIT")

    def q(self, sql: str, args: Iterable[Any] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self.conn.execute(sql, tuple(args)).fetchall()

    def one(self, sql: str, args: Iterable[Any] = ()) -> sqlite3.Row | None:
        rows = self.q(sql, args)
        return rows[0] if rows else None

    def x(self, sql: str, args: Iterable[Any] = ()) -> int:
        with self._lock:
            return self.conn.execute(sql, tuple(args)).rowcount

    # --- sync state / errors
    def mark_sync(self, kind: str, ok: bool, rows: int = 0, error: str | None = None, covered_from: int | None = None) -> None:
        t = now_ms()
        if ok:
            self.x("""INSERT INTO sync_state(kind,last_success,last_attempt,last_error,rows,covered_from) VALUES(?,?,?,NULL,?,?)
                      ON CONFLICT(kind) DO UPDATE SET last_success=excluded.last_success,last_attempt=excluded.last_attempt,
                      last_error=NULL,rows=excluded.rows,
                      covered_from=CASE WHEN sync_state.covered_from IS NULL OR excluded.covered_from < sync_state.covered_from
                                        THEN excluded.covered_from ELSE sync_state.covered_from END""",
                   (kind, t, t, rows, covered_from))
        else:
            self.x("""INSERT INTO sync_state(kind,last_attempt,last_error) VALUES(?,?,?)
                      ON CONFLICT(kind) DO UPDATE SET last_attempt=excluded.last_attempt,last_error=excluded.last_error""",
                   (kind, t, (error or "")[:500]))
            self.log_error("sync." + kind, "SyncError", error or "")

    def sync_info(self, kind: str) -> dict[str, Any] | None:
        r = self.one("SELECT * FROM sync_state WHERE kind=?", (kind,))
        return dict(r) if r else None

    def log_error(self, component: str, etype: str, message: str) -> None:
        from .logs import redact
        self.x("INSERT INTO error_log(ts,component,error_type,message) VALUES(?,?,?,?)",
               (now_ms(), component, etype, redact(message)[:1000]))
        self.x("DELETE FROM error_log WHERE id NOT IN (SELECT id FROM error_log ORDER BY id DESC LIMIT 5000)")

    def save_analysis(self, tool: str, params: dict, summary: dict) -> None:
        self.x("INSERT INTO analysis_results(tool,params_json,summary_json,created_at) VALUES(?,?,?,?)",
               (tool, json.dumps(params, ensure_ascii=False, default=str),
                json.dumps(summary, ensure_ascii=False, default=str)[:20000], now_ms()))
        self.x("DELETE FROM analysis_results WHERE id NOT IN (SELECT id FROM analysis_results ORDER BY id DESC LIMIT 2000)")

    def integrity(self) -> str:
        return self.one("PRAGMA integrity_check")[0]  # type: ignore[index]

    def backup(self, backup_dir: Path | str, keep: int = 14) -> Path:
        d = Path(backup_dir)
        d.mkdir(parents=True, exist_ok=True)
        dest = d / f"boz_v3_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3"
        with self._lock:
            b = sqlite3.connect(str(dest))
            self.conn.backup(b)
            b.close()
        olds = sorted(d.glob("boz_v3_*.sqlite3"))
        for old in olds[:-keep]:
            old.unlink(missing_ok=True)
        return dest

    @staticmethod
    def restore(backup_file: Path | str, target: Path | str) -> None:
        src = sqlite3.connect(str(backup_file))
        ok = src.execute("PRAGMA integrity_check").fetchone()[0]
        if ok != "ok":
            raise RuntimeError(f"Yedek bozuk: {ok}")
        src.close()
        shutil.copy2(str(backup_file), str(target))

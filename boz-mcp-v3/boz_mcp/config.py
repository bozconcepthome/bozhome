"""Ortam değişkenleri ve eşik yapılandırması. Gizli değerler asla loglanmaz/döndürülmez."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DEFAULT_THRESHOLDS: dict[str, Any] = {
    "timezone": "Europe/Istanbul",
    "currency": "TRY",
    "sales_drop_pct": 30,
    "sales_spike_pct": 80,
    "anomaly_robust_z": 3.0,
    "critical_stock_days": 14,
    "overstock_days": 180,
    "symbolic_stock_threshold": 9999,
    "safety_stock_service_z": 1.65,
    "default_lead_time_days": None,
    "target_cover_days": 30,
    "complaint_rate_increase_pct": 50,
    "damaged_rate_alert_pct": 3.0,
    "competitor_price_drop_pct": 5,
    "alert_cooldown_minutes": 360,
    "error_alert_cooldown_minutes": 60,
    "question_lookback_days": 7,
    "cache_ttl_seconds": {
        "products": 1800, "orders": 900, "claims": 3600,
        "questions": 300, "settlements": 3600, "buybox": 3600,
    },
    "lead_time_days_by_barcode": {},
}


def _load_dotenv(path: Path) -> None:
    """Basit .env yükleyici (mevcut ortam değişkenlerini ezmez)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.split("#", 1)[0].strip() if not v.strip().startswith(("'", '"')) else v.strip().strip("'\"")
        os.environ.setdefault(k.strip(), v)


def _bool(v: str | None) -> bool:
    return str(v or "").strip().lower() in {"1", "true", "yes", "evet", "on"}


@dataclass
class Settings:
    seller_id: str
    api_key: str = field(repr=False, default="")
    api_secret: str = field(repr=False, default="")
    auth_injected: bool = False
    base_url: str = "https://apigw.trendyol.com"
    integrator_name: str = "SelfIntegration"
    db_path: Path = Path("./data/boz_v3.sqlite3")
    backup_dir: Path = Path("./backups")
    log_level: str = "INFO"
    http_host: str = "127.0.0.1"
    http_port: int = 8765
    http_path: str = "/mcp"
    mcp_token: str = field(repr=False, default="")
    allow_path_token: bool = False
    allowed_hosts: list[str] = field(default_factory=lambda: ["127.0.0.1:*", "localhost:*"])
    notify_channel: str = "none"
    telegram_bot_token: str = field(repr=False, default="")
    telegram_chat_id: str = field(repr=False, default="")
    webhook_url: str = field(repr=False, default="")
    thresholds: dict[str, Any] = field(default_factory=lambda: json.loads(json.dumps(DEFAULT_THRESHOLDS)))

    @property
    def has_credentials(self) -> bool:
        return self.auth_injected or bool(self.api_key and self.api_secret)

    @property
    def user_agent(self) -> str:
        name = "".join(c for c in self.integrator_name if c.isalnum())[:30] or "SelfIntegration"
        return f"{self.seller_id} - {name}"

    def public_view(self) -> dict[str, Any]:
        """Gizli alanlar maskelenmiş yapılandırma özeti."""
        return {
            "seller_id_set": bool(self.seller_id),
            "credentials": "proxy-injected" if self.auth_injected else ("set" if self.api_key and self.api_secret else "missing"),
            "base_url": self.base_url,
            "db_path": str(self.db_path),
            "http": f"{self.http_host}:{self.http_port}{self.http_path}",
            "mcp_token_set": bool(self.mcp_token),
            "notify_channel": self.notify_channel,
            "timezone": self.thresholds.get("timezone"),
        }


def load_settings(env_file: str | None = None) -> Settings:
    _load_dotenv(Path(env_file or os.environ.get("BOZ_ENV_FILE", ".env")))
    e = os.environ
    s = Settings(
        seller_id=e.get("TRENDYOL_SELLER_ID", "").strip(),
        api_key=e.get("TRENDYOL_API_KEY", "").strip(),
        api_secret=e.get("TRENDYOL_API_SECRET", "").strip(),
        auth_injected=_bool(e.get("TRENDYOL_AUTH_INJECTED")),
        base_url=e.get("TRENDYOL_BASE_URL", "https://apigw.trendyol.com").rstrip("/"),
        integrator_name=e.get("TRENDYOL_INTEGRATOR_NAME", "SelfIntegration"),
        db_path=Path(e.get("BOZ_DB_PATH", "./data/boz_v3.sqlite3")),
        backup_dir=Path(e.get("BOZ_BACKUP_DIR", "./backups")),
        log_level=e.get("BOZ_LOG_LEVEL", "INFO").upper(),
        http_host=e.get("BOZ_HTTP_HOST", "127.0.0.1"),
        http_port=int(e.get("BOZ_HTTP_PORT", "8765")),
        http_path="/" + e.get("BOZ_HTTP_PATH", "/mcp").strip("/"),
        mcp_token=e.get("BOZ_MCP_TOKEN", "").strip(),
        allow_path_token=_bool(e.get("BOZ_ALLOW_PATH_TOKEN")),
        allowed_hosts=[h.strip() for h in e.get("BOZ_ALLOWED_HOSTS", "127.0.0.1:*,localhost:*").split(",") if h.strip()],
        notify_channel=(e.get("BOZ_NOTIFY_CHANNEL", "none").split("#")[0].strip().lower() or "none"),
        telegram_bot_token=e.get("BOZ_TELEGRAM_BOT_TOKEN", "").strip(),
        telegram_chat_id=e.get("BOZ_TELEGRAM_CHAT_ID", "").strip(),
        webhook_url=e.get("BOZ_WEBHOOK_URL", "").strip(),
    )
    cfg = Path(e.get("BOZ_CONFIG_FILE", "./config/thresholds.json"))
    if cfg.is_file():
        user = json.loads(cfg.read_text(encoding="utf-8"))
        for k, v in user.items():
            if isinstance(v, dict) and isinstance(s.thresholds.get(k), dict):
                s.thresholds[k].update(v)
            else:
                s.thresholds[k] = v
    return s

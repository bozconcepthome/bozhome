"""Yapılandırılmış (JSON) log, gizli değer maskeleme."""
from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime, timezone

_SECRET_PATTERNS = [
    re.compile(r"(?i)basic\s+[a-z0-9+/=]{8,}"),
    re.compile(r"(?i)bearer\s+[a-z0-9._\-]{8,}"),
    re.compile(r"bot\d{6,}:[A-Za-z0-9_\-]{20,}"),
    re.compile(r"(?i)(authorization|api[_-]?key|api[_-]?secret|token|password|secret)([\"']?\s*[=:]\s*[\"']?)([^\s\"'&,]+)"),
]


def redact(text: str) -> str:
    s = str(text)
    for p in _SECRET_PATTERNS:
        s = p.sub(lambda m: (m.group(1) + m.group(2) + "***") if m.lastindex and m.lastindex >= 3 else "***", s)
    return s


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": redact(record.getMessage()),
        }
        extra = getattr(record, "ctx", None)
        if isinstance(extra, dict):
            payload["ctx"] = json.loads(redact(json.dumps(extra, ensure_ascii=False, default=str)))
        if record.exc_info:
            payload["exc"] = redact(self.formatException(record.exc_info))[-2000:]
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    if any(getattr(h, "_boz", False) for h in root.handlers):
        return
    h = logging.StreamHandler(sys.stderr)  # stdio MCP: stdout'a ASLA log yazma
    h.setFormatter(JsonFormatter())
    h._boz = True  # type: ignore[attr-defined]
    root.addHandler(h)
    root.setLevel(level)
    logging.getLogger("httpx").setLevel("WARNING")


def get(name: str) -> logging.Logger:
    return logging.getLogger(f"boz.{name}")

"""JARVIS sunucusu: arayüzü sunar, WebSocket üzerinden ajanla konuşur.

Çalıştır:  python server.py         (sadece bu bilgisayar)
           python server.py --lan   (telefondan da erişim; token gerekir)
"""

from __future__ import annotations

import argparse
import asyncio
import os
import secrets
import socket
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).parent


def load_env() -> None:
    env = HERE / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()

import httpx  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect  # noqa: E402
from fastapi.responses import FileResponse, Response  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

import agent  # noqa: E402
import tools  # noqa: E402

TOKEN = os.environ.get("JARVIS_TOKEN") or secrets.token_urlsafe(16)
AUTO_APPROVE = os.environ.get("JARVIS_AUTO_APPROVE", "0") == "1"
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVEN_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")  # "Daniel"

app = FastAPI(title="JARVIS")
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")


def check(token: str | None) -> None:
    if not secrets.compare_digest(token or "", TOKEN):
        raise HTTPException(401, "Geçersiz token")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(HERE / "static" / "index.html")


@app.get("/manifest.json")
async def manifest() -> FileResponse:
    return FileResponse(HERE / "static" / "manifest.json")


@app.get("/api/config")
async def config(token: str = "") -> dict[str, Any]:
    check(token)
    return {"name": agent.NAME, "model": agent.MODEL, "tts": "elevenlabs" if ELEVEN_KEY else "browser",
            "auto_approve": AUTO_APPROVE}


@app.get("/api/status")
async def status(token: str = "") -> dict[str, Any]:
    check(token)
    return await asyncio.to_thread(tools.get_stats)


@app.post("/api/tts")
async def tts(request: Request, token: str = "") -> Response:
    check(token)
    if not ELEVEN_KEY:
        raise HTTPException(404, "ElevenLabs yapılandırılmadı")
    body = await request.json()
    text = str(body.get("text", ""))[:2500]
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}",
            headers={"xi-api-key": ELEVEN_KEY, "accept": "audio/mpeg"},
            json={"text": text, "model_id": "eleven_multilingual_v2",
                  "voice_settings": {"stability": 0.45, "similarity_boost": 0.8}},
        )
    if r.status_code != 200:
        raise HTTPException(502, f"TTS hatası {r.status_code}")
    return Response(r.content, media_type="audio/mpeg")


SIRI_EFFORT = os.environ.get("JARVIS_SIRI_EFFORT", "medium")
_siri: dict[str, Any] = {"session": None, "last": 0.0, "lock": asyncio.Lock()}


@app.post("/api/siri")
async def siri(request: Request, token: str = "") -> dict[str, Any]:
    """iPhone 'Jarvis' kısayolu buraya istek atar; cevap metni + iPhone eylemleri döner."""
    check(token)
    body = await request.json()
    text = str(body.get("text", "")).strip()
    if not text:
        return {"speech": "Seni duyamadım.", "actions": []}

    async with _siri["lock"]:
        out: dict[str, Any] = {"speech": "", "actions": [], "notices": []}

        async def emit(ev: dict[str, Any]) -> None:
            if ev["type"] == "text":
                out["speech"] += ev["text"]
            elif ev["type"] == "text_end":
                out["speech"] += "\n"
            elif ev["type"] == "iphone_actions":
                out["actions"] = ev["actions"]
            elif ev["type"] == "notice":
                out["notices"].append(ev["text"])

        async def approve(name: str, args: dict[str, Any]) -> bool:
            return AUTO_APPROVE  # Siri'de onay penceresi yok

        loop_time = asyncio.get_running_loop().time()
        sess = _siri["session"]
        if sess is None or loop_time - _siri["last"] > 600 or text.lower() in ("yeni konuşma", "sıfırla"):
            sess = _siri["session"] = agent.Session(emit, approve, effort=SIRI_EFFORT)
        sess.emit, sess.approve = emit, approve
        _siri["last"] = loop_time

        info = []
        if body.get("battery") not in (None, ""):
            info.append(f"pil %{body['battery']}")
        if str(body.get("charging", "")).lower() in ("1", "true", "evet", "yes"):
            info.append("şarjda")
        note = (f"[iPhone'dan Siri ile söylendi{'; ' + ', '.join(info) if info else ''}. Cevabın sesli "
                "okunacak: 1-2 kısa cümle, liste ya da kod yok. Onay gerektiren bilgisayar işlemleri "
                f"burada {'otomatik onaylı' if AUTO_APPROVE else 'reddedilir; kullanıcıya bilgisayardaki arayüzü kullanmasını söyle'}.]\n")
        try:
            await asyncio.wait_for(sess.send(note + text), timeout=110)
        except asyncio.TimeoutError:
            out["speech"] += " Bu biraz uzun sürüyor, bilgisayardaki ekrandan takip edebilirsin."
        speech = " ".join(out["speech"].split()) or " ".join(out["notices"]) or "Tamamdır."
        return {"speech": speech, "actions": out["actions"], "has_actions": bool(out["actions"])}


@app.get("/iphone")
async def iphone_page() -> FileResponse:
    return FileResponse(HERE / "static" / "iphone.html")


@app.websocket("/ws")
async def ws(socket_: WebSocket) -> None:
    if not secrets.compare_digest(socket_.query_params.get("token", ""), TOKEN):
        await socket_.close(code=4401)
        return
    await socket_.accept()
    send_lock = asyncio.Lock()
    approvals: dict[str, asyncio.Future[bool]] = {}

    async def emit(event: dict[str, Any]) -> None:
        async with send_lock:
            try:
                await socket_.send_json(event)
            except (WebSocketDisconnect, RuntimeError):
                pass

    async def approve(name: str, args: dict[str, Any]) -> bool:
        if AUTO_APPROVE:
            return True
        aid = secrets.token_hex(4)
        fut: asyncio.Future[bool] = asyncio.get_running_loop().create_future()
        approvals[aid] = fut
        await emit({"type": "approval", "id": aid, "name": name, "input": args})
        try:
            return await asyncio.wait_for(fut, timeout=300)
        except asyncio.TimeoutError:
            return False
        finally:
            approvals.pop(aid, None)

    session = agent.Session(emit, approve)
    task: asyncio.Task[None] | None = None
    await emit({"type": "hello", "name": agent.NAME, "model": agent.MODEL,
                "memories": len(tools.load_memories())})

    try:
        while True:
            msg = await socket_.receive_json()
            kind = msg.get("type")
            if kind == "message":
                if task and not task.done():
                    task.cancel()
                    await asyncio.gather(task, return_exceptions=True)
                task = asyncio.create_task(session.send(str(msg.get("text", "")), msg.get("images")))
            elif kind == "stop" and task and not task.done():
                task.cancel()
            elif kind == "approval":
                fut = approvals.get(str(msg.get("id")))
                if fut and not fut.done():
                    fut.set_result(bool(msg.get("ok")))
            elif kind == "reset":
                if task and not task.done():
                    task.cancel()
                    await asyncio.gather(task, return_exceptions=True)
                session.reset()
                await emit({"type": "reset"})
    except WebSocketDisconnect:
        pass
    finally:
        if task and not task.done():
            task.cancel()


def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="JARVIS kişisel yapay zeka asistanı")
    ap.add_argument("--lan", action="store_true", help="Yerel ağdaki cihazlara (telefon) aç")
    ap.add_argument("--port", type=int, default=int(os.environ.get("JARVIS_PORT", "8765")))
    ap.add_argument("--cert", help="HTTPS sertifikası (telefonda mikrofon için)")
    ap.add_argument("--key", help="HTTPS anahtarı")
    a = ap.parse_args()

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("⚠  ANTHROPIC_API_KEY yok. .env.example'ı .env olarak kopyalayıp anahtarı yaz.",
              file=sys.stderr)

    host = "0.0.0.0" if a.lan else "127.0.0.1"
    scheme = "https" if a.cert else "http"
    print("\n  ╔══════════════════════════════════════════╗")
    print(f"  ║  {agent.NAME} çevrimiçi — model {agent.MODEL:<17}║")
    print("  ╚══════════════════════════════════════════╝")
    print(f"  Bu bilgisayar : {scheme}://localhost:{a.port}/?token={TOKEN}")
    if a.lan:
        print(f"  Telefon       : {scheme}://{lan_ip()}:{a.port}/?token={TOKEN}")
    print(f"  Otomatik onay : {'AÇIK ⚠' if AUTO_APPROVE else 'kapalı (riskli işlemler sorulur)'}\n")
    uvicorn.run(app, host=host, port=a.port, log_level="warning",
                ssl_certfile=a.cert, ssl_keyfile=a.key)


if __name__ == "__main__":
    main()

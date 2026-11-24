"""JARVIS ajan döngüsü: Claude + yerel araçlar, olayları arayüze akış halinde gönderir."""

from __future__ import annotations

import asyncio
import json
import os
import platform
import time
import uuid
from pathlib import Path
from typing import Any, Awaitable, Callable

import anthropic

import tools

MODEL = os.environ.get("JARVIS_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("JARVIS_EFFORT", "high")  # low | medium | high | xhigh | max
NAME = os.environ.get("JARVIS_NAME", "JARVIS")
USER = os.environ.get("JARVIS_USER_NAME", "")
MAX_STEPS = int(os.environ.get("JARVIS_MAX_STEPS", "40"))

Emit = Callable[[dict[str, Any]], Awaitable[None]]
Approve = Callable[[str, dict[str, Any]], Awaitable[bool]]

SERVER_TOOLS: list[dict[str, Any]] = [
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 8},
    {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 8},
]


def system_prompt() -> str:
    mem = tools.load_memories()
    mem_text = "\n".join(f"- {m['fact']}" for m in mem[-80:]) or "(henüz yok)"
    who = f"Kullanıcının adı {USER}." if USER else ""
    return f"""Sen {NAME}'sin: kullanıcının kişisel yapay zeka asistanısın. Zeki, sakin, \
hafif esprili ve son derece yetkin bir yardımcısın. {who}

Ortam: {platform.system()} {platform.release()} ({platform.node()}), ev klasörü {Path.home()}.
Oturum başlangıcı: {time.strftime('%Y-%m-%d %H:%M, %A')}.

Kullanıcının bilgisayarı üzerinde gerçek araçların var: kabuk komutları, dosyalar, uygulama \
açma, ekran görüntüsü + fare/klavye kontrolü, sistem durumu, pano, ADB ile Android telefon \
kontrolü, web araması ve web sayfası okuma, ayrıca kalıcı hafıza.

Nasıl çalışırsın:
- İstekleri gerçekten yap; sadece nasıl yapılacağını anlatma. Gerekirse birden çok aracı \
art arda kullan ve sonucu doğrula (ör. bir şeyi tıkladıktan sonra yeniden ekran görüntüsü al).
- Birbirinden bağımsız işlemleri aynı anda (paralel araç çağrılarıyla) yap.
- Güncel bilgi (haber, hava, fiyat, kur) gerekiyorsa web_search kullan.
- Kullanıcı hakkında kalıcı bir şey öğrendiğinde remember ile kaydet.
- Geri alınamaz işlemlerden (silme, para, mesaj gönderme, sistem ayarı) önce ne yapacağını \
tek cümleyle söyle; arayüz bu araçlar için kullanıcıdan onay alır. Reddedilirse ısrar etme.
- Yanıtların sesli okunabilir: kısa, doğal, konuşma dilinde ve kullanıcının dilinde yaz. \
Uzun teknik çıktıları özetle; kod ya da liste yalnızca gerçekten gerekiyorsa.

Kullanıcı hakkında hatırladıkların:
{mem_text}"""


class Session:
    """Tek bir konuşma; geçmişi ve araç döngüsünü tutar."""

    def __init__(self, emit: Emit, approve: Approve) -> None:
        self.client = anthropic.AsyncAnthropic()
        self.emit = emit
        self.approve = approve
        self.messages: list[dict[str, Any]] = []
        self.system = system_prompt()
        self.tool_specs = [t.spec() for t in tools.TOOLS] + SERVER_TOOLS
        self.id = uuid.uuid4().hex[:8]

    def reset(self) -> None:
        self.messages.clear()
        self.system = system_prompt()

    # ----------------------------------------------------------- geçmiş onarımı
    def _repair(self) -> None:
        """Yarıda kesilen bir turdan sonra geçmişi API'nin kabul edeceği hale getir."""
        if not self.messages or self.messages[-1]["role"] != "assistant":
            return
        content = self.messages[-1]["content"]
        pending = [b for b in content if _btype(b) == "tool_use"]
        if pending:
            self.messages.append({"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": _bget(b, "id"), "is_error": True,
                 "content": "Kullanıcı tarafından durduruldu."} for b in pending]})

    def _add_user(self, blocks: list[dict[str, Any]]) -> None:
        self._repair()
        if self.messages and self.messages[-1]["role"] == "user":
            last = self.messages[-1]["content"]
            if isinstance(last, str):
                last = [{"type": "text", "text": last}]
            self.messages[-1]["content"] = last + blocks
        else:
            self.messages.append({"role": "user", "content": blocks})

    # ----------------------------------------------------------- ana döngü
    async def send(self, text: str, images: list[dict[str, str]] | None = None) -> None:
        blocks: list[dict[str, Any]] = []
        for img in images or []:
            blocks.append({"type": "image", "source": {
                "type": "base64", "media_type": img["media_type"], "data": img["data"]}})
        blocks.append({"type": "text", "text": text})
        self._add_user(blocks)

        await self.emit({"type": "state", "state": "thinking"})
        json_retries = 0
        try:
            for _step in range(MAX_STEPS):
                try:
                    response = await self._stream_turn()
                    json_retries = 0
                except ValueError:
                    # Araç girdisi hiç çözümlenemeyen JSON olarak geldi: turu yeniden iste.
                    json_retries += 1
                    if json_retries > 2:
                        raise
                    continue

                self.messages.append({"role": "assistant", "content": response.content})

                if response.stop_reason == "pause_turn":
                    continue
                if response.stop_reason == "refusal":
                    await self.emit({"type": "notice", "level": "warn",
                                     "text": "Bu isteği yerine getiremiyorum."})
                    break

                tool_uses = [b for b in response.content if b.type == "tool_use"]
                if not tool_uses:
                    break
                if response.stop_reason == "max_tokens":
                    self._repair()
                    await self.emit({"type": "notice", "level": "warn",
                                     "text": "Yanıt sınıra takıldı; araç çağrısı yarım kaldı."})
                    break

                results = await asyncio.gather(*(self._run_tool(b) for b in tool_uses))
                self.messages.append({"role": "user", "content": list(results)})
                await self.emit({"type": "state", "state": "thinking"})
            else:
                await self.emit({"type": "notice", "level": "warn",
                                 "text": f"{MAX_STEPS} adım sınırına ulaşıldı."})
        except asyncio.CancelledError:
            self._repair()
            await self.emit({"type": "notice", "level": "info", "text": "Durduruldu."})
            raise
        except anthropic.AuthenticationError:
            await self.emit({"type": "notice", "level": "error",
                             "text": "API anahtarı geçersiz. .env dosyasındaki ANTHROPIC_API_KEY'i kontrol et."})
        except anthropic.RateLimitError:
            await self.emit({"type": "notice", "level": "error",
                             "text": "Hız sınırına takıldım, biraz sonra tekrar dene."})
        except anthropic.APIStatusError as e:
            await self.emit({"type": "notice", "level": "error", "text": f"API hatası {e.status_code}: {e.message}"})
        except anthropic.APIConnectionError:
            await self.emit({"type": "notice", "level": "error", "text": "Claude'a bağlanılamadı (internet?)."})
        finally:
            self._repair()
            await self.emit({"type": "done"})

    async def _stream_turn(self):
        async with self.client.beta.messages.stream(
            model=MODEL,
            max_tokens=64000,
            system=self.system,
            messages=self.messages,
            tools=self.tool_specs,
            thinking={"type": "adaptive", "display": "summarized"},
            output_config={"effort": EFFORT},
            cache_control={"type": "ephemeral"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            block_kind: dict[int, str] = {}
            speaking = False
            async for event in stream:
                et = event.type
                if et == "content_block_start":
                    cb = event.content_block
                    block_kind[event.index] = cb.type
                    if cb.type == "tool_use":
                        await self.emit({"type": "tool_prepare", "id": cb.id, "name": cb.name})
                    elif cb.type == "server_tool_use":
                        await self.emit({"type": "tool_start", "id": cb.id, "name": cb.name,
                                         "input": {}, "server": True})
                    elif cb.type.endswith("_tool_result"):
                        await self.emit({"type": "tool_end", "id": getattr(cb, "tool_use_id", ""),
                                         "name": cb.type.replace("_tool_result", ""), "ok": True,
                                         "preview": _server_result_preview(cb)})
                    elif cb.type == "thinking":
                        await self.emit({"type": "thinking_start"})
                    elif cb.type == "text" and not speaking:
                        speaking = True
                        await self.emit({"type": "state", "state": "speaking"})
                elif et == "content_block_delta":
                    d = event.delta
                    if d.type == "text_delta":
                        await self.emit({"type": "text", "text": d.text})
                    elif d.type == "thinking_delta":
                        await self.emit({"type": "thinking", "text": d.thinking})
                elif et == "content_block_stop":
                    if block_kind.get(event.index) == "text":
                        await self.emit({"type": "text_end"})
            return await stream.get_final_message()

    async def _run_tool(self, block) -> dict[str, Any]:
        name, args, tid = block.name, block.input, block.id
        err = tools.validate(name, args)
        if err:
            return {"type": "tool_result", "tool_use_id": tid, "is_error": True,
                    "content": json.dumps({"INVALID_JSON": err, "input": args}, ensure_ascii=False)}

        await self.emit({"type": "tool_start", "id": tid, "name": name, "input": args})
        if tools.needs_approval(name, args) and not await self.approve(name, args):
            await self.emit({"type": "tool_end", "id": tid, "name": name, "ok": False,
                             "preview": "Kullanıcı reddetti"})
            return {"type": "tool_result", "tool_use_id": tid, "is_error": True,
                    "content": "Kullanıcı bu işlemi reddetti."}
        try:
            out = await tools.execute(name, args)
            ok = True
        except Exception as e:  # araç hatasını modele bildir, döngüyü kırma
            out, ok = f"Hata: {type(e).__name__}: {e}", False

        preview = out if isinstance(out, str) else "[görüntü]"
        await self.emit({"type": "tool_end", "id": tid, "name": name, "ok": ok,
                         "preview": preview[:400]})
        if isinstance(out, list) and out and out[0].get("type") == "image":
            await self.emit({"type": "image", "data": out[0]["source"]["data"]})
        return {"type": "tool_result", "tool_use_id": tid, "is_error": not ok,
                "content": out if isinstance(out, list) else str(out)}


def _btype(b: Any) -> str:
    return b.get("type") if isinstance(b, dict) else getattr(b, "type", "")


def _bget(b: Any, k: str) -> Any:
    return b.get(k) if isinstance(b, dict) else getattr(b, k, None)


def _server_result_preview(cb: Any) -> str:
    content = getattr(cb, "content", None)
    if isinstance(content, list):
        titles = [getattr(r, "title", "") for r in content[:5]]
        return " · ".join(t for t in titles if t) or f"{len(content)} sonuç"
    if content is not None and getattr(content, "error_code", None):
        return f"hata: {content.error_code}"
    return "tamam"

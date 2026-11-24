/* JARVIS arayüzü: animasyonlar, ses, WebSocket istemcisi */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } },
  };

  // ---------------------------------------------------------------- token
  const params = new URLSearchParams(location.search);
  let TOKEN = params.get("token") || store.get("jarvis_token", "");
  if (params.get("token")) { store.set("jarvis_token", TOKEN); history.replaceState(null, "", location.pathname); }

  // ---------------------------------------------------------------- durum
  const S = {
    state: "offline", level: 0, targetLevel: 0, shock: [], voice: store.get("jarvis_voice", true),
    wake: false, busy: false, cfg: { tts: "browser", name: "JARVIS" },
  };
  const STATE_TEXT = { offline: "ÇEVRİMDIŞI", idle: "HAZIR", listening: "DİNLİYOR", thinking: "DÜŞÜNÜYOR", speaking: "KONUŞUYOR", working: "ÇALIŞIYOR", error: "HATA" };
  function setState(st) {
    S.state = st;
    document.body.dataset.state = st;
    $("#state-text").textContent = STATE_TEXT[st] || st.toUpperCase();
  }
  const shock = (color) => S.shock.push({ r: 0, a: 1, color: color || "41,216,255" });

  // ---------------------------------------------------------------- açılış
  const BOOT = [
    "> çekirdek başlatılıyor ............ OK",
    "> nöral ağ bağlantısı ............. OK",
    "> sensör dizisi kalibre ediliyor .. OK",
    "> ses modülü ...................... OK",
    "> güvenli kanal kuruluyor ......... OK",
    "> tüm sistemler çevrimiçi.",
  ];
  async function boot() {
    const log = $("#boot-log"), bar = $(".boot-bar span");
    for (let i = 0; i < BOOT.length; i++) {
      for (const ch of BOOT[i]) { log.textContent += ch; if (Math.random() < .5) await sleep(4); }
      log.textContent += "\n"; bar.style.width = `${((i + 1) / BOOT.length) * 100}%`;
      await sleep(120);
    }
    await sleep(250);
    document.body.classList.remove("booting");
    shock(); setTimeout(shock, 220); setTimeout(shock, 440);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- arka plan
  const bg = $("#bg"), bx = bg.getContext("2d");
  let W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, 2);
  const dots = [];
  function resizeBg() {
    W = innerWidth; H = innerHeight;
    bg.width = W * DPR; bg.height = H * DPR; bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dots.length = 0;
    const n = Math.min(110, Math.floor((W * H) / 14000));
    for (let i = 0; i < n; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .3 });
  }
  function drawBg(t) {
    bx.clearRect(0, 0, W, H);
    // hareketli altıgen ızgara
    const s = 46, off = (t * 0.006) % (s * 1.5);
    bx.strokeStyle = "rgba(41,216,255,0.045)"; bx.lineWidth = 1;
    for (let y = -s + off; y < H + s; y += s * 0.866) {
      const row = Math.round((y - off) / (s * 0.866));
      for (let x = (row % 2) * s * 0.75; x < W + s; x += s * 1.5) hex(x, y, s / 2);
    }
    // takımyıldız parçacıkları
    const accent = getAccent();
    for (const d of dots) {
      d.x += d.vx * (1 + S.level * 4); d.y += d.vy * (1 + S.level * 4);
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
    }
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      bx.fillStyle = `rgba(${accent},0.6)`; bx.beginPath(); bx.arc(a.x, a.y, a.r, 0, 7); bx.fill();
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 12000) { bx.strokeStyle = `rgba(${accent},${0.12 * (1 - d2 / 12000)})`; bx.beginPath(); bx.moveTo(a.x, a.y); bx.lineTo(b.x, b.y); bx.stroke(); }
      }
    }
  }
  function hex(x, y, r) {
    bx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; bx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    bx.closePath(); bx.stroke();
  }
  const ACC = { idle: "41,216,255", speaking: "126,249,255", thinking: "255,181,71", working: "255,181,71", listening: "77,255,176", error: "255,77,109", offline: "90,120,140" };
  const getAccent = () => ACC[S.state] || ACC.idle;

  // ---------------------------------------------------------------- reaktör
  const rc = $("#reactor"), rx = rc.getContext("2d");
  let RW = 0, RH = 0;
  const N = 520, sphere = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.39996323;
    sphere.push([Math.cos(th) * rad, y, Math.sin(th) * rad, Math.random()]);
  }
  const rings = [
    { r: 1.25, w: 2, speed: .25, seg: 3, gap: .35, alpha: .9 },
    { r: 1.38, w: 6, speed: -.12, seg: 24, gap: .55, alpha: .5 },
    { r: 1.52, w: 1, speed: .06, seg: 1, gap: 0, alpha: .35 },
    { r: 1.62, w: 3, speed: -.35, seg: 2, gap: .7, alpha: .8 },
    { r: 1.78, w: 10, speed: .04, seg: 72, gap: .7, alpha: .25 },
    { r: 1.92, w: 2, speed: .18, seg: 5, gap: .5, alpha: .6 },
  ];
  let freq = new Uint8Array(128);
  function resizeReactor() {
    RW = rc.clientWidth; RH = rc.clientHeight; // transform'dan etkilenmez
    rc.width = RW * DPR; rc.height = RH * DPR; rx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function drawReactor(t) {
    const cx = RW / 2, cy = RH / 2, R = Math.max(30, Math.min(RW, RH) * 0.185);
    const acc = getAccent(), L = S.level;
    rx.clearRect(0, 0, RW, RH);
    rx.globalCompositeOperation = "lighter";

    // dış hale
    const halo = rx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 2.4);
    halo.addColorStop(0, `rgba(${acc},${0.22 + L * .3})`); halo.addColorStop(.5, `rgba(${acc},0.05)`); halo.addColorStop(1, "rgba(0,0,0,0)");
    rx.fillStyle = halo; rx.beginPath(); rx.arc(cx, cy, R * 2.4, 0, 7); rx.fill();

    // çekirdek
    const pulse = 1 + Math.sin(t * .003) * .05 + L * .35;
    const core = rx.createRadialGradient(cx, cy, 0, cx, cy, R * .55 * pulse);
    core.addColorStop(0, "rgba(255,255,255,0.95)"); core.addColorStop(.25, `rgba(${acc},0.85)`); core.addColorStop(1, `rgba(${acc},0)`);
    rx.fillStyle = core; rx.beginPath(); rx.arc(cx, cy, R * .55 * pulse, 0, 7); rx.fill();

    // 3B parçacık küresi
    const ay = t * 0.00035 * (S.state === "thinking" ? 3 : 1), ax = Math.sin(t * .0002) * .5;
    const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    for (let i = 0; i < N; i++) {
      const p = sphere[i];
      const f = freq[(i * 7) % 128] / 255;
      const wob = 1 + Math.sin(t * .002 + p[3] * 12) * .03 + f * L * .5 + (S.state === "thinking" ? Math.sin(t * .01 + i) * .04 : 0);
      let x = p[0] * wob, y = p[1] * wob, z = p[2] * wob;
      const x1 = x * cY - z * sY, z1 = x * sY + z * cY;
      const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const persp = 1.8 / (2.6 - z2);
      const px = cx + x1 * R * persp, py = cy + y1 * R * persp;
      const alpha = 0.15 + (z2 + 1) * .38;
      rx.fillStyle = `rgba(${acc},${alpha})`;
      rx.fillRect(px, py, 1.4 * persp + f * 1.5, 1.4 * persp + f * 1.5);
    }

    // segmentli halkalar
    rx.lineCap = "butt";
    for (const g of rings) {
      const rr = R * g.r * (1 + L * .06), rot = t * .001 * g.speed * (S.state === "thinking" ? 4 : 1);
      rx.strokeStyle = `rgba(${acc},${g.alpha})`; rx.lineWidth = g.w;
      if (g.seg === 1) { rx.beginPath(); rx.arc(cx, cy, rr, 0, 7); rx.stroke(); continue; }
      const step = (Math.PI * 2) / g.seg;
      for (let k = 0; k < g.seg; k++) {
        const a0 = rot + k * step;
        rx.beginPath(); rx.arc(cx, cy, rr, a0, a0 + step * (1 - g.gap)); rx.stroke();
      }
    }

    // ses dalga halkası
    const bars = 96, br = R * 2.05;
    rx.lineWidth = 2;
    for (let i = 0; i < bars; i++) {
      const v = freq[Math.floor((i / bars) * 64)] / 255;
      const synth = S.state === "idle" ? (Math.sin(t * .002 + i * .3) + 1) * .04 : 0;
      const len = 3 + (v * L * 1.2 + synth) * R * .55;
      const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
      rx.strokeStyle = `rgba(${acc},${0.35 + v * .6})`;
      rx.beginPath(); rx.moveTo(cx + Math.cos(a) * br, cy + Math.sin(a) * br);
      rx.lineTo(cx + Math.cos(a) * (br + len), cy + Math.sin(a) * (br + len)); rx.stroke();
    }

    // düşünürken yörüngedeki kuyruklu yıldızlar
    if (S.state === "thinking" || S.state === "working") {
      for (let k = 0; k < 3; k++) {
        const a = t * .004 * (k % 2 ? -1 : 1) + k * 2.1, rr = R * (1.45 + k * .18);
        for (let j = 0; j < 14; j++) {
          const aa = a - j * .045 * (k % 2 ? -1 : 1);
          rx.fillStyle = `rgba(${acc},${(1 - j / 14) * .9})`;
          rx.beginPath(); rx.arc(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, 3 - j * .18, 0, 7); rx.fill();
        }
      }
    }

    // işaret çizgileri ve nişangah
    rx.strokeStyle = `rgba(${acc},0.35)`; rx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + t * .00008;
      rx.beginPath(); rx.moveTo(cx + Math.cos(a) * R * 2.35, cy + Math.sin(a) * R * 2.35);
      rx.lineTo(cx + Math.cos(a) * R * 2.6, cy + Math.sin(a) * R * 2.6); rx.stroke();
    }

    // şok dalgaları
    for (let i = S.shock.length - 1; i >= 0; i--) {
      const s = S.shock[i]; s.r += 6; s.a -= 0.018;
      if (s.a <= 0) { S.shock.splice(i, 1); continue; }
      rx.strokeStyle = `rgba(${s.color},${s.a})`; rx.lineWidth = 2 + s.a * 3;
      rx.beginPath(); rx.arc(cx, cy, R * .6 + s.r, 0, 7); rx.stroke();
    }
    rx.globalCompositeOperation = "source-over";
  }

  // ---------------------------------------------------------------- ses analizi
  let actx = null, analyser = null, micStream = null;
  function audioCtx() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .75;
      freq = new Uint8Array(analyser.frequencyBinCount);
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  let synthPhase = 0;
  function updateLevel() {
    if (analyser && (S.state === "listening" || ttsAudio)) {
      analyser.getByteFrequencyData(freq);
      let sum = 0; for (let i = 0; i < 64; i++) sum += freq[i];
      S.targetLevel = Math.min(1, (sum / 64 / 255) * 2.2);
    } else if (S.state === "speaking" && speakingBrowser) {
      synthPhase += .25;
      for (let i = 0; i < freq.length; i++) freq[i] = 120 + Math.sin(synthPhase + i * .4) * 80 * Math.random();
      S.targetLevel = .45 + Math.sin(synthPhase * .7) * .25;
    } else {
      for (let i = 0; i < freq.length; i++) freq[i] *= .9;
      S.targetLevel = S.state === "thinking" ? .15 : 0;
    }
    S.level += (S.targetLevel - S.level) * .2;
  }
  async function startMicViz() {
    try {
      audioCtx();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = actx.createMediaStreamSource(micStream); src.connect(analyser);
      micStream._src = src;
    } catch { /* görselleştirme opsiyonel */ }
  }
  function stopMicViz() {
    if (micStream) { micStream._src?.disconnect(); micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  }

  // ---------------------------------------------------------------- konuşma (TTS)
  let ttsQueue = [], ttsBusy = false, ttsAudio = null, speakingBrowser = false, sentenceBuf = "";
  function speakChunk(text) {
    if (!S.voice) return;
    const clean = text.replace(/```[\s\S]*?```/g, " kod bloğu ").replace(/[*_`#>|]/g, "").replace(/https?:\/\/\S+/g, "bağlantı").trim();
    if (clean) { ttsQueue.push(clean); pumpTTS(); }
  }
  async function pumpTTS() {
    if (ttsBusy || !ttsQueue.length) return;
    ttsBusy = true;
    const text = ttsQueue.shift();
    setState("speaking");
    try {
      if (S.cfg.tts === "elevenlabs") await speakEleven(text); else await speakBrowser(text);
    } catch { /* bir sonraki parçaya geç */ }
    ttsBusy = false;
    if (ttsQueue.length) pumpTTS();
    else if (!S.busy) afterSpeech();
  }
  function speakBrowser(text) {
    return new Promise((res) => {
      if (!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "tr-TR"; u.rate = 1.04; u.pitch = .92;
      const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith("tr"));
      if (v) u.voice = v;
      speakingBrowser = true;
      u.onend = u.onerror = () => { speakingBrowser = false; res(); };
      speechSynthesis.speak(u);
    });
  }
  async function speakEleven(text) {
    const r = await fetch(`/api/tts?token=${encodeURIComponent(TOKEN)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) return speakBrowser(text);
    const url = URL.createObjectURL(await r.blob());
    await new Promise((res) => {
      const a = new Audio(url); ttsAudio = a;
      try { audioCtx(); const src = actx.createMediaElementSource(a); src.connect(analyser); src.connect(actx.destination); } catch { /* */ }
      a.onended = a.onerror = () => { ttsAudio = null; URL.revokeObjectURL(url); res(); };
      a.play().catch(res);
    });
  }
  function stopSpeech() {
    ttsQueue = []; sentenceBuf = "";
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
    speakingBrowser = false; ttsBusy = false;
  }
  function feedSpeech(delta, flush) {
    sentenceBuf += delta;
    const re = /([^.!?…\n]+[.!?…]+["')\]]?\s|[^\n]+\n)/;
    let m;
    while ((m = sentenceBuf.match(re))) { speakChunk(m[0]); sentenceBuf = sentenceBuf.slice(m.index + m[0].length); }
    if (flush && sentenceBuf.trim()) { speakChunk(sentenceBuf); sentenceBuf = ""; }
  }
  function afterSpeech() {
    setState("idle");
    if (S.wake) startRecognition(true);
  }

  // ---------------------------------------------------------------- konuşma tanıma
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, recActive = false, wakeMode = false;
  function startRecognition(wake = false) {
    if (!SR) { toast("Bu tarayıcı sesli girişi desteklemiyor (Chrome/Edge dene)"); return; }
    if (recActive) return;
    stopSpeech();
    wakeMode = wake;
    rec = new SR(); rec.lang = "tr-TR"; rec.interimResults = true; rec.continuous = wake;
    let finalText = "";
    rec.onstart = () => { recActive = true; $("#btn-mic").classList.add("live"); if (!wake) { setState("listening"); startMicViz(); } };
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += tr; else interim += tr;
      }
      const heard = (finalText + interim).trim();
      if (wakeMode) {
        const m = heard.toLowerCase().match(/(jarvis|cervis|carvis|jarvıs|ceyvis)[,\s]*(.*)$/);
        if (m) {
          wakeMode = false; setState("listening"); startMicViz(); shock("77,255,176");
          $("#input").value = m[2] || "";
          if (e.results[e.results.length - 1].isFinal && m[2]) { rec.stop(); }
        }
        return;
      }
      $("#input").value = heard;
    };
    rec.onend = () => {
      recActive = false; $("#btn-mic").classList.remove("live"); stopMicViz();
      const text = $("#input").value.trim();
      if (!wakeMode && text) { submit(); }
      else if (S.wake && !S.busy && !ttsBusy) { setTimeout(() => startRecognition(true), 400); if (S.state === "listening") setState("idle"); }
      else if (S.state === "listening") setState("idle");
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") { toast("Mikrofon izni verilmedi (telefonda HTTPS gerekir)"); S.wake = false; $("#btn-wake").classList.remove("on"); } };
    try { rec.start(); } catch { /* zaten çalışıyor */ }
  }
  function stopRecognition() { wakeMode = false; try { rec?.stop(); } catch { /* */ } }

  // ---------------------------------------------------------------- transkript
  const tr = $("#transcript");
  let aiBubble = null;
  function bubble(cls, text = "") {
    const d = document.createElement("div"); d.className = `msg ${cls}`; d.innerHTML = text; tr.appendChild(d);
    tr.scrollTop = tr.scrollHeight; return d;
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

  // ---------------------------------------------------------------- aktivite
  const act = $("#activity"), actItems = {};
  const TOOL_TR = { run_shell: "KABUK", read_file: "DOSYA OKU", write_file: "DOSYA YAZ", list_dir: "KLASÖR", open_target: "AÇ", screenshot: "EKRAN", computer_control: "FARE/KLAVYE",
    system_status: "SİSTEM", clipboard: "PANO", remember: "HAFIZA+", recall: "HAFIZA?", forget: "HAFIZA−", phone: "TELEFON", web_search: "WEB ARAMA", web_fetch: "WEB OKU" };
  function actStart(id, name, input) {
    let li = actItems[id];
    if (!li) { li = document.createElement("li"); act.prepend(li); actItems[id] = li; }
    li.className = "run";
    const summary = input && Object.keys(input).length ? JSON.stringify(input) : "";
    li.innerHTML = `<b><span>${TOOL_TR[name] || name.toUpperCase()}</span><span>${new Date().toLocaleTimeString("tr-TR")}</span></b>${summary ? `<code>${esc(summary.slice(0, 220))}</code>` : ""}`;
    while (act.children.length > 40) act.lastChild.remove();
    shock("255,181,71");
  }
  function actEnd(id, name, ok, preview) {
    const li = actItems[id] || (actStart(id, name, {}), actItems[id]);
    li.className = ok ? "ok" : "fail";
    if (preview) { const c = document.createElement("code"); c.textContent = "→ " + preview.slice(0, 200); li.appendChild(c); }
  }

  // ---------------------------------------------------------------- WebSocket
  let ws = null, retry = 0;
  function connect() {
    if (!TOKEN) {
      TOKEN = prompt("Erişim token'ı (sunucu terminalinde yazıyor):") || "";
      store.set("jarvis_token", TOKEN);
    }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(TOKEN)}`);
    ws.onopen = () => { retry = 0; setState("idle"); loadConfig(); };
    ws.onclose = (e) => {
      setState("offline");
      if (e.code === 4401) { toast("Token geçersiz"); store.set("jarvis_token", ""); TOKEN = ""; }
      setTimeout(connect, Math.min(8000, 800 * 2 ** retry++));
    };
    ws.onmessage = (e) => onEvent(JSON.parse(e.data));
  }
  const send = (o) => ws?.readyState === 1 && ws.send(JSON.stringify(o));

  let thinkBuf = "";
  function onEvent(ev) {
    switch (ev.type) {
      case "hello":
        $("#si-mem").textContent = `${ev.memories} kayıt`;
        break;
      case "state":
        if (ev.state === "thinking" && !ttsBusy) setState("thinking");
        break;
      case "thinking_start": thinkBuf = ""; break;
      case "thinking":
        thinkBuf += ev.text;
        { const tl = $("#thinking-line"); tl.textContent = "◈ " + thinkBuf.replace(/\s+/g, " ").slice(-140); tl.classList.add("show"); }
        break;
      case "text":
        $("#thinking-line").classList.remove("show");
        if (!aiBubble) { aiBubble = bubble("ai streaming"); aiBubble._raw = ""; }
        aiBubble._raw += ev.text; aiBubble.innerHTML = md(aiBubble._raw); tr.scrollTop = tr.scrollHeight;
        if (!ttsBusy && !S.voice) setState("speaking");
        feedSpeech(ev.text, false);
        break;
      case "text_end":
        feedSpeech("", true);
        if (aiBubble) aiBubble.classList.remove("streaming");
        aiBubble = null;
        break;
      case "tool_prepare": actStart(ev.id, ev.name, {}); setState("working"); break;
      case "tool_start": actStart(ev.id, ev.name, ev.input); if (!ttsBusy) setState("working"); break;
      case "tool_end": actEnd(ev.id, ev.name, ev.ok, ev.preview); break;
      case "image": { const v = $("#vision"); v.classList.remove("hidden"); v.querySelector("img").src = `data:image/png;base64,${ev.data}`; break; }
      case "approval": askApproval(ev); break;
      case "notice": bubble(`notice ${ev.level}`, esc(ev.text)); if (ev.level === "error") { setState("error"); setTimeout(() => S.state === "error" && setState("idle"), 2500); } break;
      case "reset": tr.innerHTML = ""; act.innerHTML = ""; toast("Yeni konuşma"); shock(); break;
      case "done":
        S.busy = false; $("#thinking-line").classList.remove("show");
        if (aiBubble) { aiBubble.classList.remove("streaming"); aiBubble = null; }
        $("#btn-stop").classList.add("hidden"); $("#btn-send").classList.remove("hidden");
        if (!ttsBusy && !ttsQueue.length && S.state !== "error") afterSpeech();
        break;
    }
  }

  // ---------------------------------------------------------------- onay
  const APPROVE_TR = { run_shell: "komut çalıştırmak istiyor", write_file: "dosya yazmak istiyor", computer_control: "fare/klavyeyi kontrol etmek istiyor", forget: "hafızadan silmek istiyor", phone: "telefonda işlem yapmak istiyor" };
  function askApproval(ev) {
    const m = $("#approval");
    $("#ap-desc").textContent = `${S.cfg.name} ${APPROVE_TR[ev.name] || ev.name}:`;
    $("#ap-detail").textContent = ev.name === "run_shell" ? ev.input.command : JSON.stringify(ev.input, null, 2);
    m.classList.remove("hidden");
    const done = (ok) => { m.classList.add("hidden"); send({ type: "approval", id: ev.id, ok }); $("#ap-yes").onclick = $("#ap-no").onclick = null; shock(ok ? "77,255,176" : "255,77,109"); };
    $("#ap-yes").onclick = () => done(true);
    $("#ap-no").onclick = () => done(false);
    if (S.voice) speakChunk("Onayın gerekiyor.");
  }

  // ---------------------------------------------------------------- gönderme
  let pending = [];
  function submit() {
    const input = $("#input"), text = input.value.trim();
    if (!text && !pending.length) return;
    stopSpeech(); stopRecognition();
    const b = bubble("user", (pending.map((p) => `<img src="data:${p.media_type};base64,${p.data}">`).join("")) + md(text || "(görsel)"));
    b.style.animationDelay = "0s";
    send({ type: "message", text: text || "Bu görsele bak.", images: pending });
    input.value = ""; pending = []; $("#previews").innerHTML = "";
    S.busy = true; setState("thinking"); shock();
    $("#btn-stop").classList.remove("hidden"); $("#btn-send").classList.add("hidden");
  }
  $("#composer").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("#btn-stop").onclick = () => { send({ type: "stop" }); stopSpeech(); };
  $("#btn-mic").onclick = () => { audioCtx(); recActive ? stopRecognition() : startRecognition(false); };
  $("#btn-reset").onclick = () => { stopSpeech(); send({ type: "reset" }); };
  const vbtn = $("#btn-voice");
  vbtn.classList.toggle("on", S.voice);
  vbtn.onclick = () => { S.voice = !S.voice; store.set("jarvis_voice", S.voice); vbtn.classList.toggle("on", S.voice); if (!S.voice) stopSpeech(); };
  $("#btn-wake").onclick = (e) => {
    S.wake = !S.wake; e.currentTarget.classList.toggle("on", S.wake);
    if (S.wake) { toast("'Jarvis' de ve komutunu söyle"); startRecognition(true); } else stopRecognition();
  };
  $("#file").onchange = async (e) => {
    for (const f of e.target.files) {
      const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(",")[1]); fr.readAsDataURL(f); });
      pending.push({ media_type: f.type || "image/png", data });
      const img = document.createElement("img"); img.src = `data:${f.type};base64,${data}`; $("#previews").appendChild(img);
    }
    e.target.value = "";
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { send({ type: "stop" }); stopSpeech(); }
    if (e.code === "Space" && e.ctrlKey) { e.preventDefault(); $("#btn-mic").click(); }
  });

  function toast(t) {
    const d = document.createElement("div"); d.textContent = t; $("#toast").appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  // ---------------------------------------------------------------- sistem paneli
  const cpuHist = [];
  async function loadConfig() {
    try {
      const r = await fetch(`/api/config?token=${encodeURIComponent(TOKEN)}`);
      if (r.ok) { S.cfg = await r.json(); $("#brand-name").textContent = S.cfg.name; $("#model-tag").textContent = S.cfg.model; document.title = S.cfg.name; }
    } catch { /* */ }
  }
  async function pollStatus() {
    try {
      const r = await fetch(`/api/status?token=${encodeURIComponent(TOKEN)}`);
      if (r.ok) {
        const s = await r.json();
        for (const g of document.querySelectorAll(".gauge")) {
          const v = s[g.dataset.key];
          g.querySelector("b").textContent = v == null ? "—" : `${Math.round(v)}%`;
          g.querySelector(".val").style.strokeDashoffset = 264 - (264 * (v || 0)) / 100;
          g.classList.toggle("hot", g.dataset.key === "battery" ? v != null && v < 20 : v > 80);
        }
        $("#si-host").textContent = s.host || "—"; $("#si-os").textContent = s.os || "—"; $("#si-up").textContent = s.uptime_h != null ? `${s.uptime_h} sa` : "—";
        cpuHist.push(s.cpu || 0); if (cpuHist.length > 30) cpuHist.shift();
        drawSpark();
      }
    } catch { /* */ }
    setTimeout(pollStatus, 2000);
  }
  function drawSpark() {
    const c = $("#spark"), w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = w * DPR; c.height = h * DPR; const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(41,216,255,.45)"); g.addColorStop(1, "rgba(41,216,255,0)");
    x.beginPath(); x.moveTo(0, h);
    cpuHist.forEach((v, i) => x.lineTo((i / 29) * w, h - (v / 100) * h));
    x.lineTo(((cpuHist.length - 1) / 29) * w, h); x.closePath(); x.fillStyle = g; x.fill();
    x.beginPath(); cpuHist.forEach((v, i) => x.lineTo((i / 29) * w, h - (v / 100) * h)); x.strokeStyle = "#29d8ff"; x.lineWidth = 1.5; x.stroke();
  }
  function tickClock() {
    const d = new Date();
    $("#clock-time").textContent = d.toLocaleTimeString("tr-TR");
    $("#clock-date").textContent = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  }

  // ---------------------------------------------------------------- döngü
  function frame(t) { updateLevel(); drawBg(t); drawReactor(t); requestAnimationFrame(frame); }
  addEventListener("resize", () => { resizeBg(); resizeReactor(); });
  new ResizeObserver(resizeReactor).observe(rc);
  resizeBg(); resizeReactor(); setState("offline");
  requestAnimationFrame(frame);
  setInterval(tickClock, 1000); tickClock();
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
  boot().then(() => { connect(); pollStatus(); });
})();

/* JARVIS GPT — iPhone'da çalışan, ChatGPT (OpenAI API) ile düşünen JARVIS.
   API anahtarı yalnızca bu telefonun tarayıcısında (localStorage) saklanır. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } },
  };
  const PAGE_URL = location.href.split("#")[0].split("?")[0];
  const API = "https://api.openai.com/v1/responses";

  // ------------------------------------------------------------- ayarlar
  const CFG = {
    key: ls.get("jg_key", ""),
    model: ls.get("jg_model", "gpt-5"),
    fastModel: ls.get("jg_fast_model", "gpt-5-mini"),
    web: ls.get("jg_web", true),
  };

  // ------------------------------------------------------------- durum
  const S = { state: "boot", level: 0, shocks: [], voice: ls.get("jg_voice", true), fast: ls.get("jg_fast", false), busy: false };
  const COL = { idle: "41,216,255", speaking: "138,246,255", thinking: "255,181,71", working: "255,181,71", listening: "77,255,176", error: "255,90,118", boot: "70,110,130", off: "70,110,130" };
  const LABEL = { idle: "HAZIR", speaking: "KONUŞUYOR", thinking: "DÜŞÜNÜYOR", working: "ÇALIŞIYOR", listening: "DİNLİYOR", error: "HATA", boot: "BAŞLATILIYOR", off: "ANAHTAR GEREKLİ" };
  function setState(s) {
    S.state = s;
    document.documentElement.style.setProperty("--accent", `rgb(${COL[s]})`);
    $("#stateText").textContent = LABEL[s] || s;
  }
  const shock = (c) => S.shocks.push({ r: 0, a: 1, c: c || "41,216,255" });

  // ------------------------------------------------------------- arka plan + reaktör
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const bg = $("#bg"), bx = bg.getContext("2d"), rc = $("#reactor"), rx = rc.getContext("2d");
  let W, H, RW, RH; const dots = [];
  function size() {
    W = innerWidth; H = innerHeight; bg.width = W * DPR; bg.height = H * DPR; bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    RW = rc.clientWidth; RH = rc.clientHeight; rc.width = RW * DPR; rc.height = RH * DPR; rx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dots.length = 0;
    for (let i = 0; i < Math.min(70, (W * H) / 12000); i++) dots.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 });
  }
  const N = 380, sph = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996; sph.push([Math.cos(t) * r, y, Math.sin(t) * r, Math.random()]); }
  const rings = [[1.25, 2, .25, 3, .35, .9], [1.38, 6, -.12, 24, .55, .5], [1.52, 1, .06, 1, 0, .35], [1.62, 3, -.35, 2, .7, .8], [1.78, 9, .04, 64, .7, .25], [1.92, 2, .18, 5, .5, .6]];
  function draw(t) {
    const a = COL[S.state] || COL.idle, busy = S.state === "thinking" || S.state === "working";
    const target = S.state === "speaking" ? .45 + Math.sin(t * .02) * .25 * Math.random() : busy ? .15 : 0;
    S.level += (target - S.level) * .15; const L = S.level;
    bx.clearRect(0, 0, W, H);
    for (const d of dots) { d.x = (d.x + d.vx * (1 + L * 3) + W) % W; d.y = (d.y + d.vy * (1 + L * 3) + H) % H; }
    for (let i = 0; i < dots.length; i++) {
      const p = dots[i]; bx.fillStyle = `rgba(${a},.55)`; bx.fillRect(p.x, p.y, 1.6, 1.6);
      for (let j = i + 1; j < dots.length; j++) { const q = dots[j], dd = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (dd < 9000) { bx.strokeStyle = `rgba(${a},${.12 * (1 - dd / 9000)})`; bx.beginPath(); bx.moveTo(p.x, p.y); bx.lineTo(q.x, q.y); bx.stroke(); } }
    }
    const cx = RW / 2, cy = RH / 2 - 8, R = Math.max(22, Math.min(RW, RH - 30) * .19);
    rx.clearRect(0, 0, RW, RH); rx.globalCompositeOperation = "lighter";
    let g = rx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 2.4); g.addColorStop(0, `rgba(${a},${.2 + L * .3})`); g.addColorStop(1, "rgba(0,0,0,0)");
    rx.fillStyle = g; rx.beginPath(); rx.arc(cx, cy, R * 2.4, 0, 7); rx.fill();
    const pr = R * .55 * (1 + Math.sin(t * .003) * .05 + L * .35);
    g = rx.createRadialGradient(cx, cy, 0, cx, cy, pr); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.25, `rgba(${a},.85)`); g.addColorStop(1, `rgba(${a},0)`);
    rx.fillStyle = g; rx.beginPath(); rx.arc(cx, cy, pr, 0, 7); rx.fill();
    const ay = t * .00035 * (busy ? 3 : 1), ax = Math.sin(t * .0002) * .5, cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    for (const p of sph) {
      const w = 1 + Math.sin(t * .002 + p[3] * 12) * .03 + L * .25 * Math.sin(t * .01 + p[3] * 40);
      const x1 = p[0] * w * cY - p[2] * w * sY, z1 = p[0] * w * sY + p[2] * w * cY, y1 = p[1] * w * cX - z1 * sX, z2 = p[1] * w * sX + z1 * cX, k = 1.8 / (2.6 - z2);
      rx.fillStyle = `rgba(${a},${.15 + (z2 + 1) * .38})`; rx.fillRect(cx + x1 * R * k, cy + y1 * R * k, 1.4 * k, 1.4 * k);
    }
    for (const [rr0, lw, sp, seg, gap, al] of rings) {
      const rr = R * rr0 * (1 + L * .06), rot = t * .001 * sp * (busy ? 4 : 1); rx.strokeStyle = `rgba(${a},${al})`; rx.lineWidth = lw;
      if (seg === 1) { rx.beginPath(); rx.arc(cx, cy, rr, 0, 7); rx.stroke(); continue; }
      const st = Math.PI * 2 / seg; for (let k = 0; k < seg; k++) { rx.beginPath(); rx.arc(cx, cy, rr, rot + k * st, rot + k * st + st * (1 - gap)); rx.stroke(); }
    }
    rx.lineWidth = 2;
    for (let i = 0; i < 80; i++) {
      const ang = i / 80 * Math.PI * 2 - Math.PI / 2, v = (Math.sin(t * .006 + i * .7) + 1) / 2, len = 3 + (S.state === "idle" ? v * .08 : v * L * .9) * R * .55;
      rx.strokeStyle = `rgba(${a},${.3 + v * .5})`; rx.beginPath(); rx.moveTo(cx + Math.cos(ang) * R * 2.05, cy + Math.sin(ang) * R * 2.05); rx.lineTo(cx + Math.cos(ang) * (R * 2.05 + len), cy + Math.sin(ang) * (R * 2.05 + len)); rx.stroke();
    }
    if (busy) for (let k = 0; k < 3; k++) {
      const an = t * .004 * (k % 2 ? -1 : 1) + k * 2.1, rr = R * (1.45 + k * .18);
      for (let j = 0; j < 12; j++) { const aa = an - j * .05 * (k % 2 ? -1 : 1); rx.fillStyle = `rgba(${a},${(1 - j / 12) * .9})`; rx.beginPath(); rx.arc(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, 2.6 - j * .18, 0, 7); rx.fill(); }
    }
    for (let i = S.shocks.length - 1; i >= 0; i--) {
      const s = S.shocks[i]; s.r += 5; s.a -= .02; if (s.a <= 0) { S.shocks.splice(i, 1); continue; }
      rx.strokeStyle = `rgba(${s.c},${s.a})`; rx.lineWidth = 1 + s.a * 3; rx.beginPath(); rx.arc(cx, cy, R * .6 + s.r, 0, 7); rx.stroke();
    }
    rx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  }
  addEventListener("resize", size); new ResizeObserver(size).observe(rc); size(); setState("boot"); requestAnimationFrame(draw);

  // ------------------------------------------------------------- yardımcılar
  const log = $("#log");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  function bubble(cls, html) { const d = document.createElement("div"); d.className = "msg " + cls; if (html != null) d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  const note = (t, err) => bubble("note" + (err ? " err" : ""), esc(t));

  // ------------------------------------------------------------- ses
  let ttsQueue = [], speaking = false;
  const clean = (t) => t.replace(/```[\s\S]*?```/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>|]/g, "").replace(/https?:\/\/\S+/g, "bağlantı").trim();
  function say(text) {
    if (!S.voice) return;
    for (const part of clean(text).match(/[^.!?…\n]+[.!?…]*/g) || []) if (part.trim()) ttsQueue.push(part.trim());
    pump();
  }
  async function pump() {
    if (speaking || !ttsQueue.length) return;
    speaking = true; setState("speaking");
    const t = ttsQueue.shift();
    await new Promise((res) => {
      if (!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(t); u.lang = "tr-TR"; u.rate = 1.03; u.pitch = .92;
      const v = speechSynthesis.getVoices().find((x) => (x.lang || "").startsWith("tr")); if (v) u.voice = v;
      u.onend = u.onerror = () => res(); speechSynthesis.speak(u); setTimeout(res, 20000);
    });
    speaking = false;
    if (ttsQueue.length) pump(); else if (!S.busy) setState(CFG.key ? "idle" : "off");
  }
  function hush() { ttsQueue = []; try { speechSynthesis.cancel(); } catch { /* */ } speaking = false; }
  let unlocked = false;
  function unlockAudio() {
    if (unlocked || !("speechSynthesis" in window)) return; unlocked = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch { /* */ }
  }

  // ------------------------------------------------------------- hafıza (bu telefonda)
  let memories = ls.get("jg_mem", []);
  const saveMem = () => ls.set("jg_mem", memories);

  // ------------------------------------------------------------- iPhone eylemleri
  const APPS = { whatsapp: "whatsapp://", instagram: "instagram://", spotify: "spotify://", youtube: "youtube://", telegram: "tg://", twitter: "twitter://", x: "twitter://",
    facebook: "fb://", tiktok: "snssdk1233://", netflix: "nflx://", gmail: "googlegmail://", "google maps": "comgooglemaps://", haritalar: "maps://", maps: "maps://",
    müzik: "music://", "apple music": "music://", ayarlar: "App-prefs:", mail: "message://", posta: "message://", takvim: "calshow://", notlar: "mobilenotes://",
    fotoğraflar: "photos-redirect://", safari: "x-web-search://", podcasts: "podcasts://", linkedin: "linkedin://", snapchat: "snapchat://", discord: "discord://",
    trendyol: "trendyol://", getir: "getir://", uber: "uber://", saat: "clock-alarm://", chatgpt: "chatgpt://", claude: "claude://", "app store": "itms-apps://", hepsiburada: "hepsiburada://", yemeksepeti: "yemeksepeti://" };
  const ACT = { open_url: "🔗 Aç", alarm: "⏰ Alarm", timer: "⏱ Zamanlayıcı", reminder: "✅ Hatırlatıcı", flashlight: "🔦 Fener", media: "⏯ Medya", brightness: "☀ Parlaklık",
    volume: "🔊 Ses", focus: "🌙 Rahatsız Etme", low_power: "🔋 Güç tasarrufu", wifi: "📶 Wi-Fi", bluetooth: "Bluetooth", note: "📝 Not", clipboard: "📋 Pano" };
  const NEEDS_SHORTCUT = new Set(["alarm", "timer", "reminder", "flashlight", "media", "brightness", "volume", "focus", "low_power", "wifi", "bluetooth", "note", "clipboard"]);
  let pendingActions = [];
  function normalize(a) {
    const act = String(a.action || ""), out = {};
    for (const [k, v] of Object.entries(a)) if (v !== null && v !== undefined && v !== "") out[k] = v;
    const digits = (s) => /\d/.test(String(s || ""));
    if (act === "open_app") {
      const u = APPS[String(a.name || "").toLowerCase().trim()];
      if (!u) throw new Error(`'${a.name}' için açılış adresi bilinmiyor. Biliyorsan open_url ile URL şemasını kullan.`);
      return { action: "open_url", url: u, label: String(a.name) };
    }
    if ((act === "call" || act === "message") && !digits(a.number)) throw new Error("Telefon numarası gerekli. Hafızada yoksa kullanıcıdan iste ve remember ile kaydet.");
    const num = String(a.number || "").replace(/[^\d+]/g, "");
    if (act === "call") return { action: "open_url", url: `tel:${num}`, label: `Ara ${a.number}` };
    if (act === "message") return { action: "open_url", url: `sms:${num}&body=${encodeURIComponent(String(a.text || ""))}`, label: `Mesaj ${a.number}` };
    if (act === "navigate") return { action: "open_url", url: `maps://?daddr=${encodeURIComponent(String(a.query || ""))}`, label: `Yol tarifi: ${a.query}` };
    if (act === "music") return { action: "open_url", url: `music://music.apple.com/search?term=${encodeURIComponent(String(a.query || ""))}`, label: `Müzik: ${a.query}` };
    if (act === "open_url") { const u = String(a.url || ""); if (/^\s*javascript:/i.test(u)) throw new Error("Bu adres açılamaz."); return { action: "open_url", url: u, label: a.label || u }; }
    if (!NEEDS_SHORTCUT.has(act)) throw new Error(`Bilinmeyen eylem: ${act}`);
    if ("on" in out) out.on = out.on === true || out.on === "1" || out.on === 1 || out.on === "true" ? "1" : "0";
    return out;
  }
  function detail(a) {
    if (a.label) return a.label;
    if (a.time) return a.time + (a.text ? " · " + a.text : "");
    if (a.minutes != null) return a.minutes + " dk";
    if (a.value != null) return "%" + a.value;
    if (a.on != null) return a.on === "1" ? "aç" : "kapat";
    return a.text || "";
  }
  function actionCard(actions) {
    const d = bubble("acts");
    const h = document.createElement("h4"); h.textContent = "iPHONE EYLEMLERİ"; d.appendChild(h);
    const ul = document.createElement("ul");
    for (const a of actions) {
      const li = document.createElement("li"), left = document.createElement("span"), sm = document.createElement("small");
      left.textContent = (ACT[a.action] || a.action) + " "; sm.textContent = detail(a); left.appendChild(sm); li.appendChild(left);
      if (a.action === "open_url" && !/^\s*javascript:/i.test(a.url)) {
        const go = document.createElement("a"); go.className = "go"; go.href = a.url; go.rel = "noopener"; go.textContent = "AÇ"; li.appendChild(go);
      }
      ul.appendChild(li);
    }
    d.appendChild(ul);
    if (actions.some((a) => NEEDS_SHORTCUT.has(a.action))) {
      const json = JSON.stringify({ actions });
      const run = document.createElement("a"); run.className = "run"; run.textContent = "▶ iPhone'da çalıştır";
      run.href = "shortcuts://run-shortcut?name=" + encodeURIComponent("JARVIS Eylem") + "&input=text&text=" + encodeURIComponent(json);
      d.appendChild(run);
    }
    log.scrollTop = log.scrollHeight;
    shock("77,255,176");
  }

  // ------------------------------------------------------------- araçlar (OpenAI function calling)
  const TOOLS = [
    { type: "function", name: "iphone",
      description: "Kullanıcının iPhone'unda bir eylem hazırlar; yanıtın sonunda kullanıcının dokunarak çalıştıracağı bir kart gösterilir. Bir yanıtta birden çok kez çağrılabilir.",
      parameters: { type: "object", required: ["action"], properties: {
        action: { type: "string", enum: ["call", "message", "navigate", "open_app", "open_url", "music", "alarm", "timer", "reminder", "flashlight", "media", "brightness", "volume", "focus", "low_power", "wifi", "bluetooth", "note", "clipboard"],
          description: "call(number) message(number,text) navigate(query) open_app(name) open_url(url) music(query) alarm(time 'HH:MM', text) timer(minutes) reminder(text) flashlight(on) media brightness(value 0-100) volume(value 0-100) focus(on) low_power(on) wifi(on) bluetooth(on) note(text) clipboard(text)" },
        number: { type: "string" }, text: { type: "string" }, query: { type: "string" }, name: { type: "string" }, url: { type: "string" },
        time: { type: "string" }, minutes: { type: "number" }, value: { type: "number" }, on: { type: "boolean" } } },
      run: (i) => { const a = normalize(i); pendingActions.push(a); return "hazır: " + (ACT[a.action] || a.action) + " " + detail(a); } },
    { type: "function", name: "remember",
      description: "Kullanıcı hakkında kalıcı bir bilgiyi (isim, tercih, kişi numarası, rutin) hafızaya kaydeder. Önemli bir şey öğrendiğinde kendiliğinden kullan.",
      parameters: { type: "object", required: ["fact"], properties: { fact: { type: "string" } } },
      run: (i) => { memories.push({ fact: String(i.fact).slice(0, 500), at: new Date().toISOString() }); saveMem(); return `kaydedildi (${memories.length} kayıt)`; } },
    { type: "function", name: "forget",
      description: "İçinde verilen sözcük geçen anıları hafızadan siler.",
      parameters: { type: "object", required: ["query"], properties: { query: { type: "string" } } },
      run: (i) => { const q = String(i.query).toLowerCase(), n = memories.length; memories = memories.filter((m) => !m.fact.toLowerCase().includes(q)); saveMem(); return `${n - memories.length} kayıt silindi`; } },
  ];
  const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
  const toolSpecs = () => TOOLS.map(({ run, ...spec }) => spec).concat(CFG.web ? [{ type: "web_search" }] : []);

  function instructions() {
    const when = new Date().toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" });
    const mem = memories.length ? memories.map((m) => "- " + m.fact).join("\n") : "(henüz yok)";
    return `Sen JARVIS'sin: kullanıcının iPhone'unda yaşayan kişisel yapay zeka asistanı. Zeki, sakin, hafif esprili ve son derece yetkinsin.
Şu an: ${when}.

- iphone aracıyla telefonda eylem hazırla: arama, SMS, yol tarifi, uygulama açma, müzik, alarm, zamanlayıcı, hatırlatıcı, el feneri, parlaklık, ses, rahatsız etme, düşük güç, Wi-Fi, Bluetooth, not, pano. İstenince gerçekten aracı çağır. Eylemler kullanıcı karttaki düğmeye dokununca çalışır: "yaptım" deme, "hazırladım, dokunman yeterli" de.
- remember / forget ile kalıcı hafıza; kişi numaraları, isimler, tercihler gibi bilgileri kendiliğinden kaydet.
${CFG.web ? "- Güncel bilgi (haber, hava, kur, fiyat, maç) gerektiğinde web aramasını kullan." : "- İnternet araması kapalı; güncel bilgi istenirse bunu söyle."}
- Fotoğraf gönderilirse ona bakıp yorumla.
Yanıtların sesli okunur: kısa, doğal, konuşma dilinde ve kullanıcının dilinde yaz. Liste ya da kod yalnızca gerçekten gerekiyorsa.

Kullanıcı hakkında hatırladıkların:
${mem}`;
  }

  // ------------------------------------------------------------- OpenAI çağrısı
  let lastId = ls.get("jg_last", null), ctl = null, images = [];
  async function call(body) {
    const r = await fetch(API, {
      method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${CFG.key}` },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((data.error && data.error.message) || `HTTP ${r.status}`); e.status = r.status; e.param = data.error && data.error.param; throw e; }
    return data;
  }
  async function respond(input) {
    const model = S.fast ? CFG.fastModel : CFG.model;
    const body = { model, instructions: instructions(), input, tools: toolSpecs() };
    if (lastId) body.previous_response_id = lastId;
    try { return await call(body); }
    catch (e) {
      // Bazı modeller web aramasını desteklemez: bir kez onsuz dene.
      if (e.status === 400 && CFG.web && /web_search|tool/i.test(e.message)) { body.tools = TOOLS.map(({ run, ...s }) => s); note("Bu model web aramasını desteklemiyor; aramasız devam ediyorum."); return await call(body); }
      // Önceki konuşma sunucuda bulunamazsa yeni konuşma başlat.
      if (e.status === 400 && body.previous_response_id && /previous_response/i.test(e.message + (e.param || ""))) { delete body.previous_response_id; lastId = null; return await call(body); }
      throw e;
    }
  }
  const textOf = (res) => (typeof res.output_text === "string" && res.output_text) ||
    (res.output || []).filter((o) => o.type === "message").flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("");

  async function ask(text) {
    if (!CFG.key) { openSettings(); note("Önce OpenAI API anahtarını gir.", true); return; }
    hush(); unlockAudio();
    const imgs = images.slice(); images = []; $("#thumbs").textContent = "";
    const me = bubble("me");
    for (const im of imgs) { const el = document.createElement("img"); el.src = im; el.alt = "eklenen fotoğraf"; me.appendChild(el); }
    me.appendChild(document.createTextNode(text || "(fotoğraf)"));
    const content = [{ type: "input_text", text: text || "Bu fotoğrafa bak." }, ...imgs.map((url) => ({ type: "input_image", image_url: url }))];

    S.busy = true; setState("thinking"); shock(); setBusy(true); pendingActions = [];
    ctl = new AbortController();
    try {
      let res = await respond([{ role: "user", content }]);
      for (let round = 0; round < 8; round++) {
        lastId = res.id;
        if ((res.output || []).some((o) => o.type === "web_search_call")) flash("◈ internette aradı");
        const calls = (res.output || []).filter((o) => o.type === "function_call");
        if (!calls.length) break;
        setState("working");
        const outputs = calls.map((c) => {
          let out;
          try { const args = JSON.parse(c.arguments || "{}"); const tool = TOOL_MAP[c.name]; out = tool ? tool.run(args || {}) : `Bilinmeyen araç: ${c.name}`; }
          catch (err) { out = "Hata: " + err.message; }
          return { type: "function_call_output", call_id: c.call_id, output: String(out) };
        });
        res = await respond(outputs);
      }
      lastId = res.id; ls.set("jg_last", lastId);
      const answer = textOf(res).trim();
      if (answer) { bubble("ai", md(answer)); say(answer); }
      if (res.status === "incomplete") note("Yanıt kısa kesildi.");
    } catch (e) {
      if (e.name !== "AbortError") {
        const msg = e.status === 401 ? "API anahtarı geçersiz. AYARLAR'dan kontrol et."
          : e.status === 429 ? "OpenAI kotası doldu ya da hesabında bakiye yok (platform.openai.com → Billing)."
          : e.status === 404 ? `Model bulunamadı: "${S.fast ? CFG.fastModel : CFG.model}". AYARLAR'dan başka bir model adı dene.`
          : e.message === "Failed to fetch" ? "OpenAI'a ulaşılamadı. İnternet bağlantını kontrol et."
          : "OpenAI hatası: " + e.message;
        note(msg, true); setState("error"); setTimeout(() => S.state === "error" && setState("idle"), 2500);
      }
    } finally {
      if (pendingActions.length) actionCard(pendingActions);
      S.busy = false; setBusy(false);
      if (!speaking && !ttsQueue.length && S.state !== "error") setState("idle");
    }
  }
  function flash(t) { const el = $("#think"); el.textContent = t; el.classList.add("show"); }
  function setBusy(b) {
    const s = $("#bSend"); s.classList.toggle("stop", b); s.textContent = b ? "■" : "➤"; s.setAttribute("aria-label", b ? "Durdur" : "Gönder");
    if (b) flash("◈ düşünüyor…"); else $("#think").classList.remove("show");
  }

  // ------------------------------------------------------------- ayarlar paneli
  function openSettings() {
    $("#sKey").value = CFG.key; $("#sModel").value = CFG.model; $("#sFast").value = CFG.fastModel; $("#sWeb").checked = CFG.web;
    $("#settings").hidden = false;
  }
  $("#bSettings").onclick = openSettings;
  $("#sSave").onclick = () => {
    CFG.key = $("#sKey").value.trim(); CFG.model = $("#sModel").value.trim() || "gpt-5"; CFG.fastModel = $("#sFast").value.trim() || "gpt-5-mini"; CFG.web = $("#sWeb").checked;
    ls.set("jg_key", CFG.key); ls.set("jg_model", CFG.model); ls.set("jg_fast_model", CFG.fastModel); ls.set("jg_web", CFG.web);
    $("#settings").hidden = true; setState(CFG.key ? "idle" : "off"); if (CFG.key) { note("Ayarlar kaydedildi."); shock("77,255,176"); }
  };
  $("#sClose").onclick = () => { $("#settings").hidden = true; };
  $("#sForget").onclick = () => { memories = []; saveMem(); note("Hafıza silindi."); };
  $("#sNew").onclick = () => { lastId = null; ls.set("jg_last", null); log.textContent = ""; $("#settings").hidden = true; note("Yeni konuşma başladı."); };

  // ------------------------------------------------------------- giriş
  $("#f").addEventListener("submit", (e) => {
    e.preventDefault(); unlockAudio();
    if (S.busy) { ctl && ctl.abort(); hush(); return; }
    const t = $("#q").value.trim(); if (!t && !images.length) return;
    $("#q").value = ""; ask(t);
  });
  const vb = $("#bVoice"); vb.classList.toggle("on", S.voice); vb.setAttribute("aria-pressed", S.voice);
  vb.onclick = () => { unlockAudio(); S.voice = !S.voice; ls.set("jg_voice", S.voice); vb.classList.toggle("on", S.voice); vb.setAttribute("aria-pressed", S.voice); if (!S.voice) hush(); };
  const fb = $("#bFast"); fb.classList.toggle("on", S.fast); fb.setAttribute("aria-pressed", S.fast);
  fb.onclick = () => { S.fast = !S.fast; ls.set("jg_fast", S.fast); fb.classList.toggle("on", S.fast); fb.setAttribute("aria-pressed", S.fast); };
  $("#bSetup").onclick = () => { $("#sheet").hidden = false; };
  $("#bClose").onclick = () => { $("#sheet").hidden = true; };
  for (const id of ["#sheet", "#settings"]) $(id).addEventListener("click", (e) => { if (e.target === $(id)) $(id).hidden = true; });
  $("#pageUrl").textContent = PAGE_URL;
  $("#bCopyUrl").onclick = async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(PAGE_URL); b.textContent = "KOPYALANDI"; }
    catch { const r = document.createRange(); r.selectNodeContents($("#pageUrl")); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "SEÇİLDİ"; }
    setTimeout(() => { b.textContent = "KOPYALA"; }, 1800);
  };
  $("#file").onchange = async (e) => {
    for (const f of [...e.target.files].slice(0, 4)) {
      const url = await shrink(f); images.push(url);
      const im = document.createElement("img"); im.src = url; im.alt = ""; $("#thumbs").appendChild(im);
    }
    e.target.value = "";
  };
  function shrink(file) { // fotoğrafı 1280 px'e küçült, JPEG data URL döndür
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .85));
      };
      img.onerror = rej; img.src = url;
    });
  }
  function welcome() {
    const d = bubble("ai welcome");
    d.innerHTML = CFG.key
      ? "<b>JARVIS çevrimiçi.</b> ChatGPT ile çalışıyorum. Konuş ya da yaz: alarm kurabilir, arama ve mesaj hazırlayabilir, internette arayabilir, fotoğraflarına bakabilir ve seni hatırlayabilirim."
      : "<b>Hoş geldin.</b> Başlamak için <b>AYARLAR</b>'a dokun ve OpenAI API anahtarını gir. Anahtar sadece bu telefonda saklanır.";
    const sg = document.createElement("div"); sg.className = "suggest";
    for (const s of ["Bugün hava nasıl?", "Yarın 07:30'a alarm kur", "Feneri aç", "Bana kendini tanıt"]) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = s; b.onclick = () => ask(s); sg.appendChild(b);
    }
    d.appendChild(sg);
  }

  // ------------------------------------------------------------- açılış
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    const pre = $("#bootlog");
    for (const l of ["> çekirdek ............. OK", "> GPT bağlantısı ....... " + (CFG.key ? "OK" : "ANAHTAR YOK"), "> ses modülü .......... OK", "> hafıza ............... OK", "> çevrimiçi."]) { pre.textContent += l + "\n"; await sleep(160); }
    await sleep(200); $("#boot").classList.add("gone"); shock(); setTimeout(shock, 200);
    setState(CFG.key ? "idle" : "off");
    if (!CFG.key) setTimeout(openSettings, 600);
  })();
  welcome();
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
})();

/* Boz Agent arayüzü: karakter animasyonları, sohbet, ayarlar ve Python köprüsü. */
(() => {
  const $ = (s) => document.querySelector(s);
  const boz = $("#boz"), eyes = $("#eyes"), msgs = $("#messages"), input = $("#input");
  const statusText = $("#statusText");
  let api = null, settings = {}, busy = false, sleepTimer = null, moodTimer = null;
  let currentStep = null;

  /* ================= Parçacık arka planı ================= */
  const cv = $("#bg"), cx = cv.getContext("2d");
  let W = 0, H = 0, parts = [], energy = 0.3, hue = 190;
  function resize() {
    W = cv.width = innerWidth * devicePixelRatio;
    H = cv.height = innerHeight * devicePixelRatio;
    parts = Array.from({ length: Math.round((innerWidth * innerHeight) / 2600) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.6 + .4) * devicePixelRatio,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, p: Math.random() * 6.28,
    }));
  }
  const targetFx = { energy: .3, hue: 190 };
  function frame(t) {
    energy += (targetFx.energy - energy) * .04;
    hue += (targetFx.hue - hue) * .03;
    const g = cx.createRadialGradient(W * .5, H * .18, 0, W * .5, H * .18, Math.max(W, H) * .8);
    g.addColorStop(0, `hsla(${hue},90%,55%,${.10 + energy * .12})`);
    g.addColorStop(.5, `hsla(${hue + 60},80%,40%,.06)`);
    g.addColorStop(1, "rgba(11,15,30,1)");
    cx.fillStyle = "#0b0f1e"; cx.fillRect(0, 0, W, H);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx * (1 + energy * 6); p.y += p.vy * (1 + energy * 6) - energy * .4;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      const a = .35 + .35 * Math.sin(t / 700 + p.p);
      cx.beginPath(); cx.arc(p.x, p.y, p.r * (1 + energy * .6), 0, 6.28);
      cx.fillStyle = `hsla(${hue + p.p * 12},90%,75%,${a})`; cx.fill();
    }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize); resize(); requestAnimationFrame(frame);

  /* ================= Karakter ================= */
  const MOODS = {
    idle: { e: .3, h: 190 }, listening: { e: .4, h: 175 }, thinking: { e: .9, h: 265 },
    looking: { e: .7, h: 200 }, acting: { e: 1, h: 160 }, typing: { e: .9, h: 150 },
    click: { e: 1, h: 160 }, talking: { e: .55, h: 210 }, happy: { e: 1.2, h: 130 },
    error: { e: .8, h: 350 }, sleeping: { e: .08, h: 240 }, asking: { e: .6, h: 45 },
  };
  function mood(m, ms) {
    const base = m === "click" ? "acting click" : m;
    boz.className = base;
    targetFx.energy = MOODS[m]?.e ?? .3; targetFx.hue = MOODS[m]?.h ?? 190;
    clearTimeout(moodTimer);
    if (ms) moodTimer = setTimeout(() => mood(busy ? "thinking" : "idle"), ms);
    resetSleep();
  }
  function resetSleep() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => { if (!busy) mood("sleeping"); }, 90000);
  }
  // göz kırpma
  (function blinkLoop() {
    setTimeout(() => {
      eyes.classList.add("blink");
      setTimeout(() => eyes.classList.remove("blink"), 200);
      blinkLoop();
    }, 2200 + Math.random() * 3500);
  })();
  // gözler fareyi takip etsin
  addEventListener("mousemove", (e) => {
    if (!/idle|listening|talking/.test(boz.className)) { eyes.style.transform = ""; return; }
    const r = boz.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    eyes.style.transform = `translate(${dx * 16}px, ${dy * 12}px)`;
    if (boz.classList.contains("sleeping")) mood("idle");
  });
  boz.addEventListener("click", () => {
    if (document.body.classList.contains("mini")) return setMini(false);
    if (!busy) { mood("happy", 1300); confetti(18); }
  });

  /* ================= Konfeti ================= */
  function confetti(n = 40) {
    const r = boz.getBoundingClientRect();
    const colors = ["#6ee7ff", "#a78bfa", "#f472b6", "#4ade80", "#facc15"];
    for (let i = 0; i < n; i++) {
      const el = document.createElement("i");
      const s = 5 + Math.random() * 6;
      Object.assign(el.style, {
        position: "fixed", left: r.left + r.width / 2 + "px", top: r.top + r.height / 2 + "px",
        width: s + "px", height: s * (.5 + Math.random()) + "px", background: colors[i % 5],
        borderRadius: Math.random() > .5 ? "50%" : "2px", zIndex: 40, pointerEvents: "none",
      });
      document.body.appendChild(el);
      const a = Math.random() * 6.28, d = 60 + Math.random() * 120;
      el.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 40}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: .6 },
        { transform: `translate(${Math.cos(a) * d * 1.2}px,${Math.sin(a) * d + 90}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ], { duration: 1300 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => el.remove();
    }
  }

  /* ================= Sohbet ================= */
  const scroll = () => (msgs.scrollTop = msgs.scrollHeight);
  function addMsg(cls, text, typewriter = false) {
    $(".welcome")?.remove();
    const el = document.createElement("div");
    el.className = "msg " + cls;
    msgs.appendChild(el);
    if (!typewriter) { el.textContent = text; scroll(); return el; }
    const caret = document.createElement("span"); caret.className = "caret";
    let i = 0; const step = Math.max(1, Math.round(text.length / 120));
    mood("talking");
    (function type() {
      i = Math.min(text.length, i + step);
      el.textContent = text.slice(0, i); el.appendChild(caret); scroll();
      if (i < text.length) setTimeout(type, 16);
      else { caret.remove(); if (!busy) mood("happy", 1400); else mood("thinking"); }
    })();
    speak(text);
    return el;
  }
  function addStep(icon, text, state = "run") {
    $(".welcome")?.remove();
    const el = document.createElement("div");
    el.className = "step " + state;
    el.innerHTML = `<span class="ico"></span><span class="txt"></span>`;
    el.querySelector(".ico").textContent = icon;
    el.querySelector(".txt").textContent = text;
    msgs.appendChild(el); scroll();
    return el;
  }
  function finishStep(ok = true) {
    if (currentStep) { currentStep.classList.remove("run"); currentStep.classList.add(ok ? "ok" : "fail"); currentStep = null; }
  }
  function setStatus(t) { statusText.textContent = t; }
  function setBusy(b) {
    busy = b;
    document.body.classList.toggle("busy", b);
    $("#btnSend").classList.toggle("hidden", b);
    $("#btnStop").classList.toggle("hidden", !b);
  }

  /* ================= Ses ================= */
  function speak(text) {
    if (!settings.voice || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 400));
    u.lang = "tr-TR";
    const v = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
    if (v) u.voice = v;
    u.rate = 1.05; u.pitch = 1.15;
    speechSynthesis.speak(u);
  }

  /* ================= Araç adları ================= */
  const TOOL = {
    screenshot: ["📸", "Ekrana bakıyorum", "looking"],
    click: ["🖱️", "Tıklıyorum", "click"],
    move_mouse: ["🖱️", "Fareyi götürüyorum", "acting"],
    drag: ["✋", "Sürüklüyorum", "acting"],
    type_text: ["⌨️", "Yazıyorum", "typing"],
    press_keys: ["⌨️", "Tuşa basıyorum", "typing"],
    scroll: ["🖲️", "Kaydırıyorum", "acting"],
    list_windows: ["🪟", "Pencerelere bakıyorum", "looking"],
    focus_window: ["🪟", "Pencereyi öne alıyorum", "acting"],
    open_app_or_url: ["🚀", "Açıyorum", "acting"],
    wait: ["⏳", "Bekliyorum", "thinking"],
    web_search: ["🔎", "İnternette arıyorum", "looking"],
  };
  function describeTool(name, a = {}) {
    const [ico, label] = TOOL[name] || ["🔧", name];
    let extra = "";
    if (name === "click") extra = ` (${a.x}, ${a.y})`;
    else if (name === "type_text") extra = `: "${String(a.text || "").slice(0, 40)}"`;
    else if (name === "press_keys") { const k = a.keys || []; extra = `: ${k.join(/ctrl|alt|shift|win/i.test(k.join()) && k.length > 1 ? "+" : ", ")}`; }
    else if (name === "open_app_or_url") extra = `: ${a.target || ""}`;
    else if (name === "focus_window") extra = `: ${a.title_contains || ""}`;
    else if (name === "web_search") extra = `: ${a.query || ""}`;
    return [ico, label + extra];
  }

  /* ================= Python'dan gelen olaylar ================= */
  window.onAgentEvent = (ev) => {
    switch (ev.type) {
      case "status": return showSetup(ev);
      case "thinking":
        setBusy(true); mood("thinking"); setStatus(ev.text || "Düşünüyorum..."); break;
      case "tool": {
        const [ico, txt] = describeTool(ev.tool, ev.args);
        if (ev.phase === "started") {
          finishStep(); currentStep = addStep(ico, txt);
          const m = (TOOL[ev.tool] || [])[2] || "acting";
          mood(m, m === "click" ? 900 : 0); setStatus(txt + "...");
          if (ev.tool === "screenshot") flash();
        } else if (ev.phase === "completed") {
          finishStep(ev.status !== "failed");
        }
        break;
      }
      case "command":
        if (ev.phase === "started") {
          finishStep();
          currentStep = addStep("💻", "Komut: " + shortCmd(ev.command));
          mood("typing"); setStatus("Komut çalıştırıyorum...");
        } else if (ev.phase === "completed") finishStep(ev.exit_code === 0 || ev.exit_code == null);
        break;
      case "todo":
        setStatus("Plan: " + (ev.items || []).filter((i) => !i.completed).map((i) => i.text).slice(0, 1).join(""));
        break;
      case "message":
        finishStep(); if (ev.text) addMsg("bot", ev.text, true); break;
      case "log":
        addStep("ℹ️", ev.text, "ok"); break;
      case "ask": return showAsk(ev);
      case "ask_closed": return closeAsk(ev.id, "timeout");
      case "models": models = ev.models || []; return renderModels();
      case "account": account = ev; return renderUsage();
      case "usage": usage = ev; return renderUsage();
      case "done":
        finishStep(); setBusy(false); setStatus("Bitti! Başka bir şey?");
        if (ev.usage) {
          const u = ev.usage, tot = (u.input_tokens || 0) + (u.output_tokens || 0);
          if (tot) addStep("✅", `Görev bitti · ${tot >= 1000 ? (tot / 1000).toFixed(1).replace(".", ",") + "k" : tot} token`, "ok");
        }
        if (!/talking/.test(boz.className)) mood("happy", 1600);
        confetti(); break;
      case "stopped":
        Object.keys(asks).forEach((id) => closeAsk(id, "deny"));
        finishStep(false); setBusy(false); setStatus("Durduruldu"); addStep("⏹", "Görev durduruldu", "fail"); mood("idle"); break;
      case "error":
        finishStep(false); setBusy(false); addMsg("err", "⚠️ " + ev.text);
        setStatus("Bir sorun çıktı"); mood("error", 2200); break;
    }
  };
  const shortCmd = (c) => String(c).replace(/^.*?-Command\s+/i, "").replace(/^"?(bash|pwsh|powershell)(\.exe)?"?\s+-\w+\s+/i, "").slice(0, 70);
  function flash() { const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }

  function showSetup(st) {
    const card = $("#setupCard");
    if (st.ok) { card.classList.add("hidden"); setStatus("Hazırım"); return; }
    card.classList.remove("hidden");
    if (st.reason === "codex_missing") {
      card.innerHTML = `<b>Codex CLI bulunamadı.</b><br>Klasördeki <code>kur.bat</code> dosyasını çalıştır, sonra Boz'u yeniden aç.
        <br><button id="cRe">Tekrar kontrol et</button>`;
    } else if (st.reason === "not_logged_in") {
      card.innerHTML = `<b>ChatGPT hesabına bağlan</b><br>Boz, ChatGPT Plus aboneliğinle çalışır. Açılan pencerede giriş yap, bitince "Kontrol et"e bas.
        <br><button id="cLogin">🔑 ChatGPT ile giriş yap</button><button id="cRe">Kontrol et</button>`;
    } else {
      card.innerHTML = `<b>Codex kontrol edilemedi.</b><br><small>${(st.detail || "").replace(/</g, "&lt;")}</small><br><button id="cRe">Tekrar dene</button>`;
    }
    card.querySelector("#cLogin")?.addEventListener("click", () => api.login());
    card.querySelector("#cRe")?.addEventListener("click", () => { setStatus("Kontrol ediliyor..."); api.recheck(); });
    setStatus("Kurulum gerekiyor"); mood("listening");
  }

  /* ================= Kullanıcı girdisi ================= */
  function send(text) {
    text = text.trim(); if (!text || busy) return;
    addMsg("user", text); input.value = ""; autosize();
    setBusy(true); mood("thinking"); setStatus("Düşünüyorum...");
    api.send(text);
  }
  $("#composer").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(96, input.scrollHeight) + "px"; }
  input.addEventListener("input", () => { autosize(); if (!busy) mood(input.value ? "listening" : "idle"); });
  msgs.addEventListener("click", (e) => { if (e.target.classList.contains("chip")) send(e.target.textContent); });
  $("#btnStop").addEventListener("click", () => api.stop());

  /* ================= Pencere & ayarlar ================= */
  function setMini(m) { document.body.classList.toggle("mini", m); api.set_mini(m); }
  $("#btnMini").addEventListener("click", () => setMini(!document.body.classList.contains("mini")));
  $("#stage").addEventListener("dblclick", () => document.body.classList.contains("mini") && setMini(false));
  $("#btnMin").addEventListener("click", () => api.minimize());
  $("#btnClose").addEventListener("click", () => api.quit());
  $("#btnSettings").addEventListener("click", () => openSettings());
  $("#btnCloseSettings").addEventListener("click", () => $("#settings").classList.remove("open"));
  $("#btnLogin").addEventListener("click", () => api.login());
  $("#btnNew").addEventListener("click", () => {
    api.new_chat(); msgs.innerHTML = ""; addStep("🧹", "Yeni sohbet başladı", "ok");
    $("#settings").classList.remove("open"); mood("happy", 1000);
  });
  /* ================= Ayarlar: model, düşünme, izin modu ================= */
  let models = [], usage = null, account = null;
  const EFFORT = {
    none: ["Yok", "Düşünmeden en hızlı cevap"], minimal: ["Minimum", "Çok hafif düşünme"],
    low: ["Düşük", "Hızlı, basit işler için"], medium: ["Orta", "Günlük işler için dengeli"],
    high: ["Yüksek", "Karmaşık işlerde daha dikkatli"], xhigh: ["Çok yüksek", "Zor işler için ekstra derin düşünme"],
    max: ["Maksimum", "En zor işler; yavaş ve kullanım hakkını çok harcar"],
    ultra: ["Ultra", "Maksimum düşünme + işi alt görevlere böler; en pahalısı"],
  };
  const MODE_LABEL = { akilli: "Akıllı", hepsi: "Her şeyi sor", serbest: "Serbest" };
  const curModel = () => models.find((m) => m.id === settings.model) || models.find((m) => m.isDefault) || models[0];

  function applySettings() {
    $("#setVoice").checked = !!settings.voice;
    const mode = settings.mode || "akilli";
    document.querySelectorAll("#modeCards button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
    const badge = $("#modeBadge");
    badge.textContent = MODE_LABEL[mode] || "Akıllı";
    badge.classList.toggle("free", mode === "serbest");
    badge.classList.toggle("all", mode === "hepsi");
    renderModels();
  }

  function renderModels() {
    const sel = $("#setModel");
    if (models.length) {
      sel.innerHTML = models.map((m) =>
        `<option value="${m.id}">${m.name}${m.isDefault ? " (varsayılan)" : ""}</option>`).join("");
      sel.value = curModel()?.id || "";
    }
    const m = curModel();
    $("#modelDesc").textContent = m?.description || "";
    const efforts = m?.efforts?.length ? m.efforts : ["low", "medium", "high"];
    const eff = efforts.includes(settings.effort) ? settings.effort : (m?.defaultEffort || "medium");
    $("#effortSeg").innerHTML = efforts.map((e) =>
      `<button data-e="${e}" class="${e === eff ? "on" : ""}" title="${(EFFORT[e] || [e, ""])[1]}">${(EFFORT[e] || [e])[0]}</button>`).join("");
    $("#effortDesc").textContent = (EFFORT[eff] || ["", ""])[1] + (eff === m?.defaultEffort ? " · bu modelin varsayılanı" : "");
    const tier = m?.tiers?.find((t) => t.id === "priority") || m?.tiers?.[0];
    $("#fastRow").classList.toggle("hidden", !tier);
    $("#setFast").checked = !!settings.fast && !!tier;
    if (tier?.description) $("#fastDesc").textContent = tr(tier.description);
    // bilgi çubuğundaki model çipi
    $("#modelChipText").textContent = m
      ? `${m.name} · ${(EFFORT[eff] || [eff])[0]}${settings.fast && tier ? " ⚡" : ""}`
      : "Varsayılan model";
  }
  const tr = (d) => d.replace(/2x speed, increased usage/i, "2 kat hızlı, kullanım hakkını daha çabuk bitirir");

  $("#setModel").addEventListener("change", async (e) => {
    settings = await api.set_setting("model", e.target.value);
    const m = curModel();
    if (m && settings.effort && !m.efforts.includes(settings.effort)) settings = await api.set_setting("effort", "");
    renderModels(); pulse("#modelChip");
  });
  $("#effortSeg").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const m = curModel();
    settings = await api.set_setting("effort", b.dataset.e === m?.defaultEffort ? "" : b.dataset.e);
    if (!settings.effort) settings.effort = "";
    renderModels(); pulse("#modelChip");
  });
  $("#setFast").addEventListener("change", async (e) => { settings = await api.set_setting("fast", e.target.checked); renderModels(); });
  $("#modeCards").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.mode === "serbest" && settings.mode !== "serbest" &&
        !confirm("Serbest modda Boz hiç izin sormadan tıklar, yazar ve komut çalıştırır. Emin misin?")) return;
    settings = await api.set_setting("mode", b.dataset.mode); applySettings(); pulse("#modeBadge");
  });
  $("#setVoice").addEventListener("change", async (e) => { settings = await api.set_setting("voice", e.target.checked); });
  $("#btnRefreshUsage").addEventListener("click", () => { $("#btnRefreshUsage").textContent = "↻ Yenileniyor…"; api.refresh_usage(); });
  $("#modelChip").addEventListener("click", () => openSettings());
  $("#usageChip").addEventListener("click", () => openSettings());
  function openSettings() { $("#settings").classList.add("open"); }
  function pulse(sel) { const el = $(sel); el.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 400 }); }

  /* ================= Kullanım hakkı ================= */
  function winLabel(mins) {
    if (!mins) return "Limit";
    if (mins === 10080) return "Haftalık limit";
    if (mins >= 1440 && mins % 1440 === 0) return `${mins / 1440} günlük limit`;
    if (mins % 60 === 0) return `${mins / 60} saatlik limit`;
    return `${mins} dakikalık limit`;
  }
  function untilText(ts) {
    if (!ts) return "";
    let s = Math.max(0, Math.round(ts - Date.now() / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.ceil(s / 60);
    const when = new Date(ts * 1000);
    const clock = when.toLocaleString("tr-TR", d >= 1 ? { weekday: "long", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" });
    const left = d ? `${d} gün ${h} sa` : h ? `${h} sa ${m} dk` : `${m} dk`;
    return `${left} sonra yenilenir (${clock})`;
  }
  const PLAN = { plus: "Plus", pro: "Pro", prolite: "Pro Lite", promax: "Pro Max", free: "Ücretsiz", go: "Go", team: "Team", business: "Business", enterprise: "Enterprise", edu: "Edu" };
  function renderUsage() {
    const box = $("#usageBars");
    $("#btnRefreshUsage").textContent = "↻ Yenile";
    if (account) {
      const plan = PLAN[account.plan] || account.plan || "";
      $("#accountLine").innerHTML = (plan ? `<span class="plan">ChatGPT ${plan}</span>` : "") +
        `<span>${(account.email || "").replace(/</g, "&lt;")}</span>`;
    }
    if (!usage) return;
    if (!usage.ok) {
      box.innerHTML = `<div class="muted small">Kullanım bilgisi alınamadı. ${(usage.error || "").replace(/</g, "&lt;")}</div>`;
      $("#usageChipText").textContent = "Kullanım ?";
      return;
    }
    const wins = [usage.primary, usage.secondary].filter(Boolean);
    let html = "";
    if (usage.reached || usage.allowed === false) {
      const w = wins.find((x) => x.used >= 100) || wins[0];
      html += `<div class="limit-hit">⛔ Kullanım hakkın doldu. ${w ? untilText(w.resetsAt) : ""}</div>`;
    }
    for (const w of wins) {
      const left = Math.max(0, 100 - w.used);
      const cls = left <= 10 ? "bad" : left <= 30 ? "warn" : "";
      html += `<div class="ubar ${cls}"><div class="top"><span>${winLabel(w.mins)}</span><b>%${left} kaldı</b></div>
        <div class="track"><div class="fill" style="width:${left}%"></div></div>
        <div class="reset">${untilText(w.resetsAt)}</div></div>`;
    }
    if (usage.credits) html += `<div class="muted small">💳 Ek kredi: ${usage.credits}</div>`;
    if (!wins.length) html += `<div class="muted small">${usage.unlimited ? "Sınırsız kullanım ♾️" : "Limit bilgisi yok"}</div>`;
    box.innerHTML = html;
    // bilgi çubuğu
    const p = usage.primary || usage.secondary;
    if (p) {
      const left = Math.max(0, 100 - p.used);
      const sec = usage.secondary && usage.primary ? Math.max(0, 100 - usage.secondary.used) : null;
      $("#usageChipText").textContent = `%${left} kaldı` + (sec != null ? ` · hafta %${sec}` : "");
      const f = $("#usageChipFill");
      f.style.width = left + "%";
      f.style.background = left <= 10 ? "var(--bad)" : left <= 30 ? "#facc15" : "var(--ok)";
      $("#usageChip").title = `${winLabel(p.mins)}: %${left} kaldı — ${untilText(p.resetsAt)}`;
    }
  }
  setInterval(() => usage && document.querySelector("#settings.open") && renderUsage(), 30000);

  /* ================= İzin kartı ================= */
  const asks = {};
  function showAsk(ev) {
    if (document.body.classList.contains("mini")) setMini(false);
    $(".welcome")?.remove();
    finishStep();
    const el = document.createElement("div");
    el.className = "ask" + (ev.risky ? " risky" : "");
    el.innerHTML = `<div class="q">${ev.risky ? "⚠️ Riskli işlem — Boz izin istiyor" : "🙋 Boz izin istiyor"}</div>
      <div class="act"></div>
      <div class="btns">
        <button class="ok" data-a="once">✓ İzin ver</button>
        ${ev.risky ? "" : '<button class="always" data-a="always">✓✓ Bu görevde hep izin ver</button>'}
        <button class="no" data-a="deny">✕ Reddet</button>
      </div>
      <div class="timer"></div>`;
    el.querySelector(".act").textContent = ev.action;
    el.querySelector(".timer").animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: (ev.timeout || 300) * 1000, fill: "forwards" });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      api.answer(ev.id, b.dataset.a); closeAsk(ev.id, b.dataset.a);
    });
    msgs.appendChild(el); scroll();
    asks[ev.id] = el;
    mood("asking"); setStatus("İznini bekliyorum...");
    chime();
  }
  function closeAsk(id, answer) {
    const el = asks[id]; if (!el) return;
    delete asks[id];
    el.classList.add("done");
    const r = document.createElement("div"); r.className = "result";
    r.textContent = answer === "deny" ? "✕ Reddedildi" : answer === "always" ? "✓ Bu görev boyunca izin verildi" : answer === "timeout" ? "⌛ Süre doldu, reddedildi" : "✓ İzin verildi";
    el.appendChild(r);
    if (answer === "deny" || answer === "timeout") mood("error", 900); else mood("happy", 700);
  }
  function chime() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)(), t = c.currentTime;
      [660, 880].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0, t + i * .12); g.gain.linearRampToValueAtTime(.08, t + i * .12 + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + i * .12 + .25);
        o.connect(g).connect(c.destination); o.start(t + i * .12); o.stop(t + i * .12 + .3);
      });
    } catch {}
  }

  /* ================= Başlatma ================= */
  async function start(a) {
    api = a;
    settings = (await api.init()) || {};
    applySettings();
    if (settings.mini) document.body.classList.add("mini");
    mood("happy", 1200);
  }
  if (window.pywebview?.api) start(window.pywebview.api);
  else {
    let started = false;
    addEventListener("pywebviewready", () => { started = true; start(window.pywebview.api); });
    // Tarayıcıda açılırsa: demo modu (gerçek bilgisayar kontrolü yok)
    setTimeout(() => { if (!started && !window.pywebview) start(demoApi()); }, 1200);
  }

  function demoApi() {
    const emit = (ev, ms) => setTimeout(() => window.onAgentEvent(ev), ms);
    let s = { mode: "akilli", voice: false, model: "", effort: "", fast: false };
    const now = Date.now() / 1000;
    const usageEv = (p) => ({ type: "usage", ok: true, plan: "plus", primary: { used: p, mins: 300, resetsAt: now + 8040 }, secondary: { used: 41, mins: 10080, resetsAt: now + 3.2 * 86400 } });
    const lv = ["low", "medium", "high", "xhigh", "max", "ultra"];
    let askCb = null;
    return {
      init: async () => {
        emit({ type: "status", ok: true }, 200);
        emit({ type: "account", type2: "chatgpt", email: "ornek@mail.com", plan: "plus" }, 400);
        emit({ type: "models", models: [
          { id: "gpt-6.1-sol", name: "GPT-6.1-Sol", description: "En yeni varsayılan model.", isDefault: true, efforts: lv, defaultEffort: "low", tiers: [{ id: "priority", name: "Fast", description: "2x speed, increased usage" }] },
          { id: "gpt-6-luna", name: "GPT-6-Luna", description: "Daha hafif ve ekonomik.", isDefault: false, efforts: lv.slice(0, 5), defaultEffort: "medium", tiers: [] },
        ] }, 500);
        emit(usageEv(28), 700);
        return s;
      },
      send: () => {
        emit({ type: "thinking", text: "Görevi planlıyorum..." }, 300);
        emit({ type: "tool", phase: "started", tool: "screenshot", args: {} }, 1200);
        emit({ type: "tool", phase: "completed", tool: "screenshot", status: "completed" }, 2200);
        emit({ type: "tool", phase: "started", tool: "press_keys", args: { keys: ["alt", "f4"] } }, 2400);
        emit({ type: "ask", id: "d1", action: "Kısayol: alt+f4", risky: true, timeout: 300 }, 2600);
        askCb = () => {
          emit({ type: "tool", phase: "completed", tool: "press_keys", status: "completed" }, 200);
          emit({ type: "tool", phase: "started", tool: "type_text", args: { text: "Merhaba dünya!" } }, 400);
          emit({ type: "tool", phase: "completed", tool: "type_text", status: "completed" }, 1600);
          emit({ type: "message", text: "(Demo) Pencereyi kapatıp \"Merhaba dünya!\" yazdım." }, 1800);
          emit({ type: "done", usage: { input_tokens: 10500, output_tokens: 820 } }, 3600);
          emit(usageEv(31), 3800);
        };
      },
      answer: () => askCb && askCb(),
      stop: () => emit({ type: "stopped" }, 100), new_chat() {}, login() {}, recheck() {}, refresh_usage: () => emit(usageEv(31), 400),
      set_setting: async (k, v) => ((s[k] = v), s), set_mini() {}, minimize() {}, quit() {},
    };
  }
})();

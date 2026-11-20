/* =========================================================
   BOZ YÖNETİM PANELİ
   Kaynak veriler: data.js (MAGAZA), urunler.js (Excel), ek_urunler.js
   Yayındaki değişiklikler: yonetim.js (window.YONETIM)
   Taslak: localStorage "boz_yonetim_taslak" (yalnız bu tarayıcı)
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const kopya = (x) => JSON.parse(JSON.stringify(x));
  const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
  const para = (n) => tl.format(n || 0);
  const gorsel = (h) => (window.ONIZLEME ? `g:k:${h}` : `assets/urun/${h}-k.webp`);
  const TASLAK = "boz_yonetim_taslak";

  const M0 = kopya(window.MAGAZA);                                   // data.js ayarları
  const BASE = [...(window.EK_URUNLER || []), ...(window.URUNLER || [])]; // ham ürünler
  const KOLS = [...new Set(BASE.map((u) => u.koleksiyon))];
  const YAYIN = Object.assign({ ayarlar: {}, urunler: {} }, kopya(window.YONETIM || {}));

  let T;
  try { T = JSON.parse(localStorage.getItem(TASLAK)); } catch (e) { T = null; }
  if (!T || typeof T !== "object") T = kopya(YAYIN);
  T.ayarlar = T.ayarlar || {}; T.urunler = T.urunler || {};

  const kaydet = () => {
    T.guncelleme = new Date().toISOString();
    try { localStorage.setItem(TASLAK, JSON.stringify(T)); } catch (e) {}
    durumCiz();
  };

  /* ---------- Etkin veri (taslak uygulanmış) ---------- */
  const ayar = (k) => (k in T.ayarlar ? T.ayarlar[k] : M0[k]);
  const etkin = (u0) => {
    const o = T.urunler[u0.id];
    if (!o) return u0;
    const u = kopya(u0);
    ["ad", "gizli", "oneCikan", "yakinda", "aciklama", "olcu"].forEach((k) => { if (o[k] !== undefined) u[k] = o[k]; });
    u.varyantlar.forEach((v) => Object.assign(v, (o.v || {})[v.barkod] || {}));
    return u;
  };
  const urunler = () => BASE.map(etkin);
  const stokta = (u) => !u.yakinda && u.varyantlar.some((v) => v.stok);
  const fiyatMetni = (u) => {
    if (u.yakinda) return "Yakında";
    const f = u.varyantlar.map((v) => v.fiyat);
    const mn = Math.min(...f), mx = Math.max(...f);
    return mn === mx ? para(mn) : `${para(mn)} – ${para(mx)}`;
  };

  /* ---------- Taslağa yazma (kaynakla aynıysa siler) ---------- */
  const temizle = (id) => {
    const o = T.urunler[id]; if (!o) return;
    if (o.v) { Object.keys(o.v).forEach((b) => { if (!Object.keys(o.v[b]).length) delete o.v[b]; }); if (!Object.keys(o.v).length) delete o.v; }
    if (!Object.keys(o).length) delete T.urunler[id];
  };
  const urunAyarla = (id, k, deger) => {
    const u = BASE.find((x) => x.id === id);
    const o = (T.urunler[id] = T.urunler[id] || {});
    const taban = u[k] === undefined ? (k === "gizli" || k === "oneCikan" || k === "yakinda" ? false : u[k]) : u[k];
    if (esit(deger, taban) || (deger === "" && (k === "ad" || k === "olcu"))) delete o[k]; else o[k] = deger;
    temizle(id); kaydet();
  };
  const varyantAyarla = (id, barkod, k, deger) => {
    const v0 = BASE.find((x) => x.id === id).varyantlar.find((v) => v.barkod === barkod);
    const o = (T.urunler[id] = T.urunler[id] || {}); o.v = o.v || {}; const ov = (o.v[barkod] = o.v[barkod] || {});
    if (esit(deger, v0[k])) delete ov[k]; else ov[k] = deger;
    temizle(id); kaydet();
  };
  const ayarYaz = (k, deger) => {
    if (esit(deger, M0[k])) delete T.ayarlar[k]; else T.ayarlar[k] = deger;
    kaydet();
  };

  /* ---------- Değişiklik listesi (yayındaki sürüme göre) ---------- */
  const AYAR_AD = { ucretsizKargoLimiti: "Ücretsiz kargo limiti", kargoUcreti: "Kargo ücreti", kapidaOdemeUcreti: "Kapıda ödeme bedeli", iadeGunu: "İade süresi",
    kargoSuresi: "Kargoya veriliş süresi", taksitler: "Taksit seçenekleri", banka: "Havale bilgileri", telefon: "Telefon", eposta: "E-posta", instagram: "Instagram",
    trendyolMagaza: "Trendyol mağaza bağlantısı", vitrinUrun: "Ana sayfa vitrini" };
  const urunOzet = (u0, o) => {
    if (!o) return ["Değişiklikler kaldırıldı (Excel verisine dönüldü)"];
    const r = [];
    if (o.ad !== undefined) r.push(`Ad: “${o.ad}”`);
    if (o.gizli !== undefined) r.push(o.gizli ? "Sitede gizlendi" : "Sitede gösteriliyor");
    if (o.oneCikan !== undefined) r.push(o.oneCikan ? "Öne çıkarıldı" : "Öne çıkarma kaldırıldı");
    if (o.yakinda !== undefined) r.push(o.yakinda ? "“Yakında” olarak işaretlendi" : "Satışa açıldı");
    if (o.olcu !== undefined) r.push(`Ölçü: ${o.olcu}`);
    if (o.aciklama !== undefined) r.push("Açıklama düzenlendi");
    Object.entries(o.v || {}).forEach(([b, d]) => {
      const v = u0.varyantlar.find((x) => x.barkod === b); const ad = v && v.renk ? v.renk : "Varyant";
      if (d.fiyat !== undefined) r.push(`${ad} fiyatı: ${para(v.fiyat)} → ${para(d.fiyat)}`);
      if (d.piyasa !== undefined) r.push(`${ad} liste fiyatı: ${para(d.piyasa)}`);
      if (d.stok !== undefined) r.push(`${ad}: ${d.stok ? "stokta" : "tükendi"}`);
    });
    return r;
  };
  const degisiklikler = () => {
    const out = [];
    new Set([...Object.keys(T.ayarlar), ...Object.keys(YAYIN.ayarlar || {})]).forEach((k) => {
      if (!esit(T.ayarlar[k], (YAYIN.ayarlar || {})[k])) out.push({ tur: "Ayar", ad: AYAR_AD[k] || k, detay: [k in T.ayarlar ? "Değiştirildi" : "Varsayılana döndü"] });
    });
    new Set([...Object.keys(T.urunler), ...Object.keys(YAYIN.urunler || {})]).forEach((id) => {
      if (esit(T.urunler[id], (YAYIN.urunler || {})[id])) return;
      const u0 = BASE.find((x) => x.id === id); if (!u0) return;
      out.push({ tur: "Ürün", ad: u0.ad, id, detay: urunOzet(u0, T.urunler[id]) });
    });
    return out;
  };

  /* ---------- Genel ---------- */
  const bildir = (m) => {
    const t = $(".toast"); $("#toast-msg").textContent = m; t.classList.add("show");
    clearTimeout(bildir.z); bildir.z = setTimeout(() => t.classList.remove("show"), 2600);
  };
  const durumCiz = () => {
    const n = degisiklikler().length;
    $("#durum").textContent = n ? `Taslakta ${n} değişiklik var · henüz yayında değil` : "Taslak, yayındaki sürümle aynı";
    const p = $("#nav-degisiklik"); p.hidden = !n; p.textContent = n;
  };

  const SEKMELER = { genel: "Genel bakış", urunler: "Ürünler", ayarlar: "Mağaza ayarları", siparisler: "Siparişler", yayinla: "Yayınla" };
  let sekme = "genel";
  const git = (s) => {
    if (!SEKMELER[s]) s = "genel";
    sekme = s;
    $("#baslik").textContent = SEKMELER[s];
    document.querySelectorAll("#side-nav button").forEach((b) => b.setAttribute("aria-current", b.dataset.sekme === s ? "page" : "false"));
    ({ genel: genelCiz, urunler: urunlerCiz, ayarlar: ayarlarCiz, siparisler: siparislerCiz, yayinla: yayinlaCiz })[s]();
    try { if (location.hash !== "#" + s) history.replaceState(null, "", "#" + s); } catch (e) {}
    window.scrollTo(0, 0);
  };

  /* ---------- Genel bakış ---------- */
  function genelCiz() {
    const U = urunler(), gor = U.filter((u) => !u.gizli);
    const st = gor.filter(stokta), yak = gor.filter((u) => u.yakinda), bit = gor.filter((u) => !u.yakinda && !stokta(u));
    const varN = gor.reduce((t, u) => t + u.varyantlar.length, 0);
    const mx = Math.max(...KOLS.map((k) => gor.filter((u) => u.koleksiyon === k).length), 1);
    const dikkat = [...yak.map((u) => [u, "Fiyat bekliyor", "acc"]), ...bit.map((u) => [u, "Tükendi", "no"])];
    const deg = degisiklikler();
    $("#icerik").innerHTML = `
      <section class="kpis" aria-label="Özet">
        <div class="kpi"><small>Sitedeki ürün</small><b>${gor.length}</b><span class="t">${U.length - gor.length} gizli</span></div>
        <div class="kpi"><small>Satışta</small><b>${st.length}</b><span class="t">${varN} renk seçeneği</span></div>
        <div class="kpi warn"><small>Tükenen</small><b>${bit.length}</b><span class="t">tüm renkleri bitmiş</span></div>
        <div class="kpi acc"><small>Yakında</small><b>${yak.length}</b><span class="t">fiyat girilmemiş</span></div>
        <div class="kpi"><small>Taslak değişiklik</small><b>${deg.length}</b><span class="t">${deg.length ? `<button class="link" type="button" data-git="yayinla">Yayınla</button>` : "yayında"}</span></div>
      </section>
      <div class="two">
        <section class="card-p"><h2>Koleksiyonlara göre ürünler</h2>
          <div class="bars">${KOLS.map((k) => { const n = gor.filter((u) => u.koleksiyon === k).length, s = gor.filter((u) => u.koleksiyon === k && stokta(u)).length;
            return `<div class="bar-row"><span>${esc(k)}</span><span class="tr" title="${s} satışta / ${n} ürün"><i style="width:${(n / mx) * 100}%;background:linear-gradient(90deg,var(--ink) ${n ? (s / n) * 100 : 0}%,#c7c7cc 0)"></i></span><span>${n}</span></div>`; }).join("")}</div>
          <p class="muted" style="margin:14px 0 0">Koyu kısım satışta olan, gri kısım tükenen ürünler.</p>
        </section>
        <section class="card-p"><h2>Dikkat gerektirenler</h2>
          ${dikkat.length ? `<div class="list">${dikkat.slice(0, 8).map(([u, m, c]) => `
            <div class="list-row"><img src="${gorsel(u.varyantlar[0].gorseller[0])}" alt="" loading="lazy">
              <span class="n">${esc(u.ad)}<small><span class="tag ${c}">${m}</span></small></span>
              <button class="link" type="button" data-duzenle="${u.id}">Düzenle</button></div>`).join("")}</div>
            ${dikkat.length > 8 ? `<p class="muted" style="margin:10px 0 0">ve ${dikkat.length - 8} ürün daha. <button class="link" type="button" data-git="urunler" data-durum="tukendi">Tümünü gör</button></p>` : ""}`
            : `<p class="empty-p">Her şey yolunda. Tükenen ya da fiyat bekleyen ürün yok.</p>`}
        </section>
      </div>`;
  }

  /* ---------- Ürünler ---------- */
  const filtre = { q: "", kol: "", durum: "" };
  function urunlerCiz() {
    $("#icerik").innerHTML = `
      <section class="card-p">
        <div class="ptools">
          <label class="searchbox"><span class="sr-only">Ürün ara</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" id="p-q" placeholder="Ad, kategori ya da barkod ara" value="${esc(filtre.q)}"></label>
          <label><span class="sr-only">Koleksiyon</span><select id="p-kol"><option value="">Tüm koleksiyonlar</option>${KOLS.map((k) => `<option${filtre.kol === k ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
          <label><span class="sr-only">Durum</span><select id="p-durum">
            ${[["", "Tüm durumlar"], ["stokta", "Satışta"], ["tukendi", "Tükendi"], ["yakinda", "Yakında"], ["gizli", "Gizli"], ["one", "Öne çıkan"], ["degisti", "Taslakta değişen"]].map(([v, t]) => `<option value="${v}"${filtre.durum === v ? " selected" : ""}>${t}</option>`).join("")}
          </select></label>
          <span class="cnt" id="p-cnt"></span>
        </div>
      </section>
      <section class="card-p" style="padding:8px 12px"><div class="tablo-wrap"><table class="tablo">
        <thead><tr><th></th><th>Ürün</th><th class="hide-m">Renkler</th><th>Fiyat</th><th class="hide-m">Stok</th><th>Görünür</th><th class="hide-m">Öne çıkan</th><th></th></tr></thead>
        <tbody id="p-tbody"></tbody></table></div></section>`;
    const ciz = () => {
      const q = filtre.q.trim().toLocaleLowerCase("tr");
      const L = urunler().filter((u) => {
        if (filtre.kol && u.koleksiyon !== filtre.kol) return false;
        if (q && !(u.ad + " " + u.tamAd + " " + u.kategori + " " + u.varyantlar.map((v) => v.barkod + " " + v.renk).join(" ")).toLocaleLowerCase("tr").includes(q)) return false;
        const d = filtre.durum;
        if (d === "stokta" && !stokta(u)) return false;
        if (d === "tukendi" && (u.yakinda || stokta(u))) return false;
        if (d === "yakinda" && !u.yakinda) return false;
        if (d === "gizli" && !u.gizli) return false;
        if (d === "one" && !u.oneCikan) return false;
        if (d === "degisti" && !T.urunler[u.id]) return false;
        return true;
      });
      $("#p-cnt").textContent = `${L.length} ürün`;
      $("#p-tbody").innerHTML = L.length ? L.map((u) => {
        const sn = u.varyantlar.filter((v) => v.stok).length, n = u.varyantlar.length;
        const stok = u.yakinda ? `<span class="tag acc">Yakında</span>` : sn === n ? `<span class="tag ok">Stokta</span>` : sn ? `<span class="tag">${sn}/${n} renk</span>` : `<span class="tag no">Tükendi</span>`;
        return `<tr class="${u.gizli ? "gizli" : ""}">
          <td><img class="thumb" src="${gorsel(u.varyantlar[0].gorseller[0])}" alt="" loading="lazy"></td>
          <td class="ad">${esc(u.ad)}<small>${esc(u.kategori)}${T.urunler[u.id] ? ` · <span class="tag mod">Taslakta değişti</span>` : ""}</small></td>
          <td class="hide-m"><span class="dots">${u.varyantlar.map((v) => `<i class="${v.stok ? "" : "out"}" style="background:${v.hex || "#ccc"}" title="${esc(v.renk || "Tek renk")}${v.stok ? "" : " (tükendi)"}"></i>`).join("")}</span></td>
          <td class="num">${fiyatMetni(u)}</td>
          <td class="hide-m">${stok}</td>
          <td><label class="sw"><input type="checkbox" data-gorunur="${u.id}" ${u.gizli ? "" : "checked"} aria-label="${esc(u.ad)} sitede görünsün"><span class="tr"></span></label></td>
          <td class="hide-m"><button class="star" type="button" data-one="${u.id}" aria-pressed="${!!u.oneCikan}" aria-label="${esc(u.ad)} öne çıkar">★</button></td>
          <td><button class="btn btn-ghost" style="min-height:36px;padding:0 14px;font-size:.85rem" type="button" data-duzenle="${u.id}">Düzenle</button></td>
        </tr>`;
      }).join("") : `<tr><td colspan="8" class="empty-p">Bu filtrelere uyan ürün yok.</td></tr>`;
    };
    let qz;
    $("#p-q").addEventListener("input", (e) => { clearTimeout(qz); qz = setTimeout(() => { filtre.q = e.target.value; ciz(); }, 150); });
    $("#p-kol").addEventListener("change", (e) => { filtre.kol = e.target.value; ciz(); });
    $("#p-durum").addEventListener("change", (e) => { filtre.durum = e.target.value; ciz(); });
    $("#p-tbody").addEventListener("change", (e) => {
      const g = e.target.closest("[data-gorunur]");
      if (g) { urunAyarla(g.dataset.gorunur, "gizli", !g.checked); bildir(g.checked ? "Ürün sitede gösterilecek" : "Ürün sitede gizlenecek"); ciz(); }
    });
    $("#p-tbody").addEventListener("click", (e) => {
      const s = e.target.closest("[data-one]");
      if (s) { const yeni = s.getAttribute("aria-pressed") !== "true"; urunAyarla(s.dataset.one, "oneCikan", yeni); bildir(yeni ? "Öne çıkarıldı: listelerde başta görünür" : "Öne çıkarma kaldırıldı"); ciz(); }
    });
    ciz();
  }

  /* ---------- Ürün düzenleme çekmecesi ---------- */
  let acikId = null;
  function duzenle(id) {
    const u0 = BASE.find((x) => x.id === id); if (!u0) return;
    acikId = id;
    const u = etkin(u0), o = T.urunler[id] || {};
    const mod = (k) => (o[k] !== undefined ? " mod" : "");
    const vmod = (b, k) => (((o.v || {})[b] || {})[k] !== undefined ? " mod" : "");
    const vitrin = ayar("vitrinUrun") === id;
    $("#edit-baslik").textContent = "Ürünü düzenle";
    $("#edit-body").innerHTML = `
      <div class="edit-hero"><img src="${gorsel(u.varyantlar[0].gorseller[0])}" alt="">
        <div><b>${esc(u.ad)}</b><div class="t">${esc(u.kategori)} · ${esc(u.koleksiyon)} · ${u.varyantlar.length} renk</div>
          <a class="link" href="urun.html?id=${encodeURIComponent(id)}&taslak=1" target="_blank" rel="noopener">Taslakla sitede aç ↗</a></div></div>
      <div class="toggles">
        <label class="sw"><input type="checkbox" id="e-gorunur" ${u.gizli ? "" : "checked"}><span class="tr"></span>Sitede görünsün</label>
        <label class="sw"><input type="checkbox" id="e-one" ${u.oneCikan ? "checked" : ""}><span class="tr"></span>Öne çıkar (listelerde başta)</label>
        <label class="sw"><input type="checkbox" id="e-yakinda" ${u.yakinda ? "checked" : ""}><span class="tr"></span>Yakında (fiyat gösterilmez, satılamaz)</label>
        <div>${vitrin ? `<span class="tag ok">Ana sayfa vitrininde</span>` : `<button class="link" type="button" id="e-vitrin">Ana sayfa vitrinine koy</button>`}</div>
      </div>
      <div class="f${mod("ad")}"><label for="e-ad">Ürün adı (sitede görünen)</label><input id="e-ad" value="${esc(u.ad)}" placeholder="${esc(u0.ad)}"><div class="h">Boş bırakırsanız Excel'deki ad kullanılır.</div></div>
      <div>
        <p class="sec-t">Renkler, fiyat ve stok</p>
        <div class="tablo-wrap"><table class="tablo var-t"><thead><tr><th>Renk</th><th>Satış fiyatı</th><th>Liste fiyatı</th><th>Stokta</th></tr></thead><tbody>
          ${u.varyantlar.map((v) => `<tr>
            <td style="white-space:nowrap"><span class="dot" style="background:${v.hex || "#ccc"}"></span>${esc(v.renk || "Tek renk")}</td>
            <td><div class="f inp-tl${vmod(v.barkod, "fiyat")}"><input type="number" min="0" step="0.01" inputmode="decimal" data-v="${v.barkod}" data-k="fiyat" value="${v.fiyat}" aria-label="${esc(v.renk)} satış fiyatı"></div></td>
            <td><div class="f inp-tl${vmod(v.barkod, "piyasa")}"><input type="number" min="0" step="0.01" inputmode="decimal" data-v="${v.barkod}" data-k="piyasa" value="${v.piyasa || 0}" aria-label="${esc(v.renk)} liste fiyatı"></div></td>
            <td><label class="sw"><input type="checkbox" data-v="${v.barkod}" data-k="stok" ${v.stok ? "checked" : ""} aria-label="${esc(v.renk)} stokta"><span class="tr"></span></label></td></tr>`).join("")}
        </tbody></table></div>
        <p class="muted" style="margin:8px 0 0">Liste fiyatı satış fiyatından yüksekse sitede indirim olarak gösterilir.</p>
      </div>
      <div class="f${mod("olcu")}"><label for="e-olcu">Ölçü (cm)</label><input id="e-olcu" value="${esc(u.olcu || "")}" placeholder="örn. 42 x 36"></div>
      <div class="f${mod("aciklama")}"><label for="e-acik">Açıklama</label><textarea id="e-acik" rows="7">${esc((u.aciklama || []).join("\n"))}</textarea><div class="h">Her satır sitede ayrı bir paragraf olur.</div></div>
      <div class="edit-foot">
        <button class="btn btn-dark" type="button" id="e-tamam">Bitti</button>
        ${T.urunler[id] ? `<button class="btn btn-danger" type="button" id="e-geri">Bu üründeki taslak değişiklikleri geri al</button>` : ""}
      </div>`;
    const b = $("#edit-body");
    $("#e-gorunur").onchange = (e) => urunAyarla(id, "gizli", !e.target.checked);
    $("#e-one").onchange = (e) => urunAyarla(id, "oneCikan", e.target.checked);
    $("#e-yakinda").onchange = (e) => urunAyarla(id, "yakinda", e.target.checked);
    if ($("#e-vitrin")) $("#e-vitrin").onclick = () => { ayarYaz("vitrinUrun", id); bildir("Ana sayfa vitrini değişti"); duzenle(id); };
    $("#e-ad").onchange = (e) => urunAyarla(id, "ad", e.target.value.trim() || u0.ad);
    $("#e-olcu").onchange = (e) => urunAyarla(id, "olcu", e.target.value.trim());
    $("#e-acik").onchange = (e) => urunAyarla(id, "aciklama", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean));
    b.querySelectorAll("[data-v]").forEach((inp) => inp.addEventListener("change", () => {
      const k = inp.dataset.k;
      if (k === "stok") return varyantAyarla(id, inp.dataset.v, "stok", inp.checked);
      const n = Math.round(parseFloat(String(inp.value).replace(",", ".")) * 100) / 100;
      if (!(n >= 0)) { inp.value = ""; return bildir("Geçerli bir fiyat girin"); }
      varyantAyarla(id, inp.dataset.v, k, n);
    }));
    $("#e-tamam").onclick = kapat;
    if ($("#e-geri")) $("#e-geri").onclick = (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.onay !== "1") { btn.dataset.onay = "1"; btn.textContent = "Emin misiniz? Tekrar dokunun"; return; }
      if ((YAYIN.urunler || {})[id]) T.urunler[id] = kopya(YAYIN.urunler[id]); else delete T.urunler[id];
      kaydet(); bildir("Taslak değişiklikler geri alındı"); duzenle(id);
    };
    $("#edit").hidden = false; $("#edit-perde").classList.add("open"); document.body.style.overflow = "hidden";
    setTimeout(() => $("#edit-kapat").focus(), 30);
  }
  function kapat() {
    if ($("#edit").hidden) return;
    $("#edit").hidden = true; $("#edit-perde").classList.remove("open"); document.body.style.overflow = "";
    git(sekme);
    const btn = document.querySelector(`[data-duzenle="${CSS.escape(acikId || "")}"]`); if (btn) btn.focus();
  }

  /* ---------- Mağaza ayarları ---------- */
  function ayarlarCiz() {
    const f = (k, etiket, tip = "text", ek = "", ipucu = "") => `
      <div class="f${k in T.ayarlar ? " mod" : ""}${tip === "tl" ? " inp-tl" : ""}"><label for="a-${k}">${etiket}</label>
        <input id="a-${k}" data-ayar="${k}" data-tip="${tip}" ${tip === "tl" || tip === "sayi" ? 'type="number" min="0" step="1" inputmode="numeric"' : 'type="text"'} value="${esc(ayar(k))}" ${ek}>
        ${ipucu ? `<div class="h">${ipucu}</div>` : ""}</div>`;
    const bk = ayar("banka") || {};
    const satista = urunler().filter((u) => !u.gizli && stokta(u) && u.varyantlar.filter((v) => v.stok).length);
    $("#icerik").innerHTML = `
      <section class="card-p"><h2>Kargo ve iade</h2><div class="form-grid">
        ${f("ucretsizKargoLimiti", "Ücretsiz kargo limiti", "tl", "", "Bu tutar ve üzeri sepetlerde kargo ücretsiz.")}
        ${f("kargoUcreti", "Kargo ücreti", "tl")}
        ${f("kapidaOdemeUcreti", "Kapıda ödeme hizmet bedeli", "tl")}
        ${f("iadeGunu", "İade süresi (gün)", "sayi", 'min="14"', "Mesafeli satışta yasal asgari süre 14 gündür.")}
        ${f("kargoSuresi", "Kargoya veriliş süresi", "text", "", "Sitede “… içinde kargoda” olarak görünür.")}
      </div></section>
      <section class="card-p"><h2>Taksit seçenekleri</h2>
        <div class="tablo-wrap"><table class="tablo taksit-t"><thead><tr><th>Taksit sayısı</th><th>Vade farkı</th><th></th></tr></thead><tbody id="taksit-tb"></tbody></table></div>
        <div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" type="button" id="taksit-ekle">Taksit ekle</button></div>
        <p class="muted" style="margin:10px 0 0">Vade farkı 0 olan taksitler sitede “peşin fiyatına” olarak tanıtılır. Bankanızın sanal POS oranlarıyla uyumlu olmalı.</p>
      </section>
      <section class="card-p"><h2>Havale / EFT</h2><div class="form-grid">
        <div class="f${"banka" in T.ayarlar ? " mod" : ""}"><label for="b-ad">Banka</label><input id="b-ad" data-banka="ad" value="${esc(bk.ad)}"></div>
        <div class="f${"banka" in T.ayarlar ? " mod" : ""}"><label for="b-alici">Alıcı adı</label><input id="b-alici" data-banka="alici" value="${esc(bk.alici)}"></div>
        <div class="f${"banka" in T.ayarlar ? " mod" : ""}"><label for="b-iban">IBAN</label><input id="b-iban" data-banka="iban" value="${esc(bk.iban)}" autocomplete="off" spellcheck="false"></div>
      </div></section>
      <section class="card-p"><h2>İletişim</h2><div class="form-grid">
        ${f("telefon", "Telefon", "text", 'inputmode="tel" placeholder="0 5xx xxx xx xx"')}
        ${f("eposta", "E-posta", "text", 'inputmode="email" placeholder="ornek@alanadi.com"')}
        ${f("instagram", "Instagram adresi", "text", 'placeholder="https://instagram.com/…"')}
        ${f("trendyolMagaza", "Trendyol mağaza bağlantısı")}
      </div><p class="muted" style="margin:10px 0 0">Boş bırakılan alanlar sitede gösterilmez.</p></section>
      <section class="card-p"><h2>Ana sayfa vitrini</h2>
        <div class="f${"vitrinUrun" in T.ayarlar ? " mod" : ""}"><label for="a-vitrin">Açılışta büyük gösterilen ürün</label>
          <select id="a-vitrin">${satista.map((u) => `<option value="${u.id}"${ayar("vitrinUrun") === u.id ? " selected" : ""}>${esc(u.ad)}</option>`).join("")}</select>
          <div class="h">Ürünün stoktaki renkleri vitrinde sırayla döner.</div></div></section>
      <section class="card-p"><h2>Ödeme altyapısı</h2>
        <p style="margin:0">${M0.demoMod ? `<span class="tag acc">Önizleme modu açık</span> Kart ödemesi henüz bir ödeme kuruluşuna (iyzico, PayTR vb.) bağlı değil; siparişlerde para çekilmez. Bu ayar güvenlik için panelden değil, ödeme entegrasyonu yapılırken kod tarafında kapatılır.` : `<span class="tag ok">Canlı ödeme açık</span>`}</p></section>`;
    document.querySelectorAll("[data-ayar]").forEach((inp) => inp.addEventListener("change", () => {
      const k = inp.dataset.ayar, tip = inp.dataset.tip;
      let d = inp.value.trim();
      if (tip === "tl" || tip === "sayi") {
        d = Number(d);
        if (!(d >= 0)) { inp.value = ayar(k); return bildir("Geçerli bir sayı girin"); }
        if (k === "iadeGunu" && d < 14) { inp.value = ayar(k); return bildir("İade süresi 14 günden az olamaz"); }
      }
      ayarYaz(k, d); bildir("Kaydedildi (taslak)"); ayarlarCiz();
    }));
    document.querySelectorAll("[data-banka]").forEach((inp) => inp.addEventListener("change", () => {
      const yeni = Object.assign({}, ayar("banka"), { [inp.dataset.banka]: inp.value.trim() });
      ayarYaz("banka", yeni); bildir("Kaydedildi (taslak)"); ayarlarCiz();
    }));
    $("#a-vitrin").addEventListener("change", (e) => { ayarYaz("vitrinUrun", e.target.value); bildir("Ana sayfa vitrini değişti"); ayarlarCiz(); });
    const taksitCiz = () => {
      const L = ayar("taksitler") || [];
      $("#taksit-tb").innerHTML = L.map((t, i) => `<tr>
        <td><div class="f"><input type="number" min="1" max="36" step="1" inputmode="numeric" data-ti="${i}" data-tk="ay" value="${t.ay}" aria-label="Taksit sayısı"></div></td>
        <td><div class="f inp-pct"><input type="number" min="0" max="100" step="0.1" inputmode="decimal" data-ti="${i}" data-tk="oran" value="${Math.round(t.oran * 1000) / 10}" aria-label="Vade farkı yüzde"></div></td>
        <td>${t.ay === 1 ? `<span class="muted">Tek çekim</span>` : `<button class="link" type="button" data-tsil="${i}">Kaldır</button>`}</td></tr>`).join("");
    };
    taksitCiz();
    const taksitYaz = (L) => { L.sort((a, b) => a.ay - b.ay); ayarYaz("taksitler", L); taksitCiz(); bildir("Kaydedildi (taslak)"); };
    $("#taksit-tb").addEventListener("change", (e) => {
      const i = e.target.dataset.ti; if (i === undefined) return;
      const L = kopya(ayar("taksitler")); const n = Number(e.target.value);
      if (e.target.dataset.tk === "ay") { if (!(n >= 1 && n <= 36) || L.some((t, j) => j != i && t.ay === n)) { taksitCiz(); return bildir("Taksit sayısı 1–36 arasında ve tekrarsız olmalı"); } L[i].ay = Math.round(n); }
      else { if (!(n >= 0 && n <= 100)) { taksitCiz(); return bildir("Vade farkı 0 ile 100 arasında olmalı"); } L[i].oran = Math.round(n * 10) / 1000; }
      taksitYaz(L);
    });
    $("#taksit-tb").addEventListener("click", (e) => { const i = e.target.dataset.tsil; if (i === undefined) return; const L = kopya(ayar("taksitler")); L.splice(i, 1); taksitYaz(L); });
    $("#taksit-ekle").onclick = () => {
      const L = kopya(ayar("taksitler") || []); let ay = 2; while (L.some((t) => t.ay === ay)) ay++;
      if (ay > 36) return bildir("Daha fazla taksit eklenemez");
      L.push({ ay, oran: 0 }); taksitYaz(L);
    };
  }

  /* ---------- Siparişler ---------- */
  function siparislerCiz() {
    let L = [];
    try { L = JSON.parse(localStorage.getItem("boz_siparisler") || "[]"); } catch (e) {}
    L = L.slice().reverse();
    const yontem = { kart: "Kart", kapida: "Kapıda", havale: "Havale" };
    $("#icerik").innerHTML = `
      <section class="card-p"><h2>Siparişler nereden gelir?</h2>
        <p style="margin:0">Site şu an ödeme altyapısına bağlı olmadığı için gerçek müşteri siparişleri henüz bir yere kaydedilmiyor. Ödeme kuruluşu (iyzico, PayTR vb.) bağlandığında siparişler onun panelinde ve e-postanızda görünür; istenirse buraya da aktarılabilir.</p>
        <p class="muted" style="margin:10px 0 0">Aşağıdaki liste yalnızca <b>bu tarayıcıda</b> denemek için verilen siparişlerdir.</p></section>
      <section class="card-p" style="padding:8px 12px">${L.length ? `<div class="tablo-wrap"><table class="tablo">
        <thead><tr><th>Sipariş no</th><th>Tarih</th><th>Müşteri</th><th class="hide-m">Ürünler</th><th>Ödeme</th><th>Tutar</th></tr></thead><tbody>
        ${L.map((s) => `<tr><td class="num"><b>${esc(s.no)}</b></td>
          <td class="num">${new Date(s.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</td>
          <td>${esc(s.musteri.ad)} ${esc(s.musteri.soyad)}<br><small class="muted">${esc(s.adres.ilce)} / ${esc(s.adres.il)}</small></td>
          <td class="hide-m">${s.kalemler.map((k) => `${k.adet} × ${esc(k.ad)}${k.renk ? ` (${esc(k.renk)})` : ""}`).join("<br>")}</td>
          <td>${yontem[s.yontem] || esc(s.yontem)}${s.taksit > 1 ? ` · ${s.taksit} taksit` : ""}</td>
          <td class="num"><b>${para(s.tutar.toplam)}</b></td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty-p">Bu tarayıcıda verilmiş deneme siparişi yok.</p>`}</section>`;
  }

  /* ---------- Yayınla ---------- */
  const dosyaIcerik = () => {
    const veri = { surum: 1, guncelleme: new Date().toISOString(), ayarlar: T.ayarlar, urunler: T.urunler };
    return `/* =========================================================\n   Yönetim paneli yayın dosyası — ${new Date().toLocaleString("tr-TR")}\n   yonetim.html > Yayınla ile üretildi. Elle düzenlemeyin.\n   ========================================================= */\nwindow.YONETIM = ${JSON.stringify(veri, null, 1)};\n`;
  };
  function yayinlaCiz() {
    const D = degisiklikler();
    $("#icerik").innerHTML = `
      <section class="card-p"><h2>${D.length ? `Yayına girecek ${D.length} değişiklik` : "Yayınlanacak değişiklik yok"}</h2>
        ${D.length ? `<ul class="changes">${D.map((d) => `<li><span class="tag">${d.tur}</span><span><b>${esc(d.ad)}</b> · ${d.detay.map(esc).join(" · ")}</span></li>`).join("")}</ul>`
          : `<p class="muted" style="margin:0">Taslak, sitede yayında olan sürümle aynı. Ürünler veya Mağaza ayarları sekmesinde değişiklik yapın.</p>`}
      </section>
      <section class="card-p"><h2>Nasıl yayınlanır?</h2>
        <ol class="steps-p">
          <li><b>Sitede önizle</b> ile değişiklikleri kontrol edin (yalnız siz görürsünüz).</li>
          <li><b>Yayın dosyasını indir</b> düğmesiyle <code>yonetim.js</code> dosyasını alın.</li>
          <li>Sunucudaki <code>site/assets/js/yonetim.js</code> dosyasının yerine koyun (ya da bana gönderin, ben eklerim).</li>
        </ol>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-primary" type="button" id="y-indir"${D.length ? "" : " disabled"}>Yayın dosyasını indir</button>
          <button class="btn btn-ghost" type="button" id="y-kopyala"${D.length ? "" : " disabled"}>Kodu kopyala</button>
          <a class="btn btn-ghost" href="index.html?taslak=1" target="_blank" rel="noopener">Sitede önizle</a>
        </div>
      </section>
      <section class="card-p"><h2>Dosya içeriği</h2><textarea class="code" id="y-kod" readonly spellcheck="false" aria-label="yonetim.js içeriği">${esc(dosyaIcerik())}</textarea></section>
      <section class="card-p"><h2>Taslağı sıfırla</h2>
        <p class="muted" style="margin:0 0 12px">Yayınlanmamış tüm değişiklikleri siler ve yayındaki sürüme döner.</p>
        <button class="btn btn-danger" type="button" id="y-sifirla"${D.length ? "" : " disabled"}>Taslağı sıfırla</button></section>`;
    $("#y-indir").onclick = () => {
      try {
        const url = URL.createObjectURL(new Blob([dosyaIcerik()], { type: "text/javascript" }));
        const a = document.createElement("a"); a.href = url; a.download = "yonetim.js"; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        bildir("İndirme başlatıldı. İnmediyse “Kodu kopyala”yı kullanın.");
      } catch (e) { bildir("İndirilemedi. “Kodu kopyala”yı kullanın."); }
    };
    $("#y-kopyala").onclick = () => {
      const kod = dosyaIcerik();
      (navigator.clipboard ? navigator.clipboard.writeText(kod) : Promise.reject()).then(() => bildir("Kod kopyalandı"))
        .catch(() => { const t = $("#y-kod"); t.focus(); t.select(); bildir("Metin seçildi; kopyalayın (Ctrl/⌘ + C)"); });
    };
    $("#y-sifirla").onclick = (e) => {
      const b = e.currentTarget;
      if (b.dataset.onay !== "1") { b.dataset.onay = "1"; b.textContent = "Emin misiniz? Tekrar dokunun"; return; }
      T = kopya(YAYIN); T.ayarlar = T.ayarlar || {}; T.urunler = T.urunler || {}; kaydet(); bildir("Taslak sıfırlandı"); yayinlaCiz();
    };
  }

  /* ---------- Olaylar ---------- */
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-sekme],[data-git]");
    if (g) { if (g.dataset.durum) { filtre.durum = g.dataset.durum; } git(g.dataset.sekme || g.dataset.git); return; }
    const d = e.target.closest("[data-duzenle]");
    if (d) duzenle(d.dataset.duzenle);
  });
  $("#edit-kapat").onclick = kapat;
  $("#edit-perde").onclick = kapat;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") kapat(); });
  window.addEventListener("hashchange", () => { const s = location.hash.slice(1); if (s !== sekme && SEKMELER[s]) git(s); });
  window.addEventListener("storage", (e) => { if (e.key === TASLAK) { try { T = JSON.parse(e.newValue) || kopya(YAYIN); } catch (x) {} durumCiz(); } });

  durumCiz();
  git(location.hash.slice(1) || "genel");
})();

/* =========================================================
   BOZ CONCEPT HOME — ortak kod (sepet, başlık, çekmece, kartlar)
   ========================================================= */
(function () {
  "use strict";
  const M = window.MAGAZA;
  /* ---------- Yönetim paneli değişikliklerini uygula ---------- */
  // Yayındaki değişiklikler: assets/js/yonetim.js. Taslak önizleme (?taslak=1): yalnız panelin açıldığı tarayıcıda.
  let taslakModu = false, Y = window.YONETIM || {};
  try {
    const q = new URLSearchParams(location.search).get("taslak");
    if (q === "1") sessionStorage.setItem("boz_taslak_onizleme", "1");
    if (q === "0") sessionStorage.removeItem("boz_taslak_onizleme");
    taslakModu = sessionStorage.getItem("boz_taslak_onizleme") === "1";
    if (taslakModu) { const t = JSON.parse(localStorage.getItem("boz_yonetim_taslak")); if (t) Y = t; }
  } catch (e) {}
  Object.entries(Y.ayarlar || {}).forEach(([k, v]) => { M[k] = v; });
  const uygula = (u0) => {
    const o = (Y.urunler || {})[u0.id];
    if (!o) return u0;
    const u = JSON.parse(JSON.stringify(u0));
    ["ad", "gizli", "oneCikan", "yakinda", "aciklama", "olcu"].forEach((k) => { if (o[k] !== undefined) u[k] = o[k]; });
    u.varyantlar.forEach((v) => { Object.assign(v, (o.v || {})[v.barkod] || {}); });
    return u;
  };
  const URUNLER = [...(window.EK_URUNLER || []), ...(window.URUNLER || [])].map(uygula).filter((u) => !u.gizli)
    .map((u, i) => [u, i]).sort((a, b) => (!!b[0].oneCikan - !!a[0].oneCikan) || a[1] - b[1]).map(([u]) => u);
  window.URUNLER = URUNLER;

  /* ---------- Yardımcılar ---------- */
  const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
  const tl2 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const para = (n) => (Math.abs(n - Math.round(n)) > 0.004 ? tl2.format(n) : tl.format(n));
  const paraKurus = (n) => tl2.format(n);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, el = document) => el.querySelector(s);
  const urunBul = (id) => URUNLER.find((u) => u.id === id);
  const varyantBul = (u, barkod) => (u && (u.varyantlar.find((v) => v.barkod === barkod) || u.varyantlar[0])) || null;
  const gorselYol = (h, kucuk) => `assets/urun/${h}${kucuk ? "-k" : ""}.webp`;
  const stokta = (u) => u.varyantlar.some((v) => v.stok);
  const anaVaryant = (u) => u.varyantlar.find((v) => v.stok) || u.varyantlar[0];
  const enDusuk = (u) => Math.min(...(u.varyantlar.filter((v) => v.stok).length ? u.varyantlar.filter((v) => v.stok) : u.varyantlar).map((v) => v.fiyat));
  const fiyatlarFarkli = (u) => new Set(u.varyantlar.map((v) => v.fiyat)).size > 1;
  const indirimYuzde = (v) => (v.piyasa > v.fiyat ? Math.round((1 - v.fiyat / v.piyasa) * 100) : 0);

  /* ---------- İkonlar ---------- */
  const ikon = {
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
    ret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M8 5 4 9l4 4"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
  };

  // Atom çağı yıldızı (starburst)
  const yildiz = (n = 16, ic = 0.42) => {
    let d = "";
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 50 : 50 * ic;
      const a = (Math.PI * i) / n - Math.PI / 2;
      d += (i ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(2) + " " + (50 + r * Math.sin(a)).toFixed(2);
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}Z" fill="currentColor"/></svg>`;
  };

  /* ---------- Sepet ---------- */
  const ANAHTAR = "boz_sepet_v2";
  const depoOku = () => { try { return JSON.parse(localStorage.getItem(ANAHTAR)) || []; } catch (e) { return []; } };
  let sepet = depoOku();
  const depoYaz = () => { try { localStorage.setItem(ANAHTAR, JSON.stringify(sepet)); } catch (e) {} };
  const dinleyiciler = [];

  const Sepet = {
    satirlar: () => sepet.map((s) => {
      const urun = urunBul(s.id);
      const v = urun && urun.varyantlar.find((x) => x.barkod === s.barkod);
      return urun && v ? { ...s, urun, v } : null;
    }).filter(Boolean),
    adet: () => Sepet.satirlar().reduce((t, s) => t + s.adet, 0),
    araToplam: () => Sepet.satirlar().reduce((t, s) => t + s.v.fiyat * s.adet, 0),
    kargo: () => (Sepet.araToplam() >= M.ucretsizKargoLimiti || Sepet.adet() === 0 ? 0 : M.kargoUcreti),
    ekle(id, barkod, adet = 1) {
      const var_ = sepet.find((s) => s.id === id && s.barkod === barkod);
      if (var_) var_.adet = Math.min(var_.adet + adet, 20);
      else sepet.push({ id, barkod, adet });
      Sepet._degisti();
    },
    ayarla(barkod, adet) {
      if (adet <= 0) sepet = sepet.filter((s) => s.barkod !== barkod);
      else { const s = sepet.find((x) => x.barkod === barkod); if (s) s.adet = Math.min(adet, 20); }
      Sepet._degisti();
    },
    bosalt() { sepet = []; Sepet._degisti(); },
    dinle(fn) { dinleyiciler.push(fn); },
    _degisti() { depoYaz(); dinleyiciler.forEach((f) => f()); },
  };
  window.addEventListener("storage", (e) => { if (e.key === ANAHTAR) { sepet = depoOku(); dinleyiciler.forEach((f) => f()); } });

  /* ---------- Başlık & alt bilgi ---------- */
  const logo = () => `<a class="logo" href="index.html" aria-label="${esc(M.ad)} ana sayfa" translate="no"><span class="mark">Boz</span><span class="word">Concept Home</span></a>`;

  function baslikCiz() {
    const yer = $("#site-header");
    if (!yer) return;
    const kols = window.KOLEKSIYONLAR || [];
    const link = (k) => `index.html?k=${encodeURIComponent(k)}#koleksiyon`;
    const say = (k) => URUNLER.filter((u) => u.koleksiyon === k).length;
    yer.outerHTML = `
      <div class="announce" role="note">
        <span>${para(M.ucretsizKargoLimiti)} üzeri ücretsiz kargo</span>
        <span>Kapıda ödeme</span>
        <span>${M.iadeGunu} gün kolay iade</span>
      </div>
      <header class="site-header">
        <div class="wrap bar">
          ${logo()}
          <nav class="nav" aria-label="Ana menü">
            ${kols.map((k) => `<a href="${link(k)}" data-kol-link="${esc(k)}">${esc(k)}</a>`).join("")}
            <a href="index.html#hikaye">Hikâyemiz</a>
          </nav>
          <button class="icon-act" type="button" data-arama aria-label="Ara" aria-expanded="false" aria-controls="arama-panel">${ikon.search}</button>
          <button class="icon-act cart-btn" type="button" data-open-cart aria-haspopup="dialog" aria-label="Sepet, 0 ürün">${ikon.bag}<span class="cart-count" data-n="0" aria-hidden="true">0</span></button>
          <button class="icon-act menu-btn" type="button" data-menu aria-label="Menüyü aç" aria-expanded="false" aria-controls="mobil-menu">${ikon.menu}</button>
        </div>
        <div class="arama" id="arama-panel" hidden>
          <div class="wrap"><form action="index.html#koleksiyon" method="get" role="search">
            <label class="sr-only" for="arama-q">Ürün ara</label>
            <input id="arama-q" name="q" type="search" placeholder="Sehpa, raf, havluluk…" autocomplete="off" enterkeyhint="search">
            <button class="btn btn-primary" type="submit">Ara</button>
          </form></div>
        </div>
        <nav class="mobil-menu" id="mobil-menu" aria-label="Menü" hidden>
          <div class="wrap">
            ${kols.map((k) => `<a href="${link(k)}" data-kol-link="${esc(k)}">${esc(k)}<small>${say(k)} ürün</small></a>`).join("")}
            <div class="alt">
              <a href="index.html#hikaye">Hikâyemiz</a>
              <a href="index.html#sss">Sık sorulanlar</a>
            </div>
          </div>
        </nav>
      </header>`;
  }

  /* Arama paneli ve mobil menü */
  function ustEtkilesim() {
    const bas = $(".site-header");
    if (!bas) return;
    const arama = $("#arama-panel"), menu = $("#mobil-menu");
    const aBtn = $("[data-arama]"), mBtn = $("[data-menu]");
    const ac = (panel, btn, acik) => {
      panel.hidden = !acik; btn.setAttribute("aria-expanded", String(acik));
      if (btn === mBtn) { btn.setAttribute("aria-label", acik ? "Menüyü kapat" : "Menüyü aç"); btn.innerHTML = acik ? ikon.close : ikon.menu; document.body.style.overflow = acik ? "hidden" : ""; }
    };
    const kapat = (odak) => {
      if (!menu.hidden) { ac(menu, mBtn, false); if (odak) mBtn.focus(); }
      if (!arama.hidden) { ac(arama, aBtn, false); if (odak) aBtn.focus(); }
    };
    aBtn.addEventListener("click", () => {
      const acik = arama.hidden;
      if (!menu.hidden) ac(menu, mBtn, false);
      ac(arama, aBtn, acik);
      if (acik) setTimeout(() => $("#arama-q").focus(), 30);
    });
    mBtn.addEventListener("click", () => {
      const acik = menu.hidden;
      if (!arama.hidden) ac(arama, aBtn, false);
      ac(menu, mBtn, acik);
    });
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) kapat(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") kapat(true); });
    // composedPath: tıklanan ikon yer değiştirse bile (menü ⇄ kapat) tıklama başlık içinde sayılır
    document.addEventListener("click", (e) => { if (!e.composedPath().includes(bas)) kapat(false); });
    matchMedia("(min-width: 1100px)").addEventListener("change", (e) => { if (e.matches && !menu.hidden) ac(menu, mBtn, false); });
    const q = new URLSearchParams(location.search).get("q");
    if (q) $("#arama-q").value = q;
  }

  function altBilgiCiz() {
    const yer = $("#site-footer");
    if (!yer) return;
    const kols = (window.KOLEKSIYONLAR || []).map((k) => `<li><a href="index.html?k=${encodeURIComponent(k)}#koleksiyon">${esc(k)}</a></li>`).join("");
    const iletisim = [
      M.eposta && `<li><a href="mailto:${esc(M.eposta)}">${esc(M.eposta)}</a></li>`,
      M.telefon && `<li><a href="tel:${esc(M.telefon.replace(/\s/g, ""))}">${esc(M.telefon)}</a></li>`,
      M.instagram && `<li><a href="${esc(M.instagram)}" rel="noopener" target="_blank">Instagram</a></li>`,
      M.trendyolMagaza && `<li><a href="${esc(M.trendyolMagaza)}" rel="noopener" target="_blank">Trendyol mağazamız</a></li>`,
    ].filter(Boolean).join("");
    yer.outerHTML = `
      <footer class="site-footer">
        <div class="wrap">
          <div class="cols">
            <div>
              ${logo()}
              <p class="slogan">Mekâna karakter katan tasarımlar.</p><p style="max-width:34ch">Metal tel sehpalar, raflar ve ev düzenleyiciler.</p>
              <div class="pay-icons" aria-label="Ödeme yöntemleri"><span>Visa</span><span>Mastercard</span><span>Troy</span><span>Kapıda ödeme</span><span>Havale</span></div>
            </div>
            <div><h4>Koleksiyonlar</h4><ul>${kols}</ul></div>
            <div><h4>Yardım</h4><ul>
              <li><a href="index.html#sss">Kargo ve teslimat</a></li>
              <li><a href="index.html#sss">İade ve değişim</a></li>
              <li><a href="index.html#sss">Ödeme seçenekleri</a></li>
            </ul></div>
            <div><h4>İletişim</h4><ul>${iletisim}</ul></div>
          </div>
          <div class="legal">
            <span>© ${new Date().getFullYear()} ${esc(M.ad)}</span>
            <span>Mesafeli Satış Sözleşmesi · KVKK Aydınlatma Metni · Çerez Politikası</span>
          </div>
        </div>
      </footer>`;
  }

  /* ---------- Sepet çekmecesi ---------- */
  function cekmeceCiz() {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="overlay" data-close-cart></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true" tabindex="-1">
        <div class="drawer-head">
          <h2 id="drawer-title">Sepetiniz</h2>
          <button class="icon-btn" type="button" data-close-cart aria-label="Sepeti kapat">${ikon.close}</button>
        </div>
        <div class="ship-meter" id="ship-meter"></div>
        <div class="drawer-items" id="drawer-items"></div>
        <div class="drawer-foot" id="drawer-foot"></div>
      </aside>
      <div class="toast" role="status" aria-live="polite"><span id="toast-msg"></span><button type="button" data-open-cart>Sepeti gör</button></div>`);
  }

  function kargoMetre() {
    const kalan = M.ucretsizKargoLimiti - Sepet.araToplam();
    const yuzde = Math.min(100, (Sepet.araToplam() / M.ucretsizKargoLimiti) * 100);
    return `${kalan > 0 ? `Ücretsiz kargo için <b>${para(kalan)}</b> daha ekleyin.` : `<b>Tebrikler!</b> Kargonuz ücretsiz.`}
      <div class="bar" aria-hidden="true"><i style="width:${yuzde}%"></i></div>`;
  }

  function satirHTML(s) {
    const { urun: u, v } = s;
    return `<div class="line">
      <a class="thumb" href="urun.html?id=${u.id}&v=${v.barkod}" tabindex="-1"><img src="${gorselYol(v.gorseller[0], true)}" alt="" loading="lazy"></a>
      <div>
        <h4>${esc(u.ad)}</h4>
        ${v.renk ? `<div class="muted"><span class="dot" style="background:${v.hex}"></span>${esc(v.renk)}</div>` : ""}
        <div class="qty" role="group" aria-label="${esc(u.ad)} adedi">
          <button type="button" data-qty="${v.barkod}" data-d="-1" aria-label="Azalt">−</button>
          <span>${s.adet}</span>
          <button type="button" data-qty="${v.barkod}" data-d="1" aria-label="Artır">+</button>
        </div>
      </div>
      <div>
        <div class="lp">${para(v.fiyat * s.adet)}</div>
        <button class="remove" type="button" data-remove="${v.barkod}">Kaldır</button>
      </div>
    </div>`;
  }

  function cekmeceGuncelle() {
    const sayac = $(".cart-count");
    if (sayac) {
      const yeni = String(Sepet.adet());
      sayac.dataset.n = yeni;
      const sb = $(".cart-btn"); if (sb) sb.setAttribute("aria-label", `Sepet, ${yeni} ürün`);
      if (sayac.textContent !== yeni) { sayac.textContent = yeni; sayac.classList.remove("bump"); void sayac.offsetWidth; sayac.classList.add("bump"); }
    }
    const items = $("#drawer-items");
    if (!items) return;
    const satirlar = Sepet.satirlar();
    $("#ship-meter").innerHTML = kargoMetre();
    $("#ship-meter").hidden = satirlar.length === 0;
    if (!satirlar.length) {
      items.innerHTML = `<div class="empty">${ikon.bag}<p><b>Sepetiniz henüz boş.</b><br>Koleksiyona göz atın, beğendiğinizi tek dokunuşla ekleyin.</p>
        <a class="btn btn-dark" href="index.html#koleksiyon" data-close-cart>Alışverişe başla</a></div>`;
      $("#drawer-foot").innerHTML = "";
      return;
    }
    items.innerHTML = satirlar.map(satirHTML).join("");
    const kargo = Sepet.kargo();
    $("#drawer-foot").innerHTML = `
      <div class="row"><span>Ara toplam</span><span>${para(Sepet.araToplam())}</span></div>
      <div class="row"><span>Kargo</span><span>${kargo ? para(kargo) : '<b style="color:var(--teal)">Ücretsiz</b>'}</span></div>
      <div class="row total"><span>Toplam</span><span>${para(Sepet.araToplam() + kargo)}</span></div>
      <a class="btn btn-primary btn-block btn-lg" href="odeme.html">Güvenle öde ${ikon.lock}</a>
      <p class="note">Kart · Kapıda ödeme · Havale/EFT</p>`;
  }

  let sonOdak = null;
  function cekmeceAc() {
    const d = $(".drawer");
    if (!d) return;
    sonOdak = document.activeElement;
    $(".overlay").classList.add("open");
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".toast").classList.remove("show");
    setTimeout(() => d.focus(), 50);
  }
  function cekmeceKapat() {
    const d = $(".drawer");
    if (!d || !d.classList.contains("open")) return;
    $(".overlay").classList.remove("open");
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (sonOdak && sonOdak.focus) sonOdak.focus();
  }

  let toastZaman;
  function bildir(mesaj, alt) {
    const t = $(".toast");
    if (!t) return;
    const m = $("#toast-msg");
    if (alt) { m.innerHTML = ""; const b = document.createElement("b"); b.textContent = mesaj; const k = document.createElement("small"); k.textContent = alt; m.append(b, k); }
    else m.textContent = mesaj;
    t.classList.add("show");
    clearTimeout(toastZaman);
    toastZaman = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function sepeteEkle(id, barkod, adet = 1) {
    const u = urunBul(id);
    const v = varyantBul(u, barkod);
    if (!u || !v) return;
    if (u.yakinda) { bildir("Bu ürün çok yakında satışta"); return false; }
    if (!v.stok) { bildir("Bu renk şu an tükendi"); return false; }
    Sepet.ekle(id, v.barkod, adet);
    bildir("Sepete eklendi", `${u.ad}${v.renk ? ` · ${v.renk}` : ""}`);
    return true;
  }

  /* ---------- Ürün kartı ---------- */
  function kartHTML(u) {
    const v = anaVaryant(u);
    const var_ = stokta(u);
    const ind = indirimYuzde(v);
    const ikinci = v.gorseller[1];
    const rozet = u.yakinda ? `<span class="badge sale">Yeni · Yakında</span>`
      : !var_ ? `<span class="badge out">Tükendi</span>`
      : ind >= 5 ? `<span class="badge sale">%${ind} indirim</span>`
      : u.varyantlar.length > 2 ? `<span class="badge">${u.varyantlar.length} renk</span>` : "";
    const renkler = u.varyantlar.filter((x) => x.hex).slice(0, 6);
    return `<article class="card reveal${var_ || u.yakinda ? "" : " is-out"}">
      ${rozet}
      <a class="card-media" href="urun.html?id=${u.id}" tabindex="-1" aria-hidden="true">
        <img src="${gorselYol(v.gorseller[0], true)}" alt="${esc(u.ad)}" loading="lazy" decoding="async">
        ${ikinci ? `<img class="alt" src="${gorselYol(ikinci, true)}" alt="" loading="lazy" decoding="async">` : ""}
      </a>
      <div class="card-body">
        <span class="cat">${esc(u.kategori)}</span>
        <h3><a href="urun.html?id=${u.id}" title="${esc(u.tamAd)}">${esc(u.ad)}</a></h3>
        ${renkler.length > 1 ? `<div class="swatches sm" aria-label="Renkler">${renkler.map((x) => `<span style="background:${x.hex}" title="${esc(x.renk)}"></span>`).join("")}</div>` : ""}
        <div class="card-foot">
          <span class="price">${u.yakinda ? `<small>Fiyat</small>yakında` : `${fiyatlarFarkli(u) ? "<small>başlayan</small>" : ""}${para(enDusuk(u))}${ind >= 5 ? `<s>${para(v.piyasa)}</s>` : ""}`}</span>
          ${var_ ? `<button class="add-btn" type="button" data-add="${u.id}" data-v="${v.barkod}" aria-label="${esc(u.ad)} sepete ekle">${ikon.plus}</button>` : ""}
        </div>
      </div>
    </article>`;
  }

  /* ---------- Görünür olunca beliren öğeler ---------- */
  function belirt() {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((girdiler) => {
      girdiler.forEach((g) => { if (g.isIntersecting) { g.target.classList.add("in"); io.unobserve(g.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- Olaylar ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-open-cart],[data-close-cart],[data-qty],[data-remove]");
    if (!t) return;
    if (t.dataset.add) {
      if (sepeteEkle(t.dataset.add, t.dataset.v) && t.classList.contains("add-btn")) {
        // Geri bildirim: + simgesi kısa süre onaya döner
        if (!t.dataset.etiket) t.dataset.etiket = t.getAttribute("aria-label") || "";
        t.classList.add("added"); t.innerHTML = ikon.check; t.setAttribute("aria-label", "Sepete eklendi");
        clearTimeout(t._z); t._z = setTimeout(() => { t.classList.remove("added"); t.innerHTML = ikon.plus; t.setAttribute("aria-label", t.dataset.etiket); }, 1400);
      }
    }
    else if (t.hasAttribute("data-open-cart")) { cekmeceAc(); }
    else if (t.hasAttribute("data-close-cart")) { cekmeceKapat(); }
    else if (t.dataset.qty) {
      const s = sepet.find((x) => x.barkod === t.dataset.qty);
      if (s) Sepet.ayarla(s.barkod, s.adet + Number(t.dataset.d));
    } else if (t.dataset.remove) { Sepet.ayarla(t.dataset.remove, 0); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cekmeceKapat();
    if (e.key === "Tab") {
      const d = $(".drawer.open");
      if (!d) return;
      const f = d.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const ilk = f[0], son = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === ilk || document.activeElement === d)) { e.preventDefault(); son.focus(); }
      else if (!e.shiftKey && document.activeElement === son) { e.preventDefault(); ilk.focus(); }
    }
  });

  /* ---------- Başlat ---------- */
  function baslat() {
    baslikCiz();
    ustEtkilesim();
    altBilgiCiz();
    if (!document.body.dataset.noCart) cekmeceCiz();
    Sepet.dinle(cekmeceGuncelle);
    cekmeceGuncelle();
    if (taslakModu) document.body.insertAdjacentHTML("beforeend", `<div class="taslak-serit" role="status">Taslak önizleme · yayında değil <a href="?taslak=0">Çık</a> <a href="yonetim.html">Panele dön</a></div>`);
    document.querySelectorAll("[data-burst]").forEach((el) => { el.innerHTML = yildiz(Number(el.dataset.burst) || 16); });
  }

  window.BOZ = {
    M, URUNLER, para, paraKurus, esc, urunBul, varyantBul, anaVaryant, gorselYol, stokta, enDusuk, fiyatlarFarkli, indirimYuzde,
    kartHTML, ikon, yildiz, Sepet, sepeteEkle, cekmeceAc, belirt, bildir,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", baslat);
  else baslat();
})();

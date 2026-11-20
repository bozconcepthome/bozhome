/* =========================================================
   BOZ CONCEPT HOME — tek sayfa ödeme
   Gerçek ödeme için: siparisGonder() içinde iyzico / PayTR vb.
   ödeme altyapısının sunucu tarafı entegrasyonunu çağırın.
   Kart bilgileri ASLA tarayıcıda saklanmaz.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const { M, para, paraKurus, esc, gorselYol, ikon, yildiz, Sepet } = window.BOZ;
  const $ = (s, el = document) => el.querySelector(s);
  const kok = $("#checkout-root");
  $("#secure").innerHTML = `${ikon.lock} Güvenli ödeme`;

  const ILLER = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkâri","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
  const FORM_ANAHTAR = "boz_odeme_bilgi_v1";

  /* ---------- Boş sepet ---------- */
  if (!Sepet.satirlar().length) {
    kok.innerHTML = `<div class="success"><div class="seal">${yildiz(18)}<span>🛒</span></div>
      <h1>Sepetiniz boş</h1><p>Ödeme yapmak için önce sepete ürün ekleyin.</p>
      <a class="btn btn-coral btn-lg" href="index.html#koleksiyon">Alışverişe dön</a></div>`;
    return;
  }

  const alan = (id, etiket, attrs = "", hata = "Bu alan gerekli.", ek = "") => `
    <div class="field ${ek}" data-f="${id}">
      <label for="${id}">${etiket}</label>
      <input id="${id}" name="${id}" ${attrs}>
      <div class="err" id="${id}-err">${hata}</div>
    </div>`;

  const taksitHTML = M.taksitler.map((t, i) => `
    <label class="opt"><input type="radio" name="taksit" value="${t.ay}" ${i === 0 ? "checked" : ""}>
      <span class="box"><b>${t.ay === 1 ? "Tek çekim" : `${t.ay} taksit`}</b><small data-taksit="${t.ay}"></small></span></label>`).join("");

  kok.innerHTML = `
  <form class="checkout" id="form" novalidate>
    <div>
      ${M.demoMod ? `<div class="demo-note" role="note"><b>Önizleme modu:</b> ödeme altyapısı henüz bağlanmadı. Kartınızdan çekim yapılmaz, bilgiler hiçbir yere gönderilmez.</div>` : ""}

      <section class="panel" aria-labelledby="h-iletisim">
        <h2 id="h-iletisim"><span class="n">1</span>İletişim</h2>
        <div class="fields">
          ${alan("eposta", "E-posta", 'type="email" autocomplete="email" inputmode="email" required placeholder="ornek@eposta.com"', "Geçerli bir e-posta girin.")}
          ${alan("tel", "Cep telefonu", 'type="tel" autocomplete="tel-national" inputmode="tel" required placeholder="05xx xxx xx xx" maxlength="14"', "10 haneli cep numaranızı girin (5xx…).")}
        </div>
        <p class="hint" style="margin:10px 0 0;font-size:.85rem;color:var(--ink-soft)">Sipariş ve kargo bilgilerini buraya göndereceğiz. Üyelik gerekmez.</p>
      </section>

      <section class="panel" aria-labelledby="h-teslimat">
        <h2 id="h-teslimat"><span class="n">2</span>Teslimat adresi</h2>
        <div class="fields">
          ${alan("ad", "Ad", 'autocomplete="given-name" required')}
          ${alan("soyad", "Soyad", 'autocomplete="family-name" required')}
          <div class="field" data-f="il">
            <label for="il">İl</label>
            <select id="il" name="il" autocomplete="address-level1" required><option value="">Seçin</option>${ILLER.map(i => `<option>${i}</option>`).join("")}</select>
            <div class="err">İl seçin.</div>
          </div>
          ${alan("ilce", "İlçe", 'autocomplete="address-level2" required')}
          <div class="field full" data-f="adres">
            <label for="adres">Açık adres</label>
            <textarea id="adres" name="adres" autocomplete="street-address" required placeholder="Mahalle, sokak, bina no, daire no"></textarea>
            <div class="err">Adresinizi mahalle, sokak ve numara ile yazın.</div>
          </div>
          <div class="field full">
            <label class="check"><input type="checkbox" id="fatura-ayni" checked> Fatura adresim teslimat adresimle aynı</label>
          </div>
          <div class="field full" data-f="fatura" id="fatura-wrap" hidden>
            <label for="fatura">Fatura adresi</label>
            <textarea id="fatura" name="fatura" autocomplete="billing street-address"></textarea>
            <div class="err">Fatura adresini yazın.</div>
          </div>
        </div>
      </section>

      <section class="panel" aria-labelledby="h-odeme">
        <h2 id="h-odeme"><span class="n">3</span>Ödeme</h2>
        <div class="opts" role="radiogroup" aria-labelledby="h-odeme">
          <label class="opt"><input type="radio" name="yontem" value="kart" checked>
            <span class="box">${ikon.card}<span class="t"><b>Kredi / banka kartı</b><small>Visa, Mastercard, Troy · taksit seçenekli</small></span></span></label>
          <label class="opt"><input type="radio" name="yontem" value="kapida">
            <span class="box">${ikon.cash}<span class="t"><b>Kapıda ödeme</b><small>Teslimatta nakit ya da kartla</small></span><span class="r">+${para(M.kapidaOdemeUcreti)}</span></span></label>
          <label class="opt"><input type="radio" name="yontem" value="havale">
            <span class="box">${ikon.ret}<span class="t"><b>Havale / EFT</b><small>Siparişten sonra IBAN'a ödeme</small></span></span></label>
        </div>

        <div class="pay-detail" id="pd-kart">
          <div class="fields">
            ${alan("kartad", "Kart üzerindeki isim", 'autocomplete="cc-name" required', "Kart sahibinin adını girin.", "full")}
            <div class="field full" data-f="kartno">
              <label for="kartno">Kart numarası</label>
              <div class="card-input"><input id="kartno" autocomplete="cc-number" inputmode="numeric" required placeholder="0000 0000 0000 0000" maxlength="23"><span class="brand" id="brand"></span></div>
              <div class="err">Kart numarası geçersiz görünüyor.</div>
            </div>
            ${alan("skt", "Son kullanma (AA/YY)", 'autocomplete="cc-exp" inputmode="numeric" required placeholder="AA/YY" maxlength="5"', "Geçerli bir tarih girin.")}
            ${alan("cvc", "Güvenlik kodu (CVC)", 'autocomplete="cc-csc" inputmode="numeric" required placeholder="•••" maxlength="4"', "3 ya da 4 haneli kodu girin.")}
          </div>
          <div class="field" style="margin-top:16px"><label>Taksit</label><div class="taksit opts">${taksitHTML}</div></div>
          <p style="margin:14px 0 0;font-size:.84rem;color:var(--ink-soft);display:flex;gap:8px;align-items:center">${ikon.lock.replace('aria-hidden="true"', 'aria-hidden="true" width="16" height="16"')} Ödemeniz bankanızın 3D Secure doğrulamasıyla alınır.</p>
        </div>
        <div class="pay-detail" id="pd-kapida" hidden>
          <p style="margin:0">Ürün kapınıza geldiğinde kargo görevlisine <b>nakit</b> ya da <b>kartla</b> ödeyebilirsiniz. Kapıda ödeme hizmet bedeli: <b>${para(M.kapidaOdemeUcreti)}</b>.</p>
        </div>
        <div class="pay-detail" id="pd-havale" hidden>
          <p style="margin:0 0 10px">Siparişinizi tamamladıktan sonra tutarı aşağıdaki hesaba gönderin; açıklamaya <b>sipariş numaranızı</b> yazın. Ödeme ulaşınca siparişiniz kargoya verilir.</p>
          <div class="iban"><span><small style="display:block;font-family:var(--sans);color:var(--ink-soft)">${esc(M.banka.ad)} · ${esc(M.banka.alici)}</small>${esc(M.banka.iban)}</span><button type="button" class="link-btn" id="iban-kopya">Kopyala</button></div>
        </div>
      </section>

      <div class="field" data-f="sozlesme" style="margin:6px 4px 20px">
        <label class="check"><input type="checkbox" id="sozlesme" required> <span><a href="#" onclick="return false">Ön bilgilendirme formunu</a> ve <a href="#" onclick="return false">mesafeli satış sözleşmesini</a> okudum, onaylıyorum.</span></label>
        <div class="err">Devam etmek için sözleşmeyi onaylayın.</div>
      </div>
      <button class="btn btn-coral btn-block btn-lg" type="submit" id="submit"></button>
      <p style="text-align:center;font-size:.84rem;color:var(--ink-soft);margin-top:12px">${M.iadeGunu} gün içinde koşulsuz iade · ${M.kargoSuresi} içinde kargoda</p>
    </div>

    <aside class="summary" aria-label="Sipariş özeti">
      <div class="panel">
        <button type="button" class="mobile-total" id="toggle-sum" aria-expanded="false" aria-controls="sum-details">
          <span>Sipariş özetini göster <span aria-hidden="true">▾</span></span><span class="price" id="m-total"></span>
        </button>
        <h2>Sipariş özeti</h2>
        <div class="summary-details" id="sum-details">
          <div id="sum-lines"></div>
          <div class="totals" id="totals"></div>
        </div>
      </div>
    </aside>
  </form>`;

  /* ---------- Hesaplama ---------- */
  const secili = (n) => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
  const hesap = () => {
    const ara = Sepet.araToplam();
    const kargo = Sepet.kargo();
    const yontem = secili("yontem");
    const kapida = yontem === "kapida" ? M.kapidaOdemeUcreti : 0;
    const taban = ara + kargo + kapida;
    const t = yontem === "kart" ? M.taksitler.find((x) => String(x.ay) === secili("taksit")) || M.taksitler[0] : { ay: 1, oran: 0 };
    const vade = Math.round(taban * t.oran * 100) / 100;
    return { ara, kargo, kapida, vade, toplam: taban + vade, taksit: t, yontem };
  };

  const ozetCiz = () => {
    const h = hesap();
    $("#sum-lines").innerHTML = Sepet.satirlar().map((s) => `
      <div class="line">
        <span class="thumb"><img src="${gorselYol(s.v.gorseller[0], true)}" alt=""><span class="q">${s.adet}</span></span>
        <div><h4 style="font-size:.95rem;font-family:var(--sans);font-weight:500;line-height:1.3">${esc(s.urun.ad)}</h4>${s.v.renk ? `<div class="muted"><span class="dot" style="background:${s.v.hex}"></span>${esc(s.v.renk)}</div>` : ""}</div>
        <div class="lp">${para(s.v.fiyat * s.adet)}</div>
      </div>`).join("");
    $("#totals").innerHTML = `
      <div class="row"><span>Ara toplam</span><span>${para(h.ara)}</span></div>
      <div class="row"><span>Kargo</span>${h.kargo ? `<span>${para(h.kargo)}</span>` : `<span class="free">Ücretsiz</span>`}</div>
      ${h.kapida ? `<div class="row"><span>Kapıda ödeme bedeli</span><span>${para(h.kapida)}</span></div>` : ""}
      ${h.vade ? `<div class="row"><span>Vade farkı (${h.taksit.ay} taksit)</span><span>${paraKurus(h.vade)}</span></div>` : ""}
      ${h.kargo ? `<div class="row" style="font-size:.85rem"><span>${para(M.ucretsizKargoLimiti - h.ara)} daha ekleyin, kargo ücretsiz olsun.</span></div>` : ""}
      <div class="row grand"><span>Toplam</span><span>${paraKurus(h.toplam)}</span></div>
      ${h.taksit.ay > 1 ? `<div class="row" style="justify-content:flex-end;font-size:.9rem">${h.taksit.ay} × ${paraKurus(h.toplam / h.taksit.ay)}</div>` : ""}`;
    $("#m-total").textContent = paraKurus(h.toplam);
    // Taksit kutuları
    const taban = h.ara + h.kargo;
    M.taksitler.forEach((t) => {
      const el = $(`[data-taksit="${t.ay}"]`);
      if (!el) return;
      const top = taban * (1 + t.oran);
      el.textContent = t.ay === 1 ? paraKurus(top) : `${t.ay} × ${paraKurus(top / t.ay)}${t.oran === 0 ? " · vade farksız" : ""}`;
    });
    const metin = { kart: `${paraKurus(h.toplam)} öde`, kapida: "Siparişi tamamla", havale: "Siparişi tamamla" }[h.yontem];
    $("#submit").innerHTML = `${ikon.lock} ${metin}`;
  };

  /* ---------- Biçimlendirme ---------- */
  const rakam = (s) => s.replace(/\D/g, "");
  const marka = (n) => /^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^(9792|65)/.test(n) ? "Troy" : /^3[47]/.test(n) ? "Amex" : "";
  const luhn = (n) => { let t = 0, c = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (c) { d *= 2; if (d > 9) d -= 9; } t += d; c = !c; } return t % 10 === 0; };

  $("#kartno").addEventListener("input", (e) => {
    const n = rakam(e.target.value).slice(0, 19);
    e.target.value = n.replace(/(.{4})/g, "$1 ").trim();
    $("#brand").textContent = marka(n);
  });
  $("#skt").addEventListener("input", (e) => {
    let n = rakam(e.target.value).slice(0, 4);
    if (n.length === 1 && n > "1") n = "0" + n;
    e.target.value = n.length > 2 ? n.slice(0, 2) + "/" + n.slice(2) : n;
  });
  $("#cvc").addEventListener("input", (e) => { e.target.value = rakam(e.target.value).slice(0, 4); });
  $("#tel").addEventListener("input", (e) => {
    let n = rakam(e.target.value);
    if (n.startsWith("90")) n = n.slice(2);
    if (n.length && n[0] !== "0") n = "0" + n;
    n = n.slice(0, 11);
    e.target.value = [n.slice(0, 4), n.slice(4, 7), n.slice(7, 9), n.slice(9, 11)].filter(Boolean).join(" ");
  });

  /* ---------- Doğrulama ---------- */
  const kurallar = {
    eposta: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    tel: (v) => /^05\d{9}$/.test(rakam(v)),
    ad: (v) => v.trim().length >= 2,
    soyad: (v) => v.trim().length >= 2,
    il: (v) => !!v,
    ilce: (v) => v.trim().length >= 2,
    adres: (v) => v.trim().length >= 10,
    fatura: (v) => $("#fatura-ayni").checked || v.trim().length >= 10,
    kartad: (v) => secili("yontem") !== "kart" || v.trim().length >= 3,
    kartno: (v) => secili("yontem") !== "kart" || (rakam(v).length >= 15 && luhn(rakam(v))),
    skt: (v) => {
      if (secili("yontem") !== "kart") return true;
      const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false;
      const ay = +m[1], yil = 2000 + +m[2], simdi = new Date();
      return ay >= 1 && ay <= 12 && (yil > simdi.getFullYear() || (yil === simdi.getFullYear() && ay >= simdi.getMonth() + 1));
    },
    cvc: (v) => secili("yontem") !== "kart" || /^\d{3,4}$/.test(v),
    sozlesme: () => $("#sozlesme").checked,
  };
  const dogrula = (id) => {
    const el = document.getElementById(id);
    const ok = kurallar[id](el.type === "checkbox" ? el.checked : el.value);
    const kap = document.querySelector(`[data-f="${id}"]`);
    if (kap) kap.classList.toggle("invalid", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  };
  Object.keys(kurallar).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => { if (el.value || el.type === "checkbox") dogrula(id); });
    el.addEventListener("input", () => { if (document.querySelector(`[data-f="${id}"].invalid`)) dogrula(id); });
    el.addEventListener("change", () => { if (el.type === "checkbox" || el.tagName === "SELECT") dogrula(id); });
  });

  /* ---------- Etkileşimler ---------- */
  document.querySelectorAll('input[name="yontem"]').forEach((r) => r.addEventListener("change", () => {
    ["kart", "kapida", "havale"].forEach((y) => { $(`#pd-${y}`).hidden = secili("yontem") !== y; });
    ozetCiz();
  }));
  document.querySelectorAll('input[name="taksit"]').forEach((r) => r.addEventListener("change", ozetCiz));
  $("#fatura-ayni").addEventListener("change", (e) => { $("#fatura-wrap").hidden = e.target.checked; });
  $("#toggle-sum").addEventListener("click", (e) => {
    const acik = $("#sum-details").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", acik);
    e.currentTarget.firstElementChild.firstChild.textContent = acik ? "Sipariş özetini gizle " : "Sipariş özetini göster ";
  });
  $("#iban-kopya").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(M.banka.iban.replace(/\s/g, "")).then(() => { e.target.textContent = "Kopyalandı ✓"; }).catch(() => {});
  });

  // Kişisel bilgileri (kart HARİÇ) bir sonraki alışveriş için hatırla
  const KAYITLI = ["eposta", "tel", "ad", "soyad", "il", "ilce", "adres"];
  try {
    const k = JSON.parse(localStorage.getItem(FORM_ANAHTAR)) || {};
    KAYITLI.forEach((id) => { if (k[id]) document.getElementById(id).value = k[id]; });
  } catch (e) {}

  /* ---------- Gönder ---------- */
  async function siparisGonder(siparis) {
    if (M.demoMod) { await new Promise((r) => setTimeout(r, 900)); return { ok: true }; }
    // Gerçek entegrasyon örneği:
    // const r = await fetch("/api/odeme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(siparis) });
    // return r.json(); // { ok, odemeSayfasi } → 3D Secure sayfasına yönlendirin
    throw new Error("Ödeme altyapısı yapılandırılmadı.");
  }

  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const hatalar = Object.keys(kurallar).filter((id) => !dogrula(id));
    if (hatalar.length) {
      const ilk = document.getElementById(hatalar[0]);
      ilk.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => ilk.focus({ preventScroll: true }), 300);
      return;
    }
    const btn = $("#submit");
    btn.disabled = true;
    btn.textContent = "İşleniyor…";
    const h = hesap();
    const no = "BZ" + Date.now().toString().slice(-8);
    const deger = (id) => document.getElementById(id).value.trim();
    const siparis = {
      no, tarih: new Date().toISOString(), yontem: h.yontem, taksit: h.taksit.ay,
      musteri: { eposta: deger("eposta"), tel: rakam(deger("tel")), ad: deger("ad"), soyad: deger("soyad") },
      adres: { il: deger("il"), ilce: deger("ilce"), adres: deger("adres"), fatura: $("#fatura-ayni").checked ? null : deger("fatura") },
      kalemler: Sepet.satirlar().map((s) => ({ barkod: s.v.barkod, ad: s.urun.ad, renk: s.v.renk, adet: s.adet, fiyat: s.v.fiyat })),
      tutar: { ara: h.ara, kargo: h.kargo, kapida: h.kapida, vade: h.vade, toplam: h.toplam },
      // Kart bilgileri burada YOK; ödeme sağlayıcısının güvenli formuna doğrudan iletilmelidir.
    };
    try {
      await siparisGonder(siparis);
      try {
        localStorage.setItem(FORM_ANAHTAR, JSON.stringify(Object.fromEntries(KAYITLI.map((id) => [id, deger(id)]))));
        const liste = JSON.parse(localStorage.getItem("boz_siparisler") || "[]"); liste.push(siparis);
        localStorage.setItem("boz_siparisler", JSON.stringify(liste.slice(-20)));
      } catch (err) {}
      Sepet.bosalt();
      basari(siparis);
    } catch (err) {
      btn.disabled = false;
      ozetCiz();
      alert("Ödeme alınamadı: " + err.message + " Lütfen tekrar deneyin ya da kapıda ödemeyi seçin.");
    }
  });

  function basari(s) {
    document.querySelectorAll(".progress li").forEach((li, i) => { li.className = i < 2 ? "done" : "active"; });
    const yontemMetni = { kart: `Kartınızdan ${paraKurus(s.tutar.toplam)}${s.taksit > 1 ? ` (${s.taksit} taksit)` : ""} tahsil edildi.`,
      kapida: `Teslimatta ${paraKurus(s.tutar.toplam)} ödeyeceksiniz.`,
      havale: `Lütfen ${paraKurus(s.tutar.toplam)} tutarını aşağıdaki IBAN'a gönderin, açıklamaya <b>${s.no}</b> yazın.` }[s.yontem];
    kok.innerHTML = `<div class="success">
      <div class="seal">${yildiz(18)}<span>✓</span></div>
      <h1>Teşekkürler, ${esc(s.musteri.ad)}!</h1>
      <p>Siparişiniz alındı. Ayrıntıları <b>${esc(s.musteri.eposta)}</b> adresine gönderiyoruz.</p>
      <div class="order-no">Sipariş no: ${s.no}</div>
      <p>${yontemMetni}</p>
      ${s.yontem === "havale" ? `<div class="iban" style="text-align:left;margin:0 auto 20px;max-width:440px"><span><small style="display:block;font-family:var(--sans);color:var(--ink-soft)">${esc(M.banka.ad)} · ${esc(M.banka.alici)}</small>${esc(M.banka.iban)}</span></div>` : ""}
      <p style="color:var(--ink-soft)">Teslimat: ${esc(s.adres.ilce)} / ${esc(s.adres.il)} · ${M.kargoSuresi} içinde kargoda.</p>
      ${M.demoMod ? `<p class="demo-note" style="display:inline-block">Önizleme modu: gerçek bir ödeme alınmadı.</p><br>` : ""}
      <a class="btn btn-mustard btn-lg" href="index.html" style="margin-top:16px">Alışverişe devam et</a>
    </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  ozetCiz();
});

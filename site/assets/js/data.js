/* =========================================================
   BOZ CONCEPT HOME — Mağaza ayarları
   Ürünler assets/js/urunler.js içindedir; o dosya Excel'den
   otomatik üretilir (bkz. site/README.md).
   ========================================================= */

window.MAGAZA = {
  ad: "Boz Concept Home",
  telefon: "",                           // TODO: gerçek numara (boşsa gösterilmez)
  eposta: "",                            // TODO: gerçek e-posta (boşsa gösterilmez)
  instagram: "",                         // TODO: Instagram adresi (boşsa gösterilmez)
  trendyolMagaza: "https://www.trendyol.com/magaza/boz-concept-home-m-631533",

  ucretsizKargoLimiti: 1500,   // TL — bu tutar ve üzeri ücretsiz kargo
  kargoUcreti: 89,             // TL
  kapidaOdemeUcreti: 39,       // TL — kapıda ödeme hizmet bedeli
  iadeGunu: 14,                // gün — cayma hakkı (yasal asgari 14 gün)
  kargoSuresi: "1–3 iş günü",

  // Kart ile ödemede taksit seçenekleri. oran: toplam fiyata eklenen vade farkı.
  taksitler: [
    { ay: 1, oran: 0 },
    { ay: 3, oran: 0 },
    { ay: 6, oran: 0.06 },
    { ay: 9, oran: 0.10 },
  ],

  // Havale/EFT bilgileri
  banka: { ad: "Banka Adı", alici: "Boz Concept Home", iban: "TR00 0000 0000 0000 0000 0000 00" }, // TODO

  // Ödeme altyapısı (iyzico / PayTR vb.) bağlanana kadar true kalmalı.
  // true iken kart bilgisi hiçbir yere gönderilmez, sipariş yalnız tarayıcıda kaydedilir.
  demoMod: true,

  // Ana sayfanın büyük vitrinindeki ürün (urunler.js içindeki id)
  vitrinUrun: "space-age-metal-yan-sehpa-dergilik-plaklik-pikap-sehpasi-42",

  // Videolar: urun alanı, videonun hangi ürün sayfasında da gösterileceğini belirler.
  videolar: [
    {
      src: "assets/video/tel_sehpa_10s.mp4",
      poster: "assets/video/tel_sehpa_10s.webp",
      baslik: "Hem sehpa, hem dergilik",
      sure: "10 sn",
      urun: "space-age-metal-yan-sehpa-dergilik-plaklik-pikap-sehpasi-42",
    },
    {
      src: "assets/video/sehpa_satis_hikayesi_58s.mp4",
      poster: "assets/video/sehpa_satis_hikayesi_58s.webp",
      baslik: "Bu salonun bir sorunu vardı…",
      sure: "58 sn",
      urun: "space-age-metal-yan-sehpa-dergilik-plaklik-pikap-sehpasi-42",
    },
  ],
};

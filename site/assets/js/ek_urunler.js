/* =========================================================
   Elle eklenen ürünler (Excel'de henüz olmayanlar).
   Bu dosyayı Excel dönüştürücüsü değiştirmez.
   Ürün Trendyol'a / Excel'e eklenince buradan silin.

   yakinda: true  -> fiyat yerine "Fiyat yakında" gösterilir,
                     sepete eklenemez. Fiyat belli olunca
                     yakinda: false yapın, fiyat ve stok girin.
   ========================================================= */
window.EK_URUNLER = [
  {
    id: "s-tel-yan-sehpa",
    model: "S-TEL",
    ad: "S Tel Yan Sehpa",                         // TODO: kesin ürün adı
    tamAd: "S Tel Yan Sehpa – Metal Tel Dergilikli Yan Sehpa",
    kategori: "Yan Sehpa",
    koleksiyon: "Sehpalar",
    olcu: "51 x 43 x 45",                          // 3D modelden (mm kabulüyle); üretim ölçüsüyle doğrulayın
    yeni: true,
    yakinda: true,
    model3d: "assets/3d/s-tel-yan-sehpa.glb",
    aciklama: [
      "Kare tel gövdenin içinde S biçiminde kıvrılan bir dergilik bölmesi.",
      "Üstü sehpa olarak kullanılır; içindeki kıvrımlara dergi, kitap ya da plak yerleştirebilirsiniz.",
      "Yaklaşık ölçüler: 51 × 43 × 45 cm (genişlik × derinlik × yükseklik).",
    ],
    sevkiyat: null,
    trendyol: null,
    varyantlar: [
      {
        barkod: "S-TEL-SIYAH",
        sku: "",
        renk: "Siyah",
        hex: "#1d1d1f",
        fiyat: 0,                                   // TODO: satış fiyatı
        piyasa: 0,
        stok: false,
        gorseller: ["s-tel-salon", "s-tel-studyo", "s-tel-salon-on", "s-tel-studyo-on", "s-tel-detay"],
      },
    ],
  },
];

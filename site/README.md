# Boz Concept Home — e-ticaret sitesi

1950'lerin ruhunu taşıyan (Bodoni & el yazısı başlıklar, hardal/mercan/petrol renkleri, atom yıldızları, kemerli çerçeveler), bokeh ışıklı ve buzlu cam panelli, kurulum gerektirmeyen statik bir mağaza.

| Sayfa | Ne yapar |
|---|---|
| `index.html` | Vitrin (renk değiştiren açılış), koleksiyon daireleri, arama + filtre + sıralama ile tüm ürünler, videolar, SSS |
| `urun.html?id=…` | Fotoğraf galerisi (mobilde kaydırmalı), renk seçimi, taksit bilgisi, "Hemen al", ürün videosu, benzer ürünler |
| `odeme.html` | Tek sayfa ödeme: iletişim → adres → ödeme (kart + taksit / kapıda / havale), anlık doğrulama, sipariş onayı |

## Bilgisayarda açmak

```bash
cd site
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

## Ürünleri güncellemek (Trendyol Excel'inden)

1. Trendyol satıcı panelinden ürün listesini Excel olarak indirin.
2. Çalıştırın:

```bash
pip install openpyxl pillow
python3 site/tools/excel_to_site.py ~/Downloads/urunleriniz.xlsx
```

Betik:
- Aynı **Model Kodu**'ndaki satırları tek ürünün renk seçenekleri yapar.
- Arşivlenmiş, çoklanan ve fiyatı girilmemiş ürünleri atlar; stoğu olmayanları **Tükendi** olarak gösterir.
- Görselleri indirir, WebP'ye çevirir (`assets/urun/`), kullanılmayanları siler.
- `assets/js/urunler.js` dosyasını yeniden yazar. Bu dosyayı elle düzenlemeyin.

Trendyol kategorilerinin sitedeki koleksiyonlara (Sehpalar, Raf & Kitaplık, Banyo…) nasıl dağıldığı betiğin başındaki `KOLEKSIYON` tablosundadır. Yeni bir renk adı gelirse `RENK` tablosuna rengini ekleyin.

> Excel dosyası (komisyon oranı, partner ID içerir) depoya eklenmez; `.gitignore`'dadır.

## Ayarlar — `assets/js/data.js`

Kargo limiti ve ücreti, kapıda ödeme bedeli, taksit oranları, IBAN, iletişim bilgileri, vitrin ürünü ve videolar buradadır. `TODO` yazan alanları doldurun (telefon, e-posta, Instagram, IBAN).

## Canlıya almadan önce yapılacaklar

1. **Ödeme altyapısı.** `demoMod: true` iken kart bilgisi hiçbir yere gönderilmez ve sayfada "Önizleme modu" uyarısı görünür. Gerçek ödeme için iyzico, PayTR veya bankanızın sanal POS'u ile küçük bir sunucu uç noktası (`/api/odeme`) gerekir. Bağlanacak yer `assets/js/checkout.js` içindeki `siparisGonder()` fonksiyonudur. Kart bilgileri sağlayıcının güvenli formuna/3D Secure sayfasına gitmeli, kendi sunucunuzda saklanmamalıdır. Bağlandıktan sonra `demoMod: false` yapın.
2. **Sipariş bildirimi.** Şu an sipariş yalnız müşterinin tarayıcısına kaydedilir. Ödeme uç noktası siparişi size e-posta/panel olarak iletmeli; SSS'deki "e-posta ile gönderiyoruz" ifadesi bu adımdan sonra doğru olur.
3. **Yasal metinler.** Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, KVKK Aydınlatma Metni ve Çerez Politikası sayfalarını ekleyip alt bilgideki ve ödeme sayfasındaki bağlantılara bağlayın.
4. **Kargo/taksit oranları.** `data.js`'deki kargo ücreti, ücretsiz kargo limiti ve taksit vade farkları örnek değerlerdir; kendi anlaşmalarınıza göre düzeltin.

## Yayınlama

`site/` klasörü olduğu gibi Netlify, Vercel, Cloudflare Pages veya GitHub Pages'e yüklenebilir (derleme adımı yok).

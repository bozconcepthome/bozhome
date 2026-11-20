# Boz Concept Home — e-ticaret sitesi

Sade ve ferah, ürün odaklı (beyaz/açık gri yüzeyler, büyük başlıklar, buzlu cam menü, Boz terakota vurgu rengi), kurulum gerektirmeyen statik bir mağaza.

| Sayfa | Ne yapar |
|---|---|
| `index.html` | Vitrin (renk değiştiren açılış), koleksiyon kutuları, arama + filtre + sıralama ile tüm ürünler, hikâye, SSS |
| `urun.html?id=…` | Fotoğraf galerisi (kaydırmalı, tam ekran görüntüleyici), renk seçimi, taksit bilgisi, "Hemen al", 3D model (varsa), benzer ürünler |
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
- Görselleri Trendyol'daki orijinal çözünürlükte (1200×1800) indirir, WebP'ye çevirir (`assets/urun/`), kullanılmayanları siler.
- `assets/js/urunler.js` dosyasını yeniden yazar. Bu dosyayı elle düzenlemeyin.

Trendyol kategorilerinin sitedeki koleksiyonlara (Sehpalar, Raf & Kitaplık, Banyo…) nasıl dağıldığı betiğin başındaki `KOLEKSIYON` tablosundadır. Yeni bir renk adı gelirse `RENK` tablosuna rengini ekleyin.

> Excel dosyası (komisyon oranı, partner ID içerir) depoya eklenmez; `.gitignore`'dadır.

## Excel'de olmayan yeni ürün eklemek

Henüz Trendyol'a girilmemiş ürünler `assets/js/ek_urunler.js` dosyasındadır; Excel dönüştürücüsü bu dosyaya dokunmaz.

- `yakinda: true` olan ürün "Yeni · Yakında" rozetiyle listelenir, fiyat yerine "Fiyat yakında" yazar ve sepete eklenemez.
- Fiyat belli olunca `yakinda: false` yapın, varyantın `fiyat` ve `stok: true` alanlarını doldurun.
- Ürün Excel'e eklendiğinde buradan silin (aksi hâlde iki kez görünür).

### S Tel Yan Sehpa (3D modelden sahnelendi)

`MODEL.obj` dosyasından Blender (Cycles) ile 5 görsel üretildi: iki salon çekimi, bir yakın çekim, iki stüdyo çekimi (1200×1800). Ürün sayfasındaki **3D olarak incele** düğmesi `assets/3d/s-tel-yan-sehpa.glb` modelini döndürülebilir olarak açar (model-viewer, ilk tıklamada yüklenir).

- Model dosyasında malzeme (MTL) olmadığı için renk **mat siyah toz boya** olarak seçildi. Başka renkler istenirse aynı sahne betiğiyle render alınabilir.
- Ölçüler (51 × 43 × 45 cm) modelin milimetre olduğu varsayılarak hesaplandı; üretim ölçüsüyle karşılaştırın.
- Ürün adı ("S Tel Yan Sehpa") geçicidir.
- Sahne betikleri: `tools/sahne/` (`sahne.py`, `glb.py`). Örnek: `blender -b -P tools/sahne/sahne.py -- <klasör> salon 1200 1800 400` (klasörde `model.obj` bulunmalı).

## Ayarlar — `assets/js/data.js`

Kargo limiti ve ücreti, kapıda ödeme bedeli, taksit oranları, IBAN, iletişim bilgileri, ve vitrin ürünü buradadır. `TODO` yazan alanları doldurun (telefon, e-posta, Instagram, IBAN).

## Canlıya almadan önce yapılacaklar

1. **Ödeme altyapısı.** `demoMod: true` iken kart bilgisi hiçbir yere gönderilmez ve sayfada "Önizleme modu" uyarısı görünür. Gerçek ödeme için iyzico, PayTR veya bankanızın sanal POS'u ile küçük bir sunucu uç noktası (`/api/odeme`) gerekir. Bağlanacak yer `assets/js/checkout.js` içindeki `siparisGonder()` fonksiyonudur. Kart bilgileri sağlayıcının güvenli formuna/3D Secure sayfasına gitmeli, kendi sunucunuzda saklanmamalıdır. Bağlandıktan sonra `demoMod: false` yapın.
2. **Sipariş bildirimi.** Şu an sipariş yalnız müşterinin tarayıcısına kaydedilir. Ödeme uç noktası siparişi size e-posta/panel olarak iletmeli; SSS'deki "e-posta ile gönderiyoruz" ifadesi bu adımdan sonra doğru olur.
3. **Yasal metinler.** Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, KVKK Aydınlatma Metni ve Çerez Politikası sayfalarını ekleyip alt bilgideki ve ödeme sayfasındaki bağlantılara bağlayın.
4. **Kargo/taksit oranları.** `data.js`'deki kargo ücreti, ücretsiz kargo limiti ve taksit vade farkları örnek değerlerdir; kendi anlaşmalarınıza göre düzeltin.

## Yayınlama

`site/` klasörü olduğu gibi Netlify, Vercel, Cloudflare Pages veya GitHub Pages'e yüklenebilir (derleme adımı yok).

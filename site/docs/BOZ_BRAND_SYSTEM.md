# BOZ CONCEPT HOME — Marka Tasarım Sistemi (Öneri / V1)

> Bu dosya, Boz Concept Home için kullanıcı tarafından verilen karanlık-lüks marka panosunu **site tasarımına uygulamak** amacıyla hazırlanmıştır. Referanstaki mobilya görseli konsepttir; gerçekte satılan ürün fotoğrafı olarak kullanılmamalıdır.

## Marka karakteri
- Modern, zamansız, minimal, heykelsi ve seçkin.
- Görsel yön: **premium dark editorial / cinematic product design**.
- Duygu: sakin özgüven, ustalıklı detay, mekan içinde heykele benzeyen metal/tel mobilyalar.
- Kaçınılacaklar: ucuz görünen neon, yoğun blur/glassmorphism, rastgele gradient, çok küçük metin, otomatik oynayan uzun efektler, her yerde hareket, stok fotoğrafı ile gerçek ürünmüş gibi sunum.
- Ton: net, sakin, güven veren, abartısız; doğrulanmamış ürün özelliklerini yazma.

## Tasarım token'ları — değiştirilmeden kullanılacak başlangıç paleti
| Token | Hex | Kullanım |
| --- | --- | --- |
| background | `#0A0B1A` | Ana koyu yüzey / hero |
| indigo | `#1424A8` | Vurgu ışığı, detay ve çizgiler; metin kontrastını kontrol et |
| charcoal | `#2B2B32` | Kart yüzeyi ve ayırıcılar |
| terracotta | `#C45A3C` | Birincil CTA ve küçük vurgu alanları |
| ivory | `#F6F5F2` | Başlık ve birincil metin |

- Font önerisi: başlıklarda **Manrope 700/800**, gövde ve düğmelerde **Manrope 400/500/600**. Font kullanılmadan önce yükleme/performans kontrolü yap.
- Uzun metinler için okunabilir kontrast ve 16px civarı gövde başlangıç noktası kullan.
- Renk oranı önerisi: yaklaşık %70 koyu, %20 koyu nötr/beyaz metin, %7 indigo, %3 terracotta. Bu teknik zorunluluk değil, başlangıç art direction önerisidir.
- Bir sayfada ana CTA terracotta olsun; diğer vurguların hepsi CTA ile yarışmasın.

## Layout ve komponent ilkeleri
- Desktop: editoryal 12-kolon hissi, geniş iç boşluklar, maksimum içerik genişliği ~1280px.
- Mobile-first: 390px, 768px, 1024px, 1440px ekran genişliklerinde kontrol.
- Header: BOZ / Concept Home yazı markası, sade gezinme, ürün kategorileri, arama ve gerçek işlevli sepet.
- Hero: gece laciverti stüdyo atmosferinde tek gerçek ürün; ürün fotoğrafı/video **ana odak** olmalı. Metin kısa: kategori, büyük iddia içermeyen headline, tek birincil CTA.
- Ürün grid'i: birbirini tekrar etmeyen temiz ürün kartları; ürün adı, gerçek fiyat ve varyant, gerçek stok bilgisi varsa göster; kart dekorasyonunu azalt.
- Ürün detay: yüksek kalite gerçek fotoğraf, doğru geometri; ölçüler doğrulanmışsa; net fiyat, teslimat bilgisi doğrulanmışsa; açıklama, güven ve iade bağlantıları.
- İçerik: ürünün yapısını gösteren detay çekimleri, gerçek yaşam sahneleri ve editorial kategori blokları.
- Footer: açık iletişim, yasal bilgi, politikalar ve kolay erişilen bağlantılar.

## Işık / video / hareket
- Koyu lacivert veya siyaha yakın arka plan; ürün tel çizgilerini belli eden **kontrollü elektrik indigo rim light**; yumuşak amber/terracotta tamamlayıcı ışık.
- 50mm civarı doğal perspektif, gerçekçi temas gölgesi, abartısız yansıma; geniş açı deformasyonu yok.
- Kullanıcının elindeki ürün görsellerinde parça sayısını, oranları, tel çapını, ayakları, rafları, bağlantıları, rengini ve metal yüzeyi değiştirme.
- Arka plan videosu varsa: sessiz, kısa ve optimize; poster görseli, mobil alternatif, `prefers-reduced-motion` ve düşük bağlantı koşulları için fallback.
- Hareket: 150–300ms civarı sakin geçiş; animasyonla bilgi veya CTA erişimini engelleme.

## İçerik prensipleri
- Varsayılan dil Türkçe, para birimi TRY, yerelleştirme `tr-TR`.
- Slogan *önerisi*: “Mekâna karakter katan tasarımlar.”
- Örnek ürün anlatımı (yalnızca gerçekten doğru olduğu ürünlerde): “Bir sehpa. İki iş.”, “Üstü sehpa, yanı dergilik.”
- Ölçü, malzeme, taşıma kapasitesi, sertifika, garanti, indirim ve kargo avantajı doğrulanmamışsa uydurma.
- Ürün görseli veya 3D render yerine temsili çalışma konursa açıkça “konsept/temsili” olarak işaretle.

## Claude Code uygulama talimatı
1. Önce mevcut depo ve teknoloji yığınını incele (Shopify, Next.js, React, HTML/CSS vb.); **mevcut çalışan yapıyı değiştirme**.
2. `git status` kontrolü yap ve güvenli geri dönüş için yeni dal (branch) aç veya commit öner; kullanıcı verisini silme.
3. `assets/boz-brand-reference.png` görüntüsünü marka atmosferi için referans al. Görselden var olmayan ürün özellikleri türetme.
4. İlk adımda `styles/boz-design-tokens.css` token'larını mevcut stil sistemine uyarlayıp **yalnızca ana sayfa üst bölümünün taslak ön izlemesini** yap.
5. UI taslağını üretirken frontend-design + ui-ux-pro-max kullan. Düzen, tipografi ve görsel tutarlılığı için gerekirse taste-skill kullan. Çakışırsa bu belgedeki marka kuralları üstündür.
6. Görsel bittikten sonra impeccable ve web-design-guidelines ile denetim yap; React/Next.js varsa Vercel react best practices çalıştır.
7. `390`, `768`, `1024`, `1440` genişliklerinde ekran görüntüleri al, birbirleriyle kıyasla; taşma, kontrast, CLS, buton erişimi ve mobil sepeti denetle.
8. Eksik fotoğraf/fiyat/ölçüleri **yer tutucu** olarak bırak, uydurma. Gerçek ürün verisini mevcut yetkili veri kaynağından çekmeden canlı olarak gösterme.
9. Gerçek ödeme, sipariş, stok ve fiyat mantığına izinsiz müdahale etme. Çalışan e-ticaret akışını koru; değişiklikleri önce ön izlemede göster.

## Kabul kriterleri
- İlk mobil açılışta marka ve ürün kolay tanınır.
- Birincil CTA net ve erişilebilirdir; tüm butonlar gerçek işlevlidir veya taslak olduğu belirtilir.
- Lacivert / indigo / terracotta / kırık beyaz tutarlıdır.
- Ürün görselleri orijinal geometriyi korur.
- Yükleme ve responsive görüntü akıcıdır; erişilebilirlik ve kontrast kontrol edilmiş olur.
- Sipariş, ödeme, fiyat, stok ve kargo akışında regresyon yoktur.

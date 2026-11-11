# Pompeii — Fotogerçekçi Sahne Üretim Komutları

Bu dosya, videonun 7 sahnesini **fotogerçekçi bir video modeliyle** (ör. Google Veo, OpenAI Sora, Runway Gen-4, Kling, Luma) üretmek için hazırlandı.
Mevcut video (`videos/pompeii_41s.mp4`) kodla çizilmiş **temsilî bir animasyondur**; fotogerçekçi değildir.

## Klipleri videoya yerleştirme

1. Her sahneyi aşağıdaki komutla üretin. Ayarlar: **9:16, 1080×1920, 24–30 fps**, süre tablodaki kadar veya biraz uzun.
2. Klipleri `animasyon/public/pompeii/klipler/` klasörüne koyun (ör. `s3.mp4`).
3. `animasyon/public/pompeii/klipler.json` içinde ilgili satıra dosya adını yazın (ör. `"s3_patlama": "s3.mp4"`).
4. `npm run render:pompeii` ile yeniden render alın. Ses, altyazı ve zamanlama aynı kalır; yalnız o sahnenin görüntüsü değişir.

Klipler sessiz kullanılır, ses `mix.wav` dosyasından gelir.

## Ortak stil (her komutun sonuna ekleyin)

> Photorealistic historical documentary, shot on ARRI Alexa, 35mm anamorphic lens, natural film grain, volumetric light, atmospheric haze, physically accurate lighting and shadows, realistic motion blur, natural human proportions and faces, period-accurate Roman clothing (wool and linen tunics, pallas, sandals; togas rare in daily life), 9:16 vertical framing.

**Negatif komut:** cartoon, CGI look, plastic skin, video game, anime, distorted faces, extra limbs, modern objects, modern clothing, text, watermark, logo, oversaturated colors, lens flare overload, impossible camera moves.

## Tarihsel doğruluk notları (üretimde dikkat)

- **Vezüv:** MS 79'da dağın profili bugünkünden farklıydı; bugünkü büyük koni (Gran Cono) sonraki patlamalarla oluştu. Yamaçları yeşil, üzüm bağlarıyla kaplı tek ve geniş bir dağ olarak gösterin.
- **Şehir:** Kiremit çatılar, sıvalı ve boyalı duvarlar (Pompeii kırmızısı, okr), sokaklarda yaya geçidi taşları ve araba tekerleği izleri, sokak tezgâhları (thermopolium), çeşmeler.
- **Patlama:** Önce Plinius'un anlattığı "çam ağacı" biçimli yüksek kül sütunu. Ardından saatlerce açık renkli, sonra gri pomza ve kül yağışı. Çatılar pomza ağırlığıyla çöker. En sonda dağdan inen sıcak gaz ve kül akıntıları (piroklastik akıntılar) gelir.
- **Tarih:** Geleneksel tarih 24 Ağustos. 2018'de bulunan bir kömür yazıtı Ekim ayına işaret ediyor ve tartışma sürüyor. Videoda kesin gün verilmez.
- **Kurbanlar:** Ölümleri grafik biçimde göstermeyin; geniş planlar ve atmosferle anlatın.

## Sahneler

| # | Süre | Seslendirme | Klip adı |
|---|---|---|---|
| s0 | 0,0–2,5 sn | "Milattan sonra 79 yılı…" | `s0_ucus` |
| s1 | 2,5–6,2 sn | "…Pompeii'de hayat, her zamanki gibi devam ediyordu." | `s1_sokak` |
| s2 | 6,2–11,1 sn | "Fakat Vezüv Dağı'nın içinde, büyük bir felaket hazırlanıyordu." | `s2_vezuv` |
| s3 | 11,1–14,9 sn | "Bir anda gökyüzüne, dev bir kül bulutu yükseldi." | `s3_patlama` |
| s4 | 14,9–22,5 sn | "Saatler boyunca kül ve taşlar… Sokaklar karardı. Binalar çökmeye başladı." | `s4_kul_yagmuru` |
| s5 | 22,5–29,5 sn | "Bazı insanlar kaçabildi. Bazılarıysa, ölümcül sıcak gaz ve kül akıntılarına yakalandı." | `s5_akinti` |
| s6 | 29,5–41,0 sn | "Yüzyıllar sonra, arkeologlar… Pompeii yok olmuştu. Ama hikâyesi… yaşamaya devam etti." | `s6_kalintilar` |

### s0 — Şehrin üzerinde uçuş (kanca)
> Slow cinematic drone flight at dawn over the Roman city of Pompeii in 79 AD, low altitude above terracotta tiled rooftops, inner courtyards (atria) and colonnaded streets, smoke from bakery ovens, golden hour light with long shadows, the broad green vine-covered slopes of Mount Vesuvius on the horizon under a calm sky, gentle forward dolly, atmospheric haze, birds in the distance.

### s1 — Sokaklar ve pazar
> Eye-level tracking shot walking down a busy Roman street in Pompeii, 79 AD: stone-paved road with deep cart ruts and raised stepping stones, plastered shop fronts painted red and ochre, a thermopolium counter with embedded terracotta jars, amphorae stacked by a doorway, men and women in linen and wool tunics walking and talking, a mule pulling a cart, children near a public fountain, warm morning sun with volumetric light through dust, natural candid human motion.

### s2 — Vezüv'de huzursuzluk
> Wide static shot from the edge of Pompeii toward Mount Vesuvius in 79 AD, a single broad green mountain with vineyards on its slopes, a thin plume of steam rising from the summit, a subtle earth tremor shakes the frame, a flock of birds suddenly takes off, people on a rooftop terrace turn to look toward the mountain, ominous calm, late-morning light, heat haze.

### s3 — Patlama sütunu
> Cinematic push-in toward Mount Vesuvius as a colossal Plinian eruption column bursts from the summit and rises tens of kilometers, spreading at the top like an umbrella pine tree, billowing grey-white ash and pumice, dark base with flashes of glowing debris, a shockwave of dust, the city of Pompeii in the foreground, physically accurate volumetric smoke simulation, awe-inspiring scale.

### s4 — Kül ve pomza yağmuru
> Street level in Pompeii under a darkened, ash-filled sky, light grey pumice stones and ash raining down, accumulating on the street and on roofs, people covering their heads with cushions and cloth while hurrying into doorways, a tiled roof slowly collapsing under the weight of pumice with a burst of dust, dim orange daylight filtered through ash, oil lamps glowing inside houses, realistic particle simulation, handheld camera with slight shake.

### s5 — Kaçış ve piroklastik akıntı
> Extreme wide aerial shot at dawn after a night of ashfall: groups of people fleeing through a city gate along a road out of Pompeii, then a massive glowing grey pyroclastic surge of hot gas and ash rolls down the slopes of Vesuvius and spreads toward the buried city, enormous scale, rolling turbulent clouds, dim apocalyptic light, no graphic depiction of victims, cinematic and respectful.

### s6 — Bugünkü kalıntılar
> Present-day Pompeii archaeological park on a bright clear day, the ruined Temple of Jupiter and the Forum columns with modern Mount Vesuvius rising behind, slow gentle crane shot, an archaeologist kneeling and brushing volcanic deposits from a mosaic floor, warm sunlight, birdsong mood, contemplative ending, realistic textures of weathered stone.

## Kaynaklar

- [Scientific American – How Pompeii Perished](https://www.scientificamerican.com/blog/rosetta-stones/how-pompeii-perished/)
- [Michigan Tech – Vesuvio: The eruption of A.D. 79](https://www.geo.mtu.edu/volcanoes/boris/mirror/mirrored_html/VESUVIO_79.html)
- [History UK – The eruption of Mount Vesuvius in 79 AD](https://www.history.co.uk/article/the-eruption-of-mount-vesuvius-in-79-ad-and-the-destruction-of-pompeii)
- [Archaeology Magazine – Skeletal Remains Uncovered in Pompeii (2018)](https://archaeology.org/news/2018/10/24/181024-pompeii-human-remains/)
- [Yahoo/AP – New Pompeii discovery shifts date of eruption](https://news.yahoo.com/pompeii-discovery-shifts-date-mount-vesuvius-eruption-174846126.html)
- [Pompeii Sites – Regio V excavations](https://pompeiisites.org/wp-content/uploads/REGIO-V-EXCAVATIONS-ENG.pdf)

# Animasyon sistemi (Remotion + SVG + kelime zamanlı ses)

Görüntünün tamamı kodla çizilir (React + SVG, Remotion ile oynatılır). Yapay zekâ yalnız seste kullanılır.
Sahneler `kelimeler.json` içindeki kelime zamanlarına bağlıdır; ses ile görüntü sırası karışmaz.

## Kurulum
```bash
cd animasyon
npm install            # remotion, react, yazı tipi
pip install edge-tts   # ücretsiz Microsoft nöral Türkçe ses
```
Gerekenler: Node.js, Python 3, ffmpeg, bir Chrome/Chromium (package.json'daki `--browser-executable` yolunu kendi makinene göre değiştir ya da sil).

## Kullanım
```bash
npm run ses      # public/sandalye/metin.txt -> ses.mp3 + kelimeler.json (her satır bir sahne)
npm run render   # cikti/sandalye_30s.mp4
```
- Metin: `public/sandalye/metin.txt`
- Sahneler: `src/sandalye/Video.tsx` (`an(satır, kelime)` ile kelimeye bağlı)
- Ses motoru: `ses.py` (edge-tts). ElevenLabs gibi başka bir sese geçmek için yalnız bu dosya değişir.

Not: Remotion şirketler için ayrı lisans koşulları içerir (remotion.dev/license); ticari kullanımdan önce kontrol edin.

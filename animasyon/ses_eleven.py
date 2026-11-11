#!/usr/bin/env python3
"""ElevenLabs ile metinden ses ve kelime zamanları üretir (with-timestamps uç noktası).
Kullanım: ELEVENLABS_API_KEY=... python3 ses_eleven.py public/semmelweis <ses_id> [model]
Bulut ortamında anahtar ağ vekili tarafından eklenir; o durumda ELEVENLABS_API_KEY=proxy-injected verin.
Girdi metin.txt: her satır bir sahne. [yönlendirme] okunmaz (eleven_v4 ton etiketi),
gösterim|okunuş: ekranda ilki, seste ikincisi ("1847|bin_sekiz_yüz_kırk_yedi").
Uzun metin ~700 karakterlik parçalara bölünür; parçalar previous_text/next_text ile birbirine bağlanır."""
import base64, json, os, re, ssl, subprocess, sys, tempfile, urllib.request

klasor, ses = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "eleven_v4"
HEDEF = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0  # >0 ise sahne aralarına sessizlik eklenip bu süreye tamamlanır
SON_PAY = 1.2
anahtar = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
baglam = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE")) if os.environ.get("SSL_CERT_FILE") else ssl.create_default_context()

satirlar = [x.strip() for x in open(f"{klasor}/metin.txt", encoding="utf-8") if x.strip()]

def satir_coz(c, satir, metin, kelimeler):
    for parca in re.findall(r"\[[^\]]*\]|\S+", satir):
        if metin:
            metin += " "
        if parca.startswith("["):
            metin += parca
            continue
        gor, oku = parca.split("|", 1) if "|" in parca else (parca, parca)
        oku = oku.replace("_", " ")
        kelimeler.append({"w": gor, "a": len(metin), "b": len(metin) + len(oku), "c": c})
        metin += oku
    return metin

# parçalara böl
parcalar, simdiki = [], []
for c, s in enumerate(satirlar):
    if simdiki and sum(len(x[1]) for x in simdiki) + len(s) > 700:
        parcalar.append(simdiki); simdiki = []
    simdiki.append((c, s))
parcalar.append(simdiki)

def okunus(sat):
    return " ".join(re.sub(r"\[[^\]]*\]\s*", "", s) for _, s in sat).replace("_", " ")

cikti, sesler, kaydir = [], [], 0.0
with tempfile.TemporaryDirectory() as tmp:
    for pi, sat in enumerate(parcalar):
        metin, kel = "", []
        for c, s in sat:
            metin = satir_coz(c, s, metin, kel)
        govde = {"text": metin, "model_id": model, "language_code": "tr",
                 "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True, "speed": 1.04}}
        if pi > 0:
            govde["previous_text"] = re.sub(r"\|\S+", "", okunus(parcalar[pi - 1]))[-400:]
        if pi < len(parcalar) - 1:
            govde["next_text"] = re.sub(r"\|\S+", "", okunus(parcalar[pi + 1]))[:400]
        istek = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ses}/with-timestamps?output_format=mp3_44100_128",
            data=json.dumps(govde).encode(), headers={"xi-api-key": anahtar, "Content-Type": "application/json"})
        with urllib.request.urlopen(istek, timeout=300, context=baglam) as y:
            sonuc = json.load(y)
        yol = f"{tmp}/p{pi}.mp3"
        open(yol, "wb").write(base64.b64decode(sonuc["audio_base64"]))
        h = sonuc["alignment"]
        for k in kel:
            cikti.append({"w": k["w"], "s": round(h["character_start_times_seconds"][k["a"]] + kaydir, 3),
                          "e": round(h["character_end_times_seconds"][k["b"] - 1] + kaydir, 3), "c": k["c"]})
        sure = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", yol]))
        sesler.append(yol); kaydir += sure
        print(f"parça {pi}: {len(metin)} karakter, {sure:.1f} sn")
    liste = f"{tmp}/liste.txt"
    open(liste, "w").write("".join(f"file '{p}'\n" for p in sesler))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-c:a", "libmp3lame", "-b:a", "192k", f"{klasor}/ses.mp3"], check=True)
if HEDEF > 0:
    # satır sınırlarından kesip araya eşit sessizlik koy (hızlandırma yok)
    import numpy as np
    SR = 44100
    ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{klasor}/ses.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    x = np.frombuffer(ham, np.float32)
    son = max(k["e"] for k in cikti) + 0.25
    nsat = max(k["c"] for k in cikti) + 1
    sinirlar = []
    for c in range(nsat - 1):
        a = max(k["e"] for k in cikti if k["c"] == c); b = min(k["s"] for k in cikti if k["c"] == c + 1)
        sinirlar.append((a + b) / 2)
    ara = max(0.0, (HEDEF - SON_PAY - son) / max(1, len(sinirlar)))
    if ara == 0:
        print(f"UYARI: konuşma {son:.1f} sn, hedefe sığmıyor; metni kısaltın")
    parca, onceki = [], 0
    for i, sn in enumerate(sinirlar):
        parca += [x[int(onceki * SR):int(sn * SR)], np.zeros(int(ara * SR), np.float32)]
        onceki = sn
    parca.append(x[int(onceki * SR):int(son * SR)])
    y = np.concatenate(parca)
    y = np.pad(y, (0, max(0, int(HEDEF * SR) - len(y))))[: int(HEDEF * SR)]
    for k in cikti:
        kayma = sum(ara for sn in sinirlar if k["s"] > sn)
        k["s"] = round(k["s"] + kayma, 3); k["e"] = round(k["e"] + kayma, 3)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "192k", f"{klasor}/ses.mp3"],
                   input=y.tobytes(), check=True)
    kaydir = HEDEF
    print(f"sahne aralarına {ara:.2f} sn sessizlik eklendi")
json.dump(cikti, open(f"{klasor}/kelimeler.json", "w", encoding="utf-8"), ensure_ascii=False)
print("süre", round(kaydir, 1), "sn,", len(cikti), "kelime")
for c in range(len(satirlar)):
    ks = [k for k in cikti if k["c"] == c]
    print(f"  {c:2d}: {ks[0]['s']:6.2f}-{ks[-1]['e']:6.2f}  {' '.join(k['w'] for k in ks)}")

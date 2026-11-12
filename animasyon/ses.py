#!/usr/bin/env python3
"""Metinden ses ve kelime zamanları üretir (ücretsiz Microsoft nöral ses, edge-tts ile).

Kullanım: python3 ses.py public/sandalye [ses_adı] [hedef_süre_sn]
Girdi   : <klasör>/metin.txt  -> her satır bir cümle grubu (sahne).
          Satır başında [rate=-6%,pitch=-2Hz] gibi bir etiket o satırın tonunu ayarlar (okunmaz).
          gösterim|okunuş: ekranda ilki görünür, ikincisi okunur ("21|yirmi_bir").
Çıktı   : <klasör>/ses.mp3 ve <klasör>/kelimeler.json  [{w, s, e, c}]  (c = satır numarası)

Her satır AYRI seslendirilir ve dosyadaki sırayla birleştirilir; böylece ses sırası ile
sahne sırası asla karışmaz. Sahneler kelimeler.json'daki zamanlara bağlanır.
"""
import asyncio, json, os, re, subprocess, sys, tempfile
import edge_tts

klasor = sys.argv[1]
SES = sys.argv[2] if len(sys.argv) > 2 else "tr-TR-AhmetNeural"
HEDEF = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
BAS, SON, EN_AZ_ARA, EN_COK_ARA = 0.2, 0.55, 0.1, float(os.environ.get("ARA_MAX", "0.6"))
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

async def uret(metin, yol, rate="+0%", pitch="+0Hz"):
    c = edge_tts.Communicate(metin, SES, rate=rate, pitch=pitch, boundary="WordBoundary", proxy=PROXY)
    kel = []
    with open(yol, "wb") as f:
        async for p in c.stream():
            if p["type"] == "audio":
                f.write(p["data"])
            elif p["type"] == "WordBoundary":
                kel.append({"w": p["text"], "s": p["offset"] / 1e7, "e": (p["offset"] + p["duration"]) / 1e7})
    return kel

def sure(yol):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", yol]))

def coz(satir):
    """'[rate=..] metin' -> (ayarlar, [(gösterim, okunuş), ...])"""
    ayar = {"rate": "+0%", "pitch": "+0Hz"}
    m = re.match(r"\s*\[([^\]]*)\]\s*", satir)
    if m:
        for kv in m.group(1).split(","):
            if "=" not in kv:
                continue  # ElevenLabs ton etiketi; edge-tts için yok sayılır
            k, v = kv.split("=")
            ayar[k.strip()] = v.strip()
        satir = satir[m.end():]
    parca = []
    for tok in satir.split():
        gor, oku = tok.split("|", 1) if "|" in tok else (tok, tok)
        parca.append((gor, oku.replace("_", " ")))
    return ayar, parca

def eslestir(satir, kel):
    """TTS'in döndürdüğü kelimeleri metindeki (noktalamalı) kelimelerle sırayla eşleştirir."""
    hedef = satir.split()
    sade = lambda x: "".join(ch for ch in x.lower() if ch.isalnum())
    out, j = [], 0
    for h in hedef:
        if not sade(h):
            continue
        bas = j
        birikim = ""
        while j < len(kel) and len(birikim) < len(sade(h)):
            birikim += sade(kel[j]["w"]); j += 1
        if bas == j:  # TTS kelime vermediyse öncekinin sonuna yasla
            s = e = out[-1]["e"] if out else 0.0
        else:
            s, e = kel[bas]["s"], kel[j - 1]["e"]
        out.append({"w": h, "s": s, "e": e})
    return out

async def main():
    satirlar = [x.strip() for x in open(f"{klasor}/metin.txt", encoding="utf-8") if x.strip()]
    with tempfile.TemporaryDirectory() as tmp:
        parcalar = []
        for i, s in enumerate(satirlar):
            yol = f"{tmp}/{i}.mp3"
            ayar, parca = coz(s)
            okunus = " ".join(o for _, o in parca)
            ham = eslestir(okunus, await uret(okunus, yol, ayar["rate"], ayar["pitch"]))
            # okunan kelimeleri ekrandaki gösterimlere geri topla
            kel, j = [], 0
            for gor, oku in parca:
                n = len([w for w in oku.split() if any(ch.isalnum() for ch in w)])
                grup = ham[j:j + n] or ham[j - 1:j]
                j += n
                kel.append({"w": gor, "s": grup[0]["s"], "e": grup[-1]["e"]})
            # baştaki/sondaki sessizliği kelime zamanlarına göre kırp
            bas, bit = max(0, kel[0]["s"] - 0.28), kel[-1]["e"] + 0.15
            wav = f"{tmp}/{i}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", yol, "-ss", f"{bas}", "-to", f"{bit}",
                            "-ar", "44100", "-ac", "1", wav], check=True)
            for k in kel:
                k["s"] -= bas; k["e"] -= bas
            parcalar.append((wav, kel, sure(wav)))
        konusma = sum(p[2] for p in parcalar)
        sigmaz = BAS + SON + konusma + EN_AZ_ARA * (len(parcalar) - 1)
        if sigmaz > HEDEF:  # en çok %6 hızlandır (perde korunur); fazlası metni kısaltmayı gerektirir
            tempo = min(1.06, (konusma + sigmaz - HEDEF) / konusma)
            yeni = []
            for i, (wav, kel, d) in enumerate(parcalar):
                hz = f"{tmp}/{i}_h.wav"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-filter:a", f"atempo={tempo:.4f}", hz], check=True)
                for k in kel:
                    k["s"] /= tempo; k["e"] /= tempo
                yeni.append((hz, kel, sure(hz)))
            parcalar = yeni
            konusma = sum(p[2] for p in parcalar)
            print(f"sığdırmak için ses %{(tempo - 1) * 100:.1f} hızlandırıldı")
        ara = (HEDEF - BAS - SON - konusma) / max(1, len(parcalar) - 1)
        ara = max(EN_AZ_ARA, min(EN_COK_ARA, ara))
        cikti, t, girdiler, filtre = [], BAS, [], []
        for i, (wav, kel, d) in enumerate(parcalar):
            for k in kel:
                cikti.append({"w": k["w"], "s": round(t + k["s"], 3), "e": round(t + k["e"], 3), "c": i})
            girdiler += ["-i", wav]
            filtre.append(f"[{i}:a]adelay={int(t * 1000)}[a{i}]")
            t += d + ara
        toplam = t - ara + SON
        filtre.append("".join(f"[a{i}]" for i in range(len(parcalar))) +
                      f"amix=inputs={len(parcalar)}:normalize=0,apad=whole_dur={toplam:.3f}[o]")
        subprocess.run(["ffmpeg", "-v", "error", "-y", *girdiler, "-filter_complex", ";".join(filtre),
                        "-map", "[o]", "-b:a", "160k", f"{klasor}/ses.mp3"], check=True)
    json.dump(cikti, open(f"{klasor}/kelimeler.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"toplam {toplam:.1f} sn, konuşma {konusma:.1f} sn, ara {ara:.2f} sn, {len(cikti)} kelime")
    for i, s in enumerate(satirlar):
        ks = [k for k in cikti if k["c"] == i]
        print(f"  {i}: {ks[0]['s']:5.2f}-{ks[-1]['e']:5.2f}  {' '.join(k['w'] for k in ks)}")

asyncio.run(main())

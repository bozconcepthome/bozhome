#!/usr/bin/env python3
"""Metinden ses ve kelime zamanları üretir (ücretsiz Microsoft nöral ses, edge-tts ile).

Kullanım: python3 ses.py public/sandalye [ses_adı] [hedef_süre_sn]
Girdi   : <klasör>/metin.txt  -> her satır bir cümle grubu (sahne).
Çıktı   : <klasör>/ses.mp3 ve <klasör>/kelimeler.json  [{w, s, e, c}]  (c = satır numarası)

Her satır AYRI seslendirilir ve dosyadaki sırayla birleştirilir; böylece ses sırası ile
sahne sırası asla karışmaz. Sahneler kelimeler.json'daki zamanlara bağlanır.
"""
import asyncio, json, os, subprocess, sys, tempfile
import edge_tts

klasor = sys.argv[1]
SES = sys.argv[2] if len(sys.argv) > 2 else "tr-TR-AhmetNeural"
HEDEF = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
BAS, SON, EN_AZ_ARA, EN_COK_ARA = 0.35, 1.3, 0.35, 0.9
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

async def uret(metin, yol):
    c = edge_tts.Communicate(metin, SES, boundary="WordBoundary", proxy=PROXY)
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
            kel = eslestir(s, await uret(s, yol))
            # baştaki/sondaki sessizliği kelime zamanlarına göre kırp
            bas, bit = max(0, kel[0]["s"] - 0.05), kel[-1]["e"] + 0.12
            wav = f"{tmp}/{i}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", yol, "-ss", f"{bas}", "-to", f"{bit}",
                            "-ar", "44100", "-ac", "1", wav], check=True)
            for k in kel:
                k["s"] -= bas; k["e"] -= bas
            parcalar.append((wav, kel, sure(wav)))
        konusma = sum(p[2] for p in parcalar)
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
        print(f"  {i}: {ks[0]['s']:5.2f}-{ks[-1]['e']:5.2f}  {s}")

asyncio.run(main())

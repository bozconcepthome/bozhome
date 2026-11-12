#!/usr/bin/env python3
"""Osmanlı köylüsü (5 dk): anlatım + bölüme göre müzik + ortam efektleri -> public/koylu/mix.wav (+ altyazi.srt, bolumler.txt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR = "public/koylu", 44100
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))
DUR = float(np.ceil(max(k["e"] for k in K) + 1.0))
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(1580)
an = lambda c, i=0: [k for k in K if k["c"] == c][i]["s"]
S = lambda x: int(x * SR)
lp = lambda x, fc: lfilter([1 - np.exp(-2 * np.pi * fc / SR)], [1, -np.exp(-2 * np.pi * fc / SR)], x)
hp = lambda x, fc: x - lp(x, fc)
env = lambda a, b, atk, rel: np.clip((t - a) / atk, 0, 1) * np.clip((b - t) / rel, 0, 1)
L = np.zeros(N); R = np.zeros(N)
def st(sig, at, g=1.0, pan=0.0):
    s = S(at)
    if s >= N or s < 0: return
    sig = sig[:N - s]
    L[s:s + len(sig)] += sig * g * (1 - max(0, pan)); R[s:s + len(sig)] += sig * g * (1 + min(0, pan))
nota = lambda m: 440 * 2 ** ((m - 69) / 12)

# müzik: ney benzeri nefesli + yaylı ped + kanun/ud benzeri tel (Hicaz/Uşşak esintili, basit)
def ney(m, d):
    n = S(d); tt = np.arange(n) / SR; f = nota(m) * (1 + 0.004 * np.sin(2 * np.pi * 5 * tt))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR)
    x += lp(rng.standard_normal(n), 3000) * 0.15
    e = np.clip(tt / 0.25, 0, 1) * np.clip((d - tt) / 0.4, 0, 1)
    return lp(x, 2500) * e
def tel(m, d=1.6):
    n = S(d); tt = np.arange(n) / SR; f = nota(m)
    return sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (2.5 + k)) / k for k in range(1, 6)) * (1 - np.exp(-tt * 400))
def ped(ms, a, b, g):
    x = sum(np.sin(2 * np.pi * nota(m) * t + 0.25 * np.sin(2 * np.pi * 4.5 * t + m)) for m in ms)
    return lp(x, 1400) * env(a, b, 2, 2) * g / len(ms)
# bölüm sınırları (Video.tsx ile aynı)
SAHNE_SATIR = [0, 4, 7, 8, 10, 15, 16, 20, 21, 24, 28, 30, 33, 34, 37, 39, 42]
SB = [0] + [an(c) - 0.45 for c in SAHNE_SATIR[1:]] + [DUR]
# Re Hicaz dizisi: D Eb F# G A Bb C D
HICAZ = [62, 63, 66, 67, 69, 70, 72, 74]
USSAK = [62, 64, 65, 67, 69, 70, 72, 74]
ruh = {0: 'gizem', 1: 'huzur', 2: 'huzur', 3: 'gizem', 4: 'huzur', 5: 'huzur', 6: 'gerilim', 7: 'huzur', 8: 'huzur', 9: 'gerilim', 10: 'huzur', 11: 'gizem', 12: 'huzur', 13: 'gerilim', 14: 'karanlik', 15: 'huzun', 16: 'huzur'}
muzik = np.zeros(N)
for i in range(len(SB) - 1):
    a, b = SB[i], SB[i + 1] + 0.6
    r = ruh[i]
    dizi = HICAZ if r in ('gerilim', 'karanlik', 'gizem') else USSAK
    kok = [50, 57, 62] if r != 'karanlik' else [38, 50, 53]
    muzik += ped(kok, a, b, 0.05 if r != 'karanlik' else 0.07)
    # ezgi: yavaş nefesli cümleler
    zz = a + 0.8; k = 0
    while zz < b - 2.5:
        m = dizi[[0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3][(k + i * 3) % 12]] + (0 if r != 'karanlik' else -12)
        d = 1.2 + (k % 3) * 0.6
        sig = ney(m, d) * (0.035 if r in ('huzur', 'huzun') else 0.03)
        s0 = S(zz); muzik[s0:s0 + len(sig)] += sig[:max(0, N - s0)]
        zz += d + 0.3; k += 1
    # tel vuruşları (usul)
    if r in ('huzur', 'gerilim'):
        zz = a + 0.5; k = 0
        while zz < b - 1:
            m = kok[0] + 12 + (7 if k % 4 == 2 else 0)
            sig = tel(m) * (0.05 if k % 2 == 0 else 0.03); s0 = S(zz); muzik[s0:s0 + len(sig)] += sig[:max(0, N - s0)]
            zz += 0.75 if r == 'huzur' else 0.5; k += 1
    # gerilimde davul
    if r in ('gerilim', 'karanlik'):
        zz = a + 0.5
        while zz < b - 0.5:
            n = S(0.5); tt = np.arange(n) / SR
            st(np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 9) + lp(rng.standard_normal(n), 400) * np.exp(-tt * 20) * 0.4, zz, 0.18)
            zz += 1.0
L += muzik; R += muzik

# ortam sesleri bölümlere göre
def gurultu(fc1, fc2): x = hp(lp(rng.standard_normal(N), fc2), fc1); return x / np.abs(x).max()
ruzgar = gurultu(80, 700); kus_bg = np.zeros(N)
def kus(f0):
    n = S(0.15); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(np.pi * tt / 0.15)) / SR) * np.sin(np.pi * tt / 0.15)
dis = [0, 1, 4, 5, 6, 8, 9, 10, 15]
for i in dis:
    a, b = SB[i], SB[i + 1]
    L += ruzgar * 0.04 * env(a, b, 1, 1); R += np.roll(ruzgar, 500) * 0.04 * env(a, b, 1, 1)
    for k in range(int((b - a) / 2.5)):
        st(kus(2600 + rng.random() * 900), a + 1 + k * 2.5 + rng.random(), 0.015, rng.uniform(-0.7, 0.7))
# öküz/at adımları, saban
for i in (0, 4, 8):
    a, b = SB[i], SB[i + 1]
    for k in range(int((b - a) / 0.6)):
        n = S(0.1); st(lp(rng.standard_normal(n), 500) * np.exp(-np.arange(n) / SR * 30), a + 0.5 + k * 0.6, 0.06, 0.2)
for k in range(int((SB[7] - SB[6]) / 0.35)):
    n = S(0.08); st(lp(rng.standard_normal(n), 900) * np.exp(-np.arange(n) / SR * 40), SB[6] + 0.3 + k * 0.35, 0.07, -0.3)
# pazar kalabalığı
kal = sum(lp(hp(rng.standard_normal(N), 250 + 70 * k), 1300 + 200 * k) * (0.5 + 0.5 * np.sin(2 * np.pi * (1.2 + 0.4 * k) * t + k)) for k in range(5))
kal /= np.abs(kal).max(); L += kal * 0.05 * env(SB[10], SB[11], 1, 1); R += np.roll(kal, 800) * 0.05 * env(SB[10], SB[11], 1, 1)
# sikke şıngırtısı
def sikke():
    n = S(0.4); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) for f in (3100, 4700, 6200)) / 3
for k in range(7): st(sikke(), an(26) + k * 0.25 + 0.4, 0.05, (k % 3 - 1) * 0.4)
st(sikke(), an(28), 0.08)
# kalem / defter
for c in (8, 31):
    for k in range(8):
        n = S(0.25); x = hp(rng.standard_normal(n), 3000) * np.hanning(n) * (0.5 + 0.5 * np.sin(np.arange(n) / SR * 2 * np.pi * 8) ** 2)
        st(x, an(c) + 0.3 + k * 0.45, 0.04)
# damga
n = S(0.5); tt = np.arange(n) / SR
damga = np.sin(2 * np.pi * 80 * tt) * np.exp(-tt * 20) + lp(rng.standard_normal(n), 800) * np.exp(-tt * 40) * 0.5
for c, kok in ((11, 'miri'), (36, None)):
    zaman = next((k["s"] for k in K if k["c"] == c and kok and k["w"].lower().startswith(kok)), an(c) + 0.6)
    st(damga, zaman, 0.3)
for k in range(7): st(damga, an(36) + 0.6 + k * 0.6, 0.18)
# kış rüzgârı
kisr = gurultu(200, 1500); L += kisr * 0.07 * env(SB[12], SB[13], 1, 1.5); R += np.roll(kisr, 400) * 0.07 * env(SB[12], SB[13], 1, 1.5)
# celali: dörtnala at
for k in range(int((SB[15] - SB[14]) / 0.18)):
    n = S(0.07); st(lp(rng.standard_normal(n), 700) * np.exp(-np.arange(n) / SR * 50), SB[14] + 0.2 + k * 0.18 + (0.04 if k % 3 == 0 else 0), 0.07, 0.3)
# abone tıkı
n = S(0.05); st(hp(rng.standard_normal(n), 2000) * np.exp(-np.arange(n) / SR * 120), next(k["s"] for k in K if k["c"] == 43 and k["w"].lower().startswith("abone")), 0.3)

ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=150:makeup=2", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 5); zarf /= zarf.max()
duck = 1 - 0.55 * np.clip(zarf * 4, 0, 1)
L = L * duck + ses * 0.92; R = R * duck + ses * 0.92
out = np.stack([L, R], 1)
out *= np.clip(np.minimum(t / 0.3, (DUR - t) / 1.0), 0, 1)[:, None]
out /= max(1.0, np.abs(out).max() / 0.97)
with wave.open(f"{KL}/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
def ts(x):
    ms = int(round(x * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
with open(f"{KL}/altyazi.srt", "w", encoding="utf-8") as f:
    for i, c in enumerate(sorted({k["c"] for k in K})):
        ks = [k for k in K if k["c"] == c]
        f.write(f"{i + 1}\n{ts(ks[0]['s'])} --> {ts(min(DUR, ks[-1]['e'] + 0.35))}\n{' '.join(k['w'] for k in ks)}\n\n")
BOLUM = ['Giriş', 'Köy', 'Reaya', 'Tahrir', 'Toprak', 'Komşular', 'Sipahi', 'Takvim', 'Tarla', 'Vergi', 'Pazar', 'Adalet', 'Kış', 'Değişim', 'Celali', 'Son', 'Sonraki bölüm']
with open(f"{KL}/bolumler.txt", "w", encoding="utf-8") as f:
    for i, ad in enumerate(BOLUM):
        z = max(0, SB[i]); f.write(f"{int(z // 60)}:{int(z % 60):02d} {ad}\n")
print("mix.wav, altyazi.srt, bolumler.txt yazıldı; süre", DUR)

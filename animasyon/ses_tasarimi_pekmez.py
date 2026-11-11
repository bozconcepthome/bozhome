#!/usr/bin/env python3
"""Pekmez Seli videosu için ses tasarımı: seslendirme + müzik + efektler -> public/pekmez/mix.wav
Tüm efekt anları kelimeler.json'dan gelir; metin değişince efektler de kayar.
Ayrıca public/pekmez/altyazi.srt üretir.
Kullanım: python3 ses_tasarimi_pekmez.py
"""
import json, subprocess, wave
import numpy as np

KL = "public/pekmez"
SR = 44100
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(1919)
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))

def an(c, i=0):
    return [k for k in K if k["c"] == c][i]["s"]

A = dict(hook=an(0), l1=an(1), boston=an(1, 1), litre=an(1, 4), ogle=an(2), percin=an(2, 1), patliyor=an(2, 5),
         yari=an(2, 8), dalga=an(3), hiz=an(3, 5), yutuyor=an(3, 8), olu=an(4), soguk=an(5), hapis=an(5, 5),
         son=an(6), imza=an(6, 5))
# perçin patlamaları: Video.tsx ile aynı formül
POPS = [A["percin"] + k * (A["patliyor"] + 0.45 - A["percin"]) / 8 for k in range(9)]

t = np.arange(N) / SR
def S(sec): return int(sec * SR)
def env(a, b, atk=0.3, rel=0.5):
    e = np.zeros(N)
    e += np.clip((t - a) / max(atk, 1e-3), 0, 1) * np.clip((b - t) / max(rel, 1e-3), 0, 1)
    return np.clip(e, 0, 1)
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)  # tek kutuplu alçak geçiren filtre
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)
def highpass(x, fc): return x - lowpass(x, fc)
def noise(n): return rng.standard_normal(n)
def brown(n):
    x = np.cumsum(noise(n)); x -= lowpass(x, 8); return x / (np.abs(x).max() + 1e-9)
def ekle(dst, sig, at, gain=1.0):
    s = S(at)
    if s >= N: return
    sig = sig[: N - s]
    dst[s:s + len(sig)] += sig * gain

L = np.zeros(N); R = np.zeros(N)
def st(sig, at, gain=1.0, pan=0.0):
    ekle(L, sig, at, gain * (1 - max(0, pan)))
    ekle(R, sig, at, gain * (1 + min(0, pan)))

# --- ortam: kış rüzgârı (tüm video), liman ---
ruzgar = lowpass(noise(N), 500) ; ruzgar /= np.abs(ruzgar).max()
ruzgar *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t + 1) ** 2
st(ruzgar * (0.10 + 0.08 * env(A["olu"], A["son"], 1, 1)), 0, 1)

def can(f0=880, d=2.5):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * (2.2 + r)) * g for r, g in ((1, 1), (2.76, .5), (5.4, .25), (8.9, .12)))
st(can(740), A["l1"] + 0.5, 0.05, -0.6); st(can(740), A["l1"] + 3.2, 0.04, -0.6)

# at nalı tıkırtısı + yükseltilmiş tren
def tik(f=1800, d=0.05):
    n = S(d); tt = np.arange(n) / SR
    return (noise(n) * 0.6 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 90)
for k in range(int((A["ogle"] - A["l1"]) / 0.32)):
    st(tik(1500 + (k % 2) * 300), A["l1"] + 0.2 + k * 0.32 + (k % 2) * 0.05, 0.05, 0.4)
tren = brown(S(5.0)) * np.hanning(S(5.0))
tt = np.arange(S(5.0)) / SR
tren *= 0.6 + 0.4 * (np.sin(2 * np.pi * 3.2 * tt) > 0.7)
st(tren, A["l1"] + 0.6, 0.18, 0.3)

# --- müzik: düşük gerilim pedi (Re minör), patlamada kesilir ---
def ped(freqs, a, b, gain, atk=1.5, rel=1.2, vib=0.0):
    sig = np.zeros(N)
    for f in freqs:
        for det in (-0.6, 0.6):
            ph = 2 * np.pi * (f + det) * t + vib * np.sin(2 * np.pi * 0.2 * t)
            sig += np.sin(ph) + 0.25 * np.sin(2 * ph)
    sig = lowpass(sig, 1200)
    return sig / len(freqs) * env(a, b, atk, rel) * gain
gerilim = ped([73.4, 110.0, 146.8], A["l1"] - 0.3, A["yari"] - 0.05, 0.05, 2.0, 0.05)
# yükselen gerilim (riser)
r0, r1 = A["ogle"] - 1.5, A["yari"]
fr = np.where((t > r0) & (t < r1), 120 + 900 * np.clip((t - r0) / (r1 - r0), 0, 1) ** 2.2, 0)
riser = np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(r0, r1, 3.0, 0.02) * 0.05
riser += lowpass(noise(N), 3000) * env(r0, r1, 3.5, 0.02) * 0.06 * np.clip((t - r0) / (r1 - r0), 0, 1)
# yas pedi (La minör) ve kapanış akoru (Fa majör 9)
yas = ped([110.0, 130.8, 164.8, 220.0], A["olu"] - 0.4, A["son"] + 0.4, 0.06, 1.2, 1.5)
kapanis = ped([87.3, 130.8, 174.6, 220.0, 392.0], A["son"] - 0.3, DUR + 1, 0.06, 1.5, 0.1)
muzik = gerilim + riser + yas + kapanis
# kanca: sinematik vuruş + derin uğultu
def boom(f0=55, d=2.5, f1=30):
    n = S(d); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 3)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
st(boom(60, 3.0, 32), A["hook"] - 0.05, 0.55)
akis = lowpass(brown(S(3.0)), 300) * np.hanning(S(3.0))
st(akis, 0.0, 0.35)

# --- perçinler: metal tınlama + çatırtı + gümleme ---
def percin(seed):
    n = S(0.35); tt = np.arange(n) / SR; g = np.random.default_rng(seed)
    parts = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (25 + i * 8)) for i, f in enumerate(g.uniform([1900, 3100, 4700, 6900], [2300, 3700, 5300, 7600])))
    crack = noise(n) * np.exp(-tt * 260)
    thud = np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 30)
    return parts * 0.35 + crack * 0.9 + thud * 0.6
for i, p in enumerate(POPS):
    st(percin(i), p, 0.42, ((i % 3) - 1) * 0.5)
# metal inlemesi (tank zorlanıyor) ve büyük kopma
g0 = A["ogle"]
n = S(A["yari"] - g0 + 0.6); tt = np.arange(n) / SR
f = 70 + 40 * np.sin(2 * np.pi * 0.7 * tt) + 25 * tt
inleme = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.3
inleme = lowpass(inleme, 900) * np.clip(tt / 1.5, 0, 1)
st(inleme, g0, 0.10)
st(boom(48, 3.5, 26), A["yari"] - 0.02, 0.95)
kopma = noise(S(1.2)) * np.exp(-np.arange(S(1.2)) / SR * 4)
st(lowpass(kopma, 2500), A["yari"] - 0.02, 0.6)

# --- dalga: kükreyen kahverengi gürültü, kırılan ahşap, bükülen çelik ---
d0, d1 = A["yari"] + 0.05, A["olu"] - 0.1
kukreme = lowpass(brown(N), 420) + 0.35 * lowpass(noise(N), 1400)
kukreme *= env(d0, d1, 0.4, 0.9) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * t))
L += kukreme * 0.42; R += np.roll(kukreme, 400) * 0.42
def kirilma(seed):
    n = S(0.9); tt = np.arange(n) / SR; g = np.random.default_rng(seed)
    x = noise(n) * (np.exp(-tt * 9) + (g.random(n) > 0.995) * 3 * np.exp(-tt * 4))
    return lowpass(x, 3200) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 8) * 0.8
for k, dt in enumerate([0.9, 1.9, 2.6, 3.3]):
    st(kirilma(k), A["dalga"] + dt, 0.38, (k % 2) * 0.6 - 0.3)
n = S(1.4); tt = np.arange(n) / SR
gicirti = np.sin(2 * np.pi * np.cumsum(260 - 120 * tt + 20 * np.sin(2 * np.pi * 11 * tt)) / SR) * np.hanning(n)
st(gicirti, A["dalga"] + 1.2, 0.07, 0.5)

# --- donma / yapışkanlık: koyu "vıcık" sesleri ---
def vicik(seed):
    n = S(0.4); tt = np.arange(n) / SR
    f = 160 + 260 * np.exp(-tt * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7) * (1 - np.exp(-tt * 60))
for k, dt in enumerate([0.4, 1.3, 2.1, 2.8]):
    st(vicik(k), A["soguk"] + dt, 0.12, 0.2)

# --- kapanış: kâğıt, kalem, mühür ---
kagit = highpass(noise(S(0.6)), 1500) * np.hanning(S(0.6))
st(kagit, A["son"] - 0.25, 0.08)
n = S(0.7); tt = np.arange(n) / SR
kalem = highpass(noise(n), 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt) ** 2) * np.hanning(n)
st(kalem, A["imza"] - 0.5, 0.07)
muhur = boom(110, 0.6, 60) + lowpass(noise(S(0.6)), 900) * np.exp(-np.arange(S(0.6)) / SR * 30)
st(muhur, A["imza"] + 0.35, 0.5)

# --- seslendirme: temizle, sıcaklık, hafif oda ---
ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=75,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,"
    "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,"
    "aecho=0.8:0.6:38|61:0.10|0.06",
    "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses)))
ses /= np.abs(ses).max() + 1e-9
# müzik ve ortamı konuşmanın altında kıs (ducking)
zarf = lowpass(np.abs(ses), 6); zarf /= zarf.max()
duck = 1 - 0.68 * np.clip(zarf * 4, 0, 1)
L = L * duck + muzik * duck; R = R * duck + muzik * duck
L += ses * 0.9; R += ses * 0.9
cikis = np.stack([L, R], 1)
cikis *= np.clip(np.minimum(t / 0.05, (DUR - t) / 0.8), 0, 1)[:, None]
cikis /= max(1.0, np.abs(cikis).max() / 0.97)
cikis = np.tanh(cikis * 1.15) / np.tanh(1.15)
with wave.open(f"{KL}/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((cikis * 32767).astype(np.int16).tobytes())

# --- SRT altyazı ---
def ts(x):
    h, m = int(x // 3600), int(x % 3600 // 60); s = x % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int((s % 1) * 1000):03d}"
satirlar = sorted({k["c"] for k in K})
with open(f"{KL}/altyazi.srt", "w", encoding="utf-8") as f:
    for i, c in enumerate(satirlar):
        ks = [k for k in K if k["c"] == c]
        f.write(f"{i + 1}\n{ts(ks[0]['s'])} --> {ts(ks[-1]['e'] + 0.4)}\n{' '.join(k['w'] for k in ks)}\n\n")
print("mix.wav ve altyazi.srt yazıldı; perçin anları:", [round(p, 2) for p in POPS])

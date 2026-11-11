#!/usr/bin/env python3
"""Sehpa reklamı ses tasarımı: neşeli müzik + efektler + seslendirme -> public/sehpa/mix.wav (+ altyazi.srt)
Efekt anları kelimeler.json'dan gelir. Kullanım: python3 ses_tasarimi_sehpa.py"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/sehpa", 44100, 10.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))
an = lambda c, i=0: [k for k in K if k["c"] == c][i]["s"]
A = dict(sehpa=an(0, 1), dergilik=an(0, 3), parlak=an(1, 1), kahve=an(2, 0), dergi=an(2, 2), boz=an(3, 0), bekliyor=an(3, 4))
t = np.arange(N) / SR
S = lambda x: int(x * SR)
lp = lambda x, fc: lfilter([1 - np.exp(-2 * np.pi * fc / SR)], [1, -np.exp(-2 * np.pi * fc / SR)], x)
hp = lambda x, fc: x - lp(x, fc)
L = np.zeros(N); R = np.zeros(N)
def st(sig, at, g=1.0, pan=0.0):
    s = S(at)
    if s >= N or s + len(sig) <= 0: return
    if s < 0: sig = sig[-s:]; s = 0
    sig = sig[:N - s]
    L[s:s + len(sig)] += sig * g * (1 - max(0, pan)); R[s:s + len(sig)] += sig * g * (1 + min(0, pan))

def pluck(f, d=0.9, parlak=0.5):
    """Karplus-Strong tel sesi (ukulele benzeri)."""
    n, p = S(d), int(SR / f)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * (parlak * buf[i % p] + (1 - parlak) * buf[(i + 1) % p])
    return out * np.exp(-np.arange(n) / SR * 2.2)

BPM = 120; B = 60 / BPM
nota = lambda m: 440 * 2 ** ((m - 69) / 12)
akorlar = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]  # C G Am F
cache = {}
def tel(m, d=0.8):
    if (m, d) not in cache: cache[(m, d)] = pluck(nota(m), d)
    return cache[(m, d)]
bas0 = 0.0
for bar in range(6):
    ak = akorlar[bar % 4]
    for beat, kalip in enumerate([(0, 1, 2, 3), (2, 3), (1, 2, 3), (2, 3)]):
        tt = bas0 + (bar * 4 + beat) * B
        if tt > DUR - 0.9: break
        for j, k in enumerate(kalip):
            st(tel(ak[k] , 0.9), tt + j * 0.012, 0.11, -0.3 + 0.2 * j)
        st(tel(ak[0] - 12, 0.9), tt, 0.10 if beat % 2 == 0 else 0)
# melodi (glockenspiel) - kısa ve neşeli
def zil(f, d=1.2):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (3 + r * 2)) * g for r, g in ((1, 1), (2.76, .35), (5.4, .12)))
mel = [(0, 76), (0.5, 79), (1, 84), (2, 83), (2.5, 79), (4, 81), (4.5, 84), (5, 88), (6, 86), (8, 84), (8.5, 88), (9, 91), (10, 89), (12, 88), (12.5, 86), (13, 84), (14, 83), (16, 84)]
for b, m in mel:
    if b * B < DUR - 0.8: st(zil(nota(m)), b * B, 0.045, 0.3)
# hafif el çırpma / shaker
for k in range(int(DUR / B * 2)):
    tt = k * B / 2
    n = S(0.08); x = hp(rng.standard_normal(n), 5000) * np.exp(-np.arange(n) / SR * 60)
    st(x, tt, 0.05 if k % 2 else 0.025, 0.5)
    if k % 4 == 2:
        n = S(0.15); x = lp(hp(rng.standard_normal(n), 900), 4000) * np.exp(-np.arange(n) / SR * 30)
        st(x, tt, 0.12, -0.2)
muzik_L, muzik_R = L.copy(), R.copy(); L[:] = 0; R[:] = 0

# efektler
def whoosh(d=0.6, f0=300, f1=3000):
    n = S(d); x = rng.standard_normal(n); out = np.zeros(n); seg = n // 30
    for i in range(30):
        fc = f0 * (f1 / f0) ** (i / 29)
        out[i * seg:(i + 1) * seg] = lp(x, fc)[i * seg:(i + 1) * seg]
    return out * np.hanning(n)
st(whoosh(0.5, 2500, 300), A["sehpa"] - 0.45, 0.35)
def tok(f=70, d=0.35):
    n = S(d); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14) + lp(rng.standard_normal(n), 1500) * np.exp(-tt * 50) * 0.4
st(tok(), A["sehpa"] - 0.02, 0.55)
def parilti(d=1.0):
    out = np.zeros(S(d))
    for k in range(10):
        s = zil(2000 + rng.uniform(0, 3000), 0.5)[: len(out)]
        o = S(k * d / 11); out[o:o + len(s)] += s[: len(out) - o]
    return out
st(parilti(1.1), A["parlak"] - 0.05, 0.05, 0.4)
st(zil(1567.98, 1.0) + zil(2093, 1.0) * 0.5, A["kahve"] + 0.05, 0.10, -0.3)
n = S(0.5); kagit = hp(rng.standard_normal(n), 1800) * np.hanning(n) * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 2 * np.pi * 14) ** 2)
st(kagit, A["dergi"] - 0.05, 0.14, 0.3)
st(whoosh(0.45, 400, 3500), A["boz"] - 0.4, 0.22)
for i, m in enumerate([84, 88, 91, 96]):
    st(zil(nota(m), 1.6), A["boz"] + i * 0.07, 0.07, -0.3 + i * 0.2)
st(parilti(1.4), A["bekliyor"], 0.05, -0.3)

# seslendirme
ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=90,equalizer=f=3500:t=q:w=1.2:g=2.5,equalizer=f=250:t=q:w=1:g=-1.5,"
    "acompressor=threshold=-20dB:ratio=3:attack=6:release=100:makeup=3,aecho=0.8:0.5:30|47:0.07|0.04",
    "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 6); zarf /= zarf.max()
duck = 1 - 0.6 * np.clip(zarf * 4, 0, 1)
L = (L + muzik_L) * duck + ses * 0.9
R = (R + muzik_R) * duck + ses * 0.9
out = np.stack([L, R], 1)
out *= np.clip(np.minimum(t / 0.02, (DUR - t) / 0.5), 0, 1)[:, None]
out /= max(1.0, np.abs(out).max() / 0.97)
out = np.tanh(out * 1.1) / np.tanh(1.1)
with wave.open(f"{KL}/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())

def ts(x):
    return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x % 1) * 1000)) % 1000:03d}"
with open(f"{KL}/altyazi.srt", "w", encoding="utf-8") as f:
    for i, c in enumerate(sorted({k["c"] for k in K})):
        ks = [k for k in K if k["c"] == c]
        f.write(f"{i + 1}\n{ts(ks[0]['s'])} --> {ts(min(DUR, ks[-1]['e'] + 0.3))}\n{' '.join(k['w'] for k in ks)}\n\n")
print("mix.wav ve altyazi.srt yazıldı", {k: round(v, 2) for k, v in A.items()})

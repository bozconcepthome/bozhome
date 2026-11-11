#!/usr/bin/env python3
"""Semmelweis videosu: ElevenLabs anlatımı + piyano/yaylı müzik + efektler -> public/semmelweis/mix.wav (+ altyazi.srt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/semmelweis", 44100, 60.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(1847)
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))
an = lambda c, i=0: [k for k in K if k["c"] == c][i]["s"]
S = lambda x: int(x * SR)
lp = lambda x, fc: lfilter([1 - np.exp(-2 * np.pi * fc / SR)], [1, -np.exp(-2 * np.pi * fc / SR)], x)
hp = lambda x, fc: x - lp(x, fc)
L = np.zeros(N); R = np.zeros(N)
def st(sig, at, g=1.0, pan=0.0):
    s = S(at)
    if s >= N: return
    sig = sig[:N - s]
    L[s:s + len(sig)] += sig * g * (1 - max(0, pan)); R[s:s + len(sig)] += sig * g * (1 + min(0, pan))
nota = lambda m: 440 * 2 ** ((m - 69) / 12)

def piyano(m, d=3.0, v=1.0):
    n = S(d); tt = np.arange(n) / SR; f = nota(m)
    x = sum(np.sin(2 * np.pi * f * k * tt * (1 + 0.0004 * k * k)) * np.exp(-tt * (0.9 + k * 0.7)) / k ** 1.1 for k in range(1, 8))
    x *= (1 - np.exp(-tt * 300))
    return x * v
def ped(ms, a, b, g, atk=2.0, rel=2.0):
    e = np.clip((t - a) / atk, 0, 1) * np.clip((b - t) / rel, 0, 1)
    x = sum(np.sin(2 * np.pi * nota(m) * t + 0.3 * np.sin(2 * np.pi * 5.2 * t + m)) + 0.3 * np.sin(4 * np.pi * nota(m) * t) for m in ms)
    return lp(x, 1500) * e * g / len(ms)

# akor planı: hüzünlü La minör -> umutlu Do majör (mikrop kuramı ile)
plan = [
    (0.0, [57, 60, 64], 45), (an(1) - 0.3, [53, 57, 60], 41), (an(2) - 0.3, [57, 60, 64], 45), (an(3) - 0.3, [52, 55, 59], 40),
    (an(4) - 0.3, [53, 57, 60], 41), (an(5) - 0.3, [50, 53, 57], 38), (an(6) - 0.3, [55, 59, 62], 43), (an(7) - 0.3, [48, 52, 55], 36),
    (an(8) - 0.3, [53, 57, 60], 41), (an(9) - 0.3, [57, 60, 64], 45), (an(10) - 0.3, [48, 52, 55], 36), (an(11) - 0.3, [53, 57, 60, 65], 41),
    (an(11) + 2.2, [48, 52, 55, 60], 36),
]
muzik = np.zeros(N)
for i, (bas, ak, kok) in enumerate(plan):
    bit = plan[i + 1][0] if i + 1 < len(plan) else DUR
    sig = ped(ak, bas, bit + 0.6, 0.05, 1.2, 1.0) + ped([kok - 12], bas, bit + 0.6, 0.05, 1.0, 1.0)
    muzik += sig
    # arpej piyano
    adim = 0.62
    k = 0
    while bas + k * adim < bit - 0.1:
        m = (ak + [ak[0] + 12])[[0, 1, 2, 3, 2, 1][k % 6]] + 12
        p = piyano(m, 2.6, 0.06 if i < 10 else 0.075)
        s0 = S(bas + k * adim); muzik[s0:s0 + len(p)] += p[:max(0, N - s0)]
        k += 1
# ölüm anlarında müzik inceltilir
for c in (4, 9):
    a, b = an(c, 0), max(k["e"] for k in K if k["c"] == c)
    muzik *= 1 - 0.45 * np.clip((t - a) / 0.6, 0, 1) * np.clip((b + 0.6 - t) / 0.6, 0, 1)
L += muzik; R += muzik

# efektler
def damla(f=900):
    n = S(0.25); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-tt * 40))) / SR) * np.exp(-tt * 25)
def su(d):
    n = S(d); x = hp(lp(rng.standard_normal(n), 3500), 300)
    x *= 0.6 + 0.4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 3.1))
    return x * np.hanning(n)
st(su(2.2), 0.6, 0.06); [st(damla(800 + 200 * k), 0.9 + k * 0.5, 0.05) for k in range(4)]
st(su(3.6), an(6, 2) - 0.2, 0.11, -0.2); [st(damla(700 + 150 * k), an(6, 2) + k * 0.55, 0.06, 0.3) for k in range(6)]
st(su(3.6), an(11, 1) - 0.2, 0.09, 0.2); [st(damla(900 + 100 * k), an(11, 1) + k * 0.5, 0.05, -0.3) for k in range(6)]
def can(f=520, d=4.0):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (0.8 + r * 0.6)) * g for r, g in ((1, 1), (2.4, .45), (4.1, .2), (5.9, .1)))
st(can(392), an(1, 1) - 0.4, 0.05, -0.4); st(can(392), an(1, 1) + 1.2, 0.035, -0.4)
def tik():
    n = S(0.03); return hp(rng.standard_normal(n), 2500) * np.exp(-np.arange(n) / SR * 200)
for k in range(int((an(4) - an(3)) / 0.5) + 1): st(tik(), an(3) - 0.2 + k * 0.5, 0.05 if k % 2 else 0.035, 0.4)
def kapi():
    n = S(0.9); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 62 * tt) * np.exp(-tt * 9) + lp(rng.standard_normal(n), 800) * np.exp(-tt * 18) * 0.7
st(kapi(), an(8, 4) - 0.05, 0.35)
def adim():
    n = S(0.12); tt = np.arange(n) / SR
    return lp(rng.standard_normal(n), 600) * np.exp(-tt * 40) + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 35) * 0.5
for k in range(8): st(adim(), an(5) + 0.1 + k * 0.52, 0.12, -0.6 + k * 0.16)
n = S(1.2); ufle = hp(rng.standard_normal(n), 700) * np.exp(-np.arange(n) / SR * 4) * np.hanning(n)
st(ufle, an(9, 4) + 0.6, 0.06)
st(can(1046, 3.0), an(10, 2) - 0.1, 0.03, 0.3)

# anlatım
ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=150:makeup=2",
    "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 5); zarf /= zarf.max()
duck = 1 - 0.5 * np.clip(zarf * 4, 0, 1)
L = L * duck + ses * 0.92; R = R * duck + ses * 0.92
out = np.stack([L, R], 1)
out *= np.clip(np.minimum(t / 0.3, (DUR - t) / 1.2), 0, 1)[:, None]
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
print("mix.wav ve altyazi.srt yazıldı")

#!/usr/bin/env python3
"""Ev havası videosu: ElevenLabs anlatımı + sakin müzik + efektler -> public/evhavasi/mix.wav (+ altyazi.srt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/evhavasi", 44100, 35.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(60)
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
def piyano(m, d=3.0):
    n = S(d); tt = np.arange(n) / SR; f = nota(m)
    return sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (1.0 + k * 0.8)) / k ** 1.2 for k in range(1, 7)) * (1 - np.exp(-tt * 250))
def ped(ms, a, b, g):
    e = np.clip((t - a) / 1.5, 0, 1) * np.clip((b - t) / 1.5, 0, 1)
    return lp(sum(np.sin(2 * np.pi * nota(m) * t + 0.2 * np.sin(2 * np.pi * 4.8 * t + m)) for m in ms), 1400) * e * g / len(ms)

# Fa majör - La minör - Re minör - Si bemol - Fa (sakin, aydınlık)
plan = [(0, [53, 57, 60]), (an(1) - 0.3, [57, 60, 64]), (an(2) - 0.3, [50, 53, 57]), (an(2, 8) - 0.2, [46, 50, 53]),
        (an(3) - 0.3, [53, 57, 60]), (an(3, 6), [48, 52, 55]), (an(4) - 0.3, [46, 50, 53]), (an(5) - 0.3, [53, 57, 60, 65])]
muzik = np.zeros(N)
for i, (bas, ak) in enumerate(plan):
    bit = plan[i + 1][0] if i + 1 < len(plan) else DUR
    muzik += ped(ak, bas, bit + 0.8, 0.045) + ped([ak[0] - 12], bas, bit + 0.8, 0.04)
    k = 0
    while bas + k * 0.55 < bit - 0.05:
        m = (ak + [ak[0] + 12])[[0, 2, 1, 3, 2, 1][k % 6]] + 12
        p = piyano(m, 2.4) * 0.055; s0 = S(bas + k * 0.55); muzik[s0:s0 + len(p)] += p[:max(0, N - s0)]
        k += 1
L += muzik; R += muzik
# oda tonu
oda = lp(rng.standard_normal(N), 250); oda /= np.abs(oda).max(); L += oda * 0.025; R += np.roll(oda, 300) * 0.025

def gurultu(d, f0, f1, g=1.0):
    n = S(d); return hp(lp(rng.standard_normal(n), f1), f0) * g
# ocak cızırtısı
n = S(1.3); x = gurultu(1.3, 2000, 9000) * (0.6 + 0.4 * (rng.random(n) > 0.97)) * np.hanning(n); st(x, an(2, 5) - 0.1, 0.06, -0.3)
# sprey
n = S(0.5); x = gurultu(0.5, 3000, 12000) * np.clip(np.arange(n) / SR / 0.03, 0, 1) * np.exp(-np.arange(n) / SR * 3); st(x, an(2, 6) + 0.05, 0.10, 0.3)
# fırça
n = S(0.8); x = gurultu(0.8, 1500, 6000) * np.abs(np.sin(np.arange(n) / SR * np.pi * 2.5)); st(x, an(2, 11) - 0.1, 0.06)
# damla
def damla(f):
    n = S(0.25); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.4 * np.exp(-tt * 40))) / SR) * np.exp(-tt * 22)
[st(damla(900 + 120 * k), an(2, 14) - 0.1 + k * 0.35, 0.06, 0.2) for k in range(3)]
# pencere açılışı: gıcırtı + rüzgâr + kuşlar
n = S(0.7); tt = np.arange(n) / SR
gic = np.sin(2 * np.pi * np.cumsum(420 + 140 * np.sin(2 * np.pi * 3 * tt)) / SR) * np.hanning(n) * 0.5
st(lp(gic, 2000), an(3, 6) - 0.2, 0.05, -0.5)
a0 = an(3, 6)
ruzgar = lp(rng.standard_normal(N), 900) * np.clip((t - a0) / 1.2, 0, 1) * np.clip((an(5) + 1 - t) / 2.0, 0, 1)
ruzgar *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t) ** 2
L += ruzgar * 0.10; R += np.roll(ruzgar, 500) * 0.08
def kus(f0):
    n = S(0.18); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(np.pi * tt / 0.18)) / SR) * np.sin(np.pi * tt / 0.18)
for k, dt in enumerate([0.6, 0.85, 1.9, 2.1, 3.3, 3.5, 4.4]):
    st(kus(2600 + 300 * (k % 3)), a0 + dt, 0.025, -0.6)
# nem ölçer tıkırtısı
for k in range(6):
    n = S(0.02); st(hp(rng.standard_normal(n), 3000) * np.exp(-np.arange(n) / SR * 300), an(4, 2) + k * 0.18, 0.06)
# kapanış zili
def zil(f, d=3):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (1.2 + r)) * g for r, g in ((1, 1), (2.76, .3), (5.4, .1)))
st(zil(nota(77)) + zil(nota(81)) * 0.6, an(5, 3) - 0.05, 0.035)

ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=150:makeup=2", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 5); zarf /= zarf.max()
duck = 1 - 0.5 * np.clip(zarf * 4, 0, 1)
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
print("mix.wav ve altyazi.srt yazıldı")

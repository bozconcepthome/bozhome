#!/usr/bin/env python3
"""Su içmenin faydaları videosu: anlatım + neşeli marimba/pad müzik + su efektleri -> public/suicmek/mix.wav (+ altyazi.srt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/suicmek", 44100, 55.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(2026)
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))
an = lambda c, i=0: [k for k in K if k["c"] == c][i]["s"]
S = lambda x: int(x * SR)
lp = lambda x, fc: lfilter([1 - np.exp(-2 * np.pi * fc / SR)], [1, -np.exp(-2 * np.pi * fc / SR)], x)
hp = lambda x, fc: x - lp(x, fc)
L = np.zeros(N); R = np.zeros(N)
def st(sig, at, g=1.0, pan=0.0):
    s = S(at)
    if s >= N or s < 0: return
    sig = sig[:N - s]
    L[s:s + len(sig)] += sig * g * (1 - max(0, pan)); R[s:s + len(sig)] += sig * g * (1 + min(0, pan))
nota = lambda m: 440 * 2 ** ((m - 69) / 12)

def marimba(m, d=1.2, v=1.0):
    n = S(d); tt = np.arange(n) / SR; f = nota(m)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5) + 0.35 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 22) + 0.15 * np.sin(2 * np.pi * f * 9.9 * tt) * np.exp(-tt * 40)
    return x * (1 - np.exp(-tt * 600)) * v
def ped(ms, a, b, g):
    e = np.clip((t - a) / 1.0, 0, 1) * np.clip((b - t) / 1.0, 0, 1)
    x = sum(np.sin(2 * np.pi * nota(m) * t + 0.25 * np.sin(2 * np.pi * 4.8 * t + m)) for m in ms)
    return lp(x, 1200) * e * g / len(ms)

# akorlar: Re majör, aydınlık (I - vi - IV - V döngüsü), sahne başlarına bağlı
dongu = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]
basl = [0.0] + [an(c) - 0.35 for c in range(1, 10)]
muzik = np.zeros(N)
for i, bas in enumerate(basl):
    bit = basl[i + 1] if i + 1 < len(basl) else DUR
    ak = dongu[i % 4] if i < 9 else [62, 66, 69, 74]
    muzik += ped(ak, bas, bit + 0.8, 0.045) + ped([ak[0] - 12], bas, bit + 0.8, 0.05)
    adim, k = 0.30, 0
    desen = [0, 2, 1, 2, 3, 2, 1, 2]
    while bas + k * adim < bit - 0.05:
        m = (ak + [ak[0] + 12])[desen[k % 8]] + 12
        s0 = S(bas + k * adim); p = marimba(m, 1.0, 0.07 if k % 2 == 0 else 0.045)
        muzik[s0:s0 + len(p)] += p[:max(0, N - s0)]
        k += 1
# hafif ritim: yumuşak tıkırtı
def tik():
    n = S(0.04); return hp(rng.standard_normal(n), 4000) * np.exp(-np.arange(n) / SR * 150)
for k in range(int(DUR / 0.6)):
    st(tik(), 0.3 + k * 0.6, 0.02 if k % 2 else 0.032, 0.3)
L += muzik; R += muzik

# efektler
def damla(f=900):
    n = S(0.22); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.6 * np.exp(-tt * 45))) / SR) * np.exp(-tt * 24)
def dokme(d):
    n = S(d); x = hp(lp(rng.standard_normal(n), 4500), 250)
    x *= 0.6 + 0.4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 3.3))
    return x * np.hanning(n)
def kabarcik(n=10, sure=1.5):
    out = np.zeros(S(sure + 0.3))
    for _ in range(n):
        d = damla(1200 + rng.random() * 1400) * 0.5; s0 = S(rng.random() * sure)
        out[s0:s0 + len(d)] += d[:len(out) - s0]
    return out
def vus(d=0.5):
    n = S(d); x = hp(lp(rng.standard_normal(n), 2500), 400)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2
st(dokme(2.0), 0.2, 0.05); st(kabarcik(12, 2.0), 1.4, 0.06)
for c in range(1, 10): st(vus(0.45), an(c) - 0.5, 0.05, (-1) ** c * 0.4)
for k in range(3): st(damla(700 + 200 * k), an(1, 4) + k * 0.3, 0.06, 0.3)
st(kabarcik(8, 1.5), an(2, 2), 0.05, -0.3)
st(damla(600), an(3, 2), 0.07)
st(damla(1000), an(4, 6), 0.06); st(damla(1300), an(4, 6) + 0.2, 0.05)
st(kabarcik(10, 1.8), an(5, 1), 0.05, 0.2)
st(damla(1100), an(6, 2), 0.05, -0.4); st(damla(900), an(6, 4), 0.05, 0.4)
for k in range(6): st(damla(800 + 120 * k), an(7, 3) + k * 0.25, 0.04, -0.3)
for k in range(6): st(damla(800 + 120 * k), an(7, 8) + k * 0.25, 0.04, 0.3)
st(damla(1500), an(8, 4), 0.06)
st(dokme(3.0), an(9, 1), 0.10); st(kabarcik(14, 2.2), an(9, 3), 0.06)
def can(f, d=3.0):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (1 + r * 0.6)) * g for r, g in ((1, 1), (2.76, .4), (5.4, .15)))
st(can(1175), an(9, 6), 0.05)

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

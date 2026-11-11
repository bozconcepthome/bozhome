#!/usr/bin/env python3
"""Sehpa satış hikâyesi: ElevenLabs anlatımı + hikâye müziği + efektler -> public/sehpahikaye/mix.wav (+ altyazi.srt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/sehpahikaye", 44100, 58.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(58)
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
def piyano(m, d=3.0):
    n = S(d); tt = np.arange(n) / SR; f = nota(m)
    return sum(np.sin(2 * np.pi * f * k * tt * (1 + 0.0003 * k * k)) * np.exp(-tt * (0.9 + k * 0.75)) / k ** 1.15 for k in range(1, 8)) * (1 - np.exp(-tt * 250))
def ped(ms, a, b, g, atk=1.2, rel=1.2):
    e = np.clip((t - a) / atk, 0, 1) * np.clip((b - t) / rel, 0, 1)
    return lp(sum(np.sin(2 * np.pi * nota(m) * t + 0.25 * np.sin(2 * np.pi * 5 * t + m)) + 0.25 * np.sin(4 * np.pi * nota(m) * t) for m in ms), 1600) * e * g / len(ms)
def zil(f, d=2.5):
    n = S(d); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * (1.4 + r)) * g for r, g in ((1, 1), (2.76, .35), (5.4, .12)))

T_SONRA, T_GELDI = an(4), an(4, 2)
muzik = np.zeros(N)
# 1) dağınık başlangıç: seyrek, hafif hüzünlü piyano (Re minör), saat tik-takı
for k, (zaman, m) in enumerate([(0.2, 62), (1.4, 65), (2.6, 69), (4.3, 60), (5.5, 64), (6.7, 67), (9.4, 58), (10.6, 62), (11.8, 65), (13.4, 57), (14.6, 60), (15.8, 64)]):
    muzik[S(zaman):S(zaman) + S(3)] += piyano(m, 3)[:N - S(zaman)] * 0.06
muzik += ped([50, 53, 57], 0, T_SONRA + 0.2, 0.035, 2, 0.6)
for k in range(int((T_SONRA - 0.3) / 0.5)):
    n = S(0.025); st(hp(rng.standard_normal(n), 3000) * np.exp(-np.arange(n) / SR * 260), 0.25 + k * 0.5, 0.03 if k % 2 else 0.02, 0.5)
# 2) "Sonra..." sessizlik + yükselen
r0, r1 = T_SONRA - 0.2, T_GELDI + 0.1
fr = np.where((t > r0) & (t < r1), 200 + 1400 * np.clip((t - r0) / (r1 - r0), 0, 1) ** 2, 0)
muzik += np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.clip((t - r0) / (r1 - r0), 0, 1) * ((t > r0) & (t < r1)) * 0.03
# 3) açılış: sıcak, umutlu (Fa - Do - Re minör - Si bemol), hafif ritim
plan = [(T_GELDI, [53, 57, 60, 65]), (an(6) - 0.3, [48, 52, 55, 60]), (an(7) - 0.3, [50, 53, 57, 62]), (an(8) - 0.3, [46, 50, 53, 58]),
        (an(9) - 0.3, [53, 57, 60, 65]), (an(10) - 0.3, [48, 52, 55, 60]), (an(11) - 0.3, [46, 50, 53, 58]), (an(11, 5), [53, 57, 60, 65])]
for i, (bas, ak) in enumerate(plan):
    bit = plan[i + 1][0] if i + 1 < len(plan) else DUR
    muzik += ped(ak, bas, bit + 0.6, 0.05, 0.4 if i == 0 else 1.0, 0.8) + ped([ak[0] - 12], bas, bit + 0.6, 0.05, 0.5, 0.8)
    k = 0
    while bas + k * 0.375 < bit - 0.05:
        m = (ak + [ak[0] + 12, ak[1] + 12])[[0, 2, 4, 3, 1, 3, 5, 2][k % 8]] + 12
        p = piyano(m, 1.8) * (0.045 if k % 2 else 0.06); s0 = S(bas + k * 0.375); muzik[s0:s0 + len(p)] += p[:max(0, N - s0)]
        k += 1
for k in range(int((DUR - an(5)) / 0.375)):
    tt0 = an(5) + k * 0.375
    if k % 4 == 2:
        n = S(0.14); st(lp(hp(rng.standard_normal(n), 900), 5000) * np.exp(-np.arange(n) / SR * 28), tt0, 0.05, -0.2)
    n = S(0.05); st(hp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * 70), tt0, 0.02 if k % 2 else 0.012, 0.4)
L += muzik; R += muzik

# efektler
def whoosh(d, f0, f1):
    n = S(d); x = rng.standard_normal(n); out = np.zeros(n); seg = n // 24
    for i in range(24):
        out[i * seg:(i + 1) * seg] = lp(x, f0 * (f1 / f0) ** (i / 23))[i * seg:(i + 1) * seg]
    return out * np.hanning(n)
def tok(f=80, d=0.3, g2=0.4):
    n = S(d); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) + lp(rng.standard_normal(n), 2000) * np.exp(-tt * 45) * g2
def kagit(d=0.4):
    n = S(d); return hp(rng.standard_normal(n), 1800) * np.hanning(n) * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 2 * np.pi * 12) ** 2)
def parilti(d=1.0, adet=9):
    out = np.zeros(S(d))
    for k in range(adet):
        s = zil(2200 + rng.uniform(0, 2800), 0.5)[:len(out)]; o = S(k * d / (adet + 1)); out[o:o + len(s)] += s[:len(out) - o]
    return out
st(kagit(0.5), an(1) - 0.1, 0.08, -0.4); st(tok(140, 0.2), an(1, 2) + 0.1, 0.12, 0.3)
st(zil(1300, 0.6) * 0.5, an(1, 4) + 0.2, 0.05, 0.4)
n = S(0.9); serit = hp(rng.standard_normal(n), 2500) * (0.5 + 0.5 * (np.sin(np.arange(n) / SR * 2 * np.pi * 40) > 0)) * np.hanning(n)
st(serit, an(2, 2) - 0.2, 0.06)
st(tok(55, 0.6, 0.6), an(3, 2) - 0.05, 0.4)
n = S(0.5); st(np.sign(np.sin(2 * np.pi * 110 * np.arange(n) / SR)) * np.exp(-np.arange(n) / SR * 6) * 0.3, an(3, 6), 0.06)
st(whoosh(1.0, 300, 4000), T_GELDI - 0.75, 0.2)
st(tok(60, 0.5, 0.3), T_GELDI + 0.05, 0.5)
for i, m in enumerate([77, 81, 84, 89]): st(zil(nota(m), 2.4), T_GELDI + 0.1 + i * 0.06, 0.05, -0.3 + i * 0.2)
st(parilti(1.2), an(5, 4) - 0.1, 0.045, 0.3)
st(parilti(1.2), an(8, 2) - 0.1, 0.05, -0.3)
st(zil(1567.98, 0.8) + zil(2093, 0.8) * 0.5, an(6, 2) + 0.15, 0.07, -0.2)
st(tok(120, 0.25, 0.6), an(6, 3) + 0.15, 0.2, 0.2)
st(tok(200, 0.2, 0.2), an(6, 5) + 0.12, 0.12)
for k, i in enumerate([2, 3, 4]): st(kagit(0.35), an(7, i), 0.09, 0.3); st(tok(160, 0.15, 0.5), an(7, i) + 0.25, 0.08)
for k, i in enumerate([0, 3, 6]): st(whoosh(0.45, 600, 3500), an(9, i) - 0.3, 0.12, (k - 1) * 0.6)
st(whoosh(0.8, 3500, 500), an(10) - 0.3, 0.14)
for i, m in enumerate([84, 88, 91, 96]): st(zil(nota(m), 2.6), an(11) + i * 0.07, 0.05, -0.3 + i * 0.2)
st(parilti(1.4), an(11, 6), 0.04)

ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=150:makeup=2", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 5); zarf /= zarf.max()
duck = 1 - 0.5 * np.clip(zarf * 4, 0, 1)
L = L * duck + ses * 0.92; R = R * duck + ses * 0.92
out = np.stack([L, R], 1)
out *= np.clip(np.minimum(t / 0.2, (DUR - t) / 1.0), 0, 1)[:, None]
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

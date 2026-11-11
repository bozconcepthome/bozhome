#!/usr/bin/env python3
"""Pompeii: ElevenLabs anlatımı + sinematik müzik + efektler -> public/pompeii/mix.wav (+ altyazi.srt)"""
import json, subprocess, wave
import numpy as np
from scipy.signal import lfilter

KL, SR, DUR = "public/pompeii", 44100, 41.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(79)
K = json.load(open(f"{KL}/kelimeler.json", encoding="utf-8"))
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
def ped(ms, a, b, g, atk=2, rel=2):
    x = sum(np.sin(2 * np.pi * nota(m) * t + 0.3 * np.sin(2 * np.pi * 4.6 * t + m)) + 0.35 * np.sin(4 * np.pi * nota(m) * t + 1) for m in ms)
    return lp(x, 1800) * env(a, b, atk, rel) * g / len(ms)
brown = lambda: lp(np.cumsum(rng.standard_normal(N)) * 0.02, 400) - lp(lp(np.cumsum(rng.standard_normal(N)) * 0.02, 400), 6)

T = dict(sokak=an(0, 4), fakat=an(1), anda=an(2), kul=an(2, 5), saatler=an(3), karardi=an(4, 1), cokme=an(4, 3),
         kacabildi=an(5, 2), gaz=an(5, 6), yuzyil=an(6), son=an(7), devam=an(7, 6))
# müzik: Re minör yaylı ped, gerilim, kapanışta Re majöre yumuşama
muzik = ped([50, 57, 62], 0, T["fakat"] + 0.5, 0.06, 1.5, 1.5)
muzik += ped([50, 53, 57, 62], T["fakat"] - 0.3, T["anda"] + 0.2, 0.07, 1.5, 0.3)
muzik += ped([38, 50, 53, 56], T["anda"], T["yuzyil"] + 0.3, 0.06, 0.3, 1.5)
muzik += ped([50, 53, 57, 60], T["yuzyil"] - 0.3, T["son"] + 0.3, 0.06, 1.5, 1.0)
muzik += ped([50, 54, 57, 62, 66], T["son"] - 0.2, DUR, 0.065, 1.5, 1.5)
# gerilim tremolosu
trem = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * t))
muzik += ped([62, 63], T["fakat"], T["anda"], 0.03, 1, 0.2) * trem
L += muzik; R += muzik
# ortam: kuşlar ve uzak kalabalık (sokak)
ruzgar = lp(rng.standard_normal(N), 600); ruzgar /= np.abs(ruzgar).max()
L += ruzgar * 0.04 * env(0, T["anda"] + 1, 0.5, 2); R += np.roll(ruzgar, 300) * 0.04 * env(0, T["anda"] + 1, 0.5, 2)
kalabalik = sum(lp(hp(rng.standard_normal(N), 250 + 80 * k), 1300 + 200 * k) * (0.5 + 0.5 * np.sin(2 * np.pi * (1.3 + 0.37 * k) * t + k)) for k in range(5))
kalabalik /= np.abs(kalabalik).max()
L += kalabalik * 0.05 * env(T["sokak"] - 0.6, T["fakat"] + 0.8, 0.8, 1.5); R += np.roll(kalabalik, 900) * 0.05 * env(T["sokak"] - 0.6, T["fakat"] + 0.8, 0.8, 1.5)
def kus(f0):
    n = S(0.16); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 + 800 * np.sin(np.pi * tt / 0.16)) / SR) * np.sin(np.pi * tt / 0.16)
for k, z in enumerate([0.4, 0.6, 1.5, 3.1, 3.3, 4.6]): st(kus(2700 + 250 * (k % 3)), z, 0.02, -0.5)
for k in range(9):  # tıkırtı / pazar sesi
    n = S(0.06); st(lp(rng.standard_normal(n), 2500) * np.exp(-np.arange(n) / SR * 60), T["sokak"] + 0.2 + k * 0.42, 0.05, (k % 3 - 1) * 0.5)
# yer altı uğultusu / sarsıntı
ugul = brown(); ugul /= np.abs(ugul).max()
L += ugul * 0.35 * env(T["fakat"] - 0.2, T["anda"] + 0.3, 2.5, 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t))
R += ugul * 0.35 * env(T["fakat"] - 0.2, T["anda"] + 0.3, 2.5, 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t))
# patlama
def boom(f0, d, f1, decay=1.2):
    n = S(d); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 2)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * decay)
st(boom(55, 6, 24, 0.6), T["anda"] - 0.05, 0.9)
st(lp(rng.standard_normal(S(3)), 1800) * np.exp(-np.arange(S(3)) / SR * 1.5), T["anda"] - 0.05, 0.5)
# sürekli kükreyen sütun
kukreme = brown(); kukreme /= np.abs(kukreme).max()
kuk = kukreme * env(T["anda"], T["yuzyil"] + 0.2, 0.3, 1.2) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.5 * t))
L += kuk * 0.32; R += np.roll(kuk, 700) * 0.32
# pomza / taş yağmuru: çok sayıda küçük tıkırtı
for k in range(260):
    z = T["saatler"] - 0.2 + rng.random() * (T["yuzyil"] - T["saatler"])
    n = S(0.04); x = hp(rng.standard_normal(n), 1200 + rng.random() * 2500) * np.exp(-np.arange(n) / SR * (80 + rng.random() * 80))
    st(x, z, 0.03 + 0.04 * rng.random(), rng.uniform(-0.8, 0.8))
yagmur = hp(lp(rng.standard_normal(N), 5000), 800) * env(T["saatler"] - 0.3, T["yuzyil"], 1.2, 1.0)
L += yagmur * 0.06; R += np.roll(yagmur, 200) * 0.06
# çöken çatılar
def cokus(seed):
    g = np.random.default_rng(seed); n = S(1.6); tt = np.arange(n) / SR
    x = lp(g.standard_normal(n), 2500) * (np.exp(-tt * 3) + (g.random(n) > 0.997) * 2 * np.exp(-tt * 2))
    return x + np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 5) * 0.9
for k, dz in enumerate([0.0, 0.5, 1.0]): st(cokus(k), T["cokme"] + dz, 0.4, (k - 1) * 0.6)
# piroklastik akıntı: yaklaşan derin kükreme
ak = lp(brown(), 300) + 0.3 * lp(rng.standard_normal(N), 900)
ak /= np.abs(ak).max()
akEnv = np.clip((t - (T["kacabildi"] + 0.6)) / (T["gaz"] + 1.5 - T["kacabildi"]), 0, 1) ** 1.5 * np.clip((T["yuzyil"] + 0.2 - t) / 0.8, 0, 1)
L += ak * akEnv * 0.55; R += ak * akEnv * 0.55
# kapanış: sessizlik, rüzgâr, ağustos böceği yerine hafif kuş
L += ruzgar * 0.035 * env(T["yuzyil"] - 0.2, DUR, 1.5, 1.5); R += np.roll(ruzgar, 400) * 0.035 * env(T["yuzyil"] - 0.2, DUR, 1.5, 1.5)
for k, z in enumerate([1.2, 1.4, 3.6, 5.8, 6.0, 8.4]): st(kus(2900 + 200 * (k % 2)), T["yuzyil"] + z, 0.018, 0.5)
def fırca():
    n = S(0.5); return hp(rng.standard_normal(n), 2500) * np.hanning(n) * (0.5 + 0.5 * np.sin(np.arange(n) / SR * 2 * np.pi * 6) ** 2)
for k in range(4): st(fırca(), an(6, 2) + k * 0.55, 0.05, 0.2)

ham = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{KL}/ses.mp3", "-af",
    "highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=150:makeup=2", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
ses = np.frombuffer(ham, np.float32).astype(np.float64)[:N]
ses = np.pad(ses, (0, N - len(ses))); ses /= np.abs(ses).max() + 1e-9
zarf = lp(np.abs(ses), 5); zarf /= zarf.max()
duck = 1 - 0.62 * np.clip(zarf * 4, 0, 1)
L = L * duck + ses * 0.92; R = R * duck + ses * 0.92
out = np.stack([L, R], 1)
out *= np.clip(np.minimum(t / 0.15, (DUR - t) / 1.0), 0, 1)[:, None]
out /= max(1.0, np.abs(out).max() / 0.97)
out = np.tanh(out * 1.1) / np.tanh(1.1)
with wave.open(f"{KL}/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
def ts(x):
    ms = int(round(x * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
with open(f"{KL}/altyazi.srt", "w", encoding="utf-8") as f:
    for i, c in enumerate(sorted({k["c"] for k in K})):
        ks = [k for k in K if k["c"] == c]
        f.write(f"{i + 1}\n{ts(ks[0]['s'])} --> {ts(min(DUR, ks[-1]['e'] + 0.3))}\n{' '.join(k['w'] for k in ks)}\n\n")
print("mix.wav ve altyazi.srt yazıldı")

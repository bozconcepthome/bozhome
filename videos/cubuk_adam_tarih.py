"""15 saniyelik, seslendirmeli çöp adam (stick figure) bilgilendirici tarih videosu.

Konu: "15 Saniyede Evin Tarihi"
Kullanım:  python3 videos/cubuk_adam_tarih.py
Çıktı:     videos/cubuk_adam_tarih_15s.mp4  (1080x1920, 30 fps, sesli)
Gereksinim: Pillow, numpy, ffmpeg, espeak-ng (Türkçe ses: `apt-get install espeak-ng`)
"""
import math
import os
import random
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 15.0
N = int(FPS * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "cubuk_adam_tarih_15s.mp4")
VOICE, SPEED, PITCH = "tr+m3", 180, 50
SR = 22050

LINES = [
    dict(tag="", say="On beş saniyede, evin tarihi!", sub="15 saniyede evin tarihi!"),
    dict(tag="MÖ 3000", say="Mısır'da ilk sandalyeler, statü simgesiydi.",
         sub="Mısır'da ilk sandalyeler statü simgesiydi."),
    dict(tag="1700'LER", say="Bin yedi yüzler: altın, oyma, gösteriş.",
         sub="1700'ler: altın, oyma, gösteriş."),
    dict(tag="1919", say="Bauhaus geldi: süs değil, işlev!", sub="Bauhaus geldi: süs değil, işlev!"),
    dict(tag="BUGÜN", say="Bugün: konfor ve sadelik. Boz Concept Home.",
         sub="Bugün: konfor ve sadelik."),
]

BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
if not os.path.exists(BOLD):
    BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
F_TITLE = ImageFont.truetype(SERIF, 96)
F_TAG = ImageFont.truetype(BOLD, 52)
F_SUB = ImageFont.truetype(BOLD, 54)
F_BRAND = ImageFont.truetype(BOLD, 40)

PAPER = (250, 247, 240)
INK = (30, 30, 30)
GOLD = (214, 160, 40)
SAND = (232, 200, 140)
RED, BLUE, YEL = (214, 48, 39), (30, 80, 170), (245, 196, 0)
WOOD = (150, 100, 60)
SOFA = (120, 150, 140)

# ---------------------------------------------------------------- ses
def tts(text, path):
    subprocess.run(["espeak-ng", "-v", VOICE, "-s", str(SPEED), "-p", str(PITCH),
                    "-w", path, text], check=True)
    with wave.open(path) as w:
        sr = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if sr != SR:  # basit yeniden örnekleme
        x = np.linspace(0, len(data) - 1, int(len(data) * SR / sr))
        data = np.interp(x, np.arange(len(data)), data)
    # baş/son sessizliği kırp
    nz = np.where(np.abs(data) > 0.01)[0]
    return data[nz[0]:nz[-1] + 1] if len(nz) else data

def build_audio(tmp):
    clips = [tts(l["say"], os.path.join(tmp, f"l{i}.wav")) for i, l in enumerate(LINES)]
    lead, gap, tail = 0.25, 0.3, 0.6
    total = sum(len(c) for c in clips) / SR + lead + gap * (len(clips) - 1) + tail
    tempo = max(1.0, total / DUR)
    if tempo > 1.0:  # sığmazsa hafifçe hızlandır (ffmpeg atempo ile perdeyi koruyarak)
        sped = []
        for i, c in enumerate(clips):
            a, b = os.path.join(tmp, f"c{i}.raw"), os.path.join(tmp, f"d{i}.raw")
            c.astype(np.float32).tofile(a)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1",
                            "-i", a, "-filter:a", f"atempo={tempo:.4f}", "-f", "f32le", b], check=True)
            sped.append(np.fromfile(b, dtype=np.float32))
        clips = sped
    voice = np.zeros(int(DUR * SR), dtype=np.float32)
    env = np.zeros(N)  # kare başına konuşma şiddeti (ağız animasyonu)
    starts, t = [], lead
    for c in clips:
        starts.append(t)
        s = int(t * SR)
        voice[s:s + len(c)] += c[:len(voice) - s]
        t += len(c) / SR + gap
    for f in range(N):
        a, b = int(f / FPS * SR), int((f + 1) / FPS * SR)
        env[f] = np.sqrt(np.mean(voice[a:b] ** 2)) if b > a else 0
    env /= env.max() or 1
    # yumuşak arka plan müziği (pentatonik, hafif)
    tt = np.arange(len(voice)) / SR
    notes = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66]
    music = np.zeros_like(voice)
    beat = 0.5
    for k in range(int(DUR / beat)):
        s, e = int(k * beat * SR), int((k + 1) * beat * SR)
        seg = tt[s:e] - k * beat
        f0 = notes[k % len(notes)]
        music[s:e] += 0.05 * np.sin(2 * np.pi * f0 * seg) * np.exp(-seg * 4)
    music += 0.025 * np.sin(2 * np.pi * 130.81 * tt)
    fade = np.clip(np.minimum(tt / 0.8, (DUR - tt) / 1.0), 0, 1)
    mix = voice * 0.95 + music * fade
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    path = os.path.join(tmp, "mix.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    return path, starts, env

# ---------------------------------------------------------------- çizim yardımcıları
class Pen:
    """Elle çizilmiş 'titreşim' efekti: her 4 karede bir küçük rastgele kayma."""
    def __init__(self, d, frame):
        self.d = d
        self.rng = random.Random(frame // 4)
    def j(self, p, amt=2.5):
        return (p[0] + self.rng.uniform(-amt, amt), p[1] + self.rng.uniform(-amt, amt))
    def line(self, pts, fill=INK, width=9):
        pts = [self.j(p) for p in pts]
        self.d.line(pts, fill=fill, width=width, joint="curve")
        r = width / 2
        for p in (pts[0], pts[-1]):
            self.d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)
    def poly(self, pts, fill=None, outline=INK, width=7):
        pts = [self.j(p) for p in pts]
        self.d.polygon(pts, fill=fill)
        self.d.line(pts + [pts[0]], fill=outline, width=width, joint="curve")
    def circle(self, c, r, fill=None, outline=INK, width=8):
        c = self.j(c)
        self.d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill, outline=outline, width=width)
    def rect(self, x0, y0, x1, y1, fill=None, width=7):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill=fill, width=width)

def vec(a, L):
    r = math.radians(a)
    return (math.sin(r) * L, math.cos(r) * L)  # 0 = aşağı, 90 = sağ, 180 = yukarı

def add(p, v):
    return (p[0] + v[0], p[1] + v[1])

def figure(pen, hip, pose, s=1.0, mouth=0.0, hat=None, face=1):
    """Çöp adam. pose: torso, la1, la2, ra1, ra2, ll1, ll2, rl1, rl2 (derece)."""
    P = dict(torso=180, la1=-20, la2=-10, ra1=20, ra2=10, ll1=-10, ll2=-5, rl1=10, rl2=5)
    P.update(pose)
    neck = add(hip, vec(P["torso"], 190 * s))
    head = add(neck, vec(P["torso"], 62 * s))
    pen.line([hip, neck])
    for a1, a2 in (("la1", "la2"), ("ra1", "ra2")):
        el = add(neck, vec(P[a1], 105 * s)); hd = add(el, vec(P[a2], 95 * s))
        pen.line([neck, el, hd])
    for a1, a2 in (("ll1", "ll2"), ("rl1", "rl2")):
        kn = add(hip, vec(P[a1], 120 * s)); ft = add(kn, vec(P[a2], 120 * s))
        pen.line([hip, kn, ft])
    r = 55 * s
    if hat == "pharaoh":
        hx, hy = head
        pen.poly([(hx - r * 0.9, hy - r * 0.6), (hx + r * 0.9, hy - r * 0.6),
                  (hx + r * 1.5, hy + r * 1.3), (hx - r * 1.5, hy + r * 1.3)], fill=(40, 90, 170))
        for k in range(1, 4):
            yy = hy - r * 0.6 + k * r * 0.48
            pen.d.line([(hx - r * (0.9 + 0.32 * k), yy), (hx + r * (0.9 + 0.32 * k), yy)], fill=GOLD, width=8)
    if hat == "wig":
        hx, hy = head
        for k in range(-3, 4):
            pen.circle((hx + k * r * 0.32, hy - r * 0.95 + abs(k) * 6), r * 0.32, fill=(245, 245, 245), width=5)
        for side in (-1, 1):
            for k in range(3):
                pen.circle((hx + side * r * 1.05, hy - r * 0.3 + k * r * 0.55), r * 0.3, fill=(245, 245, 245), width=5)
    pen.circle(head, r, fill=PAPER)
    if hat == "wig":
        for k in range(-3, 4):
            pen.circle((head[0] + k * r * 0.32, head[1] - r * 0.95 + abs(k) * 6), r * 0.32, fill=(245, 245, 245), width=5)
    if hat == "crown":
        hx, hy = head
        pen.poly([(hx - r * .7, hy - r * .7), (hx - r * .7, hy - r * 1.4), (hx - r * .35, hy - r * 1.0),
                  (hx, hy - r * 1.5), (hx + r * .35, hy - r * 1.0), (hx + r * .7, hy - r * 1.4),
                  (hx + r * .7, hy - r * .7)], fill=GOLD, width=5)
    # yüz
    ex = 18 * s * face
    hx, hy = head
    for dx in (-18 * s, 18 * s):
        pen.d.ellipse([hx + dx + ex * .4 - 6, hy - 14 * s - 6, hx + dx + ex * .4 + 6, hy - 14 * s + 6], fill=INK)
    mo = 4 + 22 * s * mouth
    mx = hx + ex * .4
    if mouth > 0.15:
        pen.d.ellipse([mx - 16 * s, hy + 16 * s - mo / 2, mx + 16 * s, hy + 16 * s + mo / 2], fill=INK)
    else:
        pen.d.arc([mx - 20 * s, hy, mx + 20 * s, hy + 30 * s], 20, 160, fill=INK, width=6)
    return head

def text_c(d, y, txt, f, fill, stroke=0, sfill=PAPER):
    w = d.textlength(txt, font=f)
    d.text(((W - w) / 2, y), txt, font=f, fill=fill, stroke_width=stroke, stroke_fill=sfill)

def ease(t):
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

GROUND = 1380

# ---------------------------------------------------------------- sahneler
def scene_intro(pen, t, lt, m):
    d = pen.d
    # yürüyerek gel, el salla
    walk = ease(lt / 1.2)
    x = -150 + (W / 2 + 150) * walk
    sw = math.sin(t * 14) * 30 * (1 - walk)
    wave_ = math.sin(t * 12) * 25 if walk > 0.95 else 0
    pose = dict(ll1=-sw, ll2=-sw * .3, rl1=sw, rl2=sw * .3, la1=sw * .8 - 15)
    if walk > 0.95:
        pose.update(ra1=130, ra2=165 + wave_)
    else:
        pose.update(ra1=-sw * .8 + 15)
    figure(pen, (x, GROUND - 240), pose, mouth=m)
    # başlık kartı
    a = ease((lt - 0.2) / 0.5)
    if a > 0:
        y = 400 - (1 - a) * 60
        pen.rect(110, y, W - 110, y + 300, fill=(255, 236, 170))
        text_c(d, y + 45, "15 Saniyede", F_TITLE, INK)
        text_c(d, y + 160, "Evin Tarihi", F_TITLE, INK)

def chair_egypt(pen, x):
    pen.line([(x - 90, GROUND - 230), (x + 90, GROUND - 230)], fill=WOOD, width=16)   # oturak
    pen.line([(x - 90, GROUND - 230), (x - 90, GROUND - 480)], fill=WOOD, width=14)   # sırt
    for lx in (x - 80, x + 80):
        pen.line([(lx, GROUND - 230), (lx, GROUND - 30)], fill=WOOD, width=12)
        pen.circle((lx, GROUND - 20), 16, fill=GOLD, width=5)  # hayvan ayağı detayı

def scene_egypt(pen, t, lt, m):
    pen.d.rectangle([0, GROUND, W, H], fill=SAND)
    pen.circle((860, 420), 80, fill=(250, 210, 80), outline=(230, 170, 40))
    for px, ph, pw in ((200, 380, 260), (420, 220, 190)):
        pen.poly([(px - pw, GROUND), (px, GROUND - ph - 200), (px + pw, GROUND)], fill=(225, 185, 120))
    cx = 740
    chair_egypt(pen, cx)
    nod = math.sin(t * 5) * 4
    figure(pen, (cx - 40, GROUND - 250), dict(torso=180 + nod, ll1=90, ll2=0, rl1=95, rl2=5,
           la1=40, la2=95, ra1=60, ra2=150 + math.sin(t * 6) * 10), mouth=m, hat="pharaoh")

def chair_rococo(pen, x):
    pen.poly([(x - 100, GROUND - 250), (x + 110, GROUND - 250), (x + 120, GROUND - 210), (x - 110, GROUND - 210)], fill=(170, 40, 70))
    pen.poly([(x - 110, GROUND - 250), (x - 140, GROUND - 560), (x - 30, GROUND - 600), (x - 60, GROUND - 250)], fill=GOLD)
    pen.d.arc([x - 170, GROUND - 640, x - 60, GROUND - 540], 180, 360, fill=INK, width=8)
    for lx, dirn in ((x - 95, -1), (x + 105, 1)):
        pts = [(lx + dirn * 30 * math.sin(k / 6 * math.pi), GROUND - 210 + k * 32) for k in range(7)]
        pen.line(pts, fill=GOLD, width=14)
    for k in range(5):
        pen.circle((x - 85 + k * 10 - 20, GROUND - 400 + k * 20), 8, fill=None, outline=(150, 100, 20), width=4)

def scene_rococo(pen, t, lt, m):
    d = pen.d
    d.rectangle([0, 0, W, GROUND], fill=(245, 232, 225))
    for k in range(7):  # duvar kağıdı deseni
        for r in range(6):
            pen.d.ellipse([60 + k * 150 - 6, 260 + r * 170 - 6, 60 + k * 150 + 6, 260 + r * 170 + 6], fill=(225, 190, 175))
    pen.d.rectangle([0, GROUND, W, H], fill=(190, 140, 100))
    chair_rococo(pen, 330)
    # ayna/çerçeve
    pen.poly([(700, 380), (900, 380), (900, 640), (700, 640)], fill=(220, 235, 245), width=6)
    pen.d.rectangle([690, 370, 910, 650], outline=GOLD, width=14)
    bow = 30 * (0.5 + 0.5 * math.sin(lt * 4))
    figure(pen, (720, GROUND - 240), dict(torso=180 - bow, la1=-30, la2=-40, ra1=100 + bow, ra2=140,
           ll1=-12, rl1=12), mouth=m, hat="wig", face=-1)

def scene_bauhaus(pen, t, lt, m):
    d = pen.d
    d.rectangle([0, GROUND, W, H], fill=(225, 225, 225))
    a = [ease((lt - k * 0.25) / 0.35) for k in range(3)]
    if a[0] > 0: pen.circle((640, 520), 110 * a[0], fill=RED)
    if a[1] > 0: pen.rect(800 - 95 * a[1], 760 - 95 * a[1], 800 + 95 * a[1], 760 + 95 * a[1], fill=BLUE)
    if a[2] > 0:
        s = a[2]; pen.poly([(560, 900 + 0), (560 - 110 * s, 900 + 190 * s - 190 * 0), (560 + 110 * s, 900 + 190 * s)], fill=YEL)
    # tüp çelik sandalye
    x = 800
    st = (110, 110, 120)
    pen.line([(x - 90, GROUND - 230), (x + 80, GROUND - 230)], fill=st, width=12)
    pen.line([(x - 90, GROUND - 230), (x - 100, GROUND - 450)], fill=st, width=12)
    pen.line([(x + 80, GROUND - 230), (x + 80, GROUND - 10), (x - 110, GROUND - 10)], fill=st, width=12)
    # sunum yapan çöp adam
    pt = math.sin(t * 6) * 8
    figure(pen, (270, GROUND - 240), dict(ra1=125 + pt, ra2=120 + pt, la1=-30, la2=10), mouth=m)
    if lt > 1.2:
        pen.d.text((150, 600), "!", font=F_TITLE, fill=RED)

def scene_today(pen, t, lt, m, brand_a):
    d = pen.d
    d.rectangle([0, 0, W, GROUND], fill=(238, 244, 240))
    d.rectangle([0, GROUND, W, H], fill=(205, 185, 160))
    # pencere
    pen.rect(640, 300, 940, 620, fill=(205, 230, 245))
    pen.line([(790, 300), (790, 620)], width=6); pen.line([(640, 460), (940, 460)], width=6)
    # lamba
    pen.line([(150, GROUND), (150, GROUND - 520)], width=8)
    pen.poly([(90, GROUND - 520), (210, GROUND - 520), (180, GROUND - 620), (120, GROUND - 620)], fill=(250, 220, 120))
    # bitki
    pen.poly([(900, GROUND), (960, GROUND), (970, GROUND - 120), (890, GROUND - 120)], fill=(200, 110, 70))
    for ang in (-35, -10, 15, 40):
        pen.line([(930, GROUND - 120), add((930, GROUND - 120), vec(180 + ang, 180))], fill=(60, 140, 80), width=12)
    # kanepe
    pen.rect(260, GROUND - 420, 800, GROUND - 240, fill=SOFA)
    pen.rect(240, GROUND - 240, 820, GROUND - 120, fill=SOFA)
    pen.rect(220, GROUND - 320, 290, GROUND - 120, fill=SOFA)
    pen.rect(790, GROUND - 320, 860, GROUND - 120, fill=SOFA)
    for lx in (270, 790):
        pen.line([(lx, GROUND - 120), (lx, GROUND - 40)], width=10)
    # rahatlayan çöp adam (eller başın arkasında, bacak bacak üstüne)
    sway = math.sin(t * 3) * 4
    figure(pen, (520, GROUND - 250), dict(torso=175 + sway, la1=150, la2=40, ra1=-150, ra2=-40,
           ll1=80, ll2=10, rl1=75, rl2=-60 + sway * 3), mouth=m)
    if brand_a > 0:
        y = 470 - (1 - brand_a) * 50
        pen.rect(150, y - 30, W - 150, y + 100, fill=(255, 255, 255))
        text_c(d, y, "BOZ CONCEPT HOME", ImageFont.truetype(BOLD, 64), INK)

# ---------------------------------------------------------------- kare üretimi
def render(f, starts, env):
    t = f / FPS
    s = max(i for i, st in enumerate(starts) if t >= st - 0.15 or i == 0)
    st0 = starts[s] - 0.15 if s else 0
    lt = t - st0
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    pen = Pen(d, f)
    m = env[f] if env[f] > 0.12 else 0.0
    m = m * (0.6 + 0.4 * abs(math.sin(t * 22)))
    if s == 0: scene_intro(pen, t, lt, m)
    elif s == 1: scene_egypt(pen, t, lt, m)
    elif s == 2: scene_rococo(pen, t, lt, m)
    elif s == 3: scene_bauhaus(pen, t, lt, m)
    else: scene_today(pen, t, lt, m, ease((lt - 1.6) / 0.5))
    pen.d.line([(0, GROUND), (W, GROUND)], fill=INK, width=8)
    # dönem etiketi
    tag = LINES[s]["tag"]
    if tag:
        tw = d.textlength(tag, font=F_TAG)
        pen.rect(W / 2 - tw / 2 - 40, 150, W / 2 + tw / 2 + 40, 250, fill=(255, 236, 170))
        d.text((W / 2 - tw / 2, 168), tag, font=F_TAG, fill=INK)
    # altyazı
    sub = LINES[s]["sub"]
    words, rows, cur = sub.split(), [], ""
    for w_ in words:
        test = (cur + " " + w_).strip()
        if d.textlength(test, font=F_SUB) > W - 160: rows.append(cur); cur = w_
        else: cur = test
    rows.append(cur)
    y0 = 1560
    for k, row in enumerate(rows):
        text_c(d, y0 + k * 74, row, F_SUB, INK, stroke=0)
    # ilerleme çubuğu
    d.rectangle([0, H - 14, W * (f + 1) / N, H], fill=GOLD)
    # geçiş: kısa beyaz silme
    if s and 0 <= lt < 0.2:
        a = 1 - lt / 0.2
        img = Image.blend(img, Image.new("RGB", (W, H), PAPER), a * 0.85)
    return img

def main():
    with tempfile.TemporaryDirectory() as tmp:
        audio, starts, env = build_audio(tmp)
        print("Sahne başlangıçları:", [round(s, 2) for s in starts])
        cmd = ["ffmpeg", "-y", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", audio, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium",
               "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-t", str(DUR), "-movflags", "+faststart", OUT]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for f in range(N):
            p.stdin.write(render(f, starts, env).tobytes())
        p.stdin.close(); p.wait()
    print("Yazıldı:", OUT)

if __name__ == "__main__":
    main()

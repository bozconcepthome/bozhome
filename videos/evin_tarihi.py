"""15 saniyelik bilgilendirici tarih videosu: "15 Saniyede Evin Tarihi".

Kullanım:  python3 videos/evin_tarihi.py
Çıktı:     videos/evin_tarihi_15s.mp4  (1080x1920, 30 fps, dikey / Reels-Story formatı)
Gereksinim: Pillow, ffmpeg
"""
import math
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 15
N = FPS * DUR
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "evin_tarihi_15s.mp4")

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
SANS_B = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
for p in (SANS, SANS_B):
    if not os.path.exists(p):
        SANS = SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

BG = (244, 237, 227)
INK = (43, 36, 30)
ACCENT = (168, 112, 66)
MUTED = (120, 106, 92)

SCENES = [
    dict(tag="BİLGİ", year="", title="15 Saniyede\nEvin Tarihi",
         body="Oturduğumuz koltuğun, uyuduğumuz\nyatağın 5000 yıllık hikâyesi."),
    dict(tag="MÖ 3000", year="MÖ 3000", title="Antik Mısır",
         body="İlk sandalye ve yataklar ortaya çıktı.\nMobilya, bir statü sembolüydü."),
    dict(tag="1700'LER", year="1700", title="Barok & Rokoko",
         body="Oymalar, kıvrımlar, altın varak.\nEv, gösterişin sahnesi oldu."),
    dict(tag="1919", year="1919", title="Bauhaus",
         body="Süs yerine işlev: sade, kullanışlı,\nseri üretime uygun tasarım."),
    dict(tag="BUGÜN", year="2026", title="Konsept Ev",
         body="Konfor, sadelik ve kişisel stil\ntek bir yaşam alanında buluşuyor."),
]
SCENE_LEN = N // len(SCENES)  # 90 kare = 3 sn

def font(path, size):
    return ImageFont.truetype(path, size)

F_TAG = font(SANS_B, 40)
F_YEAR = font(SERIF, 420)
F_TITLE = font(SERIF, 112)
F_BODY = font(SANS, 50)
F_BRAND = font(SANS_B, 38)
F_SMALL = font(SANS, 32)
F_CTA = font(SANS_B, 44)

def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3

def mix(c1, c2, a):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * a) for i in range(3))

def text_center(d, y, txt, f, fill, spacing=18):
    bbox = d.multiline_textbbox((0, 0), txt, font=f, spacing=spacing, align="center")
    w = bbox[2] - bbox[0]
    d.multiline_text(((W - w) / 2, y), txt, font=f, fill=fill, spacing=spacing, align="center")
    return bbox[3] - bbox[1]

def frame(i):
    s = min(i // SCENE_LEN, len(SCENES) - 1)
    local = (i - s * SCENE_LEN) / SCENE_LEN  # 0..1
    sc = SCENES[s]
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # giriş / çıkış opaklığı
    fade_in = ease(local / 0.25)
    fade_out = 1.0 if s == len(SCENES) - 1 else 1 - ease((local - 0.85) / 0.15)
    a = fade_in * fade_out
    slide = (1 - fade_in) * 60

    # arka plan: büyük soluk yıl
    if sc["year"]:
        yc = mix(BG, (226, 214, 198), a)
        fy = F_YEAR
        size = 420
        while d.textlength(sc["year"], font=fy) > W * 0.86:
            size -= 10
            fy = font(SERIF, size)
        yw = d.textlength(sc["year"], font=fy)
        drift = local * 40
        d.text(((W - yw) / 2 + 20 - drift, 620 - size), sc["year"], font=fy, fill=yc)


    # etiket
    tag_y = 760 + slide
    tw = d.textlength(sc["tag"], font=F_TAG)
    px, py = 34, 16
    bx0 = (W - tw) / 2 - px
    d.rounded_rectangle([bx0, tag_y, bx0 + tw + 2 * px, tag_y + 48 + 2 * py], radius=40,
                        fill=mix(BG, ACCENT, a))
    d.text(((W - tw) / 2, tag_y + py + 2), sc["tag"], font=F_TAG, fill=mix(ACCENT, BG, a))

    # başlık + metin
    th = text_center(d, 900 + slide, sc["title"], F_TITLE, mix(BG, INK, a), spacing=14)
    lw2 = 160 * ease((local - 0.08) / 0.3)
    ly = 900 + slide + th + 50
    d.line([W / 2 - lw2 / 2, ly, W / 2 + lw2 / 2, ly], fill=mix(BG, ACCENT, a), width=4)
    body_a = ease((local - 0.12) / 0.25) * fade_out
    text_center(d, 900 + th + 100 + (1 - body_a) * 40, sc["body"], F_BODY, mix(BG, MUTED, body_a), spacing=22)

    # zaman çizelgesi (alt)
    ty = 1640
    x0, x1 = 120, W - 120
    d.line([x0, ty, x1, ty], fill=(214, 202, 186), width=4)
    prog = (i + 1) / N
    d.line([x0, ty, x0 + (x1 - x0) * prog, ty], fill=ACCENT, width=4)
    for k in range(len(SCENES)):
        x = x0 + (x1 - x0) * k / (len(SCENES) - 1)
        on = k <= s
        rr = 14 if k == s else 9
        d.ellipse([x - rr, ty - rr, x + rr, ty + rr], fill=ACCENT if on else (214, 202, 186))
        lbl = SCENES[k]["tag"] if k else "BAŞLA"
        lw = d.textlength(lbl, font=F_SMALL)
        d.text((x - lw / 2, ty + 30), lbl, font=F_SMALL, fill=INK if k == s else MUTED)

    # marka
    brand = "BOZ CONCEPT HOME"
    bw = d.textlength(brand, font=F_BRAND)
    d.text(((W - bw) / 2, 150), brand, font=F_BRAND, fill=INK)
    d.line([W / 2 - 40, 215, W / 2 + 40, 215], fill=ACCENT, width=3)

    # kapanış: son 1 saniye CTA
    if s == len(SCENES) - 1:
        ca = ease((local - 0.6) / 0.25)
        if ca > 0:
            cta = "Evinizin hikâyesini birlikte yazalım."
            cw = d.textlength(cta, font=F_CTA)
            d.text(((W - cw) / 2, 1440 - (1 - ca) * 20), cta, font=F_CTA, fill=mix(BG, ACCENT, ca))
    return img

def main():
    audio = ("aevalsrc='0.06*sin(2*PI*220*t)+0.04*sin(2*PI*277.18*t)+0.04*sin(2*PI*329.63*t)"
             "+0.02*sin(2*PI*440*t)*(0.5+0.5*sin(2*PI*0.5*t))':s=44100:d=15,"
             "afade=t=in:d=1.5,afade=t=out:st=13:d=2")
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "lavfi", "-i", audio,
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium",
           "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(N):
        p.stdin.write(frame(i).tobytes())
    p.stdin.close()
    p.wait()
    print("Yazıldı:", OUT)

if __name__ == "__main__":
    main()

// Tel sehpa + dergilik — 19 sn Instagram hikâye videosu (1080x1920).
// Ürünün kendi fotoğrafı (public/hikaye/urun.png, zemini şeffaflaştırılmış) kullanılır; üst 250 px ve alt 320 px Instagram arayüzü için boş bırakılır.
// Ses: edge-tts (tr-TR-EmelNeural) + ses_tasarimi_hikaye.py. Sahne anları kelime zamanlarından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/hikaye/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 19, NS = 5;
const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
const C = {krem: '#f5efe6', krem2: '#e6dccd', siyah: '#1f1b18', bakir: '#a87042', turuncu: '#f27a1a', gri: '#6f655b'};

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const zipla = (t: number, t0: number, d = 0.45) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: Easing.out(Easing.back(1.8))});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const SAHNE = Array.from({length: NS}, (_, i) => (i === 0 ? 0 : an(i) - 0.35));
const sahneOp = (t: number, i: number) => {
  const a = SAHNE[i], b = i < NS - 1 ? SAHNE[i + 1] : SURE + 1;
  return (i === 0 ? 1 : gir(t, a - 0.15, 0.4)) * (1 - gir(t, b - 0.25, 0.4));
};

// kamera: her sahnede ürünün ilgili kısmına yumuşak yaklaşma (merkez x, merkez y, yakınlık)
const KAMERA: [number, number, number][] = [[540, 960, 1], [570, 930, 1.1], [510, 960, 1.1], [540, 950, 1.06], [540, 1010, 0.9]];
const kamera = (t: number) => {
  let k = KAMERA[0];
  for (let i = 1; i < NS; i++) {
    const u = gir(t, SAHNE[i] - 0.3, 0.9);
    k = [karis(k[0], KAMERA[i][0], u), karis(k[1], KAMERA[i][1], u), karis(k[2], KAMERA[i][2], u)];
  }
  return k;
};

const Isaret: React.FC<{t: number; t0: number; op: number; hx: number; hy: number; rx: number; ry: number; ex: number; ey: number; yazi: string; w: number}> = ({t, t0, op, hx, hy, rx, ry, ex, ey, yazi, w}) => {
  const ciz = gir(t, t0, 0.45), hap = zipla(t, t0 + 0.3, 0.45), nabiz = 1 + 0.04 * Math.sin(t * 5);
  const L = Math.hypot(ex - hx, ey - hy);
  return (
    <g opacity={op}>
      <ellipse cx={hx} cy={hy} rx={rx * nabiz} ry={ry * nabiz} fill={C.bakir} fillOpacity={0.12 * ciz} stroke={C.bakir} strokeWidth={6} strokeDasharray="14 12" strokeDashoffset={-t * 30} opacity={ciz} />
      <path d={`M ${hx} ${hy} L ${ex} ${ey}`} stroke={C.siyah} strokeWidth={5} strokeDasharray={L} strokeDashoffset={L * (1 - ciz)} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={12 * ciz} fill={C.siyah} />
      <g transform={`translate(${ex},${ey}) scale(${Math.max(0.001, hap)})`} opacity={Math.min(1, hap)}>
        <rect x={-w / 2} y={-44} width={w} height={88} rx={44} fill={C.siyah} />
        <text x={0} y={15} fontFamily={METIN} fontWeight={800} fontSize={42} fill="#fff" textAnchor="middle">{yazi}</text>
      </g>
    </g>
  );
};

const BASLIK: [string, string][] = [['', ''], ['Üstü sehpa', 'Kahven ve kitabın için'], ['Yanı dergilik', 'Okudukların elinin altında'], ['Işığı geçirir', 'Odayı ferah gösterir'], ['', '']];
const PARILTI = [[300, 650], [790, 640], [520, 900], [720, 1240], [380, 1210], [610, 590]];

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 52px 'Inter'", 'ğüşıöçİ'), document.fonts.load("600 30px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 60px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const [cx, cy, z] = kamera(t);
  const giris = gir(t, 0.05, 0.9);
  const sal = Math.sin(t * 0.9) * 6;
  const kapanis = gir(t, an(4, 0) - 0.2, 0.5);
  const ok = Math.abs(Math.sin(t * 4)) * 22;
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.krem} 0%, ${C.krem} 55%, ${C.krem2} 100%)`}}>
      <Audio src={staticFile('hikaye/mix.wav')} />
      {/* yumuşak ışık lekeleri */}
      <div style={{position: 'absolute', left: -200 + sal * 4, top: 380, width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 65%)'}} />
      <div style={{position: 'absolute', left: 520 - sal * 5, top: 900, width: 760, height: 760, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,112,66,.16) 0%, rgba(168,112,66,0) 65%)'}} />

      {/* ürün + işaretler (kamera ile birlikte hareket eder) */}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${540 - cx * z}px, ${960 - cy * z + (1 - giris) * 120}px) scale(${z})`, opacity: giris}}>
        <div style={{position: 'absolute', left: 250, top: 1318, width: 600, height: 60, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(31,27,24,.28) 0%, rgba(31,27,24,0) 70%)'}} />
        <Img src={staticFile('hikaye/urun.png')} style={{position: 'absolute', left: 150, top: 137, width: 849}} />
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
          <Isaret t={t} t0={an(1, 0)} op={sahneOp(t, 1)} hx={600} hy={590} rx={250} ry={52} ex={905} ey={548} yazi="Sehpa" w={230} />
          <Isaret t={t} t0={an(2, 0)} op={sahneOp(t, 2)} hx={482} hy={1060} rx={150} ry={235} ex={300} ey={1440} yazi="Dergilik" w={270} />
          {PARILTI.map(([x, y], i) => {
            const u = Math.max(0, Math.sin((t - an(3, 2)) * 3.2 - i * 0.9));
            const s = u * sahneOp(t, 3) * gir(t, an(3, 2) - 0.2, 0.3);
            return <path key={i} d="M 0 -34 Q 4 -4 34 0 Q 4 4 0 34 Q -4 4 -34 0 Q -4 -4 0 -34 Z" fill="#fff" stroke={C.bakir} strokeWidth={2} transform={`translate(${x},${y}) scale(${s}) rotate(${t * 40})`} opacity={Math.min(1, s * 1.5)} />;
          })}
        </svg>
      </div>

      {/* 0: kanca */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', opacity: sahneOp(t, 0)}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 118, lineHeight: 1, color: C.siyah, letterSpacing: -4, opacity: gir(t, an(0, 0) - 0.1, 0.3), transform: `translateY(${(1 - gir(t, an(0, 0) - 0.1, 0.4)) * 30}px)`}}>Bir sehpa,</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 132, lineHeight: 1.1, color: C.bakir, opacity: gir(t, an(0, 2) - 0.1, 0.3), transform: `scale(${karis(1.25, 1, zipla(t, an(0, 2) - 0.1))})`}}>iki iş.</div>
      </div>
      {/* 1–3: sahne başlıkları */}
      {BASLIK.map(([ust, alt], i) => {
        if (!ust) return null;
        const op = sahneOp(t, i), u = gir(t, SAHNE[i], 0.45);
        if (op <= 0.001) return null;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', opacity: op, transform: `translateY(${(1 - u) * 30}px)`}}>
            <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 108, color: C.siyah, letterSpacing: -3.5, lineHeight: 1}}>{ust}</div>
            <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 56, color: C.bakir, marginTop: 16, opacity: gir(t, an(i, 2) - 0.15, 0.4)}}>{alt}</div>
          </div>
        );
      })}
      {/* 4: marka + çağrı */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 262, textAlign: 'center', opacity: kapanis, transform: `scale(${karis(0.9, 1, kapanis)})`}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 132, lineHeight: 0.95, color: C.siyah, letterSpacing: -5}}>BOZ</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 54, letterSpacing: 13, color: C.bakir, marginTop: 12}}>CONCEPT HOME</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1330, textAlign: 'center', opacity: gir(t, an(4, 3) - 0.2, 0.4)}}>
        <div style={{display: 'inline-block', background: C.siyah, color: '#fff', fontFamily: METIN, fontWeight: 800, fontSize: 60, letterSpacing: -1, padding: '22px 54px 24px', borderRadius: 60, transform: `scale(${karis(0.7, 1, zipla(t, an(4, 3) - 0.2))})`}}>Linke dokun</div>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 38, color: C.gri, marginTop: 18, opacity: gir(t, an(4, 5) - 0.1, 0.4)}}>Trendyol'da incele</div>
        <svg width={90} height={90} viewBox="-45 -45 90 90" style={{marginTop: 4 + ok}}>
          <path d="M 0 -30 L 0 26 M -24 4 L 0 28 L 24 4" stroke={C.turuncu} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

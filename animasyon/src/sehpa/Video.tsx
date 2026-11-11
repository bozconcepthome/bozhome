// Tel yan sehpa / dergilik — 10 sn satış videosu. Ürün: gerçek fotoğraf (public/sehpa/urun.png, 972x1180).
// Sahneler kelime zamanına bağlı (public/sehpa/kelimeler.json). Ses: public/sehpa/mix.wav
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/sehpa/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 10;
const IW = 972, IH = 1180; // ürün görseli
const METIN = "'Inter', sans-serif";
const SERIF = "'Playfair Display', serif";
const ANTRASIT = '#1f1c1a', VURGU = '#c8673a';

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const A = {
  hem: an(0), sehpa: an(0, 1), hem2: an(0, 2), dergilik: an(0, 3),
  sik: an(1), parlak: an(1, 1), evinize: an(1, 3), modern: an(1, 4),
  kahve: an(2), ustte: an(2, 1), dergi: an(2, 2), yaninda: an(2, 3),
  boz: an(3), bekliyor: an(3, 4), son: K[K.length - 1].e,
};

// ürün yerleşimi (geniş plan): görsel koordinatı -> ekran
const PS = 0.86;
const PX = 540 - (IW * PS) / 2;
const ZEMIN = 1480;
const PY = ZEMIN - 1168 * PS;
const ekran = (x: number, y: number): [number, number] => [PX + x * PS, PY + y * PS];

// kamera anahtar kareleri: [zaman, merkezX, merkezY, ölçek]
type Kare = [number, number, number, number];
const KAM: Kare[] = [
  [0, 540, 960, 1.0],
  [A.sik - 0.1, 540, 940, 1.04],
  [A.parlak + 0.25, ...ekran(790, 170), 2.05] as unknown as Kare,
  [A.evinize - 0.05, ...ekran(720, 200), 2.15] as unknown as Kare,
  [A.modern + 0.35, 540, 930, 1.0],
  [A.kahve - 0.15, 540, 900, 1.08],
  [A.dergi - 0.1, 560, 960, 1.12],
  [A.boz - 0.2, 560, 980, 1.14],
  [A.boz + 0.5, 540, 930, 0.92],
  [SURE, 540, 930, 0.96],
];
const kamera = (t: number) => {
  let i = 0;
  while (i < KAM.length - 1 && t >= KAM[i + 1][0]) i++;
  if (i === KAM.length - 1) return KAM[i].slice(1) as [number, number, number];
  const [t0, x0, y0, s0] = KAM[i], [t1, x1, y1, s1] = KAM[i + 1];
  const u = yumus(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  return [karis(x0, x1, u), karis(y0, y1, u), karis(s0, s1, u)] as [number, number, number];
};

// ---- arka planlar -------------------------------------------------------------------
const Studyo: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="url(#stGok)" />
    <rect y={ZEMIN - 260} width={1080} height={700} fill="url(#stKavis)" />
    <rect y={ZEMIN} width={1080} height={440} fill="url(#stZemin)" />
  </g>
);
const Salon: React.FC<{t: number}> = ({t}) => (
  <g>
    <rect width={1080} height={1920} fill="url(#duvar)" />
    {/* pencere ve ışık */}
    <g filter="url(#flu6)">
      <rect x={-60} y={180} width={400} height={1080} rx={6} fill="url(#pencere)" />
      <path d="M 140 180 L 140 1260 M -60 720 L 340 720" stroke="#efe9e1" strokeWidth={22} />
      <rect x={-80} y={160} width={440} height={1120} rx={8} fill="none" stroke="#f3eee8" strokeWidth={26} />
      <path d="M -40 120 Q 60 700 30 1300 L -90 1300 L -90 120 Z" fill="#efe6da" />
      <path d="M 360 120 Q 330 700 395 1300 L 330 1300 Q 290 700 320 120 Z" fill="#e8dccd" />
    </g>
    <path d={`M 360 200 L 820 ${ZEMIN + 420} L 1080 ${ZEMIN + 420} L 1080 ${ZEMIN + 120} L 400 160 Z`} fill="#fff6e6" opacity={0.16 + Math.sin(t * 0.8) * 0.02} />
    {/* tablo */}
    <g filter="url(#flu8)">
      <rect x={640} y={330} width={300} height={380} fill="#f7f3ec" stroke="#b9a58d" strokeWidth={14} />
      <circle cx={760} cy={480} r={70} fill="#d79b72" /><path d="M 680 640 Q 790 520 900 640 Z" fill="#8fa38d" />
    </g>
    {/* kanepe */}
    <g filter="url(#flu8)">
      <rect x={600} y={1060} width={620} height={300} rx={60} fill="#e4dbcf" />
      <rect x={570} y={1220} width={680} height={230} rx={50} fill="#d8cdbf" />
      <rect x={660} y={1110} width={190} height={170} rx={40} fill="#c8673a" opacity={0.85} />
      <rect x={870} y={1100} width={200} height={180} rx={40} fill="#a9b5a0" />
      <rect x={600} y={1440} width={18} height={50} fill="#6b5442" /><rect x={1180} y={1440} width={18} height={50} fill="#6b5442" />
    </g>
    {/* bitki */}
    <g filter="url(#flu6)" transform={`rotate(${Math.sin(t * 1.3) * 0.6},170,1480)`}>
      <path d="M 110 1480 L 230 1480 L 245 1330 L 95 1330 Z" fill="#cdbba4" />
      {Array.from({length: 11}, (_, i) => {
        const a = -70 + i * 14, L = 260 + rnd(i) * 220;
        const ex = 170 + Math.sin((a * Math.PI) / 180) * L, ey = 1330 - Math.cos((a * Math.PI) / 180) * L;
        return <path key={i} d={`M 170 1330 Q ${(170 + ex) / 2 - 30} ${(1330 + ey) / 2} ${ex} ${ey} Q ${(170 + ex) / 2 + 40} ${(1330 + ey) / 2 + 20} 170 1330 Z`} fill={i % 2 ? '#5f7d58' : '#71906a'} />;
      })}
    </g>
    {/* zemin: meşe parke + halı */}
    <rect y={ZEMIN - 4} width={1080} height={460} fill="url(#parke)" />
    {Array.from({length: 9}, (_, i) => <path key={i} d={`M ${-200 + i * 170} ${ZEMIN} L ${-520 + i * 250} 1920`} stroke="#8e6a48" strokeWidth={3} opacity={0.35} />)}
    {Array.from({length: 5}, (_, i) => <path key={i} d={`M 0 ${ZEMIN + 40 + i * i * 22} L 1080 ${ZEMIN + 40 + i * i * 22}`} stroke="#8e6a48" strokeWidth={2} opacity={0.18} />)}
    <ellipse cx={540} cy={ZEMIN + 40} rx={520} ry={95} fill="url(#hali)" />
    <rect y={ZEMIN - 12} width={1080} height={14} fill="#f1ebe3" />
  </g>
);

// ---- aksesuarlar (görsel koordinatında) ------------------------------------------
const Fincan: React.FC<{t: number}> = ({t}) => {
  const d = interpolate(t, [A.kahve - 0.25, A.kahve + 0.05], [0, 1], {...kis, easing: Easing.in(Easing.quad)});
  if (d <= 0) return null;
  const sek = t > A.kahve + 0.05 ? Math.exp(-(t - A.kahve - 0.05) * 9) * Math.sin((t - A.kahve - 0.05) * 30) : 0;
  const y = karis(-900, 0, d) - Math.abs(sek) * 18;
  const cx = 470, by = 74; // tabla üstü
  return (
    <g transform={`translate(0,${y})`}>
      <ellipse cx={cx + 6} cy={by + 4} rx={92} ry={14} fill="#000" opacity={0.22 * d} filter="url(#flu4)" />
      <path d={`M ${cx - 78} ${by - 190} L ${cx - 70} ${by - 12} Q ${cx} ${by + 12} ${cx + 70} ${by - 12} L ${cx + 78} ${by - 190} Z`} fill="url(#seramik)" />
      <path d={`M ${cx + 74} ${by - 160} q 70 10 62 66 q -6 46 -66 42`} fill="none" stroke="url(#seramik)" strokeWidth={20} strokeLinecap="round" />
      <ellipse cx={cx} cy={by - 190} rx={78} ry={16} fill="#f7f2ea" />
      <ellipse cx={cx} cy={by - 186} rx={68} ry={12} fill="#4a2a17" />
      <ellipse cx={cx - 18} cy={by - 189} rx={26} ry={4} fill="#c08a5c" opacity={0.6} />
      <path d={`M ${cx - 60} ${by - 175} L ${cx - 54} ${by - 30}`} stroke="#fff" strokeWidth={10} opacity={0.55} strokeLinecap="round" />
      {[0, 1, 2].map((i) => {
        const f = ((t - A.kahve) * 0.7 + i / 3) % 1;
        if (t < A.kahve + 0.2) return null;
        return <path key={i} d={`M ${cx - 20 + i * 20} ${by - 210 - f * 160} q ${-24 + Math.sin(t * 3 + i) * 10} -40 0 -80 q ${24} -40 0 -80`} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={(1 - f) * 0.55} filter="url(#flu4)" />;
      })}
    </g>
  );
};
const DERGILER = [
  {x: 618, r: -7, c1: '#f2ebe1', c2: '#c8673a', gec: 0},
  {x: 650, r: -2, c1: '#2f3b38', c2: '#e8d2b0', gec: 0.12},
  {x: 682, r: 5, c1: '#a9b5a0', c2: '#ffffff', gec: 0.24},
];
const Dergiler: React.FC<{t: number}> = ({t}) => (
  <g>
    {DERGILER.map((d, i) => {
      const u = interpolate(t, [A.dergi - 0.3 + d.gec, A.dergi + 0.15 + d.gec], [0, 1], {...kis, easing: Easing.out(Easing.back(1.3))});
      if (t < A.dergi - 0.3 + d.gec) return null;
      const y = karis(-1300, 0, u);
      return (
        <g key={i} transform={`translate(${d.x},${1120 + y}) rotate(${d.r})`}>
          <rect x={-60} y={-470} width={120} height={470} rx={4} fill={d.c1} stroke="#00000033" strokeWidth={2} />
          <rect x={-60} y={-470} width={18} height={470} fill="#00000018" />
          <rect x={-34} y={-440} width={74} height={30} fill={d.c2} />
          <rect x={-34} y={-395} width={60} height={10} fill={d.c2} opacity={0.6} />
          <rect x={-34} y={-300} width={74} height={150} fill={d.c2} opacity={0.35} />
        </g>
      );
    })}
  </g>
);

const Yildiz: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) =>
  s <= 0.01 ? null : (
    <path transform={`translate(${x},${y}) scale(${s})`} d="M 0 -34 Q 4 -4 34 0 Q 4 4 0 34 Q -4 4 -34 0 Q -4 -4 0 -34 Z" fill="#fff" filter="url(#parla)" />
  );

const Urun: React.FC<{t: number; salon: number}> = ({t, salon}) => {
  const src = staticFile('sehpa/urun.png');
  // düşüş ve sekme
  const d = interpolate(t, [0, A.sehpa], [0, 1], {...kis, easing: Easing.in(Easing.quad)});
  const sonra = Math.max(0, t - A.sehpa);
  const sek = t > A.sehpa ? Math.exp(-sonra * 7) * Math.abs(Math.sin(sonra * 13)) * 60 : 0;
  const ezil = t > A.sehpa ? 1 - Math.exp(-sonra * 14) * Math.cos(sonra * 22) * 0.035 : 1;
  const dy = karis(-1700, 0, d) - sek;
  const pasla = (t0: number, d0: number) => interpolate(t, [t0, t0 + d0], [-500, IW + 500], kis);
  const parlama1 = pasla(A.parlak - 0.1, 1.0), parlama2 = pasla(A.boz + 0.1, 0.9);
  const yildizlar = [[790, 130], [905, 330], [80, 175], [300, 100], [600, 470], [715, 1010]];
  return (
    <g>
      {/* temas gölgesi */}
      <g opacity={karis(0.15, 1, d) * (1 - Math.min(1, sek / 120))}>
        <ellipse cx={PX + 480 * PS} cy={ZEMIN + 6} rx={430 * PS} ry={26} fill="#000" opacity={0.18} filter="url(#flu12)" />
        <ellipse cx={PX + 110 * PS} cy={ZEMIN - 50 * PS} rx={110 * PS} ry={10} fill="#000" opacity={0.35} filter="url(#flu4)" />
        <ellipse cx={PX + 565 * PS} cy={ZEMIN} rx={185 * PS} ry={10} fill="#000" opacity={0.4} filter="url(#flu4)" />
      </g>
      {/* zemin yansıması */}
      <g opacity={(0.2 * salon + 0.1 * (1 - salon)) * d} transform={`translate(0,${2 * ZEMIN}) scale(1,-1)`}>
        <g transform={`translate(${PX},${PY - dy}) scale(${PS})`}>
          <g mask="url(#yansimaMaske)"><image href={src} x={0} y={0} width={IW} height={IH} /></g>
        </g>
      </g>
      <g transform={`translate(${PX},${PY + dy}) scale(${PS}) translate(${IW / 2},1168) scale(${2 - ezil},${ezil}) translate(${-IW / 2},-1168)`}>
        <image href={src} x={0} y={0} width={IW} height={IH} />
        {/* sıcak pencere ışığı ve parlama: yalnız tellerin üstünde */}
        <g mask="url(#urunMaske)">
          <rect x={0} y={0} width={IW} height={IH} fill="url(#sicakIsik)" opacity={salon * 0.55} style={{mixBlendMode: 'multiply'}} />
          <rect x={parlama1 - 160} y={-200} width={320} height={IH + 400} fill="url(#parlamaBant)" transform={`rotate(18,${parlama1},${IH / 2})`} />
          <rect x={parlama2 - 160} y={-200} width={320} height={IH + 400} fill="url(#parlamaBant)" transform={`rotate(18,${parlama2},${IH / 2})`} />
        </g>
        <Dergiler t={t} />
        {/* dergilerin önünde kalan teller (yuva boşluğu hariç) */}
        {t > A.dergi - 0.4 && (
          <g clipPath="url(#onTeller)">
            <image href={src} x={0} y={0} width={IW} height={IH} />
          </g>
        )}
        <Fincan t={t} />
        {yildizlar.map(([x, y], i) => {
          const g = Math.max(0, Math.sin(Math.min(Math.PI, Math.max(0, (t - A.parlak - i * 0.12) * 3.2))));
          const g2 = Math.max(0, Math.sin(Math.min(Math.PI, Math.max(0, (t - A.bekliyor - i * 0.08) * 3.5))));
          return <Yildiz key={i} x={x} y={y} s={Math.max(g, g2) * (0.7 + rnd(i) * 0.6)} />;
        })}
      </g>
      {/* düşüşte toz */}
      {t > A.sehpa && t < A.sehpa + 1 && Array.from({length: 18}, (_, i) => {
        const u = t - A.sehpa;
        const yon = i % 2 ? 1 : -1;
        const x = 540 + yon * (200 + rnd(i) * 220 + u * (160 + rnd(i + 3) * 200));
        const y = ZEMIN - u * (40 + rnd(i + 1) * 90) + u * u * 60;
        return <circle key={i} cx={x} cy={y} r={10 + rnd(i + 2) * 16 + u * 20} fill="#fff" opacity={(1 - u) * 0.45} filter="url(#flu6)" />;
      })}
    </g>
  );
};

// ---- yazılar ---------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.35) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1610, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(24,21,19,.78)', borderRadius: 26, padding: '18px 32px 20px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 54, lineHeight: 1.22, letterSpacing: -0.5}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.07], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 10}px) scale(${k === aktif ? 1.06 : 1})`, color: k === aktif ? '#ffb27a' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};
const Not: React.FC<{t: number; t0: number; t1: number; x: number; y: number; hx: number; hy: number; yazi: string}> = ({t, t0, t1, x, y, hx, hy, yazi}) => {
  const g = gir(t, t0, 0.3) * (1 - gir(t, t1, 0.25));
  if (g <= 0.001) return null;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M ${x} ${y} L ${karis(x, hx, g)} ${karis(y, hy, g)}`} stroke={ANTRASIT} strokeWidth={4} />
        <circle cx={hx} cy={hy} r={12 * g} fill={VURGU} stroke="#fff" strokeWidth={4} />
      </svg>
      <div style={{position: 'absolute', left: x - 160, width: 320, top: y - 76, display: 'flex', justifyContent: 'center', opacity: g, transform: `translateY(${(1 - g) * 14}px)`}}>
        <div style={{background: '#fff', color: ANTRASIT, borderRadius: 40, padding: '14px 30px 12px', fontFamily: METIN, fontWeight: 800, fontSize: 38, boxShadow: '0 10px 30px rgba(0,0,0,.18)'}}>{yazi}</div>
      </div>
    </>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([
      document.fonts.load("800 54px 'Inter'", 'ğüşıöçİ'),
      document.fonts.load("italic 700 120px 'Playfair Display'", 'ğüşıöçİ'),
      document.fonts.ready,
    ]).then(() => continueRender(bekle));
  }, [bekle]);

  const [cx, cy, s] = kamera(t);
  const sars = t > A.sehpa ? Math.exp(-(t - A.sehpa) * 8) * 10 : 0;
  const kam = `translate(${540 - cx * s + Math.sin(t * 60) * sars},${960 - cy * s + Math.cos(t * 70) * sars}) scale(${s})`;
  const kamArka = `translate(${540 - cx * s * 0.85},${960 - cy * s * 0.9}) scale(${s * 0.94 + 0.06})`;
  const proj = (x: number, y: number) => { const [wx, wy] = ekran(x, y); return [540 + (wx - cx) * s, 960 + (wy - cy) * s]; };
  const salon = gir(t, A.evinize - 0.2, 0.6);
  const hookOp = 1 - gir(t, A.sik - 0.25, 0.25);
  const yazUp = (t0: number) => gir(t, t0 - 0.06, 0.22);
  const son = gir(t, A.boz - 0.05, 0.4);
  const buton = 1 + Math.sin(Math.max(0, t - A.bekliyor) * 9) * 0.035 * (t > A.bekliyor ? 1 : 0);
  const src = staticFile('sehpa/urun.png');

  return (
    <AbsoluteFill style={{background: '#efebe6'}}>
      <Audio src={staticFile('sehpa/mix.wav')} />
      <Img src={src} style={{display: 'none'}} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="stGok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f6f3ef" /><stop offset="100%" stopColor="#e6e0d8" /></linearGradient>
          <linearGradient id="stKavis" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e6e0d8" stopOpacity="0" /><stop offset="100%" stopColor="#ddd5cb" /></linearGradient>
          <linearGradient id="stZemin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ddd5cb" /><stop offset="100%" stopColor="#cfc5b9" /></linearGradient>
          <linearGradient id="duvar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f1ebe3" /><stop offset="100%" stopColor="#d9cdbf" /></linearGradient>
          <linearGradient id="pencere" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="60%" stopColor="#e9f1f5" /><stop offset="100%" stopColor="#cfdde4" /></linearGradient>
          <linearGradient id="parke" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a47c" /><stop offset="100%" stopColor="#9c7552" /></linearGradient>
          <radialGradient id="hali" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f2ece2" /><stop offset="85%" stopColor="#e7dfd2" /><stop offset="100%" stopColor="#d9cfbf" /></radialGradient>
          <linearGradient id="seramik" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#d9d2c6" /><stop offset="30%" stopColor="#fbf8f2" /><stop offset="75%" stopColor="#e9e2d6" /><stop offset="100%" stopColor="#b9b0a2" /></linearGradient>
          <linearGradient id="sicakIsik" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ffd9a8" /><stop offset="60%" stopColor="#ffffff" /><stop offset="100%" stopColor="#c9d6e6" /></linearGradient>
          <linearGradient id="parlamaBant" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="50%" stopColor="#fff" stopOpacity="0.95" /><stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="yansimaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="70%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#fff" stopOpacity="0.9" /></linearGradient>
          <mask id="urunMaske" maskUnits="userSpaceOnUse" x={0} y={0} width={IW} height={IH} style={{maskType: 'alpha'}}>
            <image href={src} x={0} y={0} width={IW} height={IH} />
          </mask>
          <mask id="yansimaMaske" maskContentUnits="userSpaceOnUse"><rect x={0} y={0} width={IW} height={IH} fill="url(#yansimaGrad)" /></mask>
          <clipPath id="onTeller">
            <path d={`M 0 0 L ${IW} 0 L ${IW} ${IH} L 0 ${IH} Z M 606 560 L 606 985 L 698 985 L 698 560 Z`} clipRule="evenodd" />
          </clipPath>
          <filter id="flu4"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="flu6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
          <filter id="flu8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="flu12" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="parla" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <radialGradient id="vinyet" cx="50%" cy="45%" r="75%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#3a2a1a" stopOpacity="0.32" /></radialGradient>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 15)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.2" />
          </filter>
        </defs>
        <g transform={kamArka}>
          <Studyo />
          <g opacity={salon}><Salon t={t} /></g>
        </g>
        <g transform={kam}>
          <Urun t={t} salon={salon} />
        </g>
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.05} />
      </svg>

      {/* kanca */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', opacity: hookOp}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 112, color: ANTRASIT, letterSpacing: -3, opacity: yazUp(A.hem), transform: `translateY(${(1 - yazUp(A.hem)) * 30}px)`}}>
          HEM <span style={{opacity: yazUp(A.sehpa)}}>SEHPA,</span>
        </div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 132, color: VURGU, marginTop: -6, opacity: yazUp(A.hem2), transform: `scale(${karis(1.25, 1, yazUp(A.dergilik))})`}}>
          hem dergilik!
        </div>
      </div>
      {/* ara yazı */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', opacity: gir(t, A.modern - 0.05, 0.25) * (1 - gir(t, A.kahve - 0.3, 0.25))}}>
        <div style={{display: 'inline-block', background: ANTRASIT, color: '#fff', borderRadius: 50, padding: '16px 40px 14px', fontFamily: METIN, fontWeight: 800, fontSize: 46, letterSpacing: 4}}>ŞIK · PARLAK · MODERN</div>
      </div>
      <Not t={t} t0={A.kahve + 0.05} t1={A.boz - 0.3} x={240} y={300} hx={proj(470, -40)[0]} hy={proj(470, -40)[1]} yazi="Sehpa" />
      <Not t={t} t0={A.dergi + 0.2} t1={A.boz - 0.3} x={900} y={640} hx={proj(655, 760)[0]} hy={proj(655, 760)[1]} yazi="Dergilik" />
      {/* kapanış */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', opacity: son, transform: `translateY(${(1 - son) * 30}px)`}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 74, letterSpacing: 12, color: ANTRASIT}}>BOZ CONCEPT HOME</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 60, color: VURGU, marginTop: 6}}>sizi bekliyor</div>
        <div style={{display: 'inline-block', marginTop: 30, background: VURGU, color: '#fff', borderRadius: 60, padding: '20px 54px 18px', fontFamily: METIN, fontWeight: 800, fontSize: 44, transform: `scale(${buton})`, opacity: gir(t, A.bekliyor - 0.1, 0.3), boxShadow: '0 14px 34px rgba(200,103,58,.4)'}}>
          Şimdi keşfedin →
        </div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

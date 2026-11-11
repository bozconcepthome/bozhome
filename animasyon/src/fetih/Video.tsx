// "1453: Gemiler karadan yürüdü" — 15 sn sinematik dikey animasyon. Tamamı SVG; her an kelime zamanından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, interpolateColors, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/bebas-neue/latin.css';
import '@fontsource/bebas-neue/latin-ext.css';
import veri from '../../public/fetih/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SURE = 15;
const BASLIK = "'Bebas Neue', 'Inter', sans-serif";
const UFUK = 1050; // su çizgisi
const SU = 1345; // ön plandaki su yüzeyi (gemilerin yüzdüğü yer)

const an = (satir: number, kelime = 0) => K.filter((k) => k.c === satir)[kelime].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const gir = (t: number, t0: number, sure = 0.8) => interpolate(t, [t0, t0 + sure], [0, 1], {...kis, easing: Easing.bezier(0.45, 0, 0.55, 1)});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const yum = (x: number, a: number, b: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const A = {
  yil: an(0, 0), halic: an(0, 1), zincir: an(0, 4), kapali: an(0, 5),
  fatih: an(1, 0), gemileri: an(1, 1), karadan: an(1, 2), yuruttu: an(1, 3),
  yaklasik: an(2, 0), yetmis: an(2, 1), tek: an(2, 3), tepeyi: an(2, 5), asti: an(2, 6),
  otuz: an(3, 0), sonra: an(3, 3), istanbul: an(3, 4), feth: an(3, 5),
};

// ---- arazi -----------------------------------------------------------------
const TEPE_X = 1750;
const tepeY = (x: number) => 1330 - 430 * Math.exp(-(((x - TEPE_X) / 520) ** 2)) + 260 * yum(Math.abs(x - TEPE_X), 780, 1020);
// gemilerin izlediği yol: su -> yamaç -> tepe -> yamaç -> su
const yolY = (x: number) => {
  const kara = 1330 - 430 * Math.exp(-(((x - TEPE_X) / 520) ** 2)) - 6;
  const u = yum(Math.abs(x - TEPE_X), 760, 900);
  return karis(kara, SU, u);
};
const egim = (x: number) => (Math.atan2(yolY(x + 20) - yolY(x - 20), 40) * 180) / Math.PI;

// ---- parçalar ---------------------------------------------------------------
const Gemi: React.FC<{x: number; t: number; i: number; isik: number}> = ({x, t, i, isik}) => {
  const suda = yum(Math.abs(x - TEPE_X), 800, 900);
  const y = yolY(x) + suda * (Math.sin(t * 2.2 + i) * 6 + 26);
  const a = egim(x) * (1 - suda) + suda * Math.sin(t * 1.7 + i * 2) * 2.5;
  const yelken = yum(x, 2620, 2900); // suya inince yelken açılır
  return (
    <g transform={`translate(${x},${y}) rotate(${a}) scale(0.92)`}>
      {/* kızak */}
      <g opacity={1 - suda}>
        <rect x={-150} y={-10} width={300} height={14} rx={7} fill="#3a2a1c" />
        {[-110, -40, 30, 100].map((kx) => (
          <g key={kx} transform={`translate(${kx},10) rotate(${x * 2.2 + kx})`}>
            <circle r={15} fill="#5b4127" stroke="#20150c" strokeWidth={3} />
            <path d="M -9 0 L 9 0 M 0 -9 L 0 9" stroke="#20150c" strokeWidth={2.5} />
          </g>
        ))}
      </g>
      {/* direk, seren, yelken */}
      <path d="M 10 -70 L 10 -330" stroke="#241910" strokeWidth={11} strokeLinecap="round" />
      <path d="M 10 -330 L 10 -70" stroke="url(#direkIsik)" strokeWidth={4} opacity={isik} />
      <path d="M -170 -86 L 10 -322 L 182 -100" stroke="#1a130c" strokeWidth={2.5} fill="none" opacity={0.9} />
      <path d={`M -96 -262 L 116 -248 L ${116 - yelken * 6} ${-248 + yelken * 150} Q 10 ${-235 + yelken * 190} ${-96 + yelken * 8} ${-262 + yelken * 150} Z`} fill="url(#yelken)" stroke="#2a2118" strokeWidth={3} opacity={0.25 + yelken * 0.75} />
      <path d="M -100 -264 L 120 -249" stroke="#241910" strokeWidth={9} strokeLinecap="round" />
      <path d="M -92 -258 Q 10 -232 112 -243" stroke="#cdbb97" strokeWidth={12} strokeLinecap="round" opacity={1 - yelken} />
      <path d={`M 10 -330 L ${-52 + Math.sin(t * 6 + i) * 8} ${-318 + Math.sin(t * 7 + i) * 5} L 10 -300 Z`} fill="#b3261e" />
      {/* gövde */}
      <path d="M -168 -48 Q -186 -80 -196 -118 L -150 -76 L 138 -76 Q 176 -86 200 -128 Q 198 -42 138 -6 L -122 -6 Q -156 -16 -168 -48 Z" fill="url(#govde)" stroke="#120c07" strokeWidth={4} strokeLinejoin="round" />
      <path d="M -160 -50 L 170 -50 M -140 -28 L 150 -28" stroke="#1c120a" strokeWidth={3} opacity={0.7} />
      <path d="M -150 -76 L 138 -76 Q 176 -86 200 -128" stroke="#ffb45a" strokeWidth={4} fill="none" opacity={isik * 0.85} strokeLinecap="round" />
      {[-110, -70, -30, 10, 50, 90].map((kx) => <circle key={kx} cx={kx} cy={-40} r={5} fill="#0d0805" />)}
      {/* güvertede fener */}
      <circle cx={150} cy={-104} r={60} fill="url(#ates)" opacity={0.55 + Math.sin(t * 11 + i * 3) * 0.12} />
      <circle cx={150} cy={-104} r={7} fill="#ffe7a8" />
    </g>
  );
};

// halat çeken askerler
const Cekenler: React.FC<{x: number; t: number; i: number}> = ({x, t, i}) => {
  const op = (1 - yum(x, 2380, 2520)) * yum(x, 880, 1000);
  if (op <= 0.01) return null;
  const bas = {x: x + 178, y: yolY(x) - 112};
  const adamlar = [250, 318, 386, 454].map((d, k) => {
    const ax = x + d;
    const ay = yolY(ax);
    const f = t * 9 + k * 1.6 + i;
    return {ax, ay, f, k};
  });
  return (
    <g opacity={op} stroke="#0a0d16" strokeLinecap="round" fill="none">
      <path d={`M ${bas.x} ${bas.y} ` + adamlar.map((m) => `L ${m.ax + 14} ${m.ay - 62}`).join(' ')} stroke="#6b5a40" strokeWidth={4} />
      {adamlar.map(({ax, ay, f, k}) => (
        <g key={k} strokeWidth={11}>
          <path d={`M ${ax - 8} ${ay - 44} L ${ax - 22 + Math.sin(f) * 22} ${ay}`} />
          <path d={`M ${ax - 8} ${ay - 44} L ${ax - 22 - Math.sin(f) * 22} ${ay}`} />
          <path d={`M ${ax - 8} ${ay - 44} L ${ax + 26} ${ay - 92}`} strokeWidth={17} />
          <path d={`M ${ax + 22} ${ay - 84} L ${ax + 2} ${ay - 60} L ${ax + 14} ${ay - 62}`} strokeWidth={8} />
          <circle cx={ax + 36} cy={ay - 108} r={13} fill="#0a0d16" stroke="none" />
          <path d={`M ${ax + 24} ${ay - 116} Q ${ax + 36} ${ay - 134} ${ax + 50} ${ay - 114}`} stroke="#b9b2a2" strokeWidth={8} />
          <path d={`M ${ax - 6} ${ay - 46} L ${ax + 28} ${ay - 94}`} stroke="#ff9d45" strokeWidth={3} opacity={0.55} transform="translate(-9,-3)" />
        </g>
      ))}
    </g>
  );
};

const Mesale: React.FC<{x: number; y: number; t: number; k: number; s?: number}> = ({x, y, t, k, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <circle cy={-150} r={150 + Math.sin(t * 13 + k) * 14} fill="url(#ates)" opacity={0.8} />
    <path d="M 0 0 L 0 -130" stroke="#1a120b" strokeWidth={9} strokeLinecap="round" />
    <path d={`M -14 -130 Q ${-18 + Math.sin(t * 15 + k) * 6} -172 ${Math.sin(t * 9 + k) * 9} ${-198 + Math.sin(t * 17 + k) * 9} Q ${18 + Math.sin(t * 12 + k) * 5} -168 14 -130 Z`} fill="#ff9a2e" />
    <path d={`M -7 -130 Q ${Math.sin(t * 14 + k) * 4} -158 ${Math.sin(t * 10 + k) * 5} -172 Q 9 -152 7 -130 Z`} fill="#fff0b3" />
    {[0, 1, 2, 3, 4].map((j) => {
      const u = (t * 0.9 + rnd(k * 9 + j)) % 1;
      return <circle key={j} cx={Math.sin(u * 7 + j) * 26 + (rnd(j + k) - 0.5) * 30} cy={-170 - u * 230} r={3.2 * (1 - u)} fill="#ffc46a" opacity={1 - u} />;
    })}
  </g>
);

const Zincir: React.FC<{t: number}> = ({t}) => {
  const ger = gir(t, A.zincir - 0.25, 0.35); // "zincirle" kelimesinde gerilir
  const titre = Math.exp(-Math.max(0, t - A.zincir) * 5) * Math.sin((t - A.zincir) * 60) * (t > A.zincir ? 1 : 0);
  const sark = karis(250, 120, ger) + titre * 10 + Math.sin(t * 1.5) * 4;
  const x0 = 70, x1 = 1000, y0 = 1210;
  const N = 15;
  const nokta = (u: number) => ({x: karis(x0, x1, u), y: y0 + sark * (1 - (2 * u - 1) ** 2)});
  return (
    <g>
      {Array.from({length: N}, (_, i) => {
        const u = (i + 0.5) / N;
        const p = nokta(u), q = nokta(u + 0.01);
        const a = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        const yan = i % 2 === 1;
        const batik = yum(p.y, SU + 15, SU + 60);
        return (
          <g key={i} transform={`translate(${p.x},${p.y}) rotate(${a})`} opacity={1 - batik * 0.75}>
            <ellipse rx={42} ry={yan ? 9 : 25} fill="none" stroke="#0b0d11" strokeWidth={yan ? 20 : 21} />
            <ellipse rx={42} ry={yan ? 9 : 25} fill="none" stroke="url(#metal)" strokeWidth={yan ? 14 : 15} />
            <path d={yan ? 'M -30 -5 L 26 -5' : 'M -30 -22 Q 0 -30 30 -22'} stroke="#e8eef5" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.75} />
          </g>
        );
      })}
    </g>
  );
};

const Kule: React.FC<{x: number; y?: number; w?: number; h?: number}> = ({x, y = 1560, w = 190, h = 560}) => (
  <g transform={`translate(${x},${y})`}>
    <path d={`M ${-w / 2} 0 L ${-w / 2 + 12} ${-h} L ${-w / 2 - 8} ${-h} L ${-w / 2 - 8} ${-h - 52} ${[0, 1, 2, 3].map((k) => { const a = -w / 2 - 8 + (k * (w + 16)) / 3.5; const b = a + (w + 16) / 7; return `L ${a} ${-h - 52} L ${b} ${-h - 52} L ${b} ${-h - 22} L ${b + (w + 16) / 7} ${-h - 22} L ${b + (w + 16) / 7} ${-h - 52}`; }).join(' ')} L ${w / 2 + 8} ${-h - 52} L ${w / 2 + 8} ${-h} L ${w / 2 - 12} ${-h} L ${w / 2} 0 Z`} fill="url(#tas)" stroke="#05070c" strokeWidth={4} />
    {Array.from({length: 26}, (_, i) => (
      <rect key={i} x={-w / 2 + 22 + rnd(i) * (w - 80)} y={-h + 20 + rnd(i + 50) * (h - 60)} width={34 + rnd(i + 9) * 22} height={14} rx={3} fill="#000" opacity={0.22} />
    ))}
    <rect x={-10} y={-h + 70} width={20} height={56} rx={10} fill="#04060a" />
  </g>
);

// uzak kıyıdaki surlar ve şehir (paralaks katmanı)
const surYolu = (() => {
  let d = `M -600 ${UFUK}`;
  for (let x = -600; x < 4200; x += 260) {
    d += ` L ${x} ${UFUK - 96}`;
    for (let k = 0; k < 6; k++) d += ` L ${x + k * 30} ${UFUK - 96} L ${x + k * 30} ${UFUK - 112} L ${x + k * 30 + 15} ${UFUK - 112} L ${x + k * 30 + 15} ${UFUK - 96}`;
    d += ` L ${x + 180} ${UFUK - 96} L ${x + 180} ${UFUK - 176}`;
    for (let k = 0; k < 4; k++) d += ` L ${x + 180 + k * 20} ${UFUK - 176} L ${x + 180 + k * 20} ${UFUK - 192} L ${x + 190 + k * 20} ${UFUK - 192} L ${x + 190 + k * 20} ${UFUK - 176}`;
    d += ` L ${x + 260} ${UFUK - 176} L ${x + 260} ${UFUK - 96}`;
  }
  return d + ` L 4200 ${UFUK} Z`;
})();
const BAYRAK_X = 2010; // sur katmanında fetih sancağının dikildiği kule
const Surlar: React.FC<{t: number; safak: number}> = ({t, safak}) => {
  const cek = gir(t, A.istanbul - 0.05, 0.7);
  return (
    <g>
      {/* arkadaki şehir: kubbeler, damlar */}
      <g fill="url(#sehir)">
        {Array.from({length: 44}, (_, i) => {
          const x = -560 + i * 108 + rnd(i) * 40, h = 150 + rnd(i + 3) * 120, w = 70 + rnd(i + 7) * 60;
          return <path key={i} d={`M ${x} ${UFUK} L ${x} ${UFUK - h} L ${x + w / 2} ${UFUK - h - 26 * rnd(i + 2)} L ${x + w} ${UFUK - h} L ${x + w} ${UFUK} Z`} />;
        })}
        {[520, 2330].map((x) => (
          <g key={x}>
            <path d={`M ${x - 150} ${UFUK} L ${x - 150} ${UFUK - 230} Q ${x - 150} ${UFUK - 270} ${x - 100} ${UFUK - 275} A 105 105 0 0 1 ${x + 100} ${UFUK - 275} Q ${x + 150} ${UFUK - 270} ${x + 150} ${UFUK - 230} L ${x + 150} ${UFUK} Z`} />
            <path d={`M ${x - 4} ${UFUK - 378} L ${x} ${UFUK - 410} L ${x + 4} ${UFUK - 378} Z`} />
          </g>
        ))}
      </g>
      {Array.from({length: 60}, (_, i) => (
        <rect key={i} x={-500 + rnd(i + 20) * 4500} y={UFUK - 130 - rnd(i + 40) * 110} width={5} height={8} fill="#ffcf7a" opacity={(0.35 + Math.sin(t * 3 + i) * 0.25) * (1 - safak * 0.8)} />
      ))}
      <path d={surYolu} fill="url(#sur)" />
      <path d={surYolu} fill="none" stroke="#ffb777" strokeWidth={2.5} opacity={0.12 + safak * 0.5} />
      {/* fetih sancağı */}
      <g transform={`translate(${BAYRAK_X},${UFUK - 192})`} opacity={cek > 0 ? 1 : 0}>
        <path d={`M 0 0 L 0 ${-150 * cek}`} stroke="#12161f" strokeWidth={6} strokeLinecap="round" />
        <path d={`M 0 ${-150 * cek} Q ${45} ${-150 * cek - 14 + Math.sin(t * 7) * 8} ${92 * cek} ${-150 * cek + 6 + Math.sin(t * 7 + 1) * 10} L ${88 * cek} ${-150 * cek + 60 + Math.sin(t * 7 + 2) * 8} Q 45 ${-150 * cek + 44 + Math.sin(t * 7 + 1) * 8} 0 ${-150 * cek + 56} Z`} fill="#c3241c" stroke="#5a0d0a" strokeWidth={2} />
      </g>
    </g>
  );
};

const Fatih: React.FC<{t: number}> = ({t}) => {
  const x = 1120, y = 1452;
  const kol = gir(t, A.gemileri - 0.2, 0.35);
  const el = {x: karis(52, 150, kol), y: karis(-150, -268, kol)};
  return (
    <g transform={`translate(${x},${y}) scale(1.22)`}>
      <path d="M -230 60 Q -200 -30 -90 -22 Q 0 -44 90 -14 Q 190 -10 230 60 L 230 400 L -230 400 Z" fill="#04060b" />
      <path d="M -200 20 Q -170 -26 -90 -22 Q 0 -44 90 -14" stroke="#ff9d45" strokeWidth={3} fill="none" opacity={0.45} />
      <Mesale x={-120} y={-14} t={t} k={3} s={0.9} />
      {/* pelerin ve gövde */}
      <path d={`M -62 0 Q -78 -150 -34 -268 L 36 -268 Q 74 -150 ${58 + Math.sin(t * 3) * 6} 0 Z`} fill="url(#pelerin)" stroke="#05060a" strokeWidth={4} />
      <path d="M -34 -268 Q -66 -150 -52 -4" stroke="#ff9d45" strokeWidth={5} fill="none" opacity={0.75} strokeLinecap="round" />
      <path d={`M 18 -250 L ${el.x} ${el.y}`} stroke="#05060a" strokeWidth={30} strokeLinecap="round" />
      <path d={`M 18 -250 L ${el.x} ${el.y}`} stroke="#3a1616" strokeWidth={22} strokeLinecap="round" />
      <circle cx={el.x + 6} cy={el.y - 6} r={13} fill="#c79a74" stroke="#05060a" strokeWidth={3} />
      {/* baş, sakal, kavuk */}
      <circle cx={4} cy={-300} r={34} fill="#c79a74" stroke="#05060a" strokeWidth={4} />
      <path d="M -6 -282 Q 22 -246 40 -290 Q 24 -276 -6 -282 Z" fill="#1b1410" />
      <circle cx={22} cy={-306} r={4.5} fill="#1b1410" />
      <path d="M 12 -316 L 32 -313" stroke="#1b1410" strokeWidth={4} strokeLinecap="round" />
      <path d="M 37 -304 L 43 -292 L 34 -291" stroke="#8a6a4e" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M -40 -318 Q -52 -390 4 -398 Q 62 -390 48 -318 Q 4 -340 -40 -318 Z" fill="#efe8da" stroke="#05060a" strokeWidth={4} />
      <path d="M -30 -344 Q 4 -366 40 -344 M -34 -328 Q 4 -350 44 -328" stroke="#b9b0a0" strokeWidth={4} fill="none" />
      <path d="M 4 -398 Q 10 -430 2 -444" stroke="#c3241c" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M -40 -318 Q -50 -372 -22 -392" stroke="#ffb45a" strokeWidth={4} fill="none" opacity={0.8} />
    </g>
  );
};

// ---- yazılar ---------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.04 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.55) return null;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1500, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(6,8,14,.72)', borderRadius: 22, padding: '16px 34px 12px', textAlign: 'center', fontFamily: BASLIK, fontSize: 76, lineHeight: 1.08, letterSpacing: 2}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.04, k.s + 0.1], [0, 1], kis);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: Math.max(0.001, u), transform: `scale(${1 + (1 - u) * 0.25})`, color: k === aktif ? '#ffcf4a' : '#fff'}}>
              {k.w.toLocaleUpperCase('tr')}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---- video -----------------------------------------------------------------
const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipi'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("76px 'Bebas Neue'", 'ığüşöçİ1453'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);

  // gün: alacakaranlık -> gece -> şafak
  const gz = [0, A.fatih - 0.2, A.gemileri, A.otuz - 0.2, A.feth + 0.5];
  const ust = interpolateColors(t, gz, ['#1a2550', '#1a2550', '#040817', '#040817', '#27437f']);
  const orta = interpolateColors(t, gz, ['#6d3f66', '#6d3f66', '#0b1533', '#0b1533', '#c9766a']);
  const alt = interpolateColors(t, gz, ['#f0864a', '#f0864a', '#1d3157', '#1d3157', '#ffd08a']);
  const gece = gir(t, A.fatih - 0.2, A.gemileri - A.fatih + 0.2) * (1 - gir(t, A.otuz - 0.2, A.feth + 0.7 - A.otuz));
  const safak = gir(t, A.otuz - 0.2, A.feth + 0.7 - A.otuz);

  // gemiler: öndeki geminin dünya x'i
  const onX = interpolate(t, [A.fatih, A.gemileri, A.tepeyi + 0.2, A.sonra, A.feth + 0.4, SURE], [900, 1330, 1820, 2800, 3130, 3190], kis);
  const gemiX = [0, 1, 2, 3, 4].map((i) => onX - i * 345);
  const gemiOp = gir(t, A.fatih - 0.1, 0.4);

  // kamera
  const kx = interpolate(t, [0, A.fatih - 0.2, A.fatih + 0.45, A.gemileri, A.tepeyi + 0.2, A.sonra, A.feth, SURE], [540, 548, 1300, 1400, 1800, 2640, 2990, 3020], {...kis, easing: Easing.bezier(0.4, 0, 0.3, 1)});
  const olcek = interpolate(t, [0, A.fatih - 0.2, A.fatih + 0.45, A.yaklasik, A.tepeyi, A.sonra, SURE], [1.0, 1.13, 1.0, 1.02, 1.14, 1.0, 1.06], {...kis, easing: Easing.bezier(0.45, 0, 0.55, 1)});
  const sars = Math.exp(-Math.max(0, t - A.zincir) * 6) * (t > A.zincir ? 1 : 0);
  const gum = Math.sin(t * 31) * 2.2 * gece * (t > A.gemileri && t < A.sonra ? 1 : 0); // yürüyen gemilerin gümbürtüsü
  const sx = Math.sin(t * 70) * 16 * sars, sy = Math.cos(t * 83) * 12 * sars + gum;
  const kamSol = kx - 540;
  const hiz = Math.abs(interpolate(t, [A.fatih - 0.2, A.fatih + 0.1, A.fatih + 0.45], [0, 1, 0], kis)); // savrulma bulanıklığı
  const dunya = (paralaks: number) => `translate(${-kamSol * paralaks + sx},${sy})`;

  const yil = gir(t, A.yil - 0.1, 0.25);
  const sayac = Math.round(70 * gir(t, A.yetmis - 0.1, 0.7));
  const sicrama = (x: number) => yum(x, 2600, 2700) * (1 - yum(x, 2760, 2980));

  return (
    <AbsoluteFill style={{background: '#040817'}}>
      <Audio src={staticFile('fetih/ses.mp3')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ust} /><stop offset="62%" stopColor={orta} /><stop offset="100%" stopColor={alt} />
          </linearGradient>
          <linearGradient id="su" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={alt} /><stop offset="14%" stopColor={orta} /><stop offset="55%" stopColor="#081226" /><stop offset="100%" stopColor="#02040a" />
          </linearGradient>
          <linearGradient id="sur" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b2337" /><stop offset="100%" stopColor="#0a0e1a" /></linearGradient>
          <linearGradient id="sehir" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a3350" stopOpacity="0.95" /><stop offset="100%" stopColor="#141b30" /></linearGradient>
          <linearGradient id="tepe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a2233" /><stop offset="30%" stopColor="#0b0f19" /><stop offset="100%" stopColor="#030408" /></linearGradient>
          <linearGradient id="tas" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3a4254" /><stop offset="45%" stopColor="#1a1f2b" /><stop offset="100%" stopColor="#090b11" /></linearGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c3ccd6" /><stop offset="45%" stopColor="#5b636e" /><stop offset="100%" stopColor="#1c2026" /></linearGradient>
          <linearGradient id="govde" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b4a2b" /><stop offset="55%" stopColor="#3a2616" /><stop offset="100%" stopColor="#170e07" /></linearGradient>
          <linearGradient id="yelken" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3e7cb" /><stop offset="100%" stopColor="#a8946d" /></linearGradient>
          <linearGradient id="direkIsik" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffb45a" stopOpacity="0" /><stop offset="100%" stopColor="#ffb45a" /></linearGradient>
          <linearGradient id="pelerin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7a1f1a" /><stop offset="60%" stopColor="#3d0f0d" /><stop offset="100%" stopColor="#170606" /></linearGradient>
          <radialGradient id="ates"><stop offset="0%" stopColor="#ffd27a" stopOpacity="0.95" /><stop offset="35%" stopColor="#ff8a2a" stopOpacity="0.45" /><stop offset="100%" stopColor="#ff6a00" stopOpacity="0" /></radialGradient>
          <radialGradient id="ay"><stop offset="0%" stopColor="#fdf6dc" stopOpacity="0.9" /><stop offset="100%" stopColor="#fdf6dc" stopOpacity="0" /></radialGradient>
          <radialGradient id="gunes"><stop offset="0%" stopColor="#fff3c4" /><stop offset="30%" stopColor="#ffc46a" stopOpacity="0.8" /><stop offset="100%" stopColor="#ff9a4a" stopOpacity="0" /></radialGradient>
          <linearGradient id="sis" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9d6ee" stopOpacity="0" /><stop offset="50%" stopColor="#c9d6ee" stopOpacity="0.5" /><stop offset="100%" stopColor="#c9d6ee" stopOpacity="0" /></linearGradient>
          <radialGradient id="vinyet" cx="50%" cy="48%" r="75%"><stop offset="50%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.7" /></radialGradient>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(t * 12)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.15" />
          </filter>
          <filter id="yumusak"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="savrul" x="-20%" width="140%"><feGaussianBlur stdDeviation={`${hiz * 38} 0`} /></filter>
          <filter id="parla"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>

        <g transform={`translate(540,1100) scale(${olcek}) translate(-540,-1100)`} filter={hiz > 0.03 ? 'url(#savrul)' : undefined}>
          {/* gök */}
          <rect x={-100} y={-100} width={1280} height={UFUK + 110} fill="url(#gok)" />
          {Array.from({length: 110}, (_, i) => (
            <circle key={i} cx={rnd(i) * 1080} cy={rnd(i + 200) * 820} r={0.8 + rnd(i + 400) * 2.1} fill="#fff" opacity={(0.25 + 0.75 * Math.abs(Math.sin(t * (1 + rnd(i) * 2) + i))) * (0.15 + gece * 0.85) * (1 - safak)} />
          ))}
          <g transform={dunya(0.06)} opacity={1 - safak * 0.85}>
            <circle cx={930} cy={690} r={190} fill="url(#ay)" opacity={0.5} />
            <circle cx={930} cy={690} r={50} fill="#fbf3d5" />
            <circle cx={950} cy={681} r={47} fill={orta} opacity={0.95} />
          </g>
          <g transform={dunya(0.1)} opacity={safak}>
            <circle cx={880} cy={UFUK - 40} r={520} fill="url(#gunes)" />
          </g>
          {/* uzak tepeler */}
          <g transform={dunya(0.18)}>
            <path d={`M -300 ${UFUK} ` + Array.from({length: 40}, (_, i) => `L ${-300 + i * 80} ${UFUK - 150 - Math.sin(i * 0.7) * 60 - Math.sin(i * 1.9) * 28}`).join(' ') + ` L 2900 ${UFUK} Z`} fill={orta} opacity={0.55} />
          </g>
          <g transform={dunya(0.5)}>
            <Surlar t={t} safak={safak} />
            <rect x={-600} y={UFUK - 70} width={5000} height={90} fill="url(#sis)" opacity={0.45} />
          </g>

          {/* su */}
          <rect x={-100} y={UFUK} width={1280} height={1100} fill="url(#su)" />
          <g transform={dunya(0.06)} opacity={(1 - safak) * 0.9}>
            {Array.from({length: 16}, (_, i) => {
              const y = UFUK + 14 + i * 26, w = 30 + i * 9 + Math.sin(t * 3 + i) * 14;
              return <rect key={i} x={936 - w / 2 + Math.sin(t * 2 + i * 1.3) * 10} y={y} width={w} height={5} rx={2.5} fill="#fbf3d5" opacity={0.5 - i * 0.025} />;
            })}
          </g>
          {Array.from({length: 70}, (_, i) => {
            const d = rnd(i + 5); // derinlik: 0 ufuk, 1 ön
            const y = UFUK + 10 + d * d * 820;
            const w = 30 + d * 150;
            const x = ((rnd(i) * 1500 - kamSol * (0.5 + d * 0.5) + t * 14 * (0.3 + d)) % 1500 + 1500) % 1500 - 200;
            return <rect key={i} x={x} y={y} width={w} height={2 + d * 4} rx={3} fill={alt} opacity={(0.1 + 0.28 * Math.abs(Math.sin(t * 1.6 + i * 2.1))) * (1 - d * 0.5)} />;
          })}

          {/* ön plan dünyası */}
          <g transform={dunya(1)}>
            {/* zincir sahnesi */}
            <Kule x={36} />
            <Zincir t={t} />
            {/* zincirin battığı yer ve su perdesi */}
            <rect x={-200} y={SU + 30} width={1300} height={700} fill="#050b18" opacity={0.55} />
            {[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={170 + i * 150} cy={SU + 34} rx={60 + Math.sin(t * 3 + i) * 12} ry={7} fill="none" stroke={alt} strokeWidth={3} opacity={0.35} />)}

            {/* tepe */}
            <path d={`M 700 2000 ` + Array.from({length: 111}, (_, i) => `L ${700 + i * 20} ${tepeY(700 + i * 20)}`).join(' ') + ` L 2900 2000 Z`} fill="url(#tepe)" />
            <path d={Array.from({length: 96}, (_, i) => `${i ? 'L' : 'M'} ${850 + i * 20} ${tepeY(850 + i * 20)}`).join(' ')} fill="none" stroke={safak > 0.3 ? '#ffb777' : '#6f86b8'} strokeWidth={4} opacity={0.45} />
            {/* yağlı kızak yolu: kütükler */}
            {Array.from({length: 46}, (_, i) => {
              const x = 960 + i * 36;
              return <ellipse key={i} cx={x} cy={yolY(x) + 12} rx={13} ry={8} fill="#3d2c1b" stroke="#150e08" strokeWidth={2.5} />;
            })}
            {/* ağaçlar, çalılar */}
            {[1105, 1490, 1650, 1990, 2140, 2390].map((x, i) => (
              <g key={x} transform={`translate(${x},${tepeY(x) + 8}) scale(${0.8 + rnd(i) * 0.5})`}>
                <path d="M 0 0 L 0 -120" stroke="#05070b" strokeWidth={10} />
                <path d="M -40 -70 L 0 -250 L 40 -70 Z M -52 -30 L 0 -180 L 52 -30 Z" fill="#070b12" />
              </g>
            ))}
            {[1560, 1900, 2260].map((x, i) => <Mesale key={x} x={x} y={tepeY(x) + 8} t={t} k={i} s={0.8} />)}

            {/* gemiler ve çekenler (arkadan öne) */}
            <g opacity={gemiOp}>
              {gemiX.map((x, i) => <Cekenler key={i} x={x} t={t} i={i} />).reverse()}
              {gemiX.map((x, i) => <Gemi key={i} x={x} t={t} i={i} isik={0.35 + gece * 0.65} />).reverse()}
              {/* suya iniş: sıçrayan su */}
              {gemiX.map((x, i) => {
                const s = sicrama(x);
                if (s <= 0.01) return null;
                return (
                  <g key={i}>
                    {Array.from({length: 16}, (_, j) => {
                      const u = ((x - 2600) / 330 + rnd(j + i * 7) * 0.4) % 1;
                      const vx = (rnd(j) - 0.25) * 320, vy = -220 - rnd(j + 3) * 260;
                      return <circle key={j} cx={x + 150 + vx * u} cy={SU + 10 + vy * u + 520 * u * u} r={5 + rnd(j + 5) * 7} fill="#dfeaff" opacity={s * (1 - u) * 0.9} />;
                    })}
                    <ellipse cx={x + 60} cy={SU + 22} rx={240 * s + 40} ry={16} fill="#dfeaff" opacity={s * 0.45} filter="url(#yumusak)" />
                  </g>
                );
              })}
            </g>
            <Fatih t={t} />
            {/* ön dalga: suda yüzen gövdeyi keser */}
            <rect x={2560} y={SU + 14} width={1700} height={800} fill="#07132a" opacity={0.78} />
            <rect x={-300} y={SU + 14} width={1150} height={800} fill="#07132a" opacity={gemiOp * 0.5} />
            {Array.from({length: 12}, (_, i) => <ellipse key={i} cx={2640 + i * 130 + Math.sin(t * 2 + i) * 20} cy={SU + 18} rx={70} ry={6} fill={alt} opacity={0.3 + Math.sin(t * 3 + i) * 0.12} />)}
          </g>

          {/* sis ve ışık */}
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-1500 + ((t * (22 + i * 14)) % 300)} y={UFUK + 60 + i * 150 + Math.sin(t * 0.8 + i) * 20} width={4200} height={150} fill="url(#sis)" opacity={0.2 + gece * 0.12} />
          ))}
          <rect x={-100} y={-100} width={1280} height={2200} fill="#ffb060" opacity={safak * 0.14} style={{mixBlendMode: 'screen'}} />
        </g>

        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.09} />
        {/* sinema bandı */}
        <rect width={1080} height={120} fill="#000" /><rect y={1800} width={1080} height={120} fill="#000" />
      </svg>

      {/* 1453 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontFamily: BASLIK, fontSize: 400, lineHeight: 1, letterSpacing: 10, color: '#fff3d6', opacity: yil * (1 - gir(t, A.fatih - 0.25, 0.3)), transform: `scale(${karis(1.6, 1, yil) + gir(t, A.yil, 4) * 0.05})`, textShadow: '0 0 60px rgba(255,150,70,.75), 0 8px 0 rgba(0,0,0,.45)'}}>
        1453
      </div>
      {/* gemi sayacı */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', fontFamily: BASLIK, color: '#fff3d6', opacity: gir(t, A.yetmis - 0.15, 0.2) * (1 - gir(t, A.otuz - 0.35, 0.3)), textShadow: '0 0 50px rgba(255,150,70,.8), 0 6px 0 rgba(0,0,0,.5)'}}>
        <div style={{fontSize: 330, lineHeight: 0.9}}>≈{sayac}</div>
        <div style={{fontSize: 110, letterSpacing: 14, color: '#ffcf4a'}}>GEMİ</div>
      </div>
      {/* kapanış */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: BASLIK, color: '#fff', opacity: gir(t, A.istanbul - 0.05, 0.3), transform: `scale(${karis(1.35, 1, gir(t, A.istanbul - 0.05, 0.35))})`, textShadow: '0 0 40px rgba(0,0,0,.6), 0 6px 0 rgba(0,0,0,.45)'}}>
        <div style={{fontSize: 96, letterSpacing: 12, color: '#ffe2a8'}}>29 MAYIS 1453</div>
        <div style={{fontSize: 210, lineHeight: 0.95, color: '#fff'}}>FETİH</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1722, textAlign: 'center', fontFamily: BASLIK, fontSize: 44, letterSpacing: 10, color: '#fff', opacity: gir(t, A.feth + 0.5, 0.4) * 0.9}}>BOZ CONCEPT HOME</div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

// Ortak çizim parçaları: karakterler, hayvanlar, köy, gökyüzü. Koordinatlar 1920x1080.
import React from 'react';
import {Easing, interpolate} from 'remotion';

export const W = 1920, H = 1080;
export const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
export const R = {toprak: '#c9a46c', kerpic: '#c69a6a', kerpicK: '#a77a4f', gece: '#141a20', murekkep: '#2a2018', kagit: '#efe3c6', kirmizi: '#9e2f25', altin: '#c99a3b', yesil: '#5f7d4a', ten: '#c99a73'};
export const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const yumus = Easing.bezier(0.45, 0, 0.55, 1);
export const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
export const zipla = (t: number, t0: number, d = 0.35) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: Easing.out(Easing.back(1.7))});
export const karis = (a: number, b: number, u: number) => a + (b - a) * u;
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- karakterler ---------------------------------------------------------------------
export type Tur = 'hasan' | 'ayse' | 'cocuk' | 'nine' | 'sipahi' | 'kadi' | 'katip' | 'koylu' | 'koylu2' | 'yeniceri';
const GIYSI: Record<Tur, {ust: string; alt: string; bas: string; sakal?: string; boy: number}> = {
  hasan: {ust: '#8a5a34', alt: '#4f3b2a', bas: '#e8dcc2', sakal: '#3a2a1e', boy: 1},
  ayse: {ust: '#7a2e2a', alt: '#3d4a5a', bas: '#d9c7a4', boy: 0.95},
  cocuk: {ust: '#6d7a4a', alt: '#4a3a2a', bas: '#b98a5a', boy: 0.62},
  nine: {ust: '#4b4a52', alt: '#3a3036', bas: '#ece6d8', boy: 0.88},
  sipahi: {ust: '#8f1f1c', alt: '#2a2a30', bas: '#f1ece0', sakal: '#2a1e16', boy: 1.04},
  kadi: {ust: '#2d4a43', alt: '#1f2a28', bas: '#f5f0e4', sakal: '#ddd6c8', boy: 1.02},
  katip: {ust: '#5a4a6a', alt: '#2a2a30', bas: '#f1ece0', sakal: '#3a2a1e', boy: 0.98},
  koylu: {ust: '#7b6a4a', alt: '#4a3a2a', bas: '#cdbb98', sakal: '#4a3a2a', boy: 0.98},
  koylu2: {ust: '#5f6a55', alt: '#3a3a30', bas: '#b9a27a', sakal: '#2a2018', boy: 1},
  yeniceri: {ust: '#2f4d7a', alt: '#8f1f1c', bas: '#f1ece0', sakal: '#2a1e16', boy: 1.04},
};
export const Kisi: React.FC<{tur: Tur; x: number; y: number; s?: number; dir?: number; yuru?: number; faz?: number; kol?: [number, number]; kol2?: [number, number]; egim?: number; op?: number; yuz?: 'duz' | 'uzgun' | 'gul'}> = ({tur, x, y, s = 1, dir = 1, yuru = 0, faz = 0, kol = [12, 8], kol2 = [-12, -8], egim = 0, op = 1, yuz = 'duz'}) => {
  if (op <= 0.001) return null;
  const g = GIYSI[tur];
  const k = s * g.boy;
  const a = Math.sin(faz) * 18 * yuru;
  const kadin = tur === 'ayse' || tur === 'nine';
  const kolCiz = ([a1, a2]: [number, number], ox: number) => {
    const r1 = (a1 * Math.PI) / 180, r2 = (a2 * Math.PI) / 180;
    const ex = ox + Math.sin(r1) * 52, ey = -150 + Math.cos(r1) * 52, hx = ex + Math.sin(r2) * 48, hy = ey + Math.cos(r2) * 48;
    return <g><path d={`M ${ox} -150 L ${ex} ${ey} L ${hx} ${hy}`} stroke={g.ust} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none" style={{filter: 'brightness(0.88)'}} /><circle cx={hx} cy={hy} r={8} fill={R.ten} /></g>;
  };
  return (
    <g transform={`translate(${x},${y}) scale(${k * dir},${k})`} opacity={op}>
      <ellipse cx={0} cy={3} rx={44} ry={7} fill="#000" opacity={0.25} />
      {kolCiz(kol2, -6)}
      {!kadin && <path d={`M -9 -78 L ${-11 - a} -2 L ${-1 - a} -2 M 9 -78 L ${11 + a} -2 L ${21 + a} -2`} stroke={g.alt} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      <g transform={`rotate(${egim},0,-80)`}>
        {kadin
          ? <path d={`M -26 -168 Q -36 -90 -40 -2 L 40 -2 Q 36 -90 26 -168 Q 0 -178 -26 -168 Z`} fill={g.ust} />
          : <path d="M -26 -168 Q -30 -120 -28 -70 L 28 -70 Q 30 -120 26 -168 Q 0 -178 -26 -168 Z" fill={g.ust} />}
        {kadin && <path d={`M -38 -60 Q 0 -50 38 -60 L 40 -2 L -40 -2 Z`} fill={g.alt} opacity={0.85} />}
        {!kadin && <path d="M -28 -96 L 28 -96 L 28 -84 L -28 -84 Z" fill={tur === 'sipahi' ? R.altin : '#c9a46c'} />}
        {tur === 'sipahi' && <path d="M -30 -168 L -44 -40 L -10 -60 Z" fill="#6d1513" />}
        {tur === 'kadi' && <path d="M -30 -170 Q -40 -80 -38 -2 L 38 -2 Q 40 -80 30 -170 Z" fill={g.ust} />}
        <path d="M -26 -168 Q -30 -120 -28 -70 L -14 -70 Q -16 -120 -12 -166 Z" fill="#000" opacity={0.14} />
        {/* baş */}
        <rect x={-7} y={-186} width={14} height={16} fill={R.ten} />
        <ellipse cx={3} cy={-206} rx={20} ry={23} fill={R.ten} />
        {g.sakal && <path d={`M -15 -204 Q -14 ${tur === 'kadi' ? -160 : -176} 4 ${tur === 'kadi' ? -156 : -172} Q 22 ${tur === 'kadi' ? -160 : -176} 22 -204 Q 14 -192 4 -192 Q -6 -192 -15 -204 Z`} fill={g.sakal} />}
        <ellipse cx={11} cy={-210} rx={2.4} ry={2.8} fill="#1c1410" /><ellipse cx={-1} cy={-210} rx={2.4} ry={2.8} fill="#1c1410" />
        {!g.sakal && <path d={yuz === 'gul' ? 'M -1 -196 Q 6 -191 12 -196' : yuz === 'uzgun' ? 'M -1 -193 Q 6 -197 12 -193' : 'M 0 -195 L 11 -195'} stroke="#6a3f2a" strokeWidth={2} fill="none" />}
        {g.sakal && yuz === 'uzgun' && <path d="M -3 -218 L 4 -216 M 10 -216 L 17 -218" stroke="#3a2a1e" strokeWidth={2} />}
        {/* başlık */}
        {kadin && <path d="M -24 -200 Q -26 -236 4 -238 Q 32 -236 30 -200 L 32 -150 Q 24 -160 22 -196 Q 4 -214 -14 -196 Q -16 -160 -24 -150 Z" fill={g.bas} />}
        {(tur === 'hasan' || tur === 'koylu' || tur === 'koylu2' || tur === 'cocuk') && <path d="M -18 -218 Q -18 -246 4 -248 Q 24 -246 24 -218 Z" fill={g.bas} />}
        {(tur === 'hasan' || tur === 'koylu' || tur === 'koylu2') && <path d="M -20 -220 Q 4 -228 26 -220 L 26 -214 Q 4 -222 -20 -214 Z" fill="#8a6a44" />}
        {(tur === 'sipahi' || tur === 'katip') && <g><ellipse cx={4} cy={-232} rx={26} ry={16} fill={g.bas} /><path d="M -2 -248 L 4 -270 L 10 -248 Z" fill={tur === 'sipahi' ? '#8f1f1c' : '#5a4a6a'} /></g>}
        {tur === 'kadi' && <ellipse cx={4} cy={-240} rx={36} ry={26} fill={g.bas} />}
        {tur === 'yeniceri' && <path d="M -18 -224 L -12 -276 Q 20 -300 40 -250 L 24 -222 Z" fill="#f1ece0" />}
      </g>
      {kolCiz(kol, 8)}
    </g>
  );
};

export const Okuz: React.FC<{x: number; y: number; s?: number; dir?: number; faz?: number; yuru?: number; renk?: string}> = ({x, y, s = 1, dir = 1, faz = 0, yuru = 0, renk = '#6b4a32'}) => (
  <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
    <ellipse cx={0} cy={4} rx={110} ry={10} fill="#000" opacity={0.22} />
    {[[-70, 0], [-48, 1.6], [52, 3.1], [74, 4.7]].map(([lx, p], i) => <path key={i} d={`M ${lx} -60 L ${lx + Math.sin(faz + p) * 10 * yuru} 0`} stroke={renk} strokeWidth={14} strokeLinecap="round" style={{filter: i % 2 ? 'brightness(0.8)' : undefined}} />)}
    <path d="M -96 -110 Q -40 -130 50 -118 Q 96 -112 100 -80 Q 100 -56 80 -50 L -86 -50 Q -110 -60 -96 -110 Z" fill={renk} />
    <path d="M 70 -116 Q 110 -128 128 -104 Q 140 -86 128 -70 Q 112 -64 96 -76 Z" fill={renk} style={{filter: 'brightness(0.9)'}} />
    <path d="M 108 -122 Q 100 -146 84 -150 M 118 -120 Q 130 -144 146 -146" stroke="#e8dcc2" strokeWidth={6} fill="none" strokeLinecap="round" />
    <circle cx={122} cy={-100} r={3} fill="#111" />
    <path d="M -96 -100 Q -112 -80 -104 -54" stroke={renk} strokeWidth={5} fill="none" />
  </g>
);
export const At: React.FC<{x: number; y: number; s?: number; dir?: number; faz?: number; yuru?: number; renk?: string; binici?: boolean}> = ({x, y, s = 1, dir = 1, faz = 0, yuru = 0, renk = '#4a2e1e', binici}) => (
  <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
    <ellipse cx={0} cy={4} rx={100} ry={9} fill="#000" opacity={0.22} />
    {[[-58, 0], [-40, 1.6], [48, 3.1], [64, 4.7]].map(([lx, p], i) => <path key={i} d={`M ${lx} -80 L ${lx + Math.sin(faz + p) * 18 * yuru} -2`} stroke={renk} strokeWidth={11} strokeLinecap="round" style={{filter: i % 2 ? 'brightness(0.8)' : undefined}} />)}
    <path d="M -80 -140 Q -20 -158 56 -144 Q 84 -134 80 -92 L -72 -84 Q -96 -100 -80 -140 Z" fill={renk} />
    <path d="M 52 -150 L 96 -214 Q 120 -228 136 -206 L 126 -186 L 100 -184 L 82 -126 Z" fill={renk} />
    <path d="M 56 -150 L 96 -216 L 88 -206 L 50 -140 Z" fill="#1a120c" />
    <path d="M -80 -134 Q -110 -120 -104 -76" stroke="#1a120c" strokeWidth={10} fill="none" strokeLinecap="round" />
    {binici && <g transform="translate(-6,-140)"><Kisi tur="sipahi" x={0} y={0} s={0.8} kol={[60, 100]} kol2={[40, 90]} /></g>}
  </g>
);

// ---- manzara --------------------------------------------------------------------------
export const Gok: React.FC<{zaman: 'safak' | 'gun' | 'aksam' | 'gece' | 'kis' | 'kasvet'}> = ({zaman}) => {
  const renk = {safak: ['#5d7ea6', '#e9b98a', '#f6d7a8'], gun: ['#6f9fcb', '#bcd5e4', '#efe2c4'], aksam: ['#3a4a6e', '#c9785a', '#efb27a'], gece: ['#0d1420', '#1e2a3c', '#34405a'], kis: ['#8c9aa8', '#c9d1d6', '#e8ebec'], kasvet: ['#2a2826', '#5a4a3e', '#8a6a4e']}[zaman];
  return (
    <g>
      <defs><linearGradient id={`gok-${zaman}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={renk[0]} /><stop offset="65%" stopColor={renk[1]} /><stop offset="100%" stopColor={renk[2]} /></linearGradient></defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#gok-${zaman})`} />
    </g>
  );
};
export const Tepeler: React.FC<{y: number; renk: string; seed: number; genlik?: number; op?: number}> = ({y, renk, seed, genlik = 60, op = 1}) => (
  <path d={`M -300 ${H + 300} L -300 ${y} ` + Array.from({length: 30}, (_, i) => `L ${-300 + i * 90} ${y - Math.sin(i * 0.5 + seed) * genlik - Math.sin(i * 1.3 + seed * 2) * genlik * 0.4}`).join(' ') + ` L ${W + 300} ${y} L ${W + 300} ${H + 300} Z`} fill={renk} opacity={op} />
);
export const Kavak: React.FC<{x: number; y: number; s?: number; t?: number}> = ({x, y, s = 1, t = 0}) => (
  <g transform={`translate(${x},${y}) scale(${s}) rotate(${Math.sin(t * 1.1 + x) * 1.2})`}>
    <rect x={-4} y={-40} width={8} height={40} fill="#5a4630" />
    <ellipse cx={0} cy={-140} rx={26} ry={110} fill="#6f8a4f" /><ellipse cx={-6} cy={-150} rx={14} ry={90} fill="#86a062" />
  </g>
);
export const Ev: React.FC<{x: number; y: number; w?: number; h?: number; s?: number; duman?: number; t?: number; kar?: number; isik?: boolean}> = ({x, y, w = 220, h = 120, s = 1, duman = 0, t = 0, kar = 0, isik}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={0} y={-h} width={w} height={h} fill={R.kerpic} />
    <rect x={0} y={-h} width={w} height={h} fill="url(#kerpicDoku)" opacity={0.5} />
    <rect x={w * 0.6} y={-h} width={w * 0.4} height={h} fill="#000" opacity={0.12} />
    <rect x={-10} y={-h - 16} width={w + 20} height={18} fill="#8a6a4a" />
    {Array.from({length: Math.floor(w / 36)}, (_, i) => <rect key={i} x={6 + i * 36} y={-h - 8} width={10} height={10} rx={2} fill="#5a4030" />)}
    {kar > 0 && <path d={`M -12 ${-h - 16} Q ${w / 2} ${-h - 30} ${w + 12} ${-h - 16} L ${w + 12} ${-h - 8} L -12 ${-h - 8} Z`} fill="#f4f6f8" opacity={kar} />}
    <rect x={w * 0.18} y={-h * 0.62} width={w * 0.2} height={h * 0.62} fill="#4a3424" />
    <rect x={w * 0.55} y={-h * 0.72} width={w * 0.14} height={h * 0.22} fill={isik ? '#f2c46a' : '#3a2a20'} />
    {duman > 0 && [0, 1, 2].map((i) => { const f = (t * 0.25 + i / 3) % 1; return <circle key={i} cx={w * 0.8 + Math.sin(t + i) * 8 + f * 30} cy={-h - 20 - f * 120} r={10 + f * 26} fill="#d9d4cc" opacity={(1 - f) * 0.5 * duman} />; })}
  </g>
);
export const Cami: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={0} y={-110} width={160} height={110} fill="#d9c7a4" />
    <path d="M 10 -110 Q 80 -190 150 -110 Z" fill="#9aa3a8" />
    <rect x={172} y={-260} width={22} height={260} fill="#e3d5b8" /><path d="M 168 -260 L 183 -310 L 198 -260 Z" fill="#9aa3a8" />
    <rect x={164} y={-200} width={38} height={10} fill="#cdbf9f" />
  </g>
);
export const Kilise: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={0} y={-100} width={140} height={100} fill="#d4c3a2" />
    <path d="M -6 -100 L 70 -150 L 146 -100 Z" fill="#9a5a3a" />
    <rect x={110} y={-200} width={40} height={200} fill="#cdbb98" /><path d="M 106 -200 L 130 -236 L 154 -200 Z" fill="#9a5a3a" />
    <path d="M 130 -252 L 130 -234 M 122 -246 L 138 -246" stroke="#5a4030" strokeWidth={4} />
  </g>
);
export const Bugday: React.FC<{x: number; y: number; w: number; boy: number; t: number; renk?: string; sik?: number}> = ({x, y, w, boy, t, renk = '#d9b45a', sik = 6}) => (
  <g>
    {Array.from({length: Math.floor(w / sik)}, (_, i) => {
      const bx = x + i * sik + rnd(i) * 4, b = boy * (0.8 + rnd(i + 3) * 0.4);
      const e = Math.sin(t * 1.6 + i * 0.3) * 4;
      return <g key={i}><path d={`M ${bx} ${y} Q ${bx + e / 2} ${y - b / 2} ${bx + e} ${y - b}`} stroke={renk} strokeWidth={2} fill="none" style={{filter: 'brightness(0.85)'}} />{boy > 20 && <ellipse cx={bx + e} cy={y - b - 6} rx={2.6} ry={8} fill={renk} />}</g>;
    })}
  </g>
);
export const Defter: React.FC<{x: number; y: number; s?: number; satir?: number; t?: number; vurgu?: string; vurguOp?: number}> = ({x, y, s = 1, satir = 1, vurgu, vurguOp = 0}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={0} cy={250} rx={560} ry={30} fill="#000" opacity={0.25} />
    <path d="M -520 -300 Q -260 -330 0 -300 L 0 260 Q -260 230 -520 260 Z" fill={R.kagit} />
    <path d="M 520 -300 Q 260 -330 0 -300 L 0 260 Q 260 230 520 260 Z" fill="#e9dcbc" />
    <path d="M 0 -300 L 0 260" stroke="#b9a983" strokeWidth={4} />
    {Array.from({length: 9}, (_, i) => {
      const g = Math.max(0, Math.min(1, satir * 9 - i));
      return <g key={i}>
        {[-1, 1].map((yon) => <path key={yon} d={`M ${yon * 60} ${-230 + i * 52} ${Array.from({length: 12}, (_, j) => `q ${yon * 14} ${-10 - rnd(i * 20 + j + (yon > 0 ? 7 : 0)) * 10} ${yon * 32} 0`).join(' ')}`} stroke={R.murekkep} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeDasharray={1000} strokeDashoffset={1000 * (1 - g)} opacity={0.8} />)}
      </g>;
    })}
    {vurgu && vurguOp > 0 && <g opacity={vurguOp}><rect x={-470} y={-30} width={420} height={70} rx={10} fill="#f2c94c" opacity={0.45} /><text x={-260} y={16} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={40} fill={R.murekkep}>{vurgu}</text></g>}
  </g>
);
export const Sikke: React.FC<{x: number; y: number; r?: number; s?: number; op?: number}> = ({x, y, r = 40, s = 1, op = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={op}>
    <circle r={r} fill="url(#gumus)" stroke="#8d9196" strokeWidth={3} />
    <circle r={r * 0.78} fill="none" stroke="#a7abb0" strokeWidth={2} />
    {Array.from({length: 4}, (_, i) => <path key={i} d={`M ${-r * 0.5} ${-r * 0.35 + i * r * 0.24} q ${r * 0.25} ${-r * 0.1} ${r * 0.5} 0 q ${r * 0.25} ${r * 0.1} ${r * 0.5} 0`} stroke="#7b8085" strokeWidth={2} fill="none" />)}
  </g>
);

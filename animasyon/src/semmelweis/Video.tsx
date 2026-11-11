// "Ellerini yıkamayı öneren doktor" — Ignaz Semmelweis, 60 sn bilgilendirici animasyon.
// Ses: ElevenLabs (public/semmelweis/ses.mp3 + mix.wav). Her sahne anı kelime zamanından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/semmelweis/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 60;
const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
const C = {gece: '#141c22', lacivert: '#1d2b33', kagit: '#efe3c8', murekkep: '#2a2420', mum: '#f3c37a', kan: '#9e2b25', kirec: '#e3eef0', mikrop: '#9ad14f', ten: '#e6c3a0', ceket: '#2b2f36', ceket2: '#3b3530'};

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SAHNE = Array.from({length: 12}, (_, i) => (i === 0 ? 0 : an(i) - 0.3));
const sahneOp = (t: number, i: number) => {
  const a = SAHNE[i], b = i < 11 ? SAHNE[i + 1] : SURE + 1;
  return (i === 0 ? 1 : gir(t, a - 0.25, 0.5)) * (1 - gir(t, b - 0.25, 0.5));
};

// ---- karakter ---------------------------------------------------------------------
type KisiP = {x: number; y: number; s?: number; dir?: number; yuru?: number; faz?: number; egim?: number; onKol?: [number, number]; arkaKol?: [number, number];
  ceket?: string; sac?: string; favori?: boolean; sakal?: boolean; sapka?: boolean; yuz?: 'duz' | 'uzgun' | 'dusun' | 'gul'; onlukBeyaz?: boolean; op?: number};
const Kisi: React.FC<KisiP> = ({x, y, s = 1, dir = 1, yuru = 0, faz = 0, egim = 0, onKol = [10, 6], arkaKol = [-10, -6], ceket = C.ceket, sac = '#3a2a1e', favori, sakal, sapka, yuz = 'duz', onlukBeyaz, op = 1}) => {
  if (op <= 0.001) return null;
  const adim = Math.sin(faz) * 22 * yuru;
  const kol = (a: [number, number], omuzX: number) => {
    const r1 = (a[0] * Math.PI) / 180, r2 = (a[1] * Math.PI) / 180;
    const ex = omuzX + Math.sin(r1) * 70, ey = -250 + Math.cos(r1) * 70;
    const hx = ex + Math.sin(r2) * 66, hy = ey + Math.cos(r2) * 66;
    return (
      <g>
        <path d={`M ${omuzX} -250 L ${ex} ${ey} L ${hx} ${hy}`} stroke={ceket} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M ${omuzX} -250 L ${ex} ${ey} L ${hx} ${hy}`} stroke="#000" strokeOpacity={0.15} strokeWidth={30} strokeLinecap="round" fill="none" transform="translate(3,3)" />
        <circle cx={hx} cy={hy} r={13} fill={C.ten} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`} opacity={op}>
      <ellipse cx={0} cy={4} rx={70} ry={10} fill="#000" opacity={0.25} />
      {kol(arkaKol, -8)}
      {/* bacaklar */}
      <path d={`M -14 -140 L ${-16 - adim} -4 L ${4 - adim} -4`} stroke="#1c1d21" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M 14 -140 L ${16 + adim} -4 L ${36 + adim} -4`} stroke="#22232a" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g transform={`rotate(${egim},0,-140)`}>
        {/* ceket */}
        <path d="M -42 -290 Q -50 -200 -46 -96 L 46 -96 Q 50 -200 42 -290 Q 0 -306 -42 -290 Z" fill={onlukBeyaz ? '#e9e4da' : ceket} />
        <path d="M -10 -292 L 0 -230 L 10 -292 Z" fill="#f4efe6" />
        <path d="M -9 -280 L 9 -280 L 0 -262 Z" fill="#141414" />
        <path d="M 0 -232 L 0 -100" stroke="#000" strokeOpacity={0.25} strokeWidth={3} />
        <path d="M -42 -290 Q -50 -200 -46 -96 L -30 -96 Q -36 -200 -28 -288 Z" fill="#000" opacity={0.18} />
        {/* baş */}
        <rect x={-10} y={-312} width={20} height={20} fill={C.ten} />
        <ellipse cx={4} cy={-345} rx={30} ry={36} fill={C.ten} />
        <path d="M -27 -352 Q -28 -392 6 -388 Q 36 -386 33 -352 Q 22 -372 -4 -366 Q -18 -362 -27 -352 Z" fill={sac} />
        {favori && <path d="M -26 -352 L -26 -322 Q -22 -316 -18 -322 L -18 -352 Z M 30 -352 L 31 -324 Q 27 -318 24 -324 L 23 -352 Z" fill={sac} />}
        {sakal && <path d="M -24 -336 Q -20 -296 8 -294 Q 32 -298 33 -336 Q 22 -320 6 -322 Q -12 -320 -24 -336 Z" fill={sac} />}
        <ellipse cx={16} cy={-348} rx={3.5} ry={4} fill="#1c1410" />
        <ellipse cx={-2} cy={-348} rx={3.5} ry={4} fill="#1c1410" />
        {yuz === 'uzgun' && <path d="M -2 -324 Q 8 -330 18 -324" stroke="#5a3a2a" strokeWidth={3} fill="none" />}
        {yuz === 'duz' && <path d="M 0 -326 L 16 -326" stroke="#5a3a2a" strokeWidth={3} />}
        {yuz === 'gul' && <path d="M -2 -328 Q 8 -320 18 -328" stroke="#5a3a2a" strokeWidth={3} fill="none" />}
        {yuz === 'dusun' && <path d="M 2 -326 Q 10 -329 16 -325" stroke="#5a3a2a" strokeWidth={3} fill="none" />}
        {(yuz === 'uzgun' || yuz === 'dusun') && <path d="M -8 -360 L 2 -357 M 12 -357 L 22 -360" stroke={sac} strokeWidth={3} />}
        {sapka && <g><rect x={-26} y={-440} width={60} height={58} rx={4} fill="#151515" /><rect x={-38} y={-386} width={84} height={9} rx={4} fill="#151515" /></g>}
      </g>
      {kol(onKol, 10)}
    </g>
  );
};

// ---- ortak parçalar --------------------------------------------------------------
const Isik: React.FC<{x: number; y: number; r: number; renk?: string; op?: number}> = ({x, y, r, renk = C.mum, op = 1}) => (
  <circle cx={x} cy={y} r={r} fill={`url(#isik-${renk.slice(1)})`} opacity={op} />
);
const Mum: React.FC<{x: number; y: number; t: number; son?: number; s?: number}> = ({x, y, t, son = 0, s = 1}) => {
  const alev = 1 - son;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <circle cy={-120} r={240 + Math.sin(t * 9) * 10} fill="url(#isik-f3c37a)" opacity={0.75 * alev} />
      <rect x={-18} y={-100} width={36} height={100} rx={6} fill="#efe6d2" />
      <path d="M -18 -100 Q 0 -92 18 -100" stroke="#d8cdb6" strokeWidth={3} fill="none" />
      <path d="M 0 -100 L 0 -114" stroke="#2a2420" strokeWidth={3} />
      {alev > 0.02 && <path d={`M -9 -112 Q ${-11 + Math.sin(t * 13) * 3} -136 ${Math.sin(t * 9) * 3} ${-156 + Math.sin(t * 17) * 4} Q ${11 + Math.sin(t * 11) * 2} -134 9 -112 Z`} fill="#ffcf6b" opacity={alev} transform={`scale(${0.4 + alev * 0.6})`} style={{transformOrigin: '0px -112px'}} />}
      {son > 0.05 && [0, 1, 2].map((i) => {
        const u = (son * 1.2 + i * 0.25) % 1;
        return <path key={i} d={`M ${Math.sin(u * 9 + i) * 10} ${-118 - u * 140} q 10 -20 0 -40`} stroke="#cfc8bd" strokeWidth={5} fill="none" opacity={(1 - u) * 0.5 * Math.min(1, son * 3)} strokeLinecap="round" />;
      })}
    </g>
  );
};
const El: React.FC<{x: number; y: number; s?: number; dir?: number; renk?: string}> = ({x, y, s = 1, dir = 1, renk = C.ten}) => (
  <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
    <path d="M -60 40 Q -70 -20 -40 -40 L -30 -110 Q -24 -122 -14 -110 L -12 -60 L -6 -128 Q 2 -140 10 -128 L 12 -62 L 20 -122 Q 28 -132 36 -120 L 34 -56 L 46 -100 Q 54 -110 60 -96 L 54 -20 Q 50 30 20 50 Z" fill={renk} stroke="#b88f6a" strokeWidth={3} />
    <path d="M -60 40 L 20 50 L 24 110 L -62 110 Z" fill="#f2ede4" />
    <path d="M -62 110 L 24 110 L 26 200 L -64 200 Z" fill={C.ceket} />
  </g>
);
const Mikroplar: React.FC<{cx: number; cy: number; r: number; t: number; n?: number; op?: number; sil?: number}> = ({cx, cy, r, t, n = 26, op = 1, sil = 0}) => (
  <g opacity={op}>
    {Array.from({length: n}, (_, i) => {
      const a = rnd(i) * Math.PI * 2, d = Math.sqrt(rnd(i + 5)) * r;
      const x = cx + Math.cos(a + t * 0.3 * (rnd(i + 2) - 0.5)) * d, y = cy + Math.sin(a + t * 0.25) * d;
      const yok = sil > rnd(i + 9) ? 0 : 1;
      if (!yok) return null;
      return rnd(i + 3) > 0.5
        ? <rect key={i} x={x - 9} y={y - 4} width={18} height={8} rx={4} fill={C.mikrop} transform={`rotate(${rnd(i) * 180 + t * 20},${x},${y})`} opacity={0.85} />
        : <circle key={i} cx={x} cy={y} r={5 + rnd(i + 1) * 3} fill={C.mikrop} opacity={0.85} />;
    })}
  </g>
);

// ---- sahneler ------------------------------------------------------------------------
const S0: React.FC<{t: number}> = ({t}) => {
  const cek = gir(t, an(0, 5) - 0.1, 0.8);
  return (
    <g>
      <rect width={1080} height={1920} fill={C.gece} />
      <Isik x={540} y={820} r={700} op={0.55} />
      <ellipse cx={540} cy={1270} rx={330} ry={70} fill="#d9d2c4" />
      <ellipse cx={540} cy={1262} rx={290} ry={52} fill="#6f8c95" />
      <ellipse cx={540} cy={1262} rx={290} ry={52} fill="url(#suParilti)" opacity={0.6} />
      <path d="M 210 1270 Q 240 1420 540 1440 Q 840 1420 870 1270" fill="#c9c1b2" />
      {[0, 1, 2].map((i) => { const u = ((t * 0.6 + i / 3) % 1); return <ellipse key={i} cx={540} cy={1262} rx={40 + u * 240} ry={8 + u * 42} fill="none" stroke="#e8f1f3" strokeWidth={3} opacity={(1 - u) * 0.5} />; })}
      <El x={karis(420, 160, cek)} y={karis(1150, 1080, cek)} s={1.25} dir={1} />
      <El x={karis(660, 920, cek)} y={karis(1150, 1080, cek)} s={1.25} dir={-1} />
    </g>
  );
};
const Bina: React.FC<{t: number}> = ({t}) => {
  const vurgu = gir(t, an(1, 4) - 0.1, 0.4);
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#alacakaranlik)" />
      <circle cx={930} cy={590} r={46} fill="#f6e9cf" opacity={0.8} />
      {/* bina */}
      <rect x={-40} y={760} width={1160} height={560} fill="#c9b99c" />
      <rect x={-40} y={740} width={1160} height={34} fill="#a8977c" />
      <path d="M 380 740 L 540 640 L 700 740 Z" fill="#b5a487" />
      {Array.from({length: 3}, (_, r) => Array.from({length: 10}, (_, c) => {
        const x = 0 + c * 112, y = 810 + r * 160;
        const isik = rnd(r * 10 + c) > 0.45;
        return <g key={`${r}-${c}`}><path d={`M ${x + 28} ${y + 110} L ${x + 28} ${y + 30} Q ${x + 56} ${y} ${x + 84} ${y + 30} L ${x + 84} ${y + 110} Z`} fill={isik ? '#f3c37a' : '#3d4448'} opacity={isik ? 0.85 : 1} /></g>;
      }))}
      <rect x={480} y={1180} width={120} height={140} fill="#4a3a2c" />
      <rect x={-40} y={1320} width={1160} height={600} fill="#7d8790" />
      <rect x={-40} y={1320} width={1160} height={600} fill="url(#karZemin)" />
      {/* iki kanat vurgusu */}
      {vurgu > 0 && (
        <g opacity={vurgu}>
          <rect x={-30} y={760} width={480} height={560} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray="22 14" />
          <rect x={630} y={760} width={480} height={560} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray="22 14" />
          <rect x={60} y={660} width={300} height={74} rx={37} fill={C.kan} />
          <text x={210} y={712} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={38} fill="#fff">1. KLİNİK</text>
          <rect x={720} y={660} width={300} height={74} rx={37} fill="#3f6f73" />
          <text x={870} y={712} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={38} fill="#fff">2. KLİNİK</text>
        </g>
      )}
      {/* kar */}
      {Array.from({length: 70}, (_, i) => <circle key={i} cx={(rnd(i) * 1080 + Math.sin(t + i) * 20) % 1080} cy={(rnd(i + 3) * 1920 + t * (50 + rnd(i) * 40)) % 1920} r={2 + rnd(i + 1) * 3} fill="#fff" opacity={0.7} />)}
    </g>
  );
};
const Karsilastirma: React.FC<{t: number}> = ({t}) => {
  const sol = gir(t, an(2, 5) - 0.2, 0.9), sag = gir(t, an(2, 9) - 0.2, 0.9);
  const izgara = (x0: number, olu: number, g: number, renk: string) =>
    Array.from({length: 100}, (_, i) => {
      const cx = x0 + (i % 10) * 40, cy = 760 + Math.floor(i / 10) * 52;
      const kirmizi = i < olu && g * 10 > i % 10 - (Math.floor(i / 10) === 0 ? 0 : 99);
      const dolu = i < Math.round(olu) && g > (i + 0.5) / Math.max(1, olu);
      return (
        <g key={i} opacity={gir(t, an(2) + i * 0.012, 0.3)}>
          <rect x={cx - 15} y={cy - 9} width={30} height={20} rx={5} fill={dolu ? C.kan : renk} />
          <rect x={cx - 15} y={cy - 9} width={9} height={20} rx={3} fill="#fff" opacity={dolu ? 0.15 : 0.5} />
          {kirmizi && null}
        </g>
      );
    });
  return (
    <g>
      <rect width={1080} height={1920} fill="#ece2cc" />
      <rect width={1080} height={1920} fill="url(#kagitDoku)" opacity={0.6} />
      <text x={290} y={590} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill={C.kan}>1. KLİNİK</text>
      <text x={290} y={640} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={28} fill={C.murekkep}>doktorlar ve öğrenciler</text>
      <text x={790} y={590} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#3f6f73">2. KLİNİK</text>
      <text x={790} y={640} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={28} fill={C.murekkep}>ebeler</text>
      <path d="M 540 560 L 540 1300" stroke={C.murekkep} strokeWidth={3} strokeDasharray="10 10" opacity={0.4} />
      {izgara(110, 10, sol, '#b9ad97')}
      {izgara(610, 3.6, sag, '#b9ad97')}
      <text x={290} y={1360} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={86} fill={C.kan} opacity={sol}>≈ %10</text>
      <text x={790} y={1360} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={86} fill="#3f6f73" opacity={sag}>&lt; %4</text>
      <text x={540} y={1420} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={26} fill={C.murekkep} opacity={0.75 * sag}>her kare 100 anneden birini temsil eder · 1841–46 ortalaması</text>
    </g>
  );
};
const Koridor: React.FC<{t: number; dusun?: boolean}> = ({t}) => {
  const lt = t - SAHNE[3];
  const x = karis(260, 640, Math.min(1, lt / 2.6));
  return (
    <g>
      <rect width={1080} height={1920} fill="#2a3237" />
      <path d="M 0 400 L 1080 400 L 1080 1350 L 0 1350 Z" fill="#5b625f" />
      {[0, 1, 2, 3].map((i) => <g key={i}><path d={`M ${80 + i * 270} 520 L ${80 + i * 270} 1150 Q ${150 + i * 270} 1060 ${220 + i * 270} 1150 L ${220 + i * 270} 520 Q ${150 + i * 270} 430 ${80 + i * 270} 520 Z`} fill="#c9d4d2" opacity={0.35} /><Isik x={150 + i * 270} y={800} r={300} renk="#f3c37a" op={0.25} /></g>)}
      <rect y={1350} width={1080} height={570} fill="#3b3a35" />
      {Array.from({length: 10}, (_, i) => <path key={i} d={`M ${i * 120 - 300} 1920 L ${540 + (i - 4.5) * 40} 1350`} stroke="#2c2b27" strokeWidth={3} />)}
      <Kisi x={x} y={1500} s={1.9} dir={1} yuru={lt < 2.6 ? 1 : 0} faz={lt * 7} favori sac="#4a3424" yuz="dusun" onKol={lt > 2.6 ? [150, 175] : [10 + Math.sin(lt * 7) * 18, 6]} arkaKol={[-10 - Math.sin(lt * 7) * 18, -6]} />
      {lt > 2.4 && <text x={x + 170} y={760} fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={150} fill={C.mum} opacity={gir(t, SAHNE[3] + 2.4, 0.3)}>?</text>}
      <g opacity={gir(t, an(3, 2) - 0.1, 0.3)}>
        <rect x={200} y={230} width={680} height={130} rx={18} fill="rgba(10,14,18,.7)" />
        <text x={540} y={295} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={56} fill="#fff">Ignaz Semmelweis</text>
        <text x={540} y={340} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill={C.mum}>1818 – 1865 · Macar doktor</text>
      </g>
    </g>
  );
};
const Otopsi: React.FC<{t: number}> = ({t}) => {
  const kes = gir(t, an(4, 4) - 0.05, 0.15);
  const irkil = Math.exp(-Math.max(0, t - an(4, 4)) * 4) * (t > an(4, 4) ? 1 : 0);
  const sonus = gir(t, an(4, 7) - 0.2, 1.4);
  return (
    <g>
      <rect width={1080} height={1920} fill="#1d2326" />
      <Isik x={540} y={700} r={760} renk="#e8d8b0" op={0.5 * (1 - sonus * 0.6)} />
      <path d="M 430 520 L 650 520 L 700 600 L 380 600 Z" fill="#8a7d63" />
      <rect x={180} y={1100} width={720} height={60} rx={10} fill="#6d6352" />
      <path d="M 200 1110 Q 540 1030 880 1110 L 880 1130 L 200 1130 Z" fill="#e7e1d6" />
      <rect x={220} y={1160} width={30} height={260} fill="#4a4236" /><rect x={830} y={1160} width={30} height={260} fill="#4a4236" />
      <g opacity={1 - sonus}>
        <Kisi x={380} y={1460} s={1.6} dir={1} egim={-14 + irkil * 10} sakal favori sac="#6b6258" onlukBeyaz yuz={irkil > 0.2 ? 'uzgun' : 'duz'} onKol={[karis(95, 60, irkil), karis(160, 120, irkil)]} arkaKol={[70, 120]} />
        <Kisi x={760} y={1460} s={1.45} dir={-1} sac="#2e221a" yuz="duz" onKol={[95 - kes * 10, 150]} arkaKol={[20, 40]} />
        {/* neşter */}
        <path d={`M ${610 - kes * 40} 1060 L ${680 - kes * 40} 1040`} stroke="#d9dde0" strokeWidth={6} strokeLinecap="round" />
        {kes > 0.5 && <circle cx={555} cy={1062} r={7 * kes} fill={C.kan} />}
      </g>
      {/* anma */}
      <g opacity={sonus}>
        <rect x={340} y={560} width={400} height={480} rx={10} fill="#2a2621" stroke="#b5965a" strokeWidth={14} />
        <Kisi x={540} y={1150} s={1.5} sakal favori sac="#6b6258" yuz="duz" onKol={[10, 6]} />
        <path d="M 340 640 L 420 560 M 360 560 L 340 580" stroke="#111" strokeWidth={22} />
        <text x={540} y={1110} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={46} fill={C.kagit}>Jakob Kolletschka</text>
        <text x={540} y={1160} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill={C.mum}>† Mart 1847</text>
        <Mum x={830} y={1300} t={t} son={gir(t, an(4, 7) + 0.3, 1.0)} s={1.3} />
      </g>
    </g>
  );
};
const Yol: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[5];
  const x = karis(170, 860, Math.min(1, lt / 3.4));
  const buyutec = gir(t, an(5, 6) - 0.25, 0.5);
  return (
    <g>
      <rect width={1080} height={1920} fill="#2a3237" />
      <rect y={500} width={1080} height={850} fill="#5b625f" />
      <rect y={1350} width={1080} height={570} fill="#3b3a35" />
      <rect x={30} y={760} width={200} height={590} fill="#3a2e24" /><text x={130} y={730} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#fff">OTOPSİ</text>
      <rect x={850} y={760} width={200} height={590} fill="#3a2e24" /><text x={950} y={730} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#fff">DOĞUM</text>
      <path d={`M 230 1460 L ${x} 1460`} stroke={C.mikrop} strokeWidth={6} strokeDasharray="4 18" strokeLinecap="round" opacity={0.6} />
      <Kisi x={x} y={1500} s={1.7} dir={1} yuru={lt < 3.4 ? 1 : 0} faz={lt * 7} sac="#2e221a" favori onlukBeyaz yuz="duz" onKol={[10 + Math.sin(lt * 7) * 16, 6]} arkaKol={[-10 - Math.sin(lt * 7) * 16, -6]} />
      <Mikroplar cx={x + 30} cy={1500 - 1.7 * 120} r={40} t={t} n={14} op={0.5 + 0.5 * buyutec} />
      {buyutec > 0 && (
        <g opacity={buyutec}>
          <circle cx={540} cy={640} r={250 * buyutec} fill="#e8d7b8" stroke="#2a2420" strokeWidth={14} />
          <g clipPath="url(#merceklik)">
            <El x={540} y={760} s={1.4} />
            <Mikroplar cx={560} cy={600} r={170} t={t} n={34} />
          </g>
          <path d={`M ${540 + 177 * buyutec} ${640 + 177 * buyutec} L ${540 + 300 * buyutec} ${640 + 300 * buyutec}`} stroke="#2a2420" strokeWidth={30} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};
const Yikama: React.FC<{t: number}> = ({t}) => {
  const yika = gir(t, an(6, 2) - 0.1, 2.6);
  const ov = Math.sin(t * 9) * 10 * (yika > 0 && yika < 1 ? 1 : 0);
  return (
    <g>
      <rect width={1080} height={1920} fill="#2b3439" />
      <Isik x={540} y={900} r={700} renk="#e3eef0" op={0.35} />
      {/* kural kağıdı */}
      <g opacity={gir(t, an(6, 1) - 0.1, 0.4)} transform="rotate(-3,540,430)">
        <rect x={250} y={250} width={580} height={330} fill={C.kagit} />
        <circle cx={540} cy={272} r={10} fill="#8a2a24" />
        <text x={540} y={340} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={50} fill={C.murekkep}>Kural</text>
        <text x={540} y={410} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={32} fill={C.murekkep}>Servise girmeden önce</text>
        <text x={540} y={455} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={32} fill={C.murekkep}>eller klorlu kireçle</text>
        <text x={540} y={500} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={32} fill={C.murekkep}>yıkanır.</text>
        <text x={540} y={555} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={24} fill={C.kan}>Mayıs 1847</text>
      </g>
      {/* leğen ve şişe */}
      <ellipse cx={540} cy={1260} rx={330} ry={70} fill="#d9d2c4" />
      <ellipse cx={540} cy={1252} rx={290} ry={52} fill="#cfe2e4" />
      <path d="M 210 1260 Q 240 1420 540 1440 Q 840 1420 870 1260" fill="#c9c1b2" />
      <g transform="translate(860,1150)">
        <rect x={-55} y={-170} width={110} height={170} rx={14} fill="#d9e6e2" stroke="#8aa09a" strokeWidth={4} />
        <rect x={-25} y={-210} width={50} height={44} fill="#8a6a44" />
        <rect x={-45} y={-120} width={90} height={56} fill={C.kagit} />
        <text x={0} y={-84} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={17} fill={C.murekkep}>Chlorkalk</text>
      </g>
      <g transform={`translate(${ov},0)`}><El x={430} y={1170} s={1.2} /></g>
      <g transform={`translate(${-ov},0)`}><El x={650} y={1170} s={1.2} dir={-1} /></g>
      <Mikroplar cx={540} cy={1050} r={150} t={t} n={30} sil={yika} op={1 - yika * 0.3} />
      {Array.from({length: 18}, (_, i) => {
        const u = (t * 0.8 + rnd(i)) % 1;
        return <circle key={i} cx={420 + rnd(i + 1) * 240} cy={1180 - u * 260} r={6 + rnd(i + 2) * 12} fill="none" stroke="#fff" strokeWidth={2.5} opacity={(1 - u) * 0.7 * yika} />;
      })}
    </g>
  );
};
const Grafik: React.FC<{t: number}> = ({t}) => {
  const veriler: [string, number][] = [['Nis', 18.3], ['May', 12.2], ['Haz', 2.4], ['Tem', 1.2], ['Ağu', 1.9]];
  const ciz = gir(t, an(7, 0) - 0.1, 2.6);
  const x = (i: number) => 200 + i * 175, y = (v: number) => 1260 - v * 32;
  const d = veriler.map(([, v], i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  return (
    <g>
      <rect width={1080} height={1920} fill="#ece2cc" />
      <rect width={1080} height={1920} fill="url(#kagitDoku)" opacity={0.6} />
      <text x={540} y={560} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={44} fill={C.murekkep}>1. Klinik · aylık ölüm oranı</text>
      <text x={540} y={612} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill={C.murekkep} opacity={0.7}>1847 · yüzde</text>
      {[0, 5, 10, 15, 20].map((v) => <g key={v}><path d={`M 160 ${y(v)} L 960 ${y(v)}`} stroke={C.murekkep} strokeOpacity={0.15} strokeWidth={2} /><text x={140} y={y(v) + 10} textAnchor="end" fontFamily={METIN} fontWeight={600} fontSize={26} fill={C.murekkep} opacity={0.6}>{v}</text></g>)}
      <rect x={x(0.5) + 10} y={y(20)} width={x(4.3) - x(0.5)} height={y(0) - y(20)} fill="#3f6f73" opacity={0.1 * ciz} />
      <path d={`M ${x(0.5) + 10} ${y(20)} L ${x(0.5) + 10} ${y(0)}`} stroke="#3f6f73" strokeWidth={4} strokeDasharray="10 8" opacity={ciz} />
      <text x={x(0.5) + 24} y={y(19.4)} fontFamily={METIN} fontWeight={800} fontSize={28} fill="#3f6f73" opacity={ciz}>el yıkama başlıyor</text>
      <path d={d} stroke={C.kan} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1600} strokeDashoffset={1600 * (1 - ciz)} />
      {veriler.map(([ay, v], i) => {
        const g = gir(t, an(7, 0) - 0.1 + i * 0.55, 0.3);
        return (
          <g key={ay} opacity={g}>
            <circle cx={x(i)} cy={y(v)} r={13} fill={C.kan} stroke="#fff" strokeWidth={4} />
            <text x={x(i)} y={y(v) - 26} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={32} fill={C.murekkep}>{v.toLocaleString('tr-TR')}</text>
            <text x={x(i)} y={1310} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill={C.murekkep}>{ay}</text>
          </g>
        );
      })}
    </g>
  );
};
const Ret: React.FC<{t: number}> = ({t}) => {
  const don = gir(t, an(8, 1) - 0.1, 0.7);
  const kapi = gir(t, an(8, 4) - 0.3, 0.35);
  return (
    <g>
      <rect width={1080} height={1920} fill="#232a2e" />
      <Isik x={300} y={900} r={600} op={0.35} />
      {[0, 1, 2].map((i) => (
        <Kisi key={i} x={600 + i * 150} y={1460} s={1.45} dir={don > 0.5 ? 1 : -1} sapka={i !== 1} sakal={i !== 0} favori sac={['#7b746a', '#5a4a3a', '#8c857b'][i]} ceket={['#1e2126', '#2a2622', '#24282e'][i]} yuz="duz" onKol={[20, 10]} op={1} />
      ))}
      <Kisi x={250} y={1460} s={1.6} dir={1} favori sac="#4a3424" yuz="uzgun" onKol={[karis(80, 20, don), karis(100, 10, don)]} />
      {/* kapanan kapı + belge */}
      <g opacity={kapi}>
        <rect x={0} y={0} width={1080 * kapi * 0.5} height={1920} fill="#151a1d" />
        <rect x={1080 - 1080 * kapi * 0.5} y={0} width={1080 * kapi * 0.5} height={1920} fill="#151a1d" />
      </g>
      <g opacity={gir(t, an(8, 4) + 0.1, 0.3)} transform="rotate(-4,540,800)">
        <rect x={270} y={600} width={540} height={360} fill={C.kagit} />
        <text x={540} y={700} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={46} fill={C.murekkep}>Görev süresi</text>
        <text x={540} y={760} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={46} fill={C.murekkep}>uzatılmadı</text>
        <rect x={380} y={810} width={320} height={90} rx={10} fill="none" stroke={C.kan} strokeWidth={7} transform="rotate(-6,540,855)" />
        <text x={540} y={875} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={48} fill={C.kan} transform="rotate(-6,540,855)">1849</text>
      </g>
    </g>
  );
};
const Gece: React.FC<{t: number}> = ({t}) => (
  <g>
    <rect width={1080} height={1920} fill="#0e1418" />
    <rect x={300} y={420} width={480} height={640} fill="#1d2a36" />
    <circle cx={640} cy={560} r={60} fill="#e9e4d4" opacity={0.9} />
    <Isik x={640} y={560} r={300} renk="#cfd8e6" op={0.3} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={340 + i * 120} y={420} width={18} height={640} fill="#0a0d10" />)}
    <rect x={300} y={720} width={480} height={18} fill="#0a0d10" />
    <path d="M 300 1060 L 780 1060 L 900 1700 L 180 1700 Z" fill="#cfd8e6" opacity={0.06} />
    <Mum x={540} y={1440} t={t} son={gir(t, an(9, 6) + 0.4, 1.2)} s={1.5} />
    <g opacity={gir(t, an(9, 1) - 0.1, 0.5)}>
      <text x={540} y={300} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={64} fill={C.kagit}>13 Ağustos 1865</text>
      <text x={540} y={360} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={34} fill={C.mum}>Viyana · 47 yaşında</text>
    </g>
  </g>
);
const Mikroskop: React.FC<{t: number}> = ({t}) => {
  const z = gir(t, an(10, 2) - 0.2, 0.9);
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#sabah)" />
      <g opacity={1 - z * 0.85} transform={`translate(540,1100) scale(${1 + z * 0.8}) translate(-540,-1100)`}>
        <rect x={360} y={1360} width={360} height={50} rx={10} fill="#3a3a3a" />
        <path d="M 600 1360 Q 700 1200 640 980" stroke="#2f2f2f" strokeWidth={46} fill="none" strokeLinecap="round" />
        <rect x={470} y={1180} width={220} height={20} fill="#555" />
        <rect x={500} y={760} width={70} height={280} rx={12} fill="#b08a3a" transform="rotate(-18,535,900)" />
        <rect x={470} y={700} width={60} height={90} rx={8} fill="#8d6b2c" transform="rotate(-18,535,900)" />
      </g>
      <g opacity={z}>
        <circle cx={540} cy={900} r={380} fill="#f4f1e6" stroke="#222" strokeWidth={28} />
        <g clipPath="url(#mercek2)"><Mikroplar cx={540} cy={900} r={360} t={t} n={60} /></g>
      </g>
      <g opacity={gir(t, an(10, 4) - 0.1, 0.4)}>
        <rect x={150} y={1380} width={360} height={110} rx={16} fill="rgba(20,24,28,.75)" />
        <text x={330} y={1430} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={40} fill="#fff">Louis Pasteur</text>
        <text x={330} y={1472} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={26} fill={C.mum}>mikrop kuramı · 1860'lar</text>
        <rect x={570} y={1380} width={360} height={110} rx={16} fill="rgba(20,24,28,.75)" />
        <text x={750} y={1430} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={40} fill="#fff">Joseph Lister</text>
        <text x={750} y={1472} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={26} fill={C.mum}>antisepsi · 1867</text>
      </g>
    </g>
  );
};
const Bugun: React.FC<{t: number}> = ({t}) => {
  const kart = gir(t, an(11, 4) + 0.3, 0.6);
  const ov = Math.sin(t * 8) * 9;
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#modern)" />
      <rect x={0} y={1180} width={1080} height={740} fill="#e7ecee" />
      <path d="M 260 1180 L 820 1180 Q 800 1330 540 1340 Q 280 1330 260 1180 Z" fill="#ffffff" stroke="#c9d3d7" strokeWidth={4} />
      <path d="M 520 860 L 520 960 Q 520 990 560 990 L 640 990" stroke="#b9c3c8" strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d={`M 640 1000 Q ${640 + Math.sin(t * 20) * 3} 1100 ${636} 1200`} stroke="#bfe3ff" strokeWidth={14} fill="none" opacity={0.75} />
      <g transform={`translate(${ov},0)`} opacity={1 - kart * 0.7}><El x={450} y={1150} s={1.15} /></g>
      <g transform={`translate(${-ov},0)`} opacity={1 - kart * 0.7}><El x={650} y={1150} s={1.15} dir={-1} /></g>
      {Array.from({length: 28}, (_, i) => {
        const u = (t * 0.5 + rnd(i)) % 1;
        return <circle key={i} cx={430 + rnd(i + 1) * 240 + Math.sin(t * 2 + i) * 20} cy={1060 - u * 520} r={8 + rnd(i + 2) * 22} fill="url(#kopuk)" stroke="#ffffff" strokeWidth={2} opacity={(1 - u) * 0.8} />;
      })}
    </g>
  );
};

const SAHNELER = [S0, Bina, Karsilastirma, Koridor, Otopsi, Yol, Yikama, Grafik, Ret, Gece, Mikroskop, Bugun];

// ---- yazılar --------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif || aktif.c === 0) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1600, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(12,14,16,.78)', borderRadius: 26, padding: '18px 32px 20px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 52, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? C.mum : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 52px 'Inter'", 'ğüşıöçİ'), document.fonts.load("600 30px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 60px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const satir0 = K.filter((k) => k.c === 0);
  const red = interpolate(t, [an(0, 7) - 0.05, an(0, 7) + 0.2], [0, 1], {...kis, easing: Easing.out(Easing.back(1.8))});
  const kapanis = gir(t, an(11, 4) + 0.3, 0.6);
  return (
    <AbsoluteFill style={{background: C.gece}}>
      <Audio src={staticFile('semmelweis/mix.wav')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          {[C.mum, '#e8d8b0', '#e3eef0', '#cfd8e6'].map((r) => (
            <radialGradient key={r} id={`isik-${r.slice(1)}`}><stop offset="0%" stopColor={r} stopOpacity="0.85" /><stop offset="100%" stopColor={r} stopOpacity="0" /></radialGradient>
          ))}
          <linearGradient id="alacakaranlik" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2c3e52" /><stop offset="55%" stopColor="#8a7f88" /><stop offset="100%" stopColor="#d9b48f" /></linearGradient>
          <linearGradient id="karZemin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eef2f4" stopOpacity="0.8" /><stop offset="100%" stopColor="#c5ccd2" stopOpacity="0.5" /></linearGradient>
          <linearGradient id="sabah" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f6efe0" /><stop offset="100%" stopColor="#d9cbb0" /></linearGradient>
          <linearGradient id="modern" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f4f7f8" /><stop offset="100%" stopColor="#dde5e8" /></linearGradient>
          <radialGradient id="kopuk" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" /><stop offset="60%" stopColor="#e6f3ff" stopOpacity="0.25" /><stop offset="100%" stopColor="#c7e3ff" stopOpacity="0.5" /></radialGradient>
          <linearGradient id="suParilti" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="50%" stopColor="#fff" stopOpacity="0.5" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <pattern id="kagitDoku" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 0 12 L 12 0" stroke="#b9a983" strokeOpacity="0.15" strokeWidth="1" /></pattern>
          <clipPath id="merceklik"><circle cx={540} cy={640} r={236} /></clipPath>
          <clipPath id="mercek2"><circle cx={540} cy={900} r={366} /></clipPath>
          <radialGradient id="vinyet" cx="50%" cy="45%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.55" /></radialGradient>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(t * 12)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.15" />
          </filter>
        </defs>
        {SAHNELER.map((Sahne, i) => {
          const op = sahneOp(t, i);
          if (op <= 0.001) return null;
          const lt = t - SAHNE[i];
          const sure = (i < 11 ? SAHNE[i + 1] : SURE) - SAHNE[i];
          const z = 1 + 0.05 * Math.min(1.2, Math.max(0, lt / sure));
          return (
            <g key={i} opacity={op} transform={`translate(540,960) scale(${z}) translate(-540,-960)`}>
              <Sahne t={t} />
            </g>
          );
        })}
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.06} />
      </svg>

      {/* kanca */}
      <div style={{position: 'absolute', left: 50, right: 50, top: 300, textAlign: 'center', opacity: 1 - gir(t, SAHNE[1] - 0.25, 0.4)}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 84, lineHeight: 1.12, color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.7)'}}>
          {satir0.slice(0, 5).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 20, opacity: gir(t, k.s - 0.06, 0.2)}}>{k.w}</span>)}
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 52, color: '#fff', marginTop: 26, opacity: gir(t, an(0, 5) - 0.06, 0.2)}}>meslektaşları tarafından</div>
        <div style={{display: 'inline-block', marginTop: 24, border: `8px solid ${C.kan}`, color: C.kan, background: 'rgba(255,255,255,.92)', borderRadius: 14, padding: '10px 34px 4px', fontFamily: METIN, fontWeight: 800, fontSize: 96, letterSpacing: 6, transform: `rotate(-5deg) scale(${karis(1.8, 1, red)})`, opacity: Math.min(1, red)}}>REDDEDİLDİ</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: gir(t, an(1) - 0.1, 0.4) * (1 - gir(t, SAHNE[2] - 0.25, 0.4))}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 120, color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.6)'}}>Viyana, 1847</div>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 36, color: '#fff', opacity: 0.9}}>Viyana Genel Hastanesi · doğum servisleri</div>
      </div>
      {/* kapanış */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: kapanis}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 96, color: '#1d2b33', letterSpacing: -2}}>Ellerini yıka.</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 54, color: '#3f6f73', marginTop: 8}}>Ignaz Semmelweis · 1818–1865</div>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 25, color: '#1d2b33', marginTop: 860, opacity: 0.75, lineHeight: 1.5}}>
          Kaynaklar: Medical Journal of Australia (2018) · EBSCO · PBS NewsHour<br />Encyclopedia.com · Sinclair, <i>Semmelweis: His Life and his Doctrine</i> (1909)
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 34, letterSpacing: 10, color: '#1d2b33', marginTop: 24}}>BOZ CONCEPT HOME</div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

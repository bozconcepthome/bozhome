// Pompeii — Bir Şehrin Yok Oluşu. 41 sn, 1080x1920, 30 fps.
// Görüntü: kodla çizilmiş TEMSİLÎ animasyon (fotogerçekçi değildir). Ses: ElevenLabs.
// public/pompeii/klipler.json içinde bir sahneye klip dosyası verilirse o sahne klip ile değiştirilir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, OffthreadVideo, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/pompeii/kelimeler.json';
import klipler from '../../public/pompeii/klipler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 41;
const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const A = {
  pompeii: an(0, 4), fakat: an(1), vezuv: an(1, 1), felaket: an(1, 6),
  anda: an(2), kul: an(2, 5), saatler: an(3), tas: an(3, 4), sokaklar: an(4), cokme: an(4, 3),
  kacabildi: an(5, 2), bazilari: an(5, 3), gaz: an(5, 6), yuzyil: an(6), arkeolog: an(6, 2), son: an(7), devam: an(7, 6),
};
const SAHNE = [0, A.pompeii - 0.35, A.fakat - 0.2, A.anda - 0.15, A.saatler - 0.25, an(5) - 0.25, A.yuzyil - 0.3, SURE];
const KLIP = [klipler.s0_ucus, klipler.s1_sokak, klipler.s2_vezuv, klipler.s3_patlama, klipler.s4_kul_yagmuru, klipler.s5_akinti, klipler.s6_kalintilar] as (string | null)[];
const sahneOp = (t: number, i: number) => (i === 0 ? 1 : gir(t, SAHNE[i] - 0.2, 0.4)) * (i === 6 ? 1 : 1 - gir(t, SAHNE[i + 1] - 0.2, 0.4));

// ---- ortak çizimler -----------------------------------------------------------------
const Dag: React.FC<{x: number; y: number; s: number; renk?: string; duman?: number; t: number}> = ({x, y, s, renk = '#5c6b5a', duman = 0, t}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -900 0 C -600 -60, -420 -220, -250 -360 C -150 -440, -60 -470, 0 -478 C 70 -470, 170 -430, 280 -340 C 450 -200, 650 -70, 900 0 Z" fill={renk} />
    <path d="M -900 0 C -600 -60, -420 -220, -250 -360 C -150 -440, -60 -470, 0 -478 L 0 0 Z" fill="#fff" opacity={0.08} />
    <path d="M -900 0 C -600 -60, -420 -220, -250 -360 C -150 -440, -60 -470, 0 -478 C 70 -470, 170 -430, 280 -340 C 450 -200, 650 -70, 900 0 Z" fill="url(#dagDoku)" opacity={0.5} />
    {Array.from({length: 26}, (_, i) => <path key={i} d={`M ${-700 + i * 55} ${-20 - (i % 3) * 8} l 40 -6`} stroke="#3f5a3a" strokeWidth={6} opacity={0.35} />)}
    {duman > 0 && <g filter="url(#bulutDoku)" opacity={duman}>{[0, 1, 2].map((i) => <circle key={i} cx={Math.sin(t * 0.3 + i) * 20} cy={-500 - i * 50 - ((t * 8) % 40)} r={40 + i * 18} fill="#c9c6bf" opacity={0.5} />)}</g>}
  </g>
);
const Catilar: React.FC<{y0: number; satir: number; t: number; renk?: string; koyu?: number}> = ({y0, satir, renk = '#b85c3a', koyu = 0}) => (
  <g>
    {Array.from({length: satir}, (_, r) => {
      const d = r / satir; const y = y0 + r * r * 5 + r * 20; const s = 0.35 + d * 1.4;
      return Array.from({length: Math.ceil(14 / s) + 2}, (_, c) => {
        const w = (90 + rnd(r * 13 + c) * 70) * s, h = (55 + rnd(r * 7 + c) * 35) * s, x = -100 + c * 125 * s * 1.05 + (r % 2) * 60 * s + rnd(r * 40 + c) * 30 * s;
        const tone = 0.75 + rnd(r * 9 + c) * 0.35;
        return (
          <g key={`${r}-${c}`}>
            <rect x={x} y={y - rnd(r + c * 3) * 18 * s} width={w} height={h * 1.2 + rnd(r + c * 3) * 18 * s} fill={rnd(r * 3 + c) > 0.5 ? '#d9cdb6' : '#cbb79b'} opacity={0.95} />
            <rect x={x + w * 0.1} y={y + h * 0.5} width={w * 0.14} height={h * 0.35} fill="#3a3028" opacity={0.7} />
            <path d={`M ${x - 4} ${y + 4} L ${x + w / 2} ${y - h * 0.55} L ${x + w + 4} ${y + 4} Z`} fill={renk} style={{filter: `brightness(${tone})`}} />
            <path d={`M ${x + w / 2} ${y - h * 0.55} L ${x + w + 4} ${y + 4} L ${x + w / 2} ${y + 4} Z`} fill="#000" opacity={0.18} />
            {koyu > 0 && <path d={`M ${x - 4} ${y + 2} L ${x + w / 2} ${y - h * 0.5} L ${x + w + 4} ${y + 2} Z`} fill="#8f8a82" opacity={koyu * (0.6 + rnd(c) * 0.4)} />}
          </g>
        );
      });
    })}
  </g>
);
const Insan: React.FC<{x: number; y: number; s?: number; faz: number; yuru?: number; dir?: number; renk?: string; kos?: boolean; ortu?: boolean}> = ({x, y, s = 1, faz, yuru = 1, dir = 1, renk = '#6b5240', kos, ortu}) => {
  const a = Math.sin(faz) * (kos ? 30 : 16) * yuru;
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
      <ellipse cx={0} cy={2} rx={22} ry={4} fill="#000" opacity={0.3} />
      <path d={`M -4 -40 L ${-6 - a * 0.5} 0 M 4 -40 L ${6 + a * 0.5} 0`} stroke="#3d2e24" strokeWidth={7} strokeLinecap="round" />
      <path d={`M -14 -92 Q -18 -60 -16 -36 L 16 -36 Q 18 -60 14 -92 Z`} fill={renk} />
      <path d="M -14 -92 L 14 -92 L 10 -84 L -10 -84 Z" fill="#000" opacity={0.15} />
      <path d={`M -12 -86 L ${-14 - a * 0.6} -56 M 12 -86 L ${14 + a * 0.6 + (kos ? 10 : 0)} ${kos ? -70 : -56}`} stroke={renk} strokeWidth={8} strokeLinecap="round" style={{filter: 'brightness(0.85)'}} />
      <circle cx={1} cy={-102} r={10} fill="#b98c6a" />
      <path d="M -9 -106 Q 1 -116 11 -106 L 10 -102 L -9 -102 Z" fill="#2b2018" />
      {ortu && <path d="M -16 -96 Q 1 -128 18 -96 L 14 -80 L -14 -80 Z" fill="#cdbfa6" />}
    </g>
  );
};
const Kul: React.FC<{t: number; yogun: number; ruzgar?: number; n?: number}> = ({t, yogun, ruzgar = -40, n = 260}) => (
  <g opacity={yogun}>
    {Array.from({length: n}, (_, i) => {
      const z = rnd(i + 3); const hiz = 300 + z * 700;
      const y = ((rnd(i) * 2200 + t * hiz) % 2200) - 140;
      const x = ((rnd(i + 1) * 1300 + t * ruzgar * (0.5 + z)) % 1300 + 1300) % 1300 - 110;
      const tas = rnd(i + 7) > 0.88;
      return tas
        ? <ellipse key={i} cx={x} cy={y} rx={3 + z * 5} ry={3 + z * 4} fill="#d6d2c8" opacity={0.85} />
        : <path key={i} d={`M ${x} ${y} l ${ruzgar * 0.03 * z} ${8 + z * 22}`} stroke="#bdb8ae" strokeWidth={1 + z * 2.4} opacity={0.35 + z * 0.4} strokeLinecap="round" />;
    })}
  </g>
);
const Bulut: React.FC<{cx: number; cy: number; r: number; n?: number; renk?: string; t: number; seed?: number; op?: number}> = ({cx, cy, r, n = 18, renk = '#bdb7ad', t, seed = 1, op = 1}) => (
  <g filter="url(#bulutDoku)" opacity={op}>
    {Array.from({length: n}, (_, i) => {
      const a = rnd(i + seed) * Math.PI * 2, d = Math.sqrt(rnd(i + seed + 5)) * r;
      return <circle key={i} cx={cx + Math.cos(a) * d + Math.sin(t * 0.4 + i) * 8} cy={cy + Math.sin(a) * d * 0.8} r={r * (0.35 + rnd(i + seed + 2) * 0.35)} fill={renk} opacity={0.8} />;
    })}
    {Array.from({length: n}, (_, i) => {
      const a = rnd(i + seed + 30) * Math.PI * 2, d = Math.sqrt(rnd(i + seed + 35)) * r * 0.9;
      return <circle key={`g${i}`} cx={cx + Math.cos(a) * d - r * 0.1} cy={cy + Math.sin(a) * d * 0.8 + r * 0.15} r={r * (0.25 + rnd(i + seed + 32) * 0.3)} fill="#000" opacity={0.12} />;
    })}
  </g>
);

// ---- sahneler -------------------------------------------------------------------------
const S0: React.FC<{t: number}> = ({t}) => {
  const u = t / SAHNE[1];
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#safakGok)" />
      <circle cx={820} cy={560} r={420} fill="url(#gunesHale)" />
      <g transform={`translate(${560 - u * 30},${760}) scale(${1.25 + u * 0.12},${0.75 + u * 0.08})`}><Dag x={0} y={0} s={1.0} renk="#6f7d6c" duman={0.25} t={t} /></g>
      <rect y={700} width={1080} height={200} fill="url(#pus)" />
      <g transform={`translate(${-u * 120},${-u * 260}) scale(${1 + u * 0.35})`} style={{transformOrigin: '540px 1400px'}}>
        <rect y={780} width={1080} height={1400} fill="#cbb79a" />
        <Catilar y0={790} satir={13} t={t} />
      </g>
      <rect y={0} width={1080} height={1920} fill="url(#altKarart)" opacity={0.4} />
      {[0, 1, 2].map((i) => <path key={i} d={`M ${700 + i * 90} 380 L ${300 + i * 200} 1920 L ${420 + i * 210} 1920 Z`} fill="#fff1d0" opacity={0.08} filter="url(#flu10)" />)}
    </g>
  );
};
const S1: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[1];
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#safakGok)" />
      <g transform={`translate(${-lt * 14},0)`}>
        {/* sol cephe: dükkânlar ve revak */}
        <path d="M -200 300 L 360 760 L 360 1420 L -200 1920 Z" fill="#c9b08c" />
        <path d="M -200 300 L 360 760 L 360 820 L -200 420 Z" fill="#9b4a31" />
        {[0, 1, 2].map((i) => <path key={i} d={`M ${-120 + i * 160} ${460 + i * 120} L ${-40 + i * 160} ${520 + i * 120} L ${-40 + i * 160} ${1620 - i * 140} L ${-120 + i * 160} ${1720 - i * 140} Z`} fill="#2e2620" opacity={0.85} />)}
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-150 + i * 140} y={520 + i * 70} width={22} height={1100 - i * 150} fill="#efe4cf" />)}
        <path d="M -200 1100 L 360 1080 L 360 1150 L -200 1260 Z" fill="#a8513a" opacity={0.6} />
        {/* sağ cephe */}
        <path d="M 1280 300 L 720 760 L 720 1420 L 1280 1920 Z" fill="#d8c3a0" />
        <path d="M 1280 300 L 720 760 L 720 820 L 1280 420 Z" fill="#8f4630" />
        <path d="M 1150 760 L 980 880 L 980 1360 L 1150 1460 Z" fill="#b5462e" opacity={0.85} />
        {[0, 1].map((i) => <path key={i} d={`M ${1250 - i * 180} ${560 + i * 140} L ${1150 - i * 180} ${640 + i * 140} L ${1150 - i * 180} ${1560 - i * 150} L ${1250 - i * 180} ${1680 - i * 150} Z`} fill="#2e2620" opacity={0.85} />)}
        {/* sokak, tekerlek izleri, basamak taşları */}
        <path d="M 360 1420 L 720 1420 L 1280 1920 L -200 1920 Z" fill="#7d7468" />
        <path d="M 470 1420 L 330 1920 M 610 1420 L 750 1920" stroke="#5a5248" strokeWidth={10} opacity={0.6} />
        {[0, 1, 2].map((i) => <ellipse key={i} cx={460 + i * 80} cy={1700} rx={34} ry={20} fill="#a59b8d" stroke="#5a5248" strokeWidth={3} />)}
        <path d="M 360 1420 L 220 1920 L -200 1920 L -200 1900 Z" fill="#8f877b" />
        <path d="M 720 1420 L 880 1920 L 1280 1920 Z" fill="#8f877b" />
        <rect x={500} y={760} width={80} height={660} fill="url(#uzakSokak)" />
      </g>
      {/* ışık huzmeleri */}
      {[0, 1, 2].map((i) => <path key={i} d={`M ${760 + i * 70} 300 L ${380 + i * 160} 1920 L ${470 + i * 160} 1920 Z`} fill="#fff0c8" opacity={0.1 + 0.04 * Math.sin(t + i)} filter="url(#flu10)" />)}
      {/* insanlar */}
      {[[420, 1600, 1.6, 1, '#7b5c45'], [650, 1560, 1.45, -1, '#a3874f'], [300, 1760, 2.0, 1, '#8c3f30'], [800, 1700, 1.8, -1, '#5f6a55'], [560, 1500, 1.1, 1, '#6b5240']].map(([x, y, s, d, r], i) => (
        <Insan key={i} x={(x as number) + (d as number) * lt * 40} y={y as number} s={s as number} faz={t * 6 + i} dir={d as number} renk={r as string} />
      ))}
      {/* amfora tezgâhı */}
      <g transform={`translate(${880 - lt * 14},1450)`}>
        {[0, 1, 2].map((i) => <path key={i} d={`M ${i * 46} 0 q -18 -40 0 -80 q 18 40 0 80`} fill="#b36a43" stroke="#7a4128" strokeWidth={3} />)}
      </g>
      <rect width={1080} height={1920} fill="url(#altKarart)" opacity={0.35} />
    </g>
  );
};
const S2: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[2];
  const sars = Math.sin(t * 40) * 3 * gir(t, A.felaket - 0.4, 0.6);
  return (
    <g transform={`translate(${sars},${sars * 0.6})`}>
      <rect width={1080} height={1920} fill="url(#ogleGok)" />
      <g transform={`translate(540,${1150}) scale(${1.3 + lt * 0.05})`}><Dag x={0} y={0} s={1.25} duman={0.4 + gir(t, A.felaket - 0.4, 1) * 0.6} t={t} /></g>
      <rect y={1050} width={1080} height={200} fill="url(#pus)" />
      <rect y={1150} width={1080} height={800} fill="#c7b391" />
      <Catilar y0={1160} satir={8} t={t} />
      {/* kaçışan kuşlar */}
      {Array.from({length: 14}, (_, i) => {
        const u = Math.max(0, t - A.felaket + 0.3 - i * 0.05);
        if (u <= 0) return null;
        const x = 540 + (rnd(i) - 0.5) * 300 + u * (rnd(i + 2) - 0.3) * 600, y = 900 - u * 260 - rnd(i + 1) * 100;
        const k = Math.sin(t * 25 + i) * 7;
        return <path key={i} d={`M ${x - 12} ${y + k} Q ${x - 5} ${y - 4} ${x} ${y} Q ${x + 5} ${y - 4} ${x + 12} ${y + k}`} stroke="#2a2a2a" strokeWidth={3} fill="none" />;
      })}
    </g>
  );
};
const S3: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[3];
  const yuk = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (t - A.anda + 0.1) / 3.2)));
  const zoom = 1 + Easing.in(Easing.quad)(Math.min(1, lt / 3.6)) * 0.55;
  const flas = t > A.anda ? Math.exp(-(t - A.anda) * 5) : 0;
  return (
    <g transform={`translate(540,1200) scale(${zoom}) translate(-540,-1200)`}>
      <rect width={1080} height={1920} fill="url(#ogleGok)" />
      <rect width={1080} height={1920} fill="#5a4a3a" opacity={yuk * 0.35} />
      {/* patlama sütunu (Pliniyen "çam ağacı" biçimi) */}
      <g>
        {Array.from({length: 9}, (_, i) => {
          const h = i / 8;
          return <Bulut key={i} cx={540 + Math.sin(i + t * 0.5) * 20} cy={660 - h * 520 * yuk} r={70 + h * 60} t={t} seed={i * 11} renk={i < 3 ? '#8d857a' : '#b3aca0'} op={Math.min(1, yuk * 3 - h)} />;
        })}
        <Bulut cx={540} cy={660 - 520 * yuk - 40} r={260 * yuk + 20} n={26} t={t} seed={99} renk="#c4bdb1" op={Math.max(0, yuk * 1.4 - 0.4)} />
        <Bulut cx={340} cy={660 - 490 * yuk} r={170 * yuk + 10} n={16} t={t} seed={120} renk="#aaa296" op={Math.max(0, yuk * 1.4 - 0.5)} />
        <Bulut cx={760} cy={660 - 500 * yuk} r={180 * yuk + 10} n={16} t={t} seed={140} renk="#b8b0a4" op={Math.max(0, yuk * 1.4 - 0.5)} />
      </g>
      <g transform="translate(540,1250)"><Dag x={0} y={0} s={1.25} renk="#4f5c4d" t={t} /></g>
      <circle cx={540} cy={665} r={90} fill="#ff9a3c" opacity={0.25 + flas * 0.6} filter="url(#flu10)" />
      <rect y={1240} width={1080} height={700} fill="#b9a585" />
      <Catilar y0={1250} satir={7} t={t} />
      <rect width={1080} height={1920} fill="#fff" opacity={flas * 0.5} />
    </g>
  );
};
const S4: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[4];
  const karanlik = gir(t, A.saatler - 0.3, 3.5);
  const cok = gir(t, A.cokme - 0.05, 0.9);
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#kulGok)" />
      {/* sokak (S1 ile aynı mekân, karanlık) */}
      <g style={{filter: `brightness(${1 - karanlik * 0.55}) saturate(${1 - karanlik * 0.6})`}}>
        <path d="M -200 300 L 360 760 L 360 1420 L -200 1920 Z" fill="#c9b08c" />
        <g transform={`translate(${-40 * cok},${160 * cok}) rotate(${cok * 9},100,600)`} opacity={1 - cok * 0.25}>
          <path d="M -200 300 L 360 760 L 360 820 L -200 420 Z" fill="#9b4a31" />
        </g>
        {[0, 1, 2].map((i) => <path key={i} d={`M ${-120 + i * 160} ${460 + i * 120} L ${-40 + i * 160} ${520 + i * 120} L ${-40 + i * 160} ${1620 - i * 140} L ${-120 + i * 160} ${1720 - i * 140} Z`} fill="#1e1915" />)}
        <path d="M 1280 300 L 720 760 L 720 1420 L 1280 1920 Z" fill="#d8c3a0" />
        <path d="M 1280 300 L 720 760 L 720 820 L 1280 420 Z" fill="#8f4630" />
        {[0, 1].map((i) => <path key={i} d={`M ${1250 - i * 180} ${560 + i * 140} L ${1150 - i * 180} ${640 + i * 140} L ${1150 - i * 180} ${1560 - i * 150} L ${1250 - i * 180} ${1680 - i * 150} Z`} fill="#1e1915" />)}
        <path d="M 360 1420 L 720 1420 L 1280 1920 L -200 1920 Z" fill="#7d7468" />
        {/* biriken pomza */}
        <path d={`M -200 ${1920 - 220 * karanlik} Q 540 ${1880 - 260 * karanlik} 1280 ${1920 - 200 * karanlik} L 1280 1920 L -200 1920 Z`} fill="#cfc9bd" />
        {Array.from({length: 120}, (_, i) => <circle key={i} cx={rnd(i) * 1080} cy={1920 - rnd(i + 1) * 240 * karanlik} r={3 + rnd(i + 2) * 7} fill="#e2ddd2" opacity={0.8 * karanlik} />)}
      </g>
      {/* çöken çatının tozu */}
      {cok > 0 && cok < 1 && <Bulut cx={180} cy={900} r={200 * cok + 40} t={t} seed={7} renk="#a59f94" op={1 - cok} />}
      {/* sığınak arayan insanlar */}
      {[[700, 1640, 1.7, -1, '#5f6a55'], [380, 1720, 1.9, 1, '#8c3f30'], [560, 1560, 1.3, -1, '#7b5c45']].map(([x, y, s, d, r], i) => (
        <Insan key={i} x={(x as number) + (d as number) * lt * (90 + i * 20)} y={y as number} s={s as number} faz={t * 10 + i} dir={d as number} renk={r as string} kos ortu />
      ))}
      <Kul t={t} yogun={0.4 + karanlik * 0.6} n={320} />
      <rect width={1080} height={1920} fill="url(#altKarart)" opacity={0.5} />
    </g>
  );
};
const S5: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[5];
  const akinti = Easing.in(Easing.quad)(Math.min(1, Math.max(0, (t - A.bazilari + 0.4) / 4.2)));
  const kacis = 1 - gir(t, A.bazilari - 0.3, 0.6);
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#kulGok)" />
      <g transform="translate(540,1050)"><Dag x={0} y={0} s={1.2} renk="#3a3b38" t={t} /></g>
      {/* piroklastik akıntı: dağın yamacından şehre yuvarlanan sıcak gaz ve kül */}
      <g>
        {Array.from({length: 7}, (_, i) => {
          const u = Math.max(0, akinti - i * 0.06);
          const x = karis(380 - i * 30, -120 + i * 150, u), y = karis(640 + i * 20, 1180 + (i % 2) * 40, u);
          return <Bulut key={i} cx={x} cy={y} r={90 + u * 230} n={18} t={t} seed={i * 17 + 200} renk={i % 2 ? '#6d665d' : '#857d71'} op={Math.min(1, akinti * 4)} />;
        })}
        {Array.from({length: 7}, (_, i) => {
          const u = Math.max(0, akinti - i * 0.06);
          return <Bulut key={`r${i}`} cx={karis(720 + i * 30, 1180 - i * 150, u)} cy={karis(650 + i * 20, 1200 + (i % 2) * 30, u)} r={90 + u * 220} n={18} t={t} seed={i * 23 + 400} renk={i % 2 ? '#78706a' : '#8a8276'} op={Math.min(1, akinti * 4)} />;
        })}
        <ellipse cx={540} cy={1180} rx={700 * akinti} ry={140 * akinti} fill="#ff7a2a" opacity={0.18 * akinti} filter="url(#flu10)" />
      </g>
      <rect y={1150} width={1080} height={800} fill="#8f8577" />
      <Catilar y0={1160} satir={8} t={t} koyu={0.85} />
      {/* kaçanlar: şehir kapısına doğru */}
      <g opacity={kacis}>
        <path d="M 760 1700 L 760 1460 Q 860 1360 960 1460 L 960 1700 Z" fill="#2b241e" />
        <path d="M 700 1460 L 1020 1460 L 1020 1420 L 700 1420 Z" fill="#9d8f7a" />
        {Array.from({length: 6}, (_, i) => <Insan key={i} x={300 + i * 70 + lt * 140} y={1760 + (i % 2) * 30} s={1.5} faz={t * 11 + i} kos ortu={i % 2 === 0} renk={['#6b5240', '#8c3f30', '#5f6a55'][i % 3]} />)}
      </g>
      <Kul t={t} yogun={0.85} n={260} ruzgar={-80} />
      <rect width={1080} height={1920} fill="#2a2018" opacity={akinti * 0.35} />
    </g>
  );
};
const S6: React.FC<{t: number}> = ({t}) => {
  const lt = t - SAHNE[6];
  const firca = gir(t, A.arkeolog - 0.2, 0.4) * (1 - gir(t, A.son - 0.3, 0.4));
  return (
    <g>
      <rect width={1080} height={1920} fill="url(#bugunGok)" />
      <g transform={`translate(540,1000) scale(${1.05 + lt * 0.01})`}><Dag x={0} y={0} s={1.1} renk="#6f8061" t={t} /></g>
      {/* Jüpiter Tapınağı kalıntısı ve forum sütunları */}
      <g transform={`translate(${-lt * 6},0)`}>
        <rect x={-100} y={990} width={1300} height={1000} fill="#a99a80" /><rect x={250} y={1020} width={580} height={150} fill="#c9bba2" />
        <rect x={250} y={1000} width={580} height={30} fill="#d9ccb4" />
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><rect x={280 + i * 98} y={760 - (i % 3 === 1 ? 0 : 60 + rnd(i) * 80)} width={44} height={260 + (i % 3 === 1 ? 0 : 60 + rnd(i) * 80)} fill="#e6dcc8" /><rect x={280 + i * 98} y={760} width={14} height={260} fill="#000" opacity={0.08} /></g>)}
        {Array.from({length: 9}, (_, i) => <g key={i}><rect x={-40 + i * 140} y={1180 - (i % 2) * 40} width={36} height={420 + (i % 2) * 40} fill="#e3d8c2" /><rect x={-48 + i * 140} y={1170 - (i % 2) * 40} width={52} height={16} fill="#cdbfa6" /></g>)}
        <rect y={1580} width={1080} height={400} fill="#b8a98f" />
        {Array.from({length: 40}, (_, i) => <rect key={i} x={rnd(i) * 1080} y={1600 + rnd(i + 1) * 300} width={30 + rnd(i + 2) * 60} height={10 + rnd(i + 3) * 20} fill="#9a8c74" opacity={0.6} />)}
      </g>
      {/* arkeolog */}
      <g opacity={firca} transform="translate(760,1820) scale(2.2)">
        <ellipse cx={0} cy={0} rx={50} ry={6} fill="#000" opacity={0.25} />
        <path d="M -20 0 Q -30 -40 -10 -70 L 20 -70 Q 26 -40 18 0 Z" fill="#5d6b74" />
        <circle cx={6} cy={-82} r={12} fill="#c49a76" />
        <path d="M -8 -90 Q 6 -104 20 -90 L 20 -86 L -8 -86 Z" fill="#c9b07a" />
        <path d={`M 14 -60 L ${-30 + Math.sin(t * 8) * 8} -12`} stroke="#5d6b74" strokeWidth={8} strokeLinecap="round" />
        <rect x={-46 + Math.sin(t * 8) * 8} y={-16} width={18} height={8} rx={2} fill="#8a5a3a" />
      </g>
      <rect width={1080} height={1920} fill="url(#altKarart)" opacity={0.3} />
    </g>
  );
};
const SAHNELER = [S0, S1, S2, S3, S4, S5, S6];

// ---- yazılar --------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.3) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1560, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(10,9,8,.72)', borderRadius: 24, padding: '16px 30px 18px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 50, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 12, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? '#ffc27a' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 50px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 100px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  // hızlı kamera geçişlerinde yatay hareket bulanıklığı
  const hiz = Math.max(...SAHNE.slice(1, 7).map((s) => Math.max(0, 1 - Math.abs(t - s) / 0.22)));
  const baslik = gir(t, 0.1, 0.5) * (1 - gir(t, SAHNE[1] - 0.3, 0.3));
  const kapanis = gir(t, A.son - 0.1, 0.6);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('pompeii/mix.wav')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="safakGok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6f8fae" /><stop offset="45%" stopColor="#d9c1a0" /><stop offset="100%" stopColor="#f2d6a6" /></linearGradient>
          <linearGradient id="ogleGok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7ea7cc" /><stop offset="60%" stopColor="#d2dbe0" /><stop offset="100%" stopColor="#efe2c8" /></linearGradient>
          <linearGradient id="kulGok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d1a17" /><stop offset="50%" stopColor="#4a4038" /><stop offset="100%" stopColor="#6e5a46" /></linearGradient>
          <linearGradient id="bugunGok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#86b3da" /><stop offset="100%" stopColor="#e8eef0" /></linearGradient>
          <linearGradient id="pus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3e3c8" stopOpacity="0" /><stop offset="50%" stopColor="#f3e3c8" stopOpacity="0.7" /><stop offset="100%" stopColor="#f3e3c8" stopOpacity="0" /></linearGradient>
          <linearGradient id="altKarart" x1="0" y1="0" x2="0" y2="1"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.8" /></linearGradient>
          <linearGradient id="uzakSokak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#efe2c8" /><stop offset="100%" stopColor="#a89a84" /></linearGradient>
          <radialGradient id="gunesHale"><stop offset="0%" stopColor="#fff4d8" stopOpacity="0.9" /><stop offset="100%" stopColor="#fff4d8" stopOpacity="0" /></radialGradient>
          <pattern id="dagDoku" width="80" height="40" patternUnits="userSpaceOnUse"><path d="M 0 30 Q 20 10 40 30 T 80 30" stroke="#2f3a2c" strokeWidth="3" fill="none" opacity="0.35" /></pattern>
          <filter id="bulutDoku" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed={Math.floor(t * 2) % 50} result="g" />
            <feDisplacementMap in="SourceGraphic" in2="g" scale="70" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation="4" />
          </filter>
          <filter id="flu10" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12" /></filter>
          <filter id="hareket" x="-10%" width="120%"><feGaussianBlur stdDeviation={`${hiz * 26} 0`} /></filter>
          <radialGradient id="vinyet" cx="50%" cy="45%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.6" /></radialGradient>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(t * 15)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.15" />
          </filter>
        </defs>
        <g filter={hiz > 0.05 ? 'url(#hareket)' : undefined}>
          {SAHNELER.map((Sahne, i) => {
            const op = sahneOp(t, i);
            if (op <= 0.001 || KLIP[i]) return null;
            return <g key={i} opacity={op}><Sahne t={t} /></g>;
          })}
        </g>
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.07} />
      </svg>
      {KLIP.map((f, i) => {
        if (!f) return null;
        const op = sahneOp(t, i);
        if (op <= 0.001) return null;
        return <AbsoluteFill key={i} style={{opacity: op}}><OffthreadVideo src={staticFile(`pompeii/klipler/${f}`)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /></AbsoluteFill>;
      })}

      <div style={{position: 'absolute', left: 30, top: 40, fontFamily: METIN, fontWeight: 600, fontSize: 24, color: '#fff', opacity: 0.75, background: 'rgba(0,0,0,.35)', padding: '6px 14px', borderRadius: 12}}>Temsilî animasyon · Yapay zekâ seslendirme</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', color: '#fff', opacity: baslik, textShadow: '0 6px 30px rgba(0,0,0,.6)'}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 150, transform: `scale(${karis(1.15, 1, baslik)})`}}>Pompeii</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 44, letterSpacing: 14, marginTop: -6}}>MS 79</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center', opacity: kapanis, color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,.55)'}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 110}}>Pompeii</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 38, letterSpacing: 4, marginTop: 4}}>MS 79 · kazılar 1748'de başladı</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1790, textAlign: 'center', opacity: gir(t, A.devam + 0.4, 0.5)}}>
        <div style={{display: 'inline-block', background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 16, padding: '10px 22px', fontFamily: METIN, fontWeight: 600, fontSize: 22, lineHeight: 1.5}}>
          Kaynaklar: Scientific American · Michigan Tech (Vesuvio 79) · Archaeology Magazine (2018)
        </div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

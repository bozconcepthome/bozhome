// "Evinizin havası" — 35 sn bilgilendirici animasyon (ElevenLabs anlatım). Tek salon, kelimeye bağlı sahneler.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/evhavasi/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 35;
const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
const KOYU = '#1e2a2e', YESIL = '#3f6f63', TURUNCU = '#c8673a';
const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const A = {
  l1: an(1), epa: an(1, 1), iki: an(1, 8), bes: an(1, 10),
  l2: an(2), ocak: an(2, 5), temizlik: an(2, 6), mobilya: an(2, 9), boya: an(2, 11), nem: an(2, 13),
  l3: an(3), gunde: an(3, 3), pencere: an(3, 6), ardina: an(3, 9),
  l4: an(4), yuzde: an(4, 2), altmis: an(4, 3),
  l5: an(5), nefes: an(5, 5), son: K[K.length - 1].e,
};
const PEN = {x0: 70, x1: 470, y0: 380, y1: 1180}; // pencere
const ZEMIN = 1430;

type Kare = [number, number, number, number];
const KAM: Kare[] = [
  [0, 760, 1380, 1.6], [A.l1 - 0.3, 660, 1200, 1.3], [A.l1 + 0.5, 540, 960, 1.0],
  [A.l3 - 0.3, 540, 960, 1.0], [A.l3 + 0.6, 330, 900, 1.28], [A.l4 - 0.35, 330, 900, 1.3],
  [A.l4 + 0.35, 690, 760, 2.4], [A.l5 - 0.35, 690, 760, 2.45], [A.l5 + 0.6, 540, 960, 1.0], [SURE, 540, 960, 1.04],
];
const kamera = (t: number): [number, number, number] => {
  let i = 0;
  while (i < KAM.length - 1 && t >= KAM[i + 1][0]) i++;
  if (i === KAM.length - 1) return [KAM[i][1], KAM[i][2], KAM[i][3]];
  const [t0, x0, y0, s0] = KAM[i], [t1, x1, y1, s1] = KAM[i + 1];
  const u = yumus(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  return [karis(x0, x1, u), karis(y0, y1, u), karis(s0, s1, u)];
};

// ---- salon ---------------------------------------------------------------------------
const Pencere: React.FC<{t: number; acik: number; bugu: number}> = ({t, acik, bugu}) => {
  const {x0, x1, y0, y1} = PEN;
  const orta = (x0 + x1) / 2;
  const kanat = (sol: boolean) => {
    const w = (orta - x0) * Math.cos((acik * 84 * Math.PI) / 180);
    const x = sol ? x0 + 18 : x1 - 18 - w;
    return (
      <g>
        <rect x={x} y={y0 + 18} width={w} height={y1 - y0 - 36} fill="url(#cam)" opacity={0.55} />
        <rect x={x} y={y0 + 18} width={w} height={y1 - y0 - 36} fill="none" stroke="#f7f5f1" strokeWidth={16} />
        <path d={`M ${x + w / 2} ${y0 + 18} L ${x + w / 2} ${y1 - 18} M ${x} ${(y0 + y1) / 2} L ${x + w} ${(y0 + y1) / 2}`} stroke="#f7f5f1" strokeWidth={9} />
        <rect x={x} y={y0 + 18} width={w} height={y1 - y0 - 36} fill="url(#camParilti)" opacity={0.5} />
        {bugu > 0.01 && Array.from({length: 40}, (_, i) => (
          <ellipse key={i} cx={x + rnd(i) * w} cy={y1 - 40 - rnd(i + 3) * 260} rx={3 + rnd(i + 1) * 4} ry={4 + rnd(i + 2) * 6} fill="#ffffff" opacity={0.55 * bugu} />
        ))}
      </g>
    );
  };
  return (
    <g>
      {/* dışarısı */}
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#gok)" />
      <g filter="url(#flu5)">
        <rect x={x0} y={y1 - 260} width={x1 - x0} height={260} fill="#9bb38f" />
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={x0 + 30 + i * 95} cy={y1 - 250 - (i % 2) * 60 + Math.sin(t * 0.8 + i) * 4} r={95 + (i % 2) * 30} fill={i % 2 ? '#6f9466' : '#83a878'} />)}
        <rect x={x0 + 250} y={y1 - 420} width={90} height={260} fill="#d9d2c6" />
      </g>
      {kanat(true)}
      {kanat(false)}
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="none" stroke="#f7f5f1" strokeWidth={22} />
      <rect x={x0 - 30} y={y1 + 4} width={x1 - x0 + 60} height={24} rx={4} fill="#f2efe9" />
      <rect x={x0 - 30} y={y1 + 24} width={x1 - x0 + 60} height={10} fill="#000" opacity={0.08} />
    </g>
  );
};
const Perde: React.FC<{x: number; t: number; ruzgar: number; dir: number}> = ({x, t, ruzgar, dir}) => {
  const salla = (k: number) => Math.sin(t * 2.2 + k) * 10 * ruzgar + ruzgar * 40 * dir;
  const d = `M ${x - 60} 330 L ${x + 60} 330 Q ${x + 70 + salla(1)} 800 ${x + 60 + salla(2) * 1.4} 1420 L ${x - 60 + salla(3) * 1.5} 1420 Q ${x - 70 + salla(4)} 800 ${x - 60} 330 Z`;
  return (
    <g>
      <path d={d} fill="url(#perde)" />
      {[-30, 0, 30].map((k, i) => <path key={k} d={`M ${x + k} 340 Q ${x + k + salla(i) * 0.6} 900 ${x + k + salla(i + 2) * 1.3} 1410`} stroke="#000" strokeOpacity={0.07} strokeWidth={14} fill="none" />)}
    </g>
  );
};
const Salon: React.FC<{t: number; acik: number; ruzgar: number; bugu: number; nem: number}> = ({t, acik, ruzgar, bugu, nem}) => (
  <g>
    <rect x={-200} y={-200} width={1480} height={ZEMIN + 200} fill="url(#duvar)" />
    <rect x={-200} y={ZEMIN - 40} width={1480} height={40} fill="#f4f1ec" />
    <rect x={-200} y={ZEMIN - 4} width={1480} height={6} fill="#000" opacity={0.07} />
    <rect x={-200} y={ZEMIN} width={1480} height={700} fill="url(#parke)" />
    {Array.from({length: 14}, (_, i) => <path key={i} d={`M ${-200 + i * 110} ${ZEMIN} L ${-900 + i * 230} 2200`} stroke="#7d5c3f" strokeWidth={2.5} opacity={0.25} />)}
    <Pencere t={t} acik={acik} bugu={bugu} />
    <Perde x={30} t={t} ruzgar={ruzgar} dir={1} />
    <Perde x={510} t={t + 1} ruzgar={ruzgar} dir={1} />
    {/* güneş huzmesi ve zemindeki ışık lekesi */}
    <path d={`M ${PEN.x0 + 20} ${PEN.y0 + 20} L ${PEN.x1 - 20} ${PEN.y0 + 20} L 1180 1560 L 1180 1980 L 620 1980 Z`} fill="url(#huzme)" style={{mixBlendMode: 'screen'}} />
    <path d="M 640 1520 L 980 1520 L 1180 1900 L 760 1900 Z" fill="#fff2d6" opacity={0.35} filter="url(#flu5)" />
    {/* tablo + nem ölçer */}
    <g>
      <rect x={830} y={520} width={210} height={290} fill="#f6f2ea" stroke="#b9a58d" strokeWidth={12} />
      <path d="M 850 760 Q 920 640 1020 760 Z" fill="#9fb59a" /><circle cx={980} cy={620} r={34} fill="#e6a77a" />
      <g opacity={gir(t, A.l1 - 0.2, 0.5)}><Higrometre x={690} y={760} r={64} nem={nem} /></g>
    </g>
    {/* kanepe */}
    <g>
      <ellipse cx={810} cy={ZEMIN + 8} rx={300} ry={22} fill="#000" opacity={0.18} filter="url(#flu5)" />
      <rect x={600} y={1080} width={470} height={250} rx={46} fill="url(#kumas)" />
      <rect x={585} y={1230} width={500} height={150} rx={40} fill="url(#kumas2)" />
      <rect x={565} y={1150} width={80} height={240} rx={36} fill="url(#kumas)" />
      <rect x={640} y={1110} width={170} height={150} rx={36} fill={TURUNCU} opacity={0.9} />
      <rect x={820} y={1100} width={180} height={160} rx={36} fill="#efe7da" />
      <rect x={620} y={1380} width={16} height={50} fill="#6b5442" /><rect x={1040} y={1380} width={16} height={50} fill="#6b5442" />
    </g>
    {/* tel sehpa (gerçek ürün fotoğrafı) + üstünde kitap ve bitki */}
    <g>
      <ellipse cx={482} cy={ZEMIN + 4} rx={120} ry={10} fill="#000" opacity={0.22} filter="url(#flu5)" />
      <image href={staticFile('evhavasi/sehpa.png')} x={366} y={ZEMIN - 283} width={233} height={283} />
      <rect x={430} y={ZEMIN - 300} width={110} height={18} rx={3} fill="#2f4a46" />
      <rect x={436} y={ZEMIN - 316} width={96} height={16} rx={3} fill="#e8dcc6" />
    </g>
    {/* bitki */}
    <g transform={`rotate(${Math.sin(t * 1.3) * (0.6 + ruzgar * 2.5)},140,${ZEMIN})`}>
      <path d={`M 90 ${ZEMIN} L 190 ${ZEMIN} L 205 ${ZEMIN - 140} L 75 ${ZEMIN - 140} Z`} fill="#d8c9b3" />
      {Array.from({length: 9}, (_, i) => {
        const a = -60 + i * 15, L = 230 + rnd(i) * 200;
        const ex = 140 + Math.sin((a * Math.PI) / 180) * L, ey = ZEMIN - 140 - Math.cos((a * Math.PI) / 180) * L;
        return <ellipse key={i} cx={(140 + ex) / 2 + Math.sin(a) * 20} cy={(ZEMIN - 140 + ey) / 2} rx={42} ry={L / 2.2} fill={i % 2 ? '#4f7a55' : '#5f8d63'} transform={`rotate(${a},${(140 + ex) / 2},${(ZEMIN - 140 + ey) / 2})`} />;
      })}
    </g>
    {/* halı */}
    <ellipse cx={720} cy={1640} rx={430} ry={120} fill="url(#hali)" />
  </g>
);
const Higrometre: React.FC<{x: number; y: number; r: number; nem: number}> = ({x, y, r, nem}) => {
  const aci = (v: number) => -135 + (v / 100) * 270;
  const yay = (a: number, b: number) => {
    const p = (v: number, rr: number) => [x + Math.sin((aci(v) * Math.PI) / 180) * rr, y - Math.cos((aci(v) * Math.PI) / 180) * rr];
    const [ax, ay] = p(a, r * 0.78), [bx, by] = p(b, r * 0.78);
    return `M ${ax} ${ay} A ${r * 0.78} ${r * 0.78} 0 ${b - a > 66 ? 1 : 0} 1 ${bx} ${by}`;
  };
  const ig = (aci(nem) * Math.PI) / 180;
  return (
    <g>
      <circle cx={x + 4} cy={y + 6} r={r + 10} fill="#000" opacity={0.18} filter="url(#flu5)" />
      <circle cx={x} cy={y} r={r + 10} fill="url(#metalCerceve)" />
      <circle cx={x} cy={y} r={r} fill="#fbfaf6" />
      <path d={yay(0, 30)} stroke="#e7c36a" strokeWidth={r * 0.12} fill="none" />
      <path d={yay(30, 50)} stroke="#5fae7b" strokeWidth={r * 0.12} fill="none" />
      <path d={yay(50, 60)} stroke="#a8cf8f" strokeWidth={r * 0.12} fill="none" />
      <path d={yay(60, 100)} stroke="#d9725c" strokeWidth={r * 0.12} fill="none" />
      {[0, 20, 40, 60, 80, 100].map((v) => {
        const a = (aci(v) * Math.PI) / 180;
        return <g key={v}>
          <path d={`M ${x + Math.sin(a) * r * 0.62} ${y - Math.cos(a) * r * 0.62} L ${x + Math.sin(a) * r * 0.7} ${y - Math.cos(a) * r * 0.7}`} stroke="#333" strokeWidth={r * 0.03} />
          <text x={x + Math.sin(a) * r * 0.48} y={y - Math.cos(a) * r * 0.48 + r * 0.06} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={r * 0.15} fill="#333">{v}</text>
        </g>;
      })}
      <text x={x} y={y + r * 0.42} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={r * 0.13} fill="#555">NEM %</text>
      <path d={`M ${x - Math.sin(ig) * r * 0.12} ${y + Math.cos(ig) * r * 0.12} L ${x + Math.sin(ig) * r * 0.66} ${y - Math.cos(ig) * r * 0.66}`} stroke="#b33a2b" strokeWidth={r * 0.04} strokeLinecap="round" />
      <circle cx={x} cy={y} r={r * 0.07} fill="#333" />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.45} rx={r * 0.5} ry={r * 0.2} fill="#fff" opacity={0.5} transform={`rotate(-30,${x},${y})`} />
    </g>
  );
};

// ---- partiküller ---------------------------------------------------------------------
const huzmede = (x: number, y: number) => {
  // huzme: üst kenar pencere, alt kenar sağ-aşağı; basit çizgi testi
  const solK = (y - PEN.y0) / (1980 - PEN.y0) * (620 - PEN.x0 - 20) + PEN.x0 + 20;
  const sagK = (y - PEN.y0) / (1560 - PEN.y0) * (1180 - PEN.x1 + 20) + PEN.x1 - 20;
  return y > PEN.y0 && x > solK && x < sagK;
};
const Partikuller: React.FC<{t: number; yogun: number; cikis: number}> = ({t, yogun, cikis}) => (
  <g>
    {Array.from({length: 320}, (_, i) => {
      if (rnd(i + 77) > yogun) return null;
      const z = rnd(i + 3);
      let x = (rnd(i) * 1300 - 100 + Math.sin(t * 0.3 + i) * 30 + t * 6 * (z - 0.5) + 1300) % 1300 - 100;
      let y = (rnd(i + 1) * 1500 + 200 + Math.cos(t * 0.25 + i * 1.7) * 30 - t * 4 * z + 1500) % 1500 + 200;
      if (cikis > 0) {
        const u = Math.min(1, Math.max(0, cikis * 1.6 - rnd(i + 9) * 0.6));
        x = karis(x, 270 + Math.sin(i) * 120, u * u); y = karis(y, 780 + Math.cos(i) * 300, u * u);
        if (u > 0.95) return null;
      }
      const isik = huzmede(x, y);
      const r = (isik ? 2.2 : 1.4) + z * (isik ? 6 : 4.5);
      return <circle key={i} cx={x} cy={y} r={r} fill={isik ? '#fff6dc' : '#d8d2c8'} opacity={(isik ? 0.95 : 0.28) * (0.5 + 0.5 * Math.sin(t * 2 + i))} filter={z > 0.75 ? 'url(#flu2)' : undefined} />;
    })}
  </g>
);
const Akim: React.FC<{t: number; g: number}> = ({t, g}) => (
  <g opacity={g}>
    {Array.from({length: 9}, (_, i) => {
      const y0 = 480 + i * 80, y1 = 900 + i * 90 + Math.sin(t + i) * 30;
      return <path key={i} d={`M 300 ${y0} C 520 ${y0 - 40 + Math.sin(t * 1.3 + i) * 30}, 760 ${y1 - 120}, 1120 ${y1}`} stroke="#ffffff" strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray="60 120" strokeDashoffset={-t * 420 - i * 50} opacity={0.55} />;
    })}
  </g>
);

// ---- kartlar ---------------------------------------------------------------------------
const Kart: React.FC<{op: number; children: React.ReactNode; x?: number; y?: number; w?: number; h?: number}> = ({op, children, x = 90, y = 360, w = 900, h = 1000}) =>
  op <= 0.001 ? null : (
    <g opacity={op} transform={`translate(0,${(1 - op) * 40})`}>
      <rect x={x + 6} y={y + 14} width={w} height={h} rx={36} fill="#000" opacity={0.18} filter="url(#flu12)" />
      <rect x={x} y={y} width={w} height={h} rx={36} fill="#fbfaf7" />
      {children}
    </g>
  );
const EpaKart: React.FC<{t: number; op: number}> = ({t, op}) => {
  const bar = interpolate(t, [A.iki - 0.1, A.bes + 0.3], [1, 5], {...kis, easing: yumus});
  const bandi = gir(t, A.iki - 0.05, 0.4);
  const satir = (y: number, baslik: string, yogun: number, ic: boolean) => (
    <g>
      <rect x={150} y={y} width={300} height={300} rx={24} fill={ic ? '#efe5d6' : '#cfe3ee'} />
      <g clipPath={`url(#mini${ic ? 'Ic' : 'Dis'})`}>
        {ic ? (
          <g><rect x={150} y={y + 200} width={300} height={100} fill="#c9a47c" /><rect x={300} y={y + 120} width={130} height={100} rx={18} fill="#b9b2a3" /><rect x={180} y={y + 40} width={90} height={120} fill="#bfe0ea" stroke="#fff" strokeWidth={6} /></g>
        ) : (
          <g><rect x={150} y={y + 210} width={300} height={90} fill="#9bb38f" /><circle cx={230} cy={y + 190} r={60} fill="#6f9466" /><circle cx={360} cy={y + 180} r={75} fill="#83a878" /><circle cx={400} cy={y + 60} r={28} fill="#fff2c4" /></g>
        )}
        {Array.from({length: Math.round(yogun)}, (_, i) => <circle key={i} cx={160 + rnd(i + (ic ? 50 : 0)) * 280 + Math.sin(t + i) * 6} cy={y + 20 + rnd(i + 9) * 260 + Math.cos(t * 0.8 + i) * 6} r={3 + rnd(i + 3) * 4} fill={ic ? '#7b6a58' : '#7d8e95'} opacity={0.7} />)}
      </g>
      <text x={500} y={y + 70} fontFamily={METIN} fontWeight={800} fontSize={44} fill={KOYU}>{baslik}</text>
      <rect x={500} y={y + 120} width={420} height={44} rx={22} fill="#ece7df" />
      {ic && <rect x={500 + 84 * 2} y={y + 120} width={84 * 3 * bandi} height={44} rx={0} fill={TURUNCU} opacity={0.25} />}
      <rect x={500} y={y + 120} width={84 * (ic ? bar : 1)} height={44} rx={22} fill={ic ? TURUNCU : YESIL} />
      <text x={500} y={y + 240} fontFamily={METIN} fontWeight={800} fontSize={ic ? 96 : 64} fill={ic ? TURUNCU : YESIL}>{ic ? (bandi > 0.5 ? '2–5×' : `${bar.toFixed(1).replace('.', ',')}×`) : '1×'}</text>
    </g>
  );
  return (
    <Kart op={op}>
      <text x={150} y={450} fontFamily={METIN} fontWeight={800} fontSize={34} fill={YESIL} letterSpacing={2}>EPA · ABD ÇEVRE KORUMA AJANSI</text>
      {satir(500, 'DIŞARIDA', 10, false)}
      {satir(860, 'İÇERİDE', 10 + 30 * (bar - 1) / 4, true)}
      <text x={150} y={1300} fontFamily={METIN} fontWeight={600} fontSize={28} fill={KOYU} opacity={0.65}>Bazı kirleticilerin iç ortam yoğunluğu, dış ortama göre</text>
    </Kart>
  );
};
const Kaynak: React.FC<{t: number; t0: number; cx: number; cy: number; etiket: string; children: React.ReactNode}> = ({t, t0, cx, cy, etiket, children}) => {
  const g = interpolate(t, [t0 - 0.1, t0 + 0.25], [0, 1], {...kis, easing: Easing.out(Easing.back(1.6))});
  if (g <= 0.001) return null;
  return (
    <g transform={`translate(${cx},${cy}) scale(${g}) translate(${-cx},${-cy})`}>
      <circle cx={cx + 4} cy={cy + 10} r={190} fill="#000" opacity={0.2} filter="url(#flu12)" />
      <circle cx={cx} cy={cy} r={190} fill="#fbfaf7" />
      <g clipPath={`url(#daire-${cx}-${cy})`}>{children}</g>
      <circle cx={cx} cy={cy} r={190} fill="none" stroke="#fff" strokeWidth={10} />
      <rect x={cx - 150} y={cy + 160} width={300} height={70} rx={35} fill={KOYU} />
      <text x={cx} y={cy + 208} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={34} fill="#fff">{etiket}</text>
    </g>
  );
};
const BUHAR = (t: number, x: number, y: number, renk = '#ffffff') =>
  [0, 1, 2].map((i) => { const f = (t * 0.6 + i / 3) % 1; return <path key={i} d={`M ${x - 30 + i * 30} ${y - f * 140} q -24 -35 0 -70 q 24 -35 0 -70`} stroke={renk} strokeWidth={10} fill="none" strokeLinecap="round" opacity={(1 - f) * 0.7} />; });
const KAYNAKLAR = [[300, 640], [780, 640], [300, 1120], [780, 1120]];
const Kaynaklar: React.FC<{t: number}> = ({t}) => (
  <g>
    <Kaynak t={t} t0={A.ocak} cx={300} cy={640} etiket="Ocak">
      <rect x={110} y={460} width={380} height={380} fill="#3a3f42" />
      <ellipse cx={300} cy={720} rx={130} ry={30} fill="#222" />
      {Array.from({length: 12}, (_, i) => <path key={i} d={`M ${300 + Math.cos(i / 1.9) * 100} ${720 + Math.sin(i / 1.9) * 22} l 0 ${-14 - Math.sin(t * 20 + i) * 6}`} stroke="#5aa0ff" strokeWidth={8} strokeLinecap="round" />)}
      <ellipse cx={300} cy={680} rx={140} ry={34} fill="#5c6166" /><rect x={160} y={600} width={280} height={80} fill="#6c7176" /><ellipse cx={300} cy={600} rx={140} ry={34} fill="#878c90" />
      <rect x={440} y={615} width={120} height={22} rx={10} fill="#2b2b2b" />
      {BUHAR(t, 300, 560)}
      {Array.from({length: 18}, (_, i) => <circle key={i} cx={200 + rnd(i) * 200 + Math.sin(t + i) * 10} cy={560 - ((t * 60 + rnd(i + 2) * 200) % 200)} r={3 + rnd(i + 3) * 3} fill="#cfc7bc" opacity={0.6} />)}
    </Kaynak>
    <Kaynak t={t} t0={A.temizlik} cx={780} cy={640} etiket="Temizlik ürünleri">
      <rect x={590} y={460} width={380} height={380} fill="#dfe9ec" />
      <path d="M 700 560 L 780 560 L 790 600 L 800 820 L 680 820 L 690 600 Z" fill="#4f8fb8" />
      <rect x={700} y={520} width={60} height={44} fill="#e9e9e9" /><path d="M 760 528 L 820 520 L 822 540 L 760 548 Z" fill="#e9e9e9" />
      <rect x={698} y={650} width={84} height={90} rx={8} fill="#fff" opacity={0.85} />
      {Array.from({length: 30}, (_, i) => { const f = (t * 0.9 + rnd(i)) % 1; return <circle key={i} cx={830 + f * 130} cy={530 + (rnd(i + 1) - 0.5) * f * 140} r={2 + f * 6} fill="#b9d6e6" opacity={(1 - f) * 0.8} />; })}
    </Kaynak>
    <Kaynak t={t} t0={A.mobilya} cx={300} cy={1120} etiket="Mobilya ve boya">
      <rect x={110} y={940} width={380} height={380} fill="#efe5d6" />
      <rect x={130} y={1060} width={210} height={150} rx={24} fill="#b9b2a3" /><rect x={130} y={1180} width={210} height={50} rx={14} fill="#a39b8b" />
      <g opacity={gir(t, A.boya - 0.1, 0.3)}>
        <rect x={360} y={1120} width={110} height={110} rx={10} fill="#d6dde0" /><ellipse cx={415} cy={1120} rx={55} ry={14} fill="#9bb38f" />
        <path d="M 330 1040 L 420 1110" stroke="#8a6a44" strokeWidth={14} strokeLinecap="round" /><rect x={406} y={1096} width={30} height={34} rx={4} fill="#9bb38f" transform="rotate(38,421,1113)" />
      </g>
      {[0, 1, 2, 3].map((i) => { const f = (t * 0.5 + i / 4) % 1; return <path key={i} d={`M ${180 + i * 70} ${1060 - f * 120} q -20 -30 0 -60 q 20 -30 0 -60`} stroke="#b6a6d8" strokeWidth={7} fill="none" opacity={(1 - f) * 0.7} strokeLinecap="round" />; })}
    </Kaynak>
    <Kaynak t={t} t0={A.nem} cx={780} cy={1120} etiket="Fazla nem">
      <rect x={590} y={940} width={380} height={380} fill="#cfe0e6" />
      <rect x={620} y={960} width={320} height={300} fill="url(#cam)" opacity={0.8} />
      {Array.from({length: 40}, (_, i) => <ellipse key={i} cx={630 + rnd(i) * 300} cy={980 + rnd(i + 2) * 260 + ((t * 20 * rnd(i + 5)) % 40)} rx={4 + rnd(i + 1) * 5} ry={6 + rnd(i + 3) * 8} fill="#ffffff" opacity={0.75} />)}
      {Array.from({length: 26}, (_, i) => <circle key={i} cx={600 + rnd(i + 30) * 60} cy={1180 + rnd(i + 31) * 100} r={3 + rnd(i) * 7} fill="#3c4a33" opacity={0.65} />)}
    </Kaynak>
  </g>
);

// ---- yazılar --------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif || aktif.c === 0 || aktif.c === 5) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1610, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(20,26,28,.8)', borderRadius: 26, padding: '18px 32px 20px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 50, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 13, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? '#ffcf8a' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};
const Rozet: React.FC<{op: number; top: number; children: React.ReactNode; renk?: string}> = ({op, top, children, renk = KOYU}) =>
  op <= 0.001 ? null : (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', opacity: op, transform: `translateY(${(1 - op) * 16}px)`}}>
      <div style={{background: renk, color: '#fff', borderRadius: 30, padding: '16px 34px 14px', fontFamily: METIN, fontWeight: 800, fontSize: 38, textAlign: 'center', lineHeight: 1.3, boxShadow: '0 12px 30px rgba(0,0,0,.25)'}}>{children}</div>
    </div>
  );

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 50px 'Inter'", 'ğüşıöçİ'), document.fonts.load("600 28px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 80px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const [cx, cy, s] = kamera(t);
  const acik = gir(t, A.pencere - 0.2, 1.4);
  const ruzgar = acik * (1 - gir(t, A.son + 0.5, 1.5) * 0.6);
  const cikis = gir(t, A.pencere + 0.4, 3.6);
  const yogun = karis(0.75, 1, gir(t, A.l2, 4)) * (1 - cikis * 0.82);
  const bugu = gir(t, A.nem - 0.1, 0.5) * (1 - acik);
  const nemDeger = interpolate(t, [A.yuzde - 0.2, A.altmis + 1.2], [72, 46], {...kis, easing: yumus});
  const epaOp = gir(t, A.l1 + 0.1, 0.45) * (1 - gir(t, A.l2 - 0.35, 0.35));
  const kaynakOp = gir(t, A.l2 - 0.1, 0.3) * (1 - gir(t, A.l3 - 0.35, 0.35));
  const flu = Math.max(epaOp, kaynakOp);
  const kapanis = gir(t, A.l5 - 0.1, 0.6);
  const satir0 = K.filter((k) => k.c === 0), satir5 = K.filter((k) => k.c === 5);

  return (
    <AbsoluteFill style={{background: '#ece4d8'}}>
      <Audio src={staticFile('evhavasi/mix.wav')} />
      <Img src={staticFile('evhavasi/sehpa.png')} style={{display: 'none'}} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="duvar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3ede4" /><stop offset="100%" stopColor="#dccfbe" /></linearGradient>
          <linearGradient id="parke" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7a27a" /><stop offset="100%" stopColor="#9a7350" /></linearGradient>
          <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8fc1e3" /><stop offset="100%" stopColor="#e3f1f7" /></linearGradient>
          <linearGradient id="cam" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" /><stop offset="100%" stopColor="#cfe6f0" stopOpacity="0.2" /></linearGradient>
          <linearGradient id="camParilti" x1="0" y1="0" x2="1" y2="1"><stop offset="30%" stopColor="#fff" stopOpacity="0" /><stop offset="45%" stopColor="#fff" stopOpacity="0.7" /><stop offset="55%" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <linearGradient id="perde" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ece4d6" /><stop offset="50%" stopColor="#f8f4ec" /><stop offset="100%" stopColor="#e2d8c8" /></linearGradient>
          <linearGradient id="huzme" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff3d4" stopOpacity="0.55" /><stop offset="100%" stopColor="#fff3d4" stopOpacity="0" /></linearGradient>
          <linearGradient id="kumas" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4bdae" /><stop offset="100%" stopColor="#a39c8d" /></linearGradient>
          <linearGradient id="kumas2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bdb6a6" /><stop offset="100%" stopColor="#968f80" /></linearGradient>
          <radialGradient id="hali" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f2ece2" /><stop offset="85%" stopColor="#e5dccd" /><stop offset="100%" stopColor="#d6cab8" /></radialGradient>
          <radialGradient id="metalCerceve" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#f2f2f2" /><stop offset="60%" stopColor="#a9abad" /><stop offset="100%" stopColor="#6d6f72" /></radialGradient>
          <radialGradient id="vinyet" cx="50%" cy="45%" r="75%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#2a1e10" stopOpacity="0.35" /></radialGradient>
          <filter id="flu2"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id="flu5" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="flu12" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="arkaFlu"><feGaussianBlur stdDeviation={flu * 10} /></filter>
          <clipPath id="miniDis"><rect x={150} y={500} width={300} height={300} rx={24} /></clipPath>
          <clipPath id="miniIc"><rect x={150} y={860} width={300} height={300} rx={24} /></clipPath>
          {KAYNAKLAR.map(([x, y]) => <clipPath key={`${x}-${y}`} id={`daire-${x}-${y}`}><circle cx={x} cy={y} r={186} /></clipPath>)}
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 12)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.2" />
          </filter>
        </defs>
        <g filter={flu > 0.02 ? 'url(#arkaFlu)' : undefined}>
          <g transform={`translate(${540 - cx * s},${960 - cy * s}) scale(${s})`}>
            <Salon t={t} acik={acik} ruzgar={ruzgar} bugu={bugu} nem={nemDeger} />
            <Partikuller t={t} yogun={yogun} cikis={cikis} />
            <Akim t={t} g={gir(t, A.pencere + 0.2, 0.8) * (1 - gir(t, A.l5 + 0.5, 1.5))} />
          </g>
          {flu > 0.02 && <rect width={1080} height={1920} fill="#1e2a2e" opacity={flu * 0.25} />}
        </g>
        <EpaKart t={t} op={epaOp} />
        <g opacity={kaynakOp}><Kaynaklar t={t} /></g>
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.04} />
      </svg>

      {/* kanca */}
      <div style={{position: 'absolute', left: 50, right: 50, top: 230, textAlign: 'center', opacity: 1 - gir(t, A.l1 - 0.3, 0.3)}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 92, color: KOYU, lineHeight: 1.05}}>
          {satir0.slice(0, 2).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 20, opacity: gir(t, k.s - 0.06, 0.25)}}>{k.w}</span>)}
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 64, color: TURUNCU, marginTop: 16, letterSpacing: -1}}>
          {satir0.slice(2).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: gir(t, k.s - 0.06, 0.2), transform: `translateY(${(1 - gir(t, k.s - 0.06, 0.2)) * 14}px)`}}>{k.w}</span>)}
        </div>
      </div>
      <Rozet op={gir(t, A.gunde - 0.05, 0.3) * (1 - gir(t, A.l4 - 0.35, 0.3))} top={210}>Günde 2–3 kez · birkaç dakika<br /><span style={{fontWeight: 600, fontSize: 30, opacity: 0.85}}>pencere ardına kadar açık · UBA</span></Rozet>
      <Rozet op={gir(t, A.altmis - 0.05, 0.3) * (1 - gir(t, A.l5 - 0.35, 0.3))} top={210} renk={YESIL}>Nem &lt; %60<br /><span style={{fontWeight: 600, fontSize: 30, opacity: 0.9}}>ideali %30–50 · EPA</span></Rozet>
      {/* kapanış */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 210, textAlign: 'center', opacity: kapanis}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 80, color: KOYU, lineHeight: 1.1}}>
          {satir5.map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 18, opacity: gir(t, k.s - 0.06, 0.25), color: i >= 4 ? TURUNCU : KOYU}}>{k.w}</span>)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1650, textAlign: 'center', opacity: gir(t, A.son + 0.2, 0.5)}}>
        <div style={{display: 'inline-block', background: 'rgba(20,26,28,.72)', borderRadius: 20, padding: '14px 26px', fontFamily: METIN, fontWeight: 600, fontSize: 25, color: '#fff', lineHeight: 1.55}}>
          Kaynaklar: EPA – Report on the Environment: Indoor Air Quality<br />EPA – Mold Course · Umweltbundesamt – Richtig lüften
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 36, letterSpacing: 10, color: '#fff', marginTop: 20, textShadow: '0 2px 8px rgba(0,0,0,.6)'}}>BOZ CONCEPT HOME</div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

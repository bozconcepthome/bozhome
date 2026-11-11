// "Bu salonun bir sorunu vardı" — tel sehpa satış hikâyesi, 58 sn. Ürün: gerçek fotoğraf. Ses: ElevenLabs (Bill).
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/sehpahikaye/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 58;
const METIN = "'Inter', sans-serif", SERIF = "'Playfair Display', serif";
const KOYU = '#1f1c1a', TURUNCU = '#c8673a', YESIL = '#3f6f63';
const IW = 972, IH = 1180;
const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const A = {
  yer: an(0, 5), dergiler: an(1), kumanda: an(1, 2), kahve: an(1, 4),
  kucuk: an(2), santim: an(2, 3), yeni: an(3), mobilya: an(3, 2), kalabalik: an(3, 6),
  sonra: an(4), geldi: an(4, 2), tek: an(5), kivrilmis: an(5, 2), teller: an(5, 4), yumusak: an(5, 5), sivri: an(5, 7),
  ustu: an(6), kahven: an(6, 2), kitabin: an(6, 3), bitki: an(6, 5),
  yani: an(7), okudugun: an(7, 2), hersey: an(7, 4),
  isik: an(8), isik2: an(8, 2), odayi: an(8, 4), ferah: an(8, 6),
  salonda: an(9), yatak: an(9, 3), okuma: an(9, 6),
  ayni: an(10), nefes: an(10, 4), boz: an(11), siz: an(11, 3),
};
const ZEMIN = 1460;
const PS = 0.44, PX = 520 - (IW * PS) / 2, PBASE = 1500, PY = PBASE - 1168 * PS;
const ek = (x: number, y: number): [number, number] => [PX + x * PS, PY + y * PS];

type Kare = [number, number, number, number];
const KAM: Kare[] = [
  [0, 540, 1020, 1.0], [A.dergiler - 0.4, 540, 1060, 1.12],
  [A.dergiler + 0.2, 250, 1440, 2.0], [A.kumanda - 0.2, 250, 1440, 2.05], [A.kumanda + 0.3, 800, 1300, 2.0], [A.kahve - 0.2, 810, 1300, 2.05],
  [A.kahve + 0.4, 880, 1410, 2.1], [A.kucuk - 0.3, 880, 1420, 2.15], [A.kucuk + 0.5, 540, 1300, 1.12], [A.yeni - 0.3, 540, 1250, 1.1],
  [A.yeni + 0.4, 540, 1150, 1.0], [A.geldi + 0.4, 540, 1150, 1.0], [A.tek - 0.3, 520, 1200, 1.2],
  [A.tek + 0.2, 520, 1240, 1.45], [A.kivrilmis - 0.2, 520, 1240, 1.5], [A.kivrilmis + 0.4, ...ek(820, 140), 2.7] as unknown as Kare, [A.yumusak - 0.2, ...ek(800, 160), 2.75] as unknown as Kare,
  [A.yumusak + 0.4, ...ek(200, 1020), 2.5] as unknown as Kare, [A.sivri - 0.2, ...ek(220, 1010), 2.5] as unknown as Kare, [A.sivri + 0.4, 520, 1150, 1.6],
  [A.ustu - 0.2, 530, 1150, 1.55], [A.ustu + 0.4, 540, 1080, 1.65], [A.yani - 0.3, 540, 1100, 1.6], [A.yani + 0.4, 560, 1300, 1.7],
  [A.isik - 0.4, 560, 1300, 1.68], [A.isik + 0.5, 540, 1180, 1.0], [A.salonda - 0.3, 540, 1180, 1.04], [SURE, 540, 1150, 1.08],
];
const kamera = (t: number): [number, number, number] => {
  let i = 0;
  while (i < KAM.length - 1 && t >= KAM[i + 1][0]) i++;
  if (i === KAM.length - 1) return [KAM[i][1], KAM[i][2], KAM[i][3]];
  const [t0, x0, y0, s0] = KAM[i], [t1, x1, y1, s1] = KAM[i + 1];
  const u = yumus(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  return [karis(x0, x1, u), karis(y0, y1, u), karis(s0, s1, u)];
};

// ---- eşyalar --------------------------------------------------------------------------
const Fincan: React.FC<{x: number; y: number; r?: number; s?: number; buhar?: number; t: number}> = ({x, y, r = 0, s = 1, buhar = 1, t}) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
    <ellipse cx={4} cy={2} rx={34} ry={6} fill="#000" opacity={0.2} />
    <path d="M -30 -70 L -26 -6 Q 0 6 26 -6 L 30 -70 Z" fill="url(#seramik)" />
    <path d="M 28 -58 q 26 4 22 26 q -3 18 -24 16" fill="none" stroke="url(#seramik)" strokeWidth={8} />
    <ellipse cx={0} cy={-70} rx={30} ry={7} fill="#f6f1e8" /><ellipse cx={0} cy={-68} rx={25} ry={5} fill="#4a2a17" />
    {buhar > 0 && [0, 1].map((i) => { const f = (t * 0.7 + i / 2) % 1; return <path key={i} d={`M ${-8 + i * 14} ${-80 - f * 70} q -10 -16 0 -32 q 10 -16 0 -32`} stroke="#fff" strokeWidth={4} fill="none" opacity={(1 - f) * 0.6 * buhar} strokeLinecap="round" />; })}
  </g>
);
const Kitap: React.FC<{x: number; y: number; r?: number; s?: number; renk?: string}> = ({x, y, r = 0, s = 1, renk = '#2f4a46'}) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
    <rect x={-62} y={-22} width={124} height={22} rx={3} fill={renk} />
    <rect x={-58} y={-18} width={116} height={6} fill="#efe6d4" opacity={0.85} />
  </g>
);
const Saksi: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M -26 0 L 26 0 L 32 -46 L -32 -46 Z" fill="#d9c9b1" />
    {[-40, -15, 10, 35].map((a, i) => <ellipse key={a} cx={Math.sin((a * Math.PI) / 180) * 30} cy={-80 - Math.cos(i) * 8} rx={13} ry={36} fill={i % 2 ? '#5f8d63' : '#4f7a55'} transform={`rotate(${a + Math.sin(t * 1.4 + i) * 3},${Math.sin((a * Math.PI) / 180) * 30},-80)`} />)}
  </g>
);
const Kumanda: React.FC<{x: number; y: number; r?: number; s?: number}> = ({x, y, r = 0, s = 1}) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
    <rect x={-50} y={-11} width={100} height={22} rx={10} fill="#2a2a2c" />
    {[-30, -12, 6, 24].map((bx) => <circle key={bx} cx={bx} cy={0} r={3.5} fill="#77787c" />)}
    <circle cx={40} cy={0} r={4} fill="#c8673a" />
  </g>
);
const DERGI_RENK = [['#f2ebe1', TURUNCU], ['#2f3b38', '#e8d2b0'], ['#a9b5a0', '#ffffff']];

// ---- oda ------------------------------------------------------------------------------
type Durum = {t: number; urun: number; dusus: number; aydin: number; esya: {mug: number; kitap: number; bitki: number; dergi: number[]; kumanda: number}; golge: number; huzme: number};
const Oda: React.FC<Durum & {klon?: string}> = ({t, urun, dusus, aydin, esya, golge, huzme, klon = ''}) => {
  const src = staticFile('sehpahikaye/urun.png');
  const ziplama = dusus < 1 ? 0 : 0;
  const dy = karis(-1700, 0, Easing.in(Easing.quad)(Math.min(1, dusus))) + ziplama;
  const sekme = t > A.geldi && urun > 0 ? Math.exp(-(t - A.geldi) * 7) * Math.abs(Math.sin((t - A.geldi) * 13)) * 40 : 0;
  const [topX, topY] = ek(470, 72);
  const ucus = (u: number, x0: number, y0: number, x1: number, y1: number, h = 260) => [karis(x0, x1, u), karis(y0, y1, u) - Math.sin(u * Math.PI) * h] as const;
  const mug = ucus(esya.mug, 880, 1520, topX - 40, topY);
  const kit = ucus(esya.kitap, 845, 1550, topX + 80, topY);
  const bit = ucus(esya.bitki, 230, 1172, topX - 150, topY, 200);
  const kum = ucus(esya.kumanda, 800, 1290, topX + 80, topY - 22, 200);
  return (
    <g>
      <rect x={-300} y={-300} width={1680} height={ZEMIN + 300} fill="url(#duvar)" />
      <rect x={-300} y={ZEMIN - 40} width={1680} height={40} fill="#f4f1ec" />
      <rect x={-300} y={ZEMIN} width={1680} height={800} fill="url(#parke)" />
      {Array.from({length: 16}, (_, i) => <path key={i} d={`M ${-300 + i * 120} ${ZEMIN} L ${-1000 + i * 250} 2300`} stroke="#7d5c3f" strokeWidth={2.5} opacity={0.22} />)}
      {/* pencere */}
      <rect x={60} y={420} width={340} height={730} fill="url(#gok)" />
      <g filter="url(#flu5)">{[0, 1, 2, 3].map((i) => <circle key={i} cx={80 + i * 100} cy={1020 - (i % 2) * 50} r={90 + (i % 2) * 25} fill={i % 2 ? '#6f9466' : '#83a878'} />)}</g>
      <rect x={60} y={420} width={340} height={730} fill="none" stroke="#f7f5f1" strokeWidth={20} />
      <path d="M 230 420 L 230 1150 M 60 785 L 400 785" stroke="#f7f5f1" strokeWidth={10} />
      <rect x={30} y={1150} width={400} height={24} rx={4} fill="#f2efe9" />
      <path d="M 10 380 Q 0 900 30 1460 L -60 1460 L -60 380 Z" fill="url(#perde)" />
      <path d="M 450 380 Q 470 900 440 1460 L 520 1460 Q 500 900 510 380 Z" fill="url(#perde)" />
      {/* huzme */}
      <path d={`M 80 440 L 380 440 L 1300 1700 L 1300 2300 L 520 2300 Z`} fill="url(#huzme)" opacity={0.35 + huzme * 0.65} style={{mixBlendMode: 'screen'}} />
      {/* tablo */}
      <rect x={760} y={560} width={220} height={300} fill="#f6f2ea" stroke="#b9a58d" strokeWidth={12} />
      <path d="M 780 820 Q 860 700 960 820 Z" fill="#9fb59a" /><circle cx={920} cy={660} r={34} fill="#e6a77a" />
      {/* kanepe */}
      <ellipse cx={900} cy={ZEMIN + 8} rx={280} ry={20} fill="#000" opacity={0.18} filter="url(#flu5)" />
      <rect x={660} y={1110} width={520} height={250} rx={46} fill="url(#kumas)" />
      <rect x={640} y={1260} width={560} height={150} rx={40} fill="url(#kumas2)" />
      <rect x={620} y={1180} width={80} height={240} rx={36} fill="url(#kumas)" />
      <rect x={700} y={1140} width={170} height={150} rx={36} fill={TURUNCU} opacity={0.9} />
      <rect x={880} y={1130} width={180} height={160} rx={36} fill="#efe7da" />
      <rect x={680} y={1410} width={16} height={50} fill="#6b5442" />
      {/* bitki (büyük) */}
      <g transform={`rotate(${Math.sin(t * 1.2) * 0.6},120,${ZEMIN})`}>
        <path d={`M 70 ${ZEMIN} L 170 ${ZEMIN} L 185 ${ZEMIN - 130} L 55 ${ZEMIN - 130} Z`} fill="#d8c9b3" />
        {Array.from({length: 8}, (_, i) => {
          const a = -55 + i * 15, Ln = 200 + rnd(i) * 160;
          const ex = 120 + Math.sin((a * Math.PI) / 180) * Ln, ey = ZEMIN - 130 - Math.cos((a * Math.PI) / 180) * Ln;
          return <ellipse key={i} cx={(120 + ex) / 2} cy={(ZEMIN - 130 + ey) / 2} rx={36} ry={Ln / 2.2} fill={i % 2 ? '#4f7a55' : '#5f8d63'} transform={`rotate(${a},${(120 + ex) / 2},${(ZEMIN - 130 + ey) / 2})`} />;
        })}
      </g>
      <ellipse cx={560} cy={1640} rx={460} ry={120} fill="url(#hali)" />
      {/* ürünün tel gölgesi */}
      {urun > 0.01 && (
        <g transform={`translate(${PX},${PY + dy - sekme}) scale(${PS})`} opacity={golge * Math.min(1, dusus)}>
          <g transform="matrix(1,0,-0.95,-0.24,1110,1448)" filter="url(#golgeFiltre)">
            <image href={src} x={0} y={0} width={IW} height={IH} />
          </g>
        </g>
      )}
      {/* yerdeki dergi yığını */}
      {DERGI_RENK.map(([c1, c2], i) => {
        const u = esya.dergi[i];
        if (u > 0.999) return null;
        const [x, y] = ucus(u, 200 + i * 26, 1530 - i * 14, ...ek(652, 600), 300);
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${karis(-12 + i * 14, 90, u)}) scale(${karis(1, 0.44 * 2.2, u)})`} opacity={1 - Math.max(0, u - 0.85) * 6}>
            <rect x={-70} y={-48} width={140} height={96} rx={4} fill={c1} stroke="#00000022" strokeWidth={2} />
            <rect x={-56} y={-36} width={60} height={14} fill={c2} /><rect x={-56} y={-10} width={110} height={40} fill={c2} opacity={0.35} />
          </g>
        );
      })}
      {/* kitap yığını + fincan (önce) */}
      <Kitap x={kit[0]} y={kit[1]} s={karis(1, 0.9, esya.kitap)} r={karis(-4, 0, esya.kitap)} />
      {esya.kitap < 0.5 && <><Kitap x={850} y={1528} renk="#8e3b2c" r={3} /><Kitap x={845} y={1506} renk="#d9b48f" r={-2} /></>}
      <Fincan x={mug[0]} y={esya.kitap < 0.5 ? Math.min(mug[1], esya.mug > 0 ? mug[1] : 1484) : mug[1]} r={esya.mug > 0 ? 0 : Math.sin(t * 2.4) * 4} s={karis(1, 0.85, esya.mug)} t={t} />
      <Kumanda x={kum[0]} y={kum[1]} r={karis(-20, 0, esya.kumanda)} s={karis(0.95, 0.9, esya.kumanda)} />
      <Saksi x={bit[0]} y={bit[1]} s={karis(1, 0.85, esya.bitki)} t={t} />
      {/* ürün */}
      {urun > 0.01 && (
        <g transform={`translate(${PX},${PY + dy - sekme}) scale(${PS})`}>
          <image href={src} x={0} y={0} width={IW} height={IH} />
          <g mask={`url(#urunMaske${klon})`}>
            <rect x={0} y={0} width={IW} height={IH} fill="url(#sicak)" opacity={0.45} style={{mixBlendMode: 'multiply'}} />
            {[A.teller - 0.2, A.isik2 - 0.2, A.boz - 0.1].map((t0, i) => {
              const px = interpolate(t, [t0, t0 + 1.0], [-500, IW + 500], kis);
              return <rect key={i} x={px - 170} y={-300} width={340} height={IH + 600} fill="url(#parlama)" transform={`rotate(20,${px},${IH / 2})`} />;
            })}
          </g>
          {DERGI_RENK.map(([c1, c2], i) => esya.dergi[i] > 0.85 && (
            <g key={i} transform={`translate(${618 + i * 32},1120) rotate(${-7 + i * 6})`} opacity={Math.min(1, (esya.dergi[i] - 0.85) * 8)}>
              <rect x={-60} y={-470} width={120} height={470} rx={4} fill={c1} stroke="#00000033" strokeWidth={2} />
              <rect x={-34} y={-440} width={74} height={30} fill={c2} /><rect x={-34} y={-300} width={74} height={150} fill={c2} opacity={0.35} />
            </g>
          ))}
          {esya.dergi[0] > 0.85 && <g clipPath={`url(#onTeller${klon})`}><image href={src} x={0} y={0} width={IW} height={IH} /></g>}
        </g>
      )}
      {/* aydınlık/karanlık */}
      <rect x={-300} y={-300} width={1680} height={2600} fill="#1b2026" opacity={(1 - aydin) * 0.42} />
      <rect x={-300} y={-300} width={1680} height={2600} fill="#ffd9a3" opacity={aydin * 0.08} style={{mixBlendMode: 'screen'}} />
    </g>
  );
};

// ---- ara sahneler ------------------------------------------------------------------
const Serit: React.FC<{t: number}> = ({t}) => {
  const g = gir(t, A.kucuk - 0.1, 0.4) * (1 - gir(t, A.yeni - 0.4, 0.3));
  const uz = gir(t, A.santim - 0.6, 1.2);
  if (g <= 0) return null;
  return (
    <g opacity={g}>
      <rect x={120} y={1560} width={840 * uz} height={46} rx={6} fill="#f2c94c" stroke="#b8902a" strokeWidth={3} />
      {Array.from({length: Math.floor(84 * uz)}, (_, i) => <path key={i} d={`M ${130 + i * 10} 1560 L ${130 + i * 10} ${1560 + (i % 10 === 0 ? 26 : i % 5 === 0 ? 18 : 10)}`} stroke="#3a2f12" strokeWidth={2} />)}
      {Array.from({length: Math.floor(8.4 * uz)}, (_, i) => <text key={i} x={130 + i * 100 + 4} y={1600} fontFamily={METIN} fontWeight={800} fontSize={14} fill="#3a2f12">{i * 10}</text>)}
      <rect x={120 + 840 * uz - 6} y={1540} width={60} height={86} rx={12} fill="#d64532" />
    </g>
  );
};
const Hayalet: React.FC<{t: number}> = ({t}) => {
  const g = gir(t, A.mobilya - 0.15, 0.3) * (1 - gir(t, A.sonra - 0.3, 0.4));
  const x = Math.exp(-Math.max(0, t - A.kalabalik) * 4) * (t > A.kalabalik ? 1 : 0);
  if (g <= 0) return null;
  const capra = gir(t, A.kalabalik, 0.3);
  return (
    <g opacity={g}>
      <g transform={`translate(${Math.sin(t * 60) * 6 * x},0)`}>
        <rect x={190} y={1150} width={700} height={420} rx={20} fill="rgba(200,103,58,.12)" stroke={TURUNCU} strokeWidth={8} strokeDasharray="26 16" />
        <path d="M 190 1250 L 890 1250 M 540 1250 L 540 1570" stroke={TURUNCU} strokeWidth={5} strokeDasharray="20 14" />
      </g>
      <g opacity={capra} stroke="#d64532" strokeWidth={26} strokeLinecap="round">
        <path d={`M 380 1200 L ${karis(380, 700, capra)} ${karis(1200, 1520, capra)}`} />
        <path d={`M 700 1200 L ${karis(700, 380, capra)} ${karis(1200, 1520, capra)}`} />
      </g>
    </g>
  );
};
const UcOda: React.FC<{t: number}> = ({t}) => {
  const src = staticFile('sehpahikaye/urun.png');
  const panel = (i: number, t0: number, baslik: string, arka: React.ReactNode, esya: React.ReactNode) => {
    const g = interpolate(t, [t0 - 0.35, t0 + 0.15], [0, 1], {...kis, easing: Easing.out(Easing.cubic)});
    const cik = gir(t, A.ayni - 0.45, 0.4);
    if (g <= 0) return null;
    const y = 250 + i * 440;
    return (
      <g key={i} opacity={1 - cik} transform={`translate(${(1 - g) * (i % 2 ? 1100 : -1100)},0)`}>
        <rect x={56} y={y + 10} width={968} height={410} rx={34} fill="#000" opacity={0.25} filter="url(#flu12)" />
        <clipPath id={`panel${i}`}><rect x={60} y={y} width={960} height={410} rx={34} /></clipPath>
        <g clipPath={`url(#panel${i})`}>
          {arka}
          <image href={src} x={560 - 0.3 * IW / 2} y={y + 400 - 0.3 * 1168} width={IW * 0.3} height={IH * 0.3} />
          {esya}
          <rect x={60} y={y} width={960} height={410} fill="url(#panelIsik)" />
        </g>
        <rect x={90} y={y + 26} width={330} height={66} rx={33} fill="rgba(20,20,22,.78)" />
        <text x={255} y={y + 71} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={32} fill="#fff">{baslik}</text>
      </g>
    );
  };
  return (
    <g>
      {panel(0, A.salonda, 'Salonda',
        <g><rect x={60} y={250} width={960} height={410} fill="#ece3d6" /><rect x={60} y={600} width={960} height={60} fill="#c9a47c" /><rect x={660} y={430} width={360} height={190} rx={36} fill="#b9b2a3" /><rect x={690} y={450} width={120} height={100} rx={26} fill={TURUNCU} /></g>,
        <Fincan x={540} y={540} s={0.6} t={t} />)}
      {panel(1, A.yatak, 'Yatak odasında',
        <g><rect x={60} y={690} width={960} height={410} fill="#dfe3e8" /><rect x={60} y={1040} width={960} height={60} fill="#b99674" /><rect x={700} y={820} width={320} height={230} rx={20} fill="#f4f1ec" /><rect x={690} y={760} width={30} height={290} fill="#8a6a50" /><rect x={720} y={840} width={140} height={60} rx={24} fill="#fff" /><circle cx={290} cy={760} r={60} fill="#ffe1a8" opacity={0.5} /></g>,
        <g><Kitap x={540} y={1015} s={0.6} renk="#3f6f63" /><circle cx={500} cy={940} r={30} fill="url(#lamba)" /></g>)}
      {panel(2, A.okuma, 'Okuma köşesinde',
        <g><rect x={60} y={1130} width={960} height={410} fill="#e8dfd0" /><rect x={60} y={1480} width={960} height={60} fill="#a9825c" /><rect x={720} y={1280} width={240} height={220} rx={40} fill="#7d8f7a" /><path d="M 300 1490 L 300 1250 L 360 1230" stroke="#2b2b2b" strokeWidth={8} fill="none" /><circle cx={370} cy={1236} r={60} fill="#ffe1a8" opacity={0.45} /></g>,
        <Saksi x={510} y={1456} s={0.55} t={t} />)}
    </g>
  );
};

// ---- yazılar ---------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif || aktif.c === 0 || aktif.c === 11) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1640, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(22,20,18,.8)', borderRadius: 26, padding: '16px 30px 18px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 48, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 12, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? '#ffb27a' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};
const Etiket: React.FC<{t: number; t0: number; t1: number; x: number; y: number; children: React.ReactNode; renk?: string}> = ({t, t0, t1, x, y, children, renk = KOYU}) => {
  const g = interpolate(t, [t0 - 0.05, t0 + 0.25], [0, 1], {...kis, easing: Easing.out(Easing.back(1.7))}) * (1 - gir(t, t1, 0.25));
  if (g <= 0.001) return null;
  return (
    <div style={{position: 'absolute', left: x - 300, width: 600, top: y, display: 'flex', justifyContent: 'center', opacity: Math.min(1, g), transform: `scale(${0.7 + 0.3 * g})`}}>
      <div style={{background: renk, color: '#fff', borderRadius: 40, padding: '14px 30px 12px', fontFamily: METIN, fontWeight: 800, fontSize: 40, boxShadow: '0 12px 30px rgba(0,0,0,.25)'}}>{children}</div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 48px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 80px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const [cx, cy, s] = kamera(t);
  const sars = t > A.geldi ? Math.exp(-(t - A.geldi) * 8) * 9 : 0;
  const kam = `translate(${540 - cx * s + Math.sin(t * 60) * sars},${960 - cy * s + Math.cos(t * 70) * sars}) scale(${s})`;
  const dusus = interpolate(t, [A.geldi - 0.55, A.geldi], [0, 1], kis);
  const esya = {
    mug: interpolate(t, [A.kahven - 0.45, A.kahven + 0.15], [0, 1], {...kis, easing: yumus}),
    kitap: interpolate(t, [A.kitabin - 0.45, A.kitabin + 0.15], [0, 1], {...kis, easing: yumus}),
    bitki: interpolate(t, [A.bitki - 0.45, A.bitki + 0.15], [0, 1], {...kis, easing: yumus}),
    dergi: [0, 1, 2].map((i) => interpolate(t, [A.okudugun - 0.35 + i * 0.3, A.okudugun + 0.25 + i * 0.3], [0, 1], {...kis, easing: yumus})),
    kumanda: interpolate(t, [A.hersey - 0.3, A.hersey + 0.3], [0, 1], {...kis, easing: yumus}),
  };
  const aydin = karis(0.15, 0.55, gir(t, A.geldi - 0.1, 0.6)) + 0.45 * gir(t, A.odayi - 0.2, 1.6);
  const golge = 0.35 + 0.55 * gir(t, A.isik - 0.1, 1.0);
  const huzme = gir(t, A.isik - 0.1, 1.2);
  const durum: Durum = {t, urun: dusus > 0 ? 1 : 0, dusus, aydin, esya, golge, huzme};
  const panelFlu = gir(t, A.salonda - 0.4, 0.4) * (1 - gir(t, A.ayni - 0.45, 0.4));
  const kaydir = interpolate(t, [A.ayni - 0.3, A.ayni + 0.9, A.nefes, A.boz - 0.4], [1080, 540, 540, -40], {...kis, easing: yumus});
  const once = t > A.ayni - 0.4 && t < A.boz;
  const markaG = gir(t, A.boz - 0.15, 0.5);
  const hook = K.filter((k) => k.c === 0);

  return (
    <AbsoluteFill style={{background: '#ece4d8'}}>
      <Audio src={staticFile('sehpahikaye/mix.wav')} />
      <Img src={staticFile('sehpahikaye/urun.png')} style={{display: 'none'}} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="duvar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3ede4" /><stop offset="100%" stopColor="#dccfbe" /></linearGradient>
          <linearGradient id="parke" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7a27a" /><stop offset="100%" stopColor="#9a7350" /></linearGradient>
          <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8fc1e3" /><stop offset="100%" stopColor="#e3f1f7" /></linearGradient>
          <linearGradient id="perde" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ece4d6" /><stop offset="50%" stopColor="#f8f4ec" /><stop offset="100%" stopColor="#e2d8c8" /></linearGradient>
          <linearGradient id="huzme" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff3d4" stopOpacity="0.55" /><stop offset="100%" stopColor="#fff3d4" stopOpacity="0" /></linearGradient>
          <linearGradient id="kumas" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4bdae" /><stop offset="100%" stopColor="#a39c8d" /></linearGradient>
          <linearGradient id="kumas2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bdb6a6" /><stop offset="100%" stopColor="#968f80" /></linearGradient>
          <linearGradient id="seramik" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#d9d2c6" /><stop offset="30%" stopColor="#fbf8f2" /><stop offset="75%" stopColor="#e9e2d6" /><stop offset="100%" stopColor="#b9b0a2" /></linearGradient>
          <linearGradient id="sicak" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ffd9a8" /><stop offset="60%" stopColor="#ffffff" /><stop offset="100%" stopColor="#c9d6e6" /></linearGradient>
          <linearGradient id="parlama" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="50%" stopColor="#fff" stopOpacity="0.95" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <linearGradient id="panelIsik" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.25" /><stop offset="60%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.15" /></linearGradient>
          <radialGradient id="hali" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f2ece2" /><stop offset="85%" stopColor="#e5dccd" /><stop offset="100%" stopColor="#d6cab8" /></radialGradient>
          <radialGradient id="lamba"><stop offset="0%" stopColor="#ffe6b0" /><stop offset="100%" stopColor="#ffe6b0" stopOpacity="0" /></radialGradient>
          <radialGradient id="vinyet" cx="50%" cy="45%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#1e140a" stopOpacity="0.45" /></radialGradient>
          {['', 'b'].map((k) => (
            <React.Fragment key={k}>
              <mask id={`urunMaske${k}`} maskUnits="userSpaceOnUse" x={0} y={0} width={IW} height={IH} style={{maskType: 'alpha'}}><image href={staticFile('sehpahikaye/urun.png')} x={0} y={0} width={IW} height={IH} /></mask>
              <clipPath id={`onTeller${k}`}><path d={`M 0 0 L ${IW} 0 L ${IW} ${IH} L 0 ${IH} Z M 606 560 L 606 985 L 698 985 L 698 560 Z`} clipRule="evenodd" /></clipPath>
            </React.Fragment>
          ))}
          <filter id="golgeFiltre" x="-50%" y="-50%" width="200%" height="200%"><feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0 0.06  0 0 0 0.55 0" /><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="flu5" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="flu12" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="panelFlu"><feGaussianBlur stdDeviation={panelFlu * 12} /></filter>
          <clipPath id="onceKirp"><rect x={0} y={0} width={Math.max(0, kaydir)} height={1920} /></clipPath>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 12)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.2" />
          </filter>
        </defs>
        <g filter={panelFlu > 0.02 ? 'url(#panelFlu)' : undefined}>
          <g transform={kam}>
            <Oda {...durum} />
            <Serit t={t} />
            <Hayalet t={t} />
          </g>
          {once && (
            <g clipPath="url(#onceKirp)">
              <g transform={kam}>
                <Oda t={t} urun={0} dusus={0} aydin={0.15} golge={0} huzme={0} esya={{mug: 0, kitap: 0, bitki: 0, dergi: [0, 0, 0], kumanda: 0}} klon="b" />
              </g>
            </g>
          )}
          {panelFlu > 0.02 && <rect width={1080} height={1920} fill="#1b1714" opacity={panelFlu * 0.3} />}
        </g>
        <UcOda t={t} />
        {once && kaydir > 0 && kaydir < 1080 && (
          <g>
            <rect x={kaydir - 4} y={0} width={8} height={1920} fill="#fff" />
            <circle cx={kaydir} cy={1000} r={46} fill="#fff" /><path d={`M ${kaydir - 18} 985 L ${kaydir - 30} 1000 L ${kaydir - 18} 1015 M ${kaydir + 18} 985 L ${kaydir + 30} 1000 L ${kaydir + 18} 1015`} stroke={KOYU} strokeWidth={6} fill="none" strokeLinecap="round" />
          </g>
        )}
        <rect width={1080} height={1920} fill="url(#vinyet)" opacity={1 - gir(t, A.odayi, 1.5) * 0.5} />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.045} />
        <rect width={1080} height={1920} fill="#fff" opacity={t > A.geldi ? Math.exp(-(t - A.geldi) * 7) * 0.35 : 0} />
      </svg>

      {/* kanca */}
      <div style={{position: 'absolute', left: 50, right: 50, top: 220, textAlign: 'center', opacity: 1 - gir(t, A.dergiler - 0.35, 0.3)}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 82, color: '#fff', lineHeight: 1.1, textShadow: '0 4px 24px rgba(0,0,0,.6)'}}>
          {hook.slice(0, 5).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 18, opacity: gir(t, k.s - 0.06, 0.2)}}>{k.w}</span>)}
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 120, color: '#ffb27a', letterSpacing: -2, marginTop: 10, textShadow: '0 4px 24px rgba(0,0,0,.5)', transform: `scale(${karis(1.4, 1, gir(t, A.yer - 0.05, 0.3))})`, opacity: gir(t, A.yer - 0.05, 0.2)}}>YER YOKTU.</div>
      </div>
      <Etiket t={t} t0={A.dergiler} t1={A.kumanda - 0.25} x={540} y={300}>Dergiler yerde</Etiket>
      <Etiket t={t} t0={A.kumanda} t1={A.kahve - 0.25} x={540} y={300}>Kumanda kayıp</Etiket>
      <Etiket t={t} t0={A.kahve} t1={A.kucuk - 0.3} x={540} y={300} renk="#8e3b2c">Kahve kitabın üstünde</Etiket>
      <Etiket t={t} t0={A.santim} t1={A.yeni - 0.4} x={540} y={300}>Her santimetre önemli</Etiket>
      <Etiket t={t} t0={A.kalabalik} t1={A.sonra - 0.3} x={540} y={300} renk="#d64532">Daha da kalabalık</Etiket>
      <div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 96, color: KOYU, opacity: gir(t, A.sonra - 0.05, 0.3) * (1 - gir(t, A.tek - 0.3, 0.3))}}>
        Sonra... <span style={{color: TURUNCU, opacity: gir(t, A.geldi - 0.1, 0.2)}}>bu geldi.</span>
      </div>
      <Etiket t={t} t0={A.tek} t1={A.kivrilmis - 0.2} x={540} y={300}>Tek parça</Etiket>
      <Etiket t={t} t0={A.kivrilmis} t1={A.yumusak - 0.2} x={540} y={300}>Kıvrılmış metal tel</Etiket>
      <Etiket t={t} t0={A.yumusak} t1={A.ustu - 0.3} x={540} y={300} renk={YESIL}>Sivri köşe yok</Etiket>
      <Etiket t={t} t0={A.ustu} t1={A.yani - 0.25} x={540} y={300} renk={TURUNCU}>ÜSTÜ: SEHPA</Etiket>
      <Etiket t={t} t0={A.yani} t1={A.isik - 0.3} x={540} y={300} renk={TURUNCU}>YANI: DERGİLİK</Etiket>
      <Etiket t={t} t0={A.odayi} t1={A.salonda - 0.4} x={540} y={300} renk={YESIL}>Odayı doldurmaz, ferahlatır</Etiket>
      {once && kaydir > 60 && kaydir < 1040 && (
        <>
          <div style={{position: 'absolute', left: 40, top: 300, background: 'rgba(20,20,22,.75)', color: '#fff', borderRadius: 30, padding: '10px 24px 8px', fontFamily: METIN, fontWeight: 800, fontSize: 34, opacity: Math.min(1, (kaydir - 60) / 200)}}>ÖNCE</div>
          <div style={{position: 'absolute', right: 40, top: 300, background: TURUNCU, color: '#fff', borderRadius: 30, padding: '10px 24px 8px', fontFamily: METIN, fontWeight: 800, fontSize: 34, opacity: Math.min(1, (1040 - kaydir) / 200)}}>SONRA</div>
        </>
      )}
      {/* marka kapanışı */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', opacity: markaG, transform: `translateY(${(1 - markaG) * 24}px)`}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 70, letterSpacing: 12, color: KOYU}}>BOZ CONCEPT HOME</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 56, color: TURUNCU, marginTop: 8, opacity: gir(t, A.siz - 0.1, 0.4)}}>Evinizin hikâyesini değiştirin.</div>
        <div style={{display: 'inline-block', marginTop: 26, background: KOYU, color: '#fff', borderRadius: 50, padding: '18px 44px 16px', fontFamily: METIN, fontWeight: 800, fontSize: 40, opacity: gir(t, A.siz + 0.8, 0.4), transform: `scale(${1 + Math.sin(Math.max(0, t - A.siz) * 8) * 0.03})`}}>Sehpa + Dergilik · Şimdi keşfedin</div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

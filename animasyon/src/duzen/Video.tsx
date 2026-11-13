// "Evini düzene sok" — Boz Concept Home Trendyol mağazası için 40 sn dikey satış animasyonu.
// İçerik, mağazanın Trendyol'daki ürün gamına dayanır: yapışkanlı metal banyo/mutfak düzenleyicileri.
// Ses: edge-tts (tr-TR-EmelNeural) + ses_tasarimi_duzen.py. Sahne anları kelime zamanlarından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import veri from '../../public/duzen/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 40, NS = 8;
const METIN = "'Inter', sans-serif";
const C = {krem: '#f6efe4', fayans: '#eadfce', derz: '#dccfba', siyah: '#1f1b18', bakir: '#a87042', turuncu: '#f27a1a', yesil: '#2fa86a', mercan: '#e5533d', beyaz: '#ffffff', gri: '#6f655b'};
const RENK = ['#5aa9c9', '#e9b44c', '#d96c75', '#7fb77e', '#8e7cc3', '#e58e4f'];

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const zipla = (t: number, t0: number, d = 0.45) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: Easing.out(Easing.back(1.8))});
const dus = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: Easing.bounce});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SAHNE = Array.from({length: NS}, (_, i) => (i === 0 ? 0 : an(i) - 0.35));
const sahneOp = (t: number, i: number) => {
  const a = SAHNE[i], b = i < NS - 1 ? SAHNE[i + 1] : SURE + 1;
  return (i === 0 ? 1 : gir(t, a - 0.2, 0.45)) * (1 - gir(t, b - 0.2, 0.45));
};

// ---- ortak parçalar ------------------------------------------------------------------
const Sise: React.FC<{x: number; y: number; w?: number; h?: number; renk: string; aci?: number; op?: number; pompa?: boolean}> = ({x, y, w = 80, h = 190, renk, aci = 0, op = 1, pompa}) => (
  <g transform={`translate(${x},${y}) rotate(${aci})`} opacity={op}>
    <rect x={-w / 2} y={-h} width={w} height={h} rx={18} fill={renk} />
    <rect x={-w / 2 + 10} y={-h * 0.62} width={w - 20} height={h * 0.34} rx={8} fill="#fff" opacity={0.75} />
    <rect x={-w * 0.22} y={-h - 30} width={w * 0.44} height={34} rx={8} fill={C.siyah} />
    {pompa && <path d={`M 0 ${-h - 30} L 0 ${-h - 54} L ${w * 0.4} ${-h - 54}`} stroke={C.siyah} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
  </g>
);
const Kavanoz: React.FC<{x: number; y: number; renk: string; op?: number; aci?: number}> = ({x, y, renk, op = 1, aci = 0}) => (
  <g transform={`translate(${x},${y}) rotate(${aci})`} opacity={op}>
    <rect x={-42} y={-120} width={84} height={120} rx={14} fill="#fff" stroke="#d9cfc0" strokeWidth={4} />
    <rect x={-36} y={-78} width={72} height={72} rx={8} fill={renk} opacity={0.85} />
    <rect x={-46} y={-146} width={92} height={32} rx={8} fill={C.siyah} />
  </g>
);
// tel raf: içindekiler children olarak verilir, ön korkuluk üstlerine çizilir
const Raf: React.FC<{x: number; y: number; w: number; h?: number; op?: number; children?: React.ReactNode}> = ({x, y, w, h = 90, op = 1, children}) => (
  <g opacity={op}>
    <rect x={x} y={y - 6} width={w} height={12} rx={6} fill={C.siyah} />
    {children}
    <rect x={x} y={y - h} width={w} height={h} rx={16} fill="none" stroke={C.siyah} strokeWidth={10} />
    {Array.from({length: Math.floor(w / 46) - 1}, (_, i) => <rect key={i} x={x + (i + 1) * (w / Math.floor(w / 46)) - 3} y={y - h} width={6} height={h} fill={C.siyah} />)}
  </g>
);
const Tik: React.FC<{x: number; y: number; s?: number; u: number; renk?: string}> = ({x, y, s = 1, u, renk = C.yesil}) => (
  <g transform={`translate(${x},${y}) scale(${s * Math.max(0.001, u)})`} opacity={Math.min(1, u)}>
    <circle r={44} fill={renk} />
    <path d="M -20 0 L -6 15 L 22 -16" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </g>
);
const Etiket: React.FC<{x: number; y: number; yazi: string; boy?: number; renk?: string; op?: number; anchor?: 'start' | 'middle' | 'end'; kalin?: number}> = ({x, y, yazi, boy = 46, renk = C.siyah, op = 1, anchor = 'middle', kalin = 800}) => (
  <text x={x} y={y} fontFamily={METIN} fontWeight={kalin} fontSize={boy} fill={renk} textAnchor={anchor} opacity={op}>{yazi}</text>
);
const Hap: React.FC<{x: number; y: number; w: number; yazi: string; u: number; aktif?: boolean}> = ({x, y, w, yazi, u, aktif = true}) => (
  <g transform={`translate(${x},${y}) scale(${Math.max(0.001, u)})`} opacity={Math.min(1, u)}>
    <rect x={-w / 2} y={-46} width={w} height={92} rx={46} fill={aktif ? C.siyah : '#fff'} />
    <Etiket x={0} y={15} yazi={yazi} boy={42} renk={aktif ? '#fff' : C.siyah} />
  </g>
);

// ---- sahneler --------------------------------------------------------------------------
// 0: dağınıklık — şişeler ve kavanozlar tezgâha devriliyor
const S0: React.FC<{t: number}> = ({t}) => {
  const esya = [
    [200, 1210, -78, 0], [330, 1210, 12, 1], [430, 1150, 84, 2], [270, 1090, -20, 3], [520, 1210, -6, 4], [400, 1040, 40, 5],
  ];
  const mutfak = [[660, 1210, 70, 0], [770, 1210, -8, 1], [880, 1210, 16, 2], [720, 1080, -30, 3], [860, 1070, 55, 4], [940, 1130, -80, 5]];
  const sallan = Math.sin(t * 9) * 1.5;
  return (
    <g>
      <rect x={60} y={1210} width={960} height={26} rx={13} fill={C.bakir} />
      <rect x={90} y={1236} width={900} height={200} fill="#e2d5c0" />
      {esya.map(([x, y, a, r], i) => {
        const u = dus(t, 0.35 + i * 0.4, 0.55);
        return <Sise key={i} x={x} y={karis(y - 700, y, u)} renk={RENK[r]} aci={a + sallan * (i % 2 ? 1 : -1)} op={Math.min(1, u * 4)} pompa={i % 2 === 0} w={70 + (i % 3) * 10} h={160 + (i % 2) * 40} />;
      })}
      {mutfak.map(([x, y, a, r], i) => {
        const u = dus(t, an(0, 5) - 0.1 + i * 0.22, 0.5);
        return <Kavanoz key={i} x={x} y={karis(y - 700, y, u)} renk={RENK[(r + 2) % 6]} aci={a + sallan * (i % 2 ? -1 : 1)} op={Math.min(1, u * 4)} />;
      })}
      {[[170, 760], [890, 700], [540, 640]].map(([x, y], i) => (
        <text key={i} x={x} y={y + Math.sin(t * 3 + i) * 12} fontFamily={METIN} fontWeight={800} fontSize={130} fill={C.mercan} textAnchor="middle" opacity={gir(t, 1.6 + i * 0.5, 0.3) * 0.9} transform={`rotate(${(i - 1) * 12},${x},${y})`}>?</text>
      ))}
    </g>
  );
};

// 1: matkap yok
const S1: React.FC<{t: number}> = ({t}) => {
  const yasak = zipla(t, an(1, 4) - 0.05, 0.4);
  const titre = t < an(1, 4) ? Math.sin(t * 70) * 4 : 0;
  return (
    <g>
      <g transform={`translate(${540 + titre},820) rotate(-8)`} opacity={1 - 0.45 * Math.min(1, yasak)}>
        <rect x={-210} y={-80} width={330} height={160} rx={40} fill="#3f8f8a" />
        <rect x={-150} y={60} width={110} height={240} rx={30} fill="#357a76" />
        <rect x={-170} y={280} width={150} height={60} rx={16} fill={C.siyah} />
        <path d="M 120 -56 L 200 -34 L 200 34 L 120 56 Z" fill={C.siyah} />
        <rect x={200} y={-9} width={170} height={18} rx={6} fill="#8c8c8c" />
        <rect x={-170} y={-40} width={130} height={18} rx={9} fill="#fff" opacity={0.35} />
      </g>
      {t < an(1, 4) && Array.from({length: 6}, (_, i) => {
        const u = (t * 2 + rnd(i)) % 1;
        return <circle key={i} cx={920 + u * 90} cy={770 + (rnd(i + 3) - 0.5) * 160 + u * 60} r={7} fill={C.gri} opacity={(1 - u) * 0.6} />;
      })}
      <g transform={`translate(540,830) scale(${karis(1.7, 1, Math.min(1, yasak))})`} opacity={Math.min(1, yasak)}>
        <circle r={300} fill="none" stroke={C.mercan} strokeWidth={44} />
        <rect x={-290} y={-22} width={580} height={44} fill={C.mercan} transform="rotate(45)" />
      </g>
      <Hap x={310} y={1320} w={380} yazi="Delik yok" u={zipla(t, an(1, 5) - 0.05)} />
      <Hap x={770} y={1320} w={340} yazi="Toz yok" u={zipla(t, an(1, 7) - 0.05)} />
    </g>
  );
};

// 2: yapıştır, yerleştir, kullan
const S2: React.FC<{t: number}> = ({t}) => {
  const gel = gir(t, an(2, 0), an(2, 3) - an(2, 0));
  const bas = gir(t, an(2, 3), 0.18) * (1 - gir(t, an(2, 3) + 0.18, 0.25));
  const y = karis(1500, 980, gel);
  const adim = [an(2, 3), an(2, 4), an(2, 5)];
  return (
    <g>
      <g transform={`translate(540,${y}) scale(${1 + bas * 0.06},${1 - bas * 0.08}) translate(-540,${-y})`}>
        <rect x={250} y={y - 180} width={580} height={70} rx={14} fill={C.bakir} opacity={karis(1, 0.25, gir(t, an(2, 3), 0.3))} />
        <Raf x={200} y={y} w={680} h={110}>
          {[0, 1, 2].map((i) => {
            const u = dus(t, an(2, 4) - 0.05 + i * 0.22, 0.45);
            return <Sise key={i} x={330 + i * 210} y={karis(y - 620, y - 8, u)} renk={RENK[i]} op={Math.min(1, u * 4)} pompa={i === 1} w={110} h={250} />;
          })}
        </Raf>
      </g>
      {Array.from({length: 10}, (_, i) => {
        const u = gir(t, an(2, 3) + 0.05, 0.5), a = (i / 10) * Math.PI * 2;
        return <rect key={i} x={-5} y={-24} width={10} height={48} rx={5} fill={C.bakir} opacity={u * (1 - u) * 4} transform={`translate(${540 + Math.cos(a) * (380 + u * 70)},${880 + Math.sin(a) * (230 + u * 50)}) rotate(${(a * 180) / Math.PI + 90})`} />;
      })}
      {['1', '2', '3'].map((n, i) => {
        const u = zipla(t, adim[i] - 0.05);
        return (
          <g key={i} transform={`translate(${250 + i * 290},1300) scale(${Math.max(0.001, u)})`} opacity={Math.min(1, u)}>
            <circle r={62} fill={C.siyah} />
            <Etiket x={0} y={24} yazi={n} boy={70} renk="#fff" />
          </g>
        );
      })}
      <Tik x={900} y={720} s={1.3} u={zipla(t, an(2, 5) + 0.3)} />
    </g>
  );
};

// 3: banyo — raf + havlupan sepeti
const S3: React.FC<{t: number}> = ({t}) => {
  const raf = gir(t, an(3, 0), 0.4), havlu = gir(t, an(3, 3) - 0.1, 0.5);
  return (
    <g>
      <Raf x={90} y={980} w={440} h={100} op={raf}>
        {[0, 1, 2].map((i) => {
          const u = dus(t, an(3, 1) - 0.05 + i * 0.2, 0.45);
          return <Sise key={i} x={180 + i * 130} y={karis(480, 972, u)} renk={RENK[i + 1]} op={Math.min(1, u * 4)} pompa={i !== 1} w={90} h={210 - i * 20} />;
        })}
      </Raf>
      <Etiket x={310} y={1070} yazi="Yapışkanlı raf" boy={38} op={raf} />
      {/* havlupan */}
      <g opacity={gir(t, an(3, 0) + 0.2, 0.4)}>
        <rect x={640} y={560} width={22} height={840} rx={11} fill="#cfc8bd" />
        <rect x={930} y={560} width={22} height={840} rx={11} fill="#cfc8bd" />
        {Array.from({length: 9}, (_, i) => <rect key={i} x={640} y={600 + i * 95} width={312} height={16} rx={8} fill="#dcd6cc" />)}
      </g>
      <g opacity={havlu} transform={`translate(0,${(1 - havlu) * -60})`}>
        <path d="M 690 790 L 690 760 M 900 790 L 900 760" stroke={C.siyah} strokeWidth={10} strokeLinecap="round" />
        <Raf x={660} y={960} w={272} h={170}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${712 + i * 84},900)`}>
              <circle r={40} fill={['#f3e9dc', '#9fc5d1', '#f3e9dc'][i]} stroke="#cdbfa9" strokeWidth={4} />
              <path d="M 0 0 m -22 0 a 22 22 0 1 1 22 22 a 12 12 0 1 1 -10 -18" stroke="#cdbfa9" strokeWidth={5} fill="none" />
            </g>
          ))}
        </Raf>
        <rect x={690} y={1076} width={210} height={250} rx={14} fill="#9fc5d1" />
        <rect x={690} y={1260} width={210} height={16} fill="#fff" opacity={0.6} />
        <Etiket x={796} y={1450} yazi="Havlupan sepeti" boy={38} />
      </g>
    </g>
  );
};

// 4: mutfak — baharatlık + kâğıt havluluk + kancalar
const S4: React.FC<{t: number}> = ({t}) => {
  const raf = gir(t, an(4, 0), 0.4), rulo = zipla(t, an(4, 3) - 0.1, 0.5);
  return (
    <g>
      <Raf x={140} y={880} w={800} h={90} op={raf}>
        {[0, 1, 2, 3, 4].map((i) => {
          const u = dus(t, an(4, 1) - 0.05 + i * 0.16, 0.45);
          return <Kavanoz key={i} x={240 + i * 150} y={karis(420, 872, u)} renk={RENK[(i + 1) % 6]} op={Math.min(1, u * 4)} />;
        })}
      </Raf>
      <g opacity={raf}>
        <path d="M 240 880 L 240 1010 L 840 1010 L 840 880" stroke={C.siyah} strokeWidth={10} fill="none" strokeLinejoin="round" />
        {[160, 920].map((x, i) => <path key={i} d={`M ${x} 880 L ${x} 930 Q ${x} 960 ${x + (i ? -30 : 30)} 960`} stroke={C.siyah} strokeWidth={10} fill="none" strokeLinecap="round" />)}
      </g>
      <g transform={`translate(540,1010) scale(${Math.max(0.001, rulo)})`} opacity={Math.min(1, rulo)}>
        <rect x={-230} y={-90} width={460} height={180} rx={30} fill="#fff" stroke="#e0d6c6" strokeWidth={5} />
        {[-140, -50, 40, 130].map((x) => <path key={x} d={`M ${x} -90 L ${x} 90`} stroke="#e6dccb" strokeWidth={4} strokeDasharray="8 10" />)}
        <ellipse cx={-230} cy={0} rx={30} ry={90} fill="#f4ede2" stroke="#e0d6c6" strokeWidth={5} />
        <ellipse cx={-230} cy={0} rx={10} ry={30} fill="#cdbfa9" />
        <path d={`M 150 90 L 150 ${230 + Math.sin(t * 3) * 8} L 230 ${230 + Math.sin(t * 3 + 1) * 8} L 230 60`} fill="#fff" stroke="#e0d6c6" strokeWidth={5} />
      </g>
      <Etiket x={540} y={1400} yazi="Baharatlık + kâğıt havluluk" boy={40} op={gir(t, an(4, 3), 0.4)} />
    </g>
  );
};

// 5: ürün gamı — üç kart
const S5: React.FC<{t: number}> = ({t}) => {
  const k = [an(5, 0), an(5, 5), an(5, 9)].map((x) => zipla(t, x - 0.15, 0.5));
  const kay = (Math.sin(t * 2.2) * 0.5 + 0.5) * 46;
  const kart = (i: number, y: number, ad: string, alt: string, simge: React.ReactNode) => {
    const u = Math.min(1, k[i]);
    return (
      <g opacity={u} transform={`translate(0,${(1 - u) * 60})`}>
        <rect x={96} y={y + 10} width={900} height={270} rx={40} fill={C.siyah} opacity={0.1} />
        <rect x={90} y={y} width={900} height={270} rx={40} fill="#fff" />
        <g transform={`translate(240,${y + 135})`}>{simge}</g>
        <Etiket x={410} y={y + 126} yazi={ad} boy={54} anchor="start" />
        <Etiket x={410} y={y + 186} yazi={alt} boy={36} anchor="start" kalin={600} renk={C.gri} />
      </g>
    );
  };
  return (
    <g>
      {kart(0, 500, 'Tezgâh üstü raf', '2 katlı · banyo ve mutfak', (
        <g stroke={C.siyah} strokeWidth={9} strokeLinecap="round" fill="none">
          <path d="M -90 -40 L 90 -40 M -90 60 L 90 60 M -90 -40 L -90 100 M 90 -40 L 90 100" />
          <rect x={-60} y={-90} width={34} height={46} rx={8} fill={RENK[1]} stroke="none" /><rect x={10} y={-100} width={34} height={56} rx={8} fill={RENK[0]} stroke="none" />
          <rect x={-30} y={10} width={34} height={46} rx={8} fill={RENK[2]} stroke="none" /><rect x={30} y={4} width={34} height={52} rx={8} fill={RENK[3]} stroke="none" />
        </g>
      ))}
      {kart(1, 810, 'Dolap içi sepet', 'Raylı, teleskopik · 2 katlı', (
        <g>
          <rect x={-100} y={-100} width={150} height={200} rx={10} fill="#efe6d8" stroke="#cdbfa9" strokeWidth={6} />
          <g transform={`translate(${kay},0)`} stroke={C.siyah} strokeWidth={8} fill="none" strokeLinecap="round">
            <rect x={-80} y={-70} width={150} height={50} rx={8} /><rect x={-80} y={20} width={150} height={50} rx={8} />
            <rect x={-50} y={-96} width={26} height={30} rx={6} fill={RENK[4]} stroke="none" /><rect x={0} y={-6} width={26} height={30} rx={6} fill={RENK[5]} stroke="none" />
          </g>
        </g>
      ))}
      {kart(2, 1120, 'Tekerlekli raf', '5 katlı · katlanır düzenleyici', (
        <g stroke={C.siyah} strokeWidth={8} strokeLinecap="round" fill="none">
          <path d="M -50 -110 L -50 92 M 50 -110 L 50 92" />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M -50 ${-100 + i * 46} L 50 ${-100 + i * 46}`} />)}
          <circle cx={-50} cy={104} r={11} fill={C.siyah} /><circle cx={50} cy={104} r={11} fill={C.siyah} />
          <rect x={-30} y={-90} width={22} height={30} rx={5} fill={RENK[0]} stroke="none" /><rect x={6} y={-42} width={22} height={28} rx={5} fill={RENK[2]} stroke="none" /><rect x={-20} y={4} width={22} height={28} rx={5} fill={RENK[1]} stroke="none" />
        </g>
      ))}
    </g>
  );
};

// 6: siyah metal + İzmir'den evine
const S6: React.FC<{t: number}> = ({t}) => {
  const yol = gir(t, an(6, 4) - 0.1, 1.6), harita = gir(t, an(6, 4) - 0.3, 0.4);
  const parla = interpolate(t, [an(6, 0), an(6, 0) + 1.4], [-200, 1100], kis);
  return (
    <g>
      <defs><clipPath id="rafKes"><rect x={200} y={612} width={680} height={294} /></clipPath></defs>
      <Raf x={200} y={900} w={680} h={130} />
      <Raf x={200} y={720} w={680} h={100} />
      <path d="M 210 620 L 210 900 M 870 620 L 870 900" stroke={C.siyah} strokeWidth={12} strokeLinecap="round" />
      <g clipPath="url(#rafKes)"><rect x={parla} y={560} width={90} height={420} fill="#fff" opacity={0.55} transform={`skewX(-20)`} /></g>
      <g opacity={harita}>
        <path d="M 200 1290 Q 540 1120 880 1290" stroke={C.bakir} strokeWidth={8} fill="none" strokeDasharray="4 22" strokeLinecap="round" />
        <g transform="translate(200,1290)">
          <path d="M 0 0 C -50 -60 -50 -120 0 -120 C 50 -120 50 -60 0 0 Z" fill={C.mercan} /><circle cy={-78} r={18} fill="#fff" />
          <Etiket x={0} y={56} yazi="İzmir" boy={42} />
        </g>
        <g transform="translate(880,1290)">
          <path d="M -60 -50 L 0 -110 L 60 -50 L 60 0 L -60 0 Z" fill={C.siyah} /><rect x={-16} y={-44} width={32} height={44} fill={C.krem} />
          <Etiket x={0} y={56} yazi="Evin" boy={42} />
        </g>
        {(() => {
          const u = yol, x = karis(200, 880, u), y = 1290 - Math.sin(u * Math.PI) * 85;
          return <g transform={`translate(${x},${y - 20})`}><rect x={-34} y={-34} width={68} height={60} rx={8} fill={C.turuncu} /><path d="M -34 -8 L 34 -8 M 0 -34 L 0 26" stroke="#fff" strokeWidth={6} opacity={0.8} /></g>;
        })()}
      </g>
    </g>
  );
};

// 7: çağrı — arama çubuğu
const S7: React.FC<{t: number}> = ({t}) => {
  const yaz = 'boz concept home';
  const n = Math.round(interpolate(t, [an(7, 3) - 0.2, an(7, 4) + 0.5], [0, yaz.length], kis));
  const cubuk = zipla(t, an(7, 3) - 0.4, 0.5);
  const imlec = Math.floor(t * 2.5) % 2 === 0;
  return (
    <g>
      <g transform={`translate(540,980) scale(${Math.max(0.001, cubuk)})`} opacity={Math.min(1, cubuk)}>
        <rect x={-440} y={-70} width={880} height={140} rx={70} fill="#fff" stroke={C.turuncu} strokeWidth={10} />
        <circle cx={-360} cy={-4} r={26} fill="none" stroke={C.turuncu} strokeWidth={10} />
        <path d="M -342 16 L -320 40" stroke={C.turuncu} strokeWidth={10} strokeLinecap="round" />
        <text x={-290} y={18} fontFamily={METIN} fontWeight={600} fontSize={54} fill={C.siyah}>{yaz.slice(0, n)}{imlec && n < yaz.length + 1 ? '|' : ''}</text>
      </g>
      {['Banyo', 'Mutfak', 'Düzenleyici'].map((y, i) => <Hap key={i} x={[230, 500, 810][i]} y={1180} w={[240, 260, 320][i]} yazi={y} u={zipla(t, an(7, 5) - 0.1 + i * 0.12)} aktif={false} />)}
      <Tik x={540} y={1360} s={1.2} u={zipla(t, an(7, 6))} renk={C.turuncu} />
    </g>
  );
};
const SAHNELER = [S0, S1, S2, S3, S4, S5, S6, S7];
const BASLIK: [string, string, number][] = [
  ['', '', 0], ['ÇÖZÜM', 'Delmeden montaj', 84], ['3 ADIM', 'Yapıştır · Yerleştir · Kullan', 62], ['BANYO', 'Her şey yerinde', 84],
  ['MUTFAK', 'Tezgâh ferah', 84], ['ÜRÜN GAMI', 'Her köşeye bir çözüm', 76], ['TASARIM', 'Siyah metal, sade çizgi', 72], ['', '', 0],
];

// ---- yazılar ---------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1570, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(31,27,24,.9)', borderRadius: 26, padding: '18px 32px 20px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 50, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? '#f6b26b' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 52px 'Inter'", 'ğüşıöçİâ'), document.fonts.load("600 30px 'Inter'", 'ğüşıöçİâ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const kanca = 1 - gir(t, SAHNE[1] - 0.25, 0.4);
  const marka = zipla(t, an(7, 0) - 0.15, 0.5);
  return (
    <AbsoluteFill style={{background: C.krem}}>
      <Audio src={staticFile('duzen/mix.wav')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <pattern id="fayans" width="180" height="180" patternUnits="userSpaceOnUse">
            <rect width="180" height="180" fill={C.krem} />
            <rect x="4" y="4" width="172" height="172" rx="10" fill={C.fayans} opacity="0.55" />
          </pattern>
          <linearGradient id="alt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.krem} stopOpacity="0" /><stop offset="100%" stopColor="#d9c9b0" stopOpacity="0.9" /></linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#fayans)" />
        <rect y={1300} width={1080} height={620} fill="url(#alt)" />
        {SAHNELER.map((Sahne, i) => {
          const op = sahneOp(t, i);
          if (op <= 0.001) return null;
          const lt = t - SAHNE[i];
          const sure = (i < NS - 1 ? SAHNE[i + 1] : SURE) - SAHNE[i];
          const z = 1 + 0.04 * Math.min(1.2, Math.max(0, lt / sure));
          return (
            <g key={i} opacity={op} transform={`translate(540,960) scale(${z}) translate(-540,-960)`}>
              <Sahne t={t} />
            </g>
          );
        })}
      </svg>

      {/* kanca */}
      <div style={{position: 'absolute', left: 50, right: 50, top: 180, textAlign: 'center', opacity: kanca}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 96, lineHeight: 1.06, color: C.siyah, letterSpacing: -2.5}}>
          {['Banyo', 'dağınık,'].map((w, i) => <span key={i} style={{display: 'inline-block', marginRight: 22, opacity: gir(t, 0.25 + i * 0.3, 0.2)}}>{w}</span>)}
          <br />
          {['tezgâh', 'dolu?'].map((w, i) => <span key={i} style={{display: 'inline-block', marginRight: 22, color: C.mercan, opacity: gir(t, an(0, 5) - 0.05 + i * 0.3, 0.2)}}>{w}</span>)}
        </div>
      </div>
      {/* sahne başlıkları */}
      {BASLIK.map(([ust, alt, boy], i) => {
        if (!ust) return null;
        const op = sahneOp(t, i), u = gir(t, SAHNE[i], 0.45);
        if (op <= 0.001) return null;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 180, textAlign: 'center', opacity: op, transform: `translateY(${(1 - u) * 30}px)`}}>
            <div style={{display: 'inline-block', background: C.bakir, color: '#fff', fontFamily: METIN, fontWeight: 800, fontSize: 34, letterSpacing: 6, padding: '10px 28px', borderRadius: 40}}>{ust}</div>
            <div style={{fontFamily: METIN, fontWeight: 800, fontSize: boy, color: C.siyah, marginTop: 18, letterSpacing: -2}}>{alt}</div>
          </div>
        );
      })}
      {/* kapanış */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: Math.min(1, marka), transform: `scale(${karis(0.85, 1, Math.min(1, marka))})`}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 150, lineHeight: 0.95, color: C.siyah, letterSpacing: -5}}>BOZ</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 62, letterSpacing: 14, color: C.bakir, marginTop: 14}}>CONCEPT HOME</div>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 44, color: C.siyah, marginTop: 110, opacity: gir(t, an(7, 3) - 0.3, 0.4)}}>Trendyol'da ara:</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 84, letterSpacing: -2, color: C.siyah, opacity: gir(t, an(7, 5) - 0.1, 0.4)}}>
        Evini düzene sok.
      </div>
      {t < an(7, 5) - 0.2 && <Altyazi t={t} />}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

// "Büyük Pekmez Seli — Boston, 15 Ocak 1919" — 30 sn dikey, gerçekçi ışıklı SVG animasyon.
// Ölçek: 28 px = 1 m. Tank 15 m x 27 m, dalga ≈ 8 m, hız ≈ 56 km/sa (≈ 15,5 m/sn ≈ 435 px/sn).
// Her an kelime zamanından gelir (public/pekmez/kelimeler.json). Ses: public/pekmez/mix.wav
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/bebas-neue/latin.css';
import '@fontsource/bebas-neue/latin-ext.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import veri from '../../public/pekmez/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SURE = 30;
const BASLIK = "'Bebas Neue', 'Inter', sans-serif";
const METIN = "'Inter', sans-serif";

const GROUND = 1360;
const TX = 620, TR = 378, TH = 420; // tank: merkez x, yarıçap (27 m çap), yükseklik (15 m)
const TL = TX - TR, TRt = TX + TR, TTOP = GROUND - TH;
const PX_M = 28;

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const sonu = (c: number) => { const s = K.filter((k) => k.c === c); return s[s.length - 1].e; };
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.6) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sinir = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const A = {
  hook: an(0), l1: an(1), boston: an(1, 1), litre: an(1, 4),
  ogle: an(2), percin: an(2, 1), patliyor: an(2, 5), yari: an(2, 8),
  dalga: an(3), metre: an(3, 1), hiz: an(3, 5), yutuyor: an(3, 8),
  olu: an(4), yarali: an(4, 4),
  soguk: an(5), koyu: an(5, 1), hapis: an(5, 5),
  son: an(6), muhendis: an(6, 4), imza: an(6, 5), bitis: sonu(6),
};
const POPS = Array.from({length: 9}, (_, k) => A.percin + (k * (A.patliyor + 0.45 - A.percin)) / 8);
// perçinlerin tank duvarındaki yerleri (sağ yarı, yakın planda görünen bölge)
const POP_XY = [[905, 1100], [842, 1160], [955, 1220], [880, 1040], [930, 1280], [815, 1250], [968, 1100], [860, 1310], [900, 1180]];

// ---- pekmez akışı ------------------------------------------------------------------
const onCephe = (t: number) => {
  if (t < A.l1) return 2260 + 560 * Easing.out(Easing.quad)(t / A.l1); // kanca: ileri sahneden kısa bir an
  if (t < A.yari) return -1;
  const u = t - A.yari;
  return TRt + 450 * u - 10 * u * u;
};
const tepeH = (Fr: number) => sinir(8 * PX_M * Math.exp(-(Fr - TRt) / 1900), 42, 8 * PX_M);
const kalinti = (t: number) => (t < A.l1 ? 30 : 30 + 26 * Math.exp(-Math.max(0, t - A.yari) / 2.5));
const yuzey = (x: number, t: number, Fr: number) => {
  // zeminden yukarı pekmez kalınlığı (px)
  if (Fr < 0 || x > Fr) return 0;
  const u = t - A.yari;
  let h = kalinti(t) + (tepeH(Fr) - kalinti(t)) * Math.exp(-(Fr - x) / 210);
  if (t > A.yari && u < 1.6) {
    const kubbe = TH * 0.95 * Math.exp(-u * 2.4) * Math.exp(-(((x - TX) / (TR + 380 * u)) ** 2));
    h = Math.max(h, kubbe);
  }
  const burun = Math.sqrt(sinir((Fr - x) / 55, 0, 1));
  const dalgacik = Math.sin(x * 0.03 - t * 4) * 3 + Math.sin(x * 0.011 + t * 2.3) * 4;
  const donma = gir(t, A.soguk, 2.4);
  return Math.max(0, h * burun + dalgacik * (1 - donma * 0.8) * burun);
};

// ---- kamera ------------------------------------------------------------------------
type Kare = [number, number, number, number];
const KAMERA: Kare[] = [
  [0, 2560, 1430, 2.35],
  [A.l1 - 0.01, 2720, 1420, 2.5],
  [A.l1, 1060, 1130, 0.8],
  [A.litre - 0.5, 980, 1130, 0.86],
  [A.litre + 0.4, 700, 1120, 1.05],
  [A.ogle - 0.2, 720, 1120, 1.1],
  [A.percin - 0.05, 880, 1170, 2.15],
  [A.yari - 0.05, 890, 1175, 2.3],
  [A.yari + 0.75, 1250, 1150, 0.95],
];
const kamera = (t: number): [number, number, number] => {
  let i = 0;
  while (i < KAMERA.length - 1 && t >= KAMERA[i + 1][0]) i++;
  let [, cx, cy, s] = KAMERA[i];
  if (i < KAMERA.length - 1) {
    const [t0, x0, y0, s0] = KAMERA[i];
    const [t1, x1, y1, s1] = KAMERA[i + 1];
    const u = yumus((t - t0) / Math.max(1e-3, t1 - t0));
    cx = karis(x0, x1, u); cy = karis(y0, y1, u); s = karis(s0, s1, u);
  }
  // dalgayı takip
  const Fr = onCephe(t);
  if (t > A.yari + 0.75) {
    const g = gir(t, A.yari + 0.75, 0.6);
    const tak = sinir(Fr - 300, 1250, 3100);
    cx = karis(cx, tak, g); cy = karis(cy, 1230, g); s = karis(s, 1.22, g);
  }
  const genis = gir(t, A.olu - 0.35, 0.9);
  cx = karis(cx, 2350, genis); cy = karis(cy, 1150, genis); s = karis(s, 0.74 + gir(t, A.olu, 3.4) * 0.04, genis);
  const yakin = gir(t, A.soguk - 0.35, 0.9);
  cx = karis(cx, 2700, yakin); cy = karis(cy, 1440, yakin); s = karis(s, 1.95 + gir(t, A.soguk, 3.5) * 0.12, yakin);
  return [cx, cy, s];
};

// ---- çizim parçaları ----------------------------------------------------------------
const Bina: React.FC<{x: number; w: number; h: number; renk: string; kat: number; i: number}> = ({x, w, h, renk, kat, i}) => {
  const pencere = [] as React.ReactNode[];
  const sut = Math.max(2, Math.floor(w / 62));
  for (let k = 0; k < kat; k++)
    for (let j = 0; j < sut; j++) {
      const px = x + 22 + j * ((w - 44) / sut), py = GROUND - h + 40 + k * ((h - 90) / kat);
      const isik = rnd(i * 50 + k * 7 + j) > 0.78;
      pencere.push(<rect key={`${k}-${j}`} x={px} y={py} width={(w - 44) / sut - 22} height={(h - 90) / kat - 26} fill={isik ? '#e9c98a' : '#2a3038'} opacity={isik ? 0.75 : 0.85} />);
      pencere.push(<rect key={`a${k}-${j}`} x={px - 4} y={py - 6} width={(w - 44) / sut - 14} height={6} fill="#c9b9a2" opacity={0.6} />);
    }
  return (
    <g>
      <rect x={x} y={GROUND - h} width={w} height={h} fill={renk} />
      <rect x={x} y={GROUND - h} width={w} height={h} fill="url(#tugla)" opacity={0.35} />
      <rect x={x - 6} y={GROUND - h - 14} width={w + 12} height={18} fill="#4a3a30" />
      {pencere}
      <rect x={x} y={GROUND - h} width={w} height={h} fill="url(#binaGolge)" />
    </g>
  );
};

const Itfaiye: React.FC<{t: number; Fr: number}> = ({t, Fr}) => {
  const x0 = 1880, w = 330, h = 330;
  const kay = Fr > x0 - 60 ? sinir((Fr - x0 + 60) * 0.12, 0, 46) : 0;
  const egim = Fr > x0 - 60 ? sinir((Fr - x0 + 60) * 0.012, 0, 4.5) : 0;
  const cokus = gir(t, A.yari + (x0 + 120 - TRt) / 450, 0.7);
  return (
    <g transform={`translate(${kay},0) rotate(${egim},${x0 + w},${GROUND})`}>
      <rect x={x0} y={GROUND - h} width={w} height={h} fill="#7d3b2c" />
      <rect x={x0} y={GROUND - h} width={w} height={h} fill="url(#tugla)" opacity={0.4} />
      <g transform={`translate(0,${cokus * 120}) rotate(${cokus * -6},${x0},${GROUND - h})`}>
        <rect x={x0 - 8} y={GROUND - h - 18} width={w + 16} height={22} fill="#3d2b22" />
        {[0, 1, 2].map((j) => <rect key={j} x={x0 + 30 + j * 100} y={GROUND - h + 30} width={60} height={70} fill="#2a3038" />)}
      </g>
      {[0, 1].map((j) => (
        <g key={j}>
          <path d={`M ${x0 + 40 + j * 150} ${GROUND} L ${x0 + 40 + j * 150} ${GROUND - 150} Q ${x0 + 100 + j * 150} ${GROUND - 210} ${x0 + 160 + j * 150} ${GROUND - 150} L ${x0 + 160 + j * 150} ${GROUND} Z`} fill="#9b2318" />
          <path d={`M ${x0 + 100 + j * 150} ${GROUND - 185} L ${x0 + 100 + j * 150} ${GROUND}`} stroke="#5e130c" strokeWidth={4} />
        </g>
      ))}
      <rect x={x0} y={GROUND - h} width={w} height={h} fill="url(#binaGolge)" />
    </g>
  );
};

// yükseltilmiş demiryolu (Atlantic Avenue)
const KOLON = Array.from({length: 14}, (_, i) => 1080 + i * 230);
const DEK = GROUND - 210;
const Demiryolu: React.FC<{t: number; Fr: number}> = ({t, Fr}) => {
  const bukul = (xc: number) => (Fr > xc ? sinir((Fr - xc) / 9, 0, 1) * karis(26, 9, sinir((xc - 1080) / 2200, 0, 1)) : 0);
  const sark = (xc: number) => bukul(xc) * 2.2;
  const noktalar = [[-900, DEK], ...KOLON.map((x) => [x, DEK + sark(x)]), [4200, DEK]];
  const d = noktalar.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const trenX = interpolate(t, [A.l1, A.ogle + 0.6], [-700, 2300], kis);
  return (
    <g>
      {/* tren */}
      {t > A.l1 && t < A.yari + 0.4 && [0, 1, 2].map((k) => (
        <g key={k} transform={`translate(${trenX - k * 205},${DEK - 92})`}>
          <rect x={0} y={0} width={190} height={84} rx={8} fill="#3d4a3f" />
          <rect x={0} y={0} width={190} height={84} rx={8} fill="url(#metalDik)" opacity={0.4} />
          {[0, 1, 2, 3, 4].map((j) => <rect key={j} x={14 + j * 35} y={16} width={24} height={26} fill="#c9b98f" opacity={0.7} />)}
          <rect x={-4} y={-8} width={198} height={12} rx={4} fill="#2b322c" />
        </g>
      ))}
      <path d={d + ` L 4200 ${DEK + 34} ` + [...noktalar].reverse().map(([x, y]) => `L ${x} ${y + 34}`).join(' ') + ' Z'} fill="#2f3439" />
      {Array.from({length: 120}, (_, i) => {
        const x = -900 + i * 43;
        return <path key={i} d={`M ${x} ${DEK + 34} L ${x + 21} ${DEK + 4} L ${x + 43} ${DEK + 34}`} stroke="#4a5157" strokeWidth={4} fill="none" transform={`translate(0,${sark(KOLON.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), KOLON[0])) * 0.7})`} />;
      })}
      <path d={d} stroke="#5b636a" strokeWidth={6} fill="none" />
      {KOLON.map((x) => {
        const a = bukul(x);
        return (
          <g key={x} transform={`rotate(${a},${x},${GROUND})`}>
            <rect x={x - 11} y={DEK + 30} width={22} height={GROUND - DEK - 30} fill="url(#metalDik)" />
            <path d={`M ${x - 11} ${DEK + 60} L ${x + 11} ${DEK + 120} M ${x + 11} ${DEK + 60} L ${x - 11} ${DEK + 120}`} stroke="#2b3035" strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
};

const Tank: React.FC<{t: number}> = ({t}) => {
  const u = t - A.yari;
  const yarik = u > 0;
  const sol = yarik ? -16 * Easing.out(Easing.cubic)(sinir(u / 0.7, 0, 1)) : 0;
  const sagA = yarik ? 52 * Easing.out(Easing.cubic)(sinir(u / 0.8, 0, 1)) : 0;
  const sagX = yarik ? 300 * Easing.out(Easing.cubic)(sinir(u / 0.8, 0, 1)) : 0;
  const kesit = gir(t, A.litre - 0.25, 0.5) * (1 - gir(t, A.ogle - 0.4, 0.4));
  const dolu = interpolate(t, [A.litre - 0.1, A.litre + 1.3], [0, 0.93], {...kis, easing: Easing.out(Easing.cubic)});
  const CATLAK = 880;
  const govde = (x0: number, x1: number) => (
    <g>
      <rect x={x0} y={TTOP} width={x1 - x0} height={TH} fill="url(#tankMetal)" />
      {/* sızıntı lekeleri: tank sızıntıları gizlemek için kahverengiye boyanmıştı */}
      {Array.from({length: 16}, (_, i) => {
        const x = TL + 20 + rnd(i + 3) * (2 * TR - 40);
        if (x < x0 || x > x1) return null;
        return <rect key={i} x={x} y={TTOP + 60 + rnd(i) * 120} width={6 + rnd(i + 9) * 10} height={120 + rnd(i + 5) * 220} rx={4} fill="#3c1d0a" opacity={0.35} />;
      })}
      {Array.from({length: 7}, (_, k) => {
        const y = TTOP + 18 + k * 60;
        return (
          <g key={k}>
            <path d={`M ${x0} ${y} L ${x1} ${y}`} stroke="#2a2522" strokeWidth={3} opacity={0.7} />
            <path d={`M ${x0} ${y + 2} L ${x1} ${y + 2}`} stroke="#c8c3bb" strokeWidth={1.5} opacity={0.35} />
            {Array.from({length: Math.ceil((x1 - x0) / 17)}, (_, j) => {
              const rx = x0 + 6 + j * 17;
              const kopuk = POP_XY.some(([px, py], n) => t > POPS[n] && Math.abs(px - rx) < 9 && Math.abs(py - (y - 7)) < 30);
              return kopuk ? null : <circle key={j} cx={rx} cy={y - 7} r={3.2} fill="#5d5650" stroke="#2a2522" strokeWidth={1} />;
            })}
            {Array.from({length: 7}, (_, j) => {
              const vx = TL + ((j + (k % 2) * 0.5) * (2 * TR)) / 6;
              if (vx < x0 || vx > x1) return null;
              return <path key={j} d={`M ${vx} ${y} L ${vx} ${y + 60}`} stroke="#2a2522" strokeWidth={2.5} opacity={0.6} />;
            })}
          </g>
        );
      })}
      <rect x={x0} y={TTOP} width={x1 - x0} height={TH} fill="url(#tankGolge)" />
    </g>
  );
  return (
    <g>
      {/* gölge */}
      <ellipse cx={TX + 60} cy={GROUND + 8} rx={TR + 110} ry={22} fill="#000" opacity={yarik ? 0 : 0.35} filter="url(#bulanik8)" />
      {/* sol parça */}
      <g transform={`rotate(${sol},${TL},${GROUND})`}>
        {govde(TL, CATLAK)}
        <path d={`M ${TL - 8} ${TTOP} Q ${TX} ${TTOP - 70} ${CATLAK} ${TTOP - 16} L ${CATLAK} ${TTOP} Z`} fill="url(#cati)" />
        {/* merdiven */}
        <g stroke="#26221f" strokeWidth={3}>
          <path d={`M ${TL + 40} ${GROUND} L ${TL + 40} ${TTOP} M ${TL + 64} ${GROUND} L ${TL + 64} ${TTOP}`} />
          {Array.from({length: 18}, (_, i) => <path key={i} d={`M ${TL + 40} ${GROUND - 12 - i * 23} L ${TL + 64} ${GROUND - 12 - i * 23}`} />)}
        </g>
      </g>
      {/* sağ parça */}
      <g transform={`translate(${sagX},${yarik ? -60 * Math.sin(sinir(u / 0.8, 0, 1) * Math.PI) : 0}) rotate(${sagA},${TRt},${GROUND})`} opacity={yarik ? 1 - gir(t, A.yari + 1.2, 0.6) : 1}>
        {govde(CATLAK, TRt)}
        <path d={`M ${CATLAK} ${TTOP - 16} Q ${TRt - 40} ${TTOP - 20} ${TRt + 8} ${TTOP} L ${CATLAK} ${TTOP} Z`} fill="url(#cati)" />
      </g>
      {/* kesit: içindeki pekmez */}
      {kesit > 0.01 && (
        <g opacity={kesit}>
          <rect x={TL + 8} y={TTOP + 6} width={2 * TR - 16} height={TH - 12} fill="#11161b" opacity={0.78} />
          <rect x={TL + 8} y={GROUND - 6 - (TH - 12) * dolu} width={2 * TR - 16} height={(TH - 12) * dolu} fill="url(#pekmezDik)" />
          <path d={`M ${TL + 8} ${GROUND - 6 - (TH - 12) * dolu} ${Array.from({length: 25}, (_, i) => `L ${TL + 8 + i * ((2 * TR - 16) / 24)} ${GROUND - 6 - (TH - 12) * dolu + Math.sin(i * 0.9 + t * 3) * 3}`).join(' ')}`} stroke="#e7a85a" strokeWidth={4} fill="none" opacity={0.8} />
          <rect x={TL + 8} y={TTOP + 6} width={2 * TR - 16} height={TH - 12} fill="none" stroke="#e8d7b8" strokeWidth={3} strokeDasharray="14 10" opacity={0.6} />
        </g>
      )}
      {/* çatlaklar ve sızan pekmez */}
      {t > POPS[0] && !yarik && (
        <g>
          {POP_XY.map(([px, py], n) => {
            const g = gir(t, POPS[n], 0.25);
            if (g <= 0) return null;
            const uz = sinir((t - POPS[n]) * 220, 0, 160);
            return (
              <g key={n}>
                <path d={`M ${px} ${py} l ${-12 + rnd(n) * 24} ${30 * g} l ${10 - rnd(n + 1) * 20} ${40 * g} M ${px} ${py} l ${20 * g} ${-14 * g}`} stroke="#120d0a" strokeWidth={2.5} fill="none" />
                <rect x={px - 3} y={py} width={6 + g * 4} height={uz} rx={4} fill="url(#pekmezDik)" />
              </g>
            );
          })}
          <path d={`M ${CATLAK} ${GROUND} L ${CATLAK + 6} ${GROUND - 120 * gir(t, A.patliyor, 1.2)} L ${CATLAK - 8} ${GROUND - 230 * gir(t, A.patliyor + 0.3, 1.0)} L ${CATLAK + 4} ${GROUND - 380 * gir(t, A.patliyor + 0.6, 0.6)}`} stroke="#0e0a07" strokeWidth={4} fill="none" />
        </g>
      )}
      {/* fırlayan perçinler */}
      {POP_XY.map(([px, py], n) => {
        const u2 = t - POPS[n];
        if (u2 < 0 || u2 > 0.6) return null;
        const vx = 520 + rnd(n) * 380, vy = -260 + rnd(n + 4) * 200;
        const x = px + vx * u2, y = py + vy * u2 + 900 * u2 * u2;
        return (
          <g key={n}>
            <circle cx={px} cy={py} r={karis(26, 0, sinir(u2 / 0.12, 0, 1))} fill="#fff1c9" opacity={0.9} />
            <path d={`M ${x} ${y} L ${x - vx * 0.05} ${y - (vy + 1800 * u2) * 0.05}`} stroke="#ffd79a" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
            <circle cx={x} cy={y} r={4.5} fill="#ddd2c4" />
          </g>
        );
      })}
      {/* uçan parçalar */}
      {yarik && u < 2 && Array.from({length: 14}, (_, i) => {
        const vx = 200 + rnd(i) * 700, vy = -500 - rnd(i + 2) * 600;
        const x = CATLAK + vx * u, y = TTOP + 120 + rnd(i + 7) * 200 + vy * u + 1100 * u * u;
        if (y > GROUND + 40) return null;
        return <rect key={i} x={x} y={y} width={18 + rnd(i + 3) * 40} height={10 + rnd(i + 1) * 18} fill="#6c645c" stroke="#2a2522" strokeWidth={2} transform={`rotate(${u * (300 + i * 40)},${x},${y})`} />;
      })}
    </g>
  );
};

const Pekmez: React.FC<{t: number; Fr: number}> = ({t, Fr}) => {
  if (Fr < 0) return null;
  const x0 = t < A.l1 ? 1500 : TL - 900;
  const adim = 14;
  const pts: [number, number][] = [];
  for (let x = x0; x <= Fr + 1; x += adim) pts.push([x, GROUND - yuzey(x, t, Fr)]);
  pts.push([Fr, GROUND]);
  const ust = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const govde = ust + ` L ${x0} ${GROUND + 2} Z`;
  // öndeki sokak düzlemine yayılan pekmez (kameraya yaklaştıkça geride kalır)
  const duz = `M ${x0} ${GROUND - 2} L ${Fr} ${GROUND - 2} ` + Array.from({length: 12}, (_, i) => `L ${Fr - 70 * (i + 1) * 0.6 - 30 * Math.sin(i * 1.7 + t * 2)} ${GROUND + (i + 1) * 92}`).join(' ') + ` L ${x0} ${GROUND + 1104} Z`;
  const donma = gir(t, A.soguk, 2.6);
  const parlak = 1 - donma * 0.65;
  const crest = tepeH(Fr);
  return (
    <g>
      <path d={duz} fill="url(#pekmezDuz)" />
      <path d={duz} fill="url(#yansima)" opacity={0.5 * parlak} />
      {/* düzlemdeki parlak akış çizgileri */}
      {Array.from({length: 26}, (_, i) => {
        const y = GROUND + 40 + rnd(i) * 1000;
        const lim = Fr - (y - GROUND) * 0.46 - 50;
        const x = x0 + ((rnd(i + 8) * 3000 + t * (180 - donma * 170)) % 3000);
        if (x > lim) return null;
        const w = 60 + rnd(i + 2) * 200;
        return <rect key={i} x={x} y={y} width={Math.min(w, lim - x)} height={3 + rnd(i) * 4} rx={3} fill="#f3c27c" opacity={0.25 * parlak} />;
      })}
      <path d={govde} fill="url(#pekmezDik)" />
      <path d={ust} stroke="#ffcf8a" strokeWidth={5} fill="none" opacity={0.55 * parlak} strokeLinejoin="round" />
      <path d={ust} stroke="#fff4dc" strokeWidth={2} fill="none" opacity={0.45 * parlak} strokeDasharray="40 140" strokeDashoffset={-t * 260} />
      {/* kıvrılan dalga ucu ve sıçrayan damlalar */}
      {t > A.yari && Fr < 4300 && (
        <g>
          <path d={`M ${Fr - 120} ${GROUND - crest * 0.98} Q ${Fr + 10} ${GROUND - crest * 1.12} ${Fr + 24} ${GROUND - crest * 0.62} Q ${Fr + 6} ${GROUND - crest * 0.78} ${Fr - 30} ${GROUND - crest * 0.7} Z`} fill="url(#pekmezDik)" />
          <path d={`M ${Fr - 110} ${GROUND - crest * 0.97} Q ${Fr + 6} ${GROUND - crest * 1.1} ${Fr + 20} ${GROUND - crest * 0.66}`} stroke="#ffd9a0" strokeWidth={4} fill="none" opacity={0.7} />
          {Array.from({length: 22}, (_, i) => {
            const f = (t * 1.6 + rnd(i)) % 1;
            const x = Fr - 40 + f * (140 + rnd(i + 1) * 160);
            const y = GROUND - crest * (0.9 + rnd(i + 2) * 0.3) - f * 160 + f * f * 420;
            return <ellipse key={i} cx={x} cy={y} rx={5 + rnd(i + 3) * 8} ry={4 + rnd(i + 4) * 6} fill="#5a2a0c" opacity={1 - f} />;
          })}
        </g>
      )}
    </g>
  );
};

const Insan: React.FC<{x: number; y?: number; s?: number; faz: number; renk?: string; sapka?: 'fotr' | 'kasket' | 'denizci'; dir?: number}> = ({x, y = GROUND, s = 1, faz, renk = '#1f242b', sapka = 'fotr', dir = 1}) => {
  const b = Math.sin(faz) * 9;
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`} fill={renk}>
      <ellipse cx={0} cy={0} rx={14} ry={3} fill="#000" opacity={0.3} />
      <path d={`M -3 -24 L ${-4 + b} -2 L ${0 + b} -2 Z`} stroke={renk} strokeWidth={5} strokeLinecap="round" />
      <path d={`M 3 -24 L ${4 - b} -2 L ${8 - b} -2 Z`} stroke={renk} strokeWidth={5} strokeLinecap="round" />
      <path d="M -9 -46 Q -11 -30 -8 -20 L 9 -20 Q 11 -30 8 -46 Q 0 -50 -9 -46 Z" />
      <circle cx={1} cy={-53} r={5.5} fill="#c9a98a" />
      {sapka === 'fotr' && <path d="M -7 -57 L -6 -63 L 7 -63 L 8 -57 L 11 -56 L -10 -56 Z" />}
      {sapka === 'kasket' && <path d="M -6 -58 Q 1 -64 7 -58 L 11 -57 L -6 -56 Z" />}
      {sapka === 'denizci' && <path d="M -6 -57 Q 1 -61 8 -57 L 8 -56 L -6 -56 Z" fill="#e8e6e0" />}
    </g>
  );
};

const AtArabasi: React.FC<{x: number; faz: number}> = ({x, faz}) => (
  <g transform={`translate(${x},${GROUND})`}>
    <ellipse cx={-10} cy={2} rx={95} ry={6} fill="#000" opacity={0.3} />
    {/* araba */}
    <rect x={-120} y={-44} width={92} height={30} fill="#5b3d26" />
    <circle cx={-96} cy={-12} r={14} fill="none" stroke="#2a1a10" strokeWidth={4} />
    <circle cx={-50} cy={-12} r={14} fill="none" stroke="#2a1a10" strokeWidth={4} />
    <rect x={-110} y={-62} width={36} height={18} fill="#8a6a44" />
    <path d="M -28 -32 L 6 -38" stroke="#2a1a10" strokeWidth={4} />
    {/* at */}
    <g fill="#3b2a1f">
      <path d="M 4 -54 Q 30 -62 58 -54 Q 66 -40 58 -32 L 8 -32 Q 0 -42 4 -54 Z" />
      <path d={`M 56 -56 Q 66 -78 80 -82 L 86 -74 Q 76 -66 70 -50 Z`} />
      {[10, 22, 46, 56].map((lx, i) => <path key={lx} d={`M ${lx} -34 L ${lx + Math.sin(faz + i * 1.7) * 7} 0`} stroke="#3b2a1f" strokeWidth={5} strokeLinecap="round" />)}
    </g>
  </g>
);

const Termometre: React.FC<{t: number}> = ({t}) => {
  const g = gir(t, A.soguk - 0.1, 0.4);
  const derece = interpolate(t, [A.soguk + 0.1, A.hapis + 0.6], [5, -4], {...kis, easing: yumus});
  const y = (d: number) => 640 - (d + 10) * 24;
  return (
    <g opacity={g * (1 - gir(t, A.son - 0.45, 0.35))} transform="translate(905,0)">
      <rect x={-60} y={210} width={120} height={560} rx={60} fill="rgba(10,16,24,.62)" />
      <rect x={-12} y={250} width={24} height={420} rx={12} fill="#dfe8ef" opacity={0.9} />
      <rect x={-7} y={y(derece)} width={14} height={680 - y(derece)} rx={7} fill="#d6402b" />
      <circle cx={0} cy={690} r={30} fill="#d6402b" stroke="#dfe8ef" strokeWidth={6} />
      {[10, 5, 0, -5].map((d) => (
        <g key={d}>
          <path d={`M 16 ${y(d)} L 30 ${y(d)}`} stroke="#fff" strokeWidth={3} />
          <text x={-22} y={y(d) + 8} textAnchor="end" fontFamily={METIN} fontWeight={800} fontSize={24} fill={d === 0 ? '#9fd3ff' : '#fff'}>{d > 0 ? `+${d}` : d}°</text>
        </g>
      ))}
    </g>
  );
};

const Plan: React.FC<{t: number}> = ({t}) => {
  const op = gir(t, A.son - 0.45, 0.55);
  if (op <= 0) return null;
  const ciz = gir(t, A.son - 0.2, 1.6);
  const L = 2400;
  const imza = gir(t, A.imza - 0.45, 0.8);
  const muhur = interpolate(t, [A.imza + 0.3, A.imza + 0.5], [0, 1], {...kis, easing: Easing.out(Easing.back(1.6))});
  const kart = gir(t, A.bitis + 0.15, 0.5);
  return (
    <g opacity={op}>
      <rect width={1080} height={1920} fill="#0d3563" />
      <rect width={1080} height={1920} fill="url(#plKareli)" />
      <rect width={1080} height={1920} fill="url(#plIsik)" />
      <g stroke="#e9f2ff" fill="none" strokeWidth={4} strokeDasharray={L} strokeDashoffset={L * (1 - ciz)} opacity={1 - kart * 0.92}>
        <rect x={160} y={700} width={760} height={420} />
        <path d="M 160 700 Q 540 600 920 700" />
        {Array.from({length: 6}, (_, k) => <path key={k} d={`M 160 ${760 + k * 60} L 920 ${760 + k * 60}`} strokeWidth={2} opacity={0.6} />)}
        <path d="M 160 1170 L 920 1170 M 160 1155 L 160 1185 M 920 1155 L 920 1185" strokeWidth={3} />
        <path d="M 980 700 L 980 1120 M 965 700 L 995 700 M 965 1120 L 995 1120" strokeWidth={3} />
      </g>
      <g opacity={ciz * (1 - kart)} fontFamily={METIN} fontWeight={800} fill="#e9f2ff">
        <text x={540} y={1225} fontSize={40} textAnchor="middle">27 m</text>
        <text x={1030} y={925} fontSize={40} textAnchor="middle" transform="rotate(-90,1030,925)">15 m</text>
        <text x={160} y={650} fontSize={30} opacity={0.8}>DEPOLAMA TANKI · KESİT</text>
      </g>
      {/* başlık bloğu, imza ve mühür */}
      <g opacity={1 - kart}>
        <rect x={430} y={1290} width={490} height={170} fill="none" stroke="#e9f2ff" strokeWidth={3} />
        <text x={450} y={1330} fontFamily={METIN} fontWeight={600} fontSize={22} fill="#e9f2ff" opacity={0.8}>MÜHENDİS İMZASI</text>
        <path d="M 455 1420 C 480 1360 505 1440 530 1390 S 575 1350 590 1410 S 640 1440 660 1380 S 720 1400 760 1395 L 880 1385" stroke="#ffffff" strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={700} strokeDashoffset={700 * (1 - imza)} />
        {muhur > 0 && (
          <g transform={`translate(330,1350) rotate(-12) scale(${karis(1.8, 1, muhur)})`} opacity={sinir(muhur, 0, 1)}>
            <rect x={-130} y={-62} width={260} height={124} rx={14} fill="none" stroke="#e8432f" strokeWidth={9} />
            <text x={0} y={-8} textAnchor="middle" fontFamily={BASLIK} fontSize={52} fill="#e8432f" letterSpacing={2}>ONAYLANDI</text>
            <text x={0} y={38} textAnchor="middle" fontFamily={BASLIK} fontSize={34} fill="#e8432f" letterSpacing={3}>MÜHENDİS</text>
          </g>
        )}
      </g>
    </g>
  );
};

// ---- yazılar --------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif || aktif.c === 0 || t > A.bitis + 0.12) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.45) return null;
  return (
    <div style={{position: 'absolute', left: 54, right: 54, top: 1470, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(8,10,14,.74)', borderRadius: 26, padding: '20px 34px 22px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 58, lineHeight: 1.2, letterSpacing: -0.5}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 15, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 10}px)`, color: k === aktif ? '#ffb347' : '#fff'}}>
              {k.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
const Etiket: React.FC<{t: number; t0: number; t1: number; top: number; children: React.ReactNode; renk?: string; buyuk?: boolean}> = ({t, t0, t1, top, children, renk = '#ffb347', buyuk}) => {
  const g = gir(t, t0, 0.3) * (1 - gir(t, t1, 0.3));
  if (g <= 0.001) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', opacity: g, transform: `translateY(${(1 - g) * 16}px)`}}>
      <div style={{background: 'rgba(8,10,14,.66)', borderLeft: `8px solid ${renk}`, borderRadius: 14, padding: buyuk ? '14px 30px 10px' : '12px 26px 8px', fontFamily: BASLIK, fontSize: buyuk ? 92 : 62, letterSpacing: 3, color: '#fff', lineHeight: 1}}>
        {children}
      </div>
    </div>
  );
};

// ---- video ---------------------------------------------------------------------------
const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([
      document.fonts.load("92px 'Bebas Neue'", 'ĞÜŞİÖÇ1919'),
      document.fonts.load("800 58px 'Inter'", 'ğüşıöçİ'),
      document.fonts.load("600 22px 'Inter'", 'ğüşıöçİ'),
      document.fonts.ready,
    ]).then(() => continueRender(bekle));
  }, [bekle]);

  const Fr = onCephe(t);
  let [cx, cy, s] = kamera(t);
  const sars = (t > A.yari ? Math.exp(-(t - A.yari) * 3.2) * 26 : 0) + (t > POPS[0] && t < A.yari ? 3 : 0) + (t > A.yari && t < A.olu ? 2.5 : 0);
  const sx = Math.sin(t * 71) * sars, sy = Math.cos(t * 89) * sars * 0.8;
  const dunya = `translate(${540 - cx * s + sx},${960 - cy * s + sy}) scale(${s})`;
  const parallaks = (k: number) => `translate(${540 - cx * s * k + sx},${960 - cy * s + sy}) scale(${s})`;
  const derinlik = sinir((s - 1.3) / 1.0, 0, 1); // yakın planda arka plan flu
  const karanlik = 1 - Math.abs(t - A.l1) / 0.2;
  const soguk = gir(t, A.olu - 0.3, 0.8);
  const gunes = 1 - soguk * 0.6;

  const satir0 = K.filter((k) => k.c === 0);
  const yurur = (x0: number, v: number) => x0 + v * (t - A.l1);

  return (
    <AbsoluteFill style={{background: '#0b0f14'}}>
      <Audio src={staticFile('pekmez/mix.wav')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={soguk > 0.5 ? '#4a5a6c' : '#7f95ab'} />
            <stop offset="55%" stopColor={soguk > 0.5 ? '#8d97a0' : '#c7cbc8'} />
            <stop offset="100%" stopColor={soguk > 0.5 ? '#b3b5b2' : '#e6d9c2'} />
          </linearGradient>
          <linearGradient id="tankMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b3632" /><stop offset="18%" stopColor="#6e655c" /><stop offset="38%" stopColor="#9a8f82" />
            <stop offset="52%" stopColor="#857a6e" /><stop offset="80%" stopColor="#4f4740" /><stop offset="100%" stopColor="#24201d" />
          </linearGradient>
          <linearGradient id="tankGolge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.12" /><stop offset="70%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="cati" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4a433d" /><stop offset="45%" stopColor="#8a8076" /><stop offset="100%" stopColor="#2c2723" /></linearGradient>
          <linearGradient id="metalDik" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2a2f34" /><stop offset="40%" stopColor="#6c757d" /><stop offset="100%" stopColor="#1d2125" /></linearGradient>
          <linearGradient id="pekmezDik" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8c4614" /><stop offset="12%" stopColor="#5a2a0b" /><stop offset="60%" stopColor="#2e1405" /><stop offset="100%" stopColor="#1a0b03" />
          </linearGradient>
          <linearGradient id="pekmezDuz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a2109" /><stop offset="40%" stopColor="#2a1205" /><stop offset="100%" stopColor="#140802" />
          </linearGradient>
          <linearGradient id="yansima" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd9a3" stopOpacity="0.45" /><stop offset="18%" stopColor="#ffd9a3" stopOpacity="0" />
            <stop offset="55%" stopColor="#9fb2c4" stopOpacity="0" /><stop offset="70%" stopColor="#9fb2c4" stopOpacity="0.12" /><stop offset="100%" stopColor="#9fb2c4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="binaGolge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.06" /><stop offset="100%" stopColor="#000" stopOpacity="0.38" /></linearGradient>
          <linearGradient id="deniz" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8a9aa6" /><stop offset="100%" stopColor="#2c3a45" /></linearGradient>
          <linearGradient id="sokak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b6660" /><stop offset="100%" stopColor="#2b2826" /></linearGradient>
          <pattern id="kaldirim" width="64" height="34" patternUnits="userSpaceOnUse">
            <rect width="64" height="34" fill="#4a4642" />
            <rect x="2" y="2" width="28" height="13" rx="6" fill="#6d6761" /><rect x="34" y="2" width="28" height="13" rx="6" fill="#625c56" />
            <rect x="-14" y="19" width="28" height="13" rx="6" fill="#5e5953" /><rect x="18" y="19" width="28" height="13" rx="6" fill="#6f6963" /><rect x="50" y="19" width="28" height="13" rx="6" fill="#5e5953" />
          </pattern>
          <pattern id="tugla" width="44" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 44 10 M 0 20 L 44 20 M 22 0 L 22 10 M 0 10 L 0 20 M 44 10 L 44 20" stroke="#2a150f" strokeWidth="1.5" />
          </pattern>
          <pattern id="plKare" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1.5" fill="none" /></pattern>
          <pattern id="plKareli" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="url(#plKare)" /><path d="M 200 0 L 0 0 0 200" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" fill="none" />
          </pattern>
          <radialGradient id="plIsik" cx="50%" cy="45%" r="70%"><stop offset="0%" stopColor="#3f78b8" stopOpacity="0.35" /><stop offset="100%" stopColor="#000" stopOpacity="0.45" /></radialGradient>
          <radialGradient id="gunesIsik" cx="78%" cy="30%" r="45%"><stop offset="0%" stopColor="#fff1d0" stopOpacity="0.75" /><stop offset="100%" stopColor="#fff1d0" stopOpacity="0" /></radialGradient>
          <radialGradient id="vinyet" cx="50%" cy="46%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.62" /></radialGradient>
          <linearGradient id="sis" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dfe3e6" stopOpacity="0" /><stop offset="50%" stopColor="#dfe3e6" stopOpacity="0.55" /><stop offset="100%" stopColor="#dfe3e6" stopOpacity="0" /></linearGradient>
          <filter id="bulanik8"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="arka"><feGaussianBlur stdDeviation={2 + derinlik * 7} /></filter>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={Math.floor(t * 15)} />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 -0.18" />
          </filter>
        </defs>

        {/* gök */}
        <rect width={1080} height={1920} fill="url(#gok)" />
        <rect width={1080} height={1920} fill="url(#gunesIsik)" opacity={gunes} />
        <g transform={`translate(${-cx * 0.05 * s},0)`} opacity={0.55}>
          {Array.from({length: 7}, (_, i) => (
            <ellipse key={i} cx={(rnd(i) * 1600 + t * 6) % 1800 - 300} cy={150 + rnd(i + 3) * 500} rx={220 + rnd(i + 5) * 260} ry={40 + rnd(i + 1) * 30} fill="#f4f1ea" opacity={0.35} filter="url(#bulanik8)" />
          ))}
        </g>

        {/* uzak: liman ve gemiler */}
        <g transform={parallaks(0.55)} filter="url(#arka)">
          <rect x={-2600} y={GROUND - 70} width={4200} height={600} fill="url(#deniz)" />
          {[[-1500, 1], [-700, 0.8], [100, 0.9]].map(([x, k], i) => (
            <g key={i} transform={`translate(${x},${GROUND - 70}) scale(${k})`} fill="#4b5560">
              <path d="M -160 0 L 160 0 L 130 -46 L -140 -46 Z" />
              <rect x={-60} y={-110} width={80} height={64} />
              <rect x={-30} y={-170} width={18} height={70} />
            </g>
          ))}
          {/* arka şehir silueti */}
          {Array.from({length: 40}, (_, i) => {
            const x = -400 + i * 130, h = 260 + rnd(i) * 260;
            return <rect key={i} x={x} y={GROUND - 120 - h} width={120} height={h} fill="#9aa1a6" opacity={0.55} />;
          })}
        </g>

        <g transform={dunya}>
          {/* binalar ve itfaiye */}
          <g filter={derinlik > 0.05 ? 'url(#arka)' : undefined}>
            {[[1080, 260, 470, '#8a4a36', 5], [1350, 230, 410, '#7a5a48', 4], [1590, 280, 520, '#6d3a2c', 6], [2230, 260, 450, '#8b5a3c', 5], [2500, 300, 540, '#74463a', 6], [2810, 240, 430, '#86503a', 5], [3060, 300, 500, '#6f4434', 6], [3370, 280, 460, '#80523e', 5]].map(([x, w, h, r, k], i) => (
              <Bina key={i} x={x as number} w={w as number} h={h as number} renk={r as string} kat={k as number} i={i} />
            ))}
            <Itfaiye t={t} Fr={Fr} />
            <Demiryolu t={t} Fr={Fr} />
          </g>
          {/* sokak */}
          <rect x={-2600} y={GROUND} width={7000} height={1400} fill="url(#kaldirim)" />
          <rect x={-2600} y={GROUND} width={7000} height={1400} fill="url(#sokak)" opacity={0.55} />
          <rect x={-2600} y={GROUND - 4} width={7000} height={14} fill="#8d867d" />
          {/* rıhtım */}
          <rect x={-2600} y={GROUND - 4} width={2700} height={40} fill="#5b4a3a" />
          <Tank t={t} />
          {/* insanlar ve at arabası (sakin öğle) */}
          {t > A.l1 && t < A.yari + 0.2 && (
            <g opacity={1 - gir(t, A.ogle - 0.4, 0.4)}>
              <AtArabasi x={yurur(1180, 60)} faz={t * 7} />
              <Insan x={yurur(1060, 38)} faz={t * 7} s={1.05} sapka="fotr" />
              <Insan x={yurur(1440, -34)} faz={t * 7 + 1} dir={-1} sapka="kasket" renk="#2b2420" />
              <Insan x={yurur(1530, -30)} faz={t * 6 + 2} dir={-1} s={0.85} sapka="kasket" renk="#3a3a40" />
              <Insan x={yurur(1700, 26)} faz={t * 6.5} sapka="denizci" renk="#1d2a44" />
              <Insan x={yurur(980, 22)} faz={t * 6} s={0.95} sapka="fotr" renk="#2d2925" />
            </g>
          )}
          {/* güvercinler kaçışıyor */}
          {t > A.yari && t < A.olu + 0.5 && Array.from({length: 16}, (_, i) => {
            const bx = 1400 + i * 130, bas = A.yari + (bx - TRt) / 450 - 0.5;
            const u = t - bas;
            if (u < 0 || u > 2.5) return null;
            const x = bx + u * 160, y = GROUND - 420 - (i % 4) * 30 - u * 260;
            const k = Math.sin(t * 30 + i) * 8;
            return <path key={i} d={`M ${x - 12} ${y + k} Q ${x - 5} ${y - 4} ${x} ${y} Q ${x + 5} ${y - 4} ${x + 12} ${y + k}`} stroke="#2b2b2e" strokeWidth={3.5} fill="none" strokeLinecap="round" />;
          })}
          {/* kanca: sahipsiz şapka */}
          {t < A.l1 && (
            <g transform={`translate(${2640 + Math.max(0, (Fr - 2600)) * 0.85},${GROUND + 54 - Math.max(0, Fr - 2600) * 0.12}) rotate(${Math.max(0, Fr - 2600) * 0.35})`}>
              <ellipse cx={0} cy={6} rx={46} ry={10} fill="#000" opacity={0.35} />
              <path d="M -42 0 Q 0 10 42 0 L 34 -6 Q 30 -40 0 -42 Q -30 -40 -34 -6 Z" fill="#26201b" />
              <path d="M -32 -12 Q 0 -6 32 -12" stroke="#5a1e16" strokeWidth={7} />
            </g>
          )}
          <Pekmez t={t} Fr={Fr} />
          {/* enkaz */}
          {t > A.olu - 0.5 && (
            <g opacity={gir(t, A.olu - 0.5, 0.6)}>
              {[[1950, -14, 18], [2200, 8, 0], [2480, -6, 30], [2860, 4, -12], [3150, -10, 40]].map(([x, dy, r], i) => (
                <g key={i} transform={`translate(${x},${GROUND - 30 + (dy as number) + Math.sin(t * 0.8 + i) * 2 * (1 - gir(t, A.soguk, 2))}) rotate(${r})`}>
                  <rect x={-90} y={-12} width={180} height={22} fill="#5b3d26" stroke="#2a1a10" strokeWidth={3} />
                </g>
              ))}
              <g transform={`translate(2300,${GROUND - 40}) rotate(-20)`}>
                <circle r={34} fill="none" stroke="#3a2412" strokeWidth={7} />
                {[0, 45, 90, 135].map((a) => <path key={a} d="M -34 0 L 34 0" stroke="#3a2412" strokeWidth={4} transform={`rotate(${a})`} />)}
              </g>
              <rect x={2620} y={GROUND - 64} width={52} height={64} rx={10} fill="#4a3220" stroke="#22150b" strokeWidth={3} />
            </g>
          )}
          {/* sıkışan adam ve kurtarıcı denizci */}
          {t > A.soguk - 0.4 && (
            <g opacity={gir(t, A.soguk - 0.4, 0.4) * (1 - gir(t, A.son - 0.45, 0.35))}>
              {(() => {
                const cek = gir(t, A.hapis - 0.2, 2.2);
                const mx = 2640, my = GROUND + 150 - cek * 14;
                const kol = Math.sin(t * 2.2) * 10;
                return (
                  <g>
                    <path d={`M ${mx + 18} ${my - 70} Q ${karis(mx + 140, mx + 150, cek)} ${my - 60 + Math.sin(t * 3) * 6} 2862 ${GROUND + 70}`} stroke="#c8b48c" strokeWidth={5} fill="none" />
                    <g fill="#1f242b">
                      <path d={`M ${mx - 22} ${my} Q ${mx - 24} ${my - 50} ${mx - 14} ${my - 72} L ${mx + 14} ${my - 72} Q ${mx + 24} ${my - 50} ${mx + 22} ${my} Z`} />
                      <circle cx={mx} cy={my - 88} r={14} fill="#c9a98a" />
                      <path d={`M ${mx + 12} ${my - 66} L ${mx + 36} ${my - 78 + kol}`} stroke="#1f242b" strokeWidth={11} strokeLinecap="round" />
                      <path d={`M ${mx - 12} ${my - 66} L ${mx - 40} ${my - 40 - kol}`} stroke="#1f242b" strokeWidth={11} strokeLinecap="round" />
                    </g>
                    <path d={`M ${mx - 40} ${my - 2} Q ${mx} ${my + 10} ${mx + 40} ${my - 2}`} stroke="#ffcf8a" strokeWidth={4} fill="none" opacity={0.5 * (1 - gir(t, A.soguk, 2.6) * 0.6)} />
                    <rect x={2830} y={GROUND + 70} width={190} height={26} fill="#5b3d26" stroke="#2a1a10" strokeWidth={3} />
                    <g transform={`translate(2880,${GROUND + 72}) scale(2.1)`}>
                      <Insan x={0} faz={0.6 + Math.sin(t * 2) * 0.3} sapka="denizci" renk="#1d2a44" dir={-1} />
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </g>

        {/* atmosfer: sis katmanları, soğuk ton */}
        {[0, 1].map((i) => <rect key={i} x={-200} y={760 + i * 360 + Math.sin(t * 0.5 + i) * 30} width={1480} height={260} fill="url(#sis)" opacity={0.22 + soguk * 0.2} />)}
        <rect width={1080} height={1920} fill="#6f8aa6" opacity={soguk * 0.22} style={{mixBlendMode: 'multiply'}} />
        {/* kar tanesi gibi ince buz parçacıkları: soğuk sahnesi */}
        {t > A.soguk - 0.3 && Array.from({length: 50}, (_, i) => (
          <circle key={i} cx={(rnd(i) * 1080 + Math.sin(t + i) * 20) % 1080} cy={(rnd(i + 9) * 1920 + t * (40 + rnd(i) * 40)) % 1920} r={1.5 + rnd(i + 2) * 2.5} fill="#fff" opacity={0.5 * gir(t, A.soguk - 0.3, 0.6) * (1 - gir(t, A.son - 0.45, 0.35))} />
        ))}
        <Termometre t={t} />
        <Plan t={t} />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.07} />
        <rect width={1080} height={1920} fill="#fff" opacity={t > A.yari ? Math.exp(-(t - A.yari) * 9) * 0.55 : 0} />
        <rect width={1080} height={1920} fill="#000" opacity={sinir(karanlik, 0, 1)} />
      </svg>

      {/* kanca: dev yazı */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 200, textAlign: "center", fontFamily: BASLIK, color: "#fff", lineHeight: 0.95, opacity: 1 - gir(t, A.l1 - 0.25, 0.2), textShadow: '0 4px 0 rgba(0,0,0,.55), 0 0 40px rgba(0,0,0,.85)'}}>
        <div style={{fontSize: 118, letterSpacing: 2}}>
          {satir0.slice(0, 3).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 22, opacity: gir(t, k.s - 0.06, 0.18), transform: `translateY(${(1 - gir(t, k.s - 0.06, 0.18)) * 20}px)`}}>{k.w.toLocaleUpperCase('tr')}</span>)}
        </div>
        <div style={{fontSize: 210, color: '#ffb347', marginTop: 10}}>
          {satir0.slice(3).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 26, opacity: gir(t, k.s - 0.06, 0.18), transform: `scale(${karis(1.4, 1, gir(t, k.s - 0.06, 0.25))})`}}>{k.w.toLocaleUpperCase('tr')}</span>)}
        </div>
      </div>

      <Etiket t={t} t0={A.l1 + 0.1} t1={A.ogle - 0.4} top={250}>15 OCAK 1919 · BOSTON, ABD</Etiket>
      <Etiket t={t} t0={A.litre - 0.05} t1={A.ogle - 0.4} top={370} buyuk>8,7 MİLYON LİTRE</Etiket>
      <Etiket t={t} t0={A.metre - 0.05} t1={A.olu - 0.45} top={250} buyuk>≈ 8 METRE</Etiket>
      <Etiket t={t} t0={A.hiz - 0.05} t1={A.olu - 0.45} top={375}>SAATTE ≈ 56 KM</Etiket>
      <Etiket t={t} t0={A.olu - 0.05} t1={A.soguk - 0.4} top={260} renk="#c94a3a" buyuk>21 ÖLÜ</Etiket>
      <Etiket t={t} t0={A.yarali - 0.05} t1={A.soguk - 0.4} top={390} renk="#c94a3a">~150 YARALI</Etiket>
      <Etiket t={t} t0={A.koyu - 0.05} t1={A.son - 0.45} top={250} renk="#9fd3ff">SOĞUK = DAHA KOYU</Etiket>

      {/* kapanış kartı */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', color: '#fff', opacity: gir(t, A.bitis + 0.15, 0.5)}}>
        <div style={{fontFamily: BASLIK, fontSize: 150, lineHeight: 0.9, letterSpacing: 3}}>BÜYÜK<br />PEKMEZ SELİ</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 44, marginTop: 24, color: '#ffb347'}}>Boston · 15 Ocak 1919</div>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 27, marginTop: 300, opacity: 0.85, lineHeight: 1.5}}>
          Kaynaklar: Britannica · NPR · TIME · Mass. Eyalet Sekreterliği<br />APS 2016 akışkanlar çalışması · S. Puleo, <i>Dark Tide</i>
        </div>
        <div style={{fontFamily: BASLIK, fontSize: 46, letterSpacing: 10, marginTop: 40}}>BOZ CONCEPT HOME</div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

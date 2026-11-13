// "Su içmenin faydaları" — 55 sn dikey bilgilendirici animasyon.
// Ses: edge-tts (tr-TR-EmelNeural) + ses_tasarimi_suicmek.py müzik/efekt. Sahne anları kelime zamanlarından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import veri from '../../public/suicmek/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30, SURE = 55, NS = 10;
const METIN = "'Inter', sans-serif";
const C = {acik: '#e9f8fc', orta: '#bfe7f2', derin: '#0b3c5d', su: '#2b9fd8', su2: '#7fd3f0', kopuk: '#d8f3fc', gunes: '#ffb547', mercan: '#ff6b6b', yesil: '#2fbf71', ten: '#f2c9a5', pembe: '#f5a3b8'};

const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kis = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yumus = Easing.bezier(0.45, 0, 0.55, 1);
const gir = (t: number, t0: number, d = 0.5) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: yumus});
const zipla = (t: number, t0: number, d = 0.45) => interpolate(t, [t0, t0 + d], [0, 1], {...kis, easing: Easing.out(Easing.back(1.8))});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SAHNE = Array.from({length: NS}, (_, i) => (i === 0 ? 0 : an(i) - 0.35));
const sahneOp = (t: number, i: number) => {
  const a = SAHNE[i], b = i < NS - 1 ? SAHNE[i + 1] : SURE + 1;
  return (i === 0 ? 1 : gir(t, a - 0.2, 0.45)) * (1 - gir(t, b - 0.2, 0.45));
};

// ---- ortak parçalar ------------------------------------------------------------------
const dalga = (x0: number, x1: number, y: number, amp: number, faz: number, alt: number) => {
  let d = `M ${x0} ${alt} L ${x0} ${y}`;
  for (let x = x0; x <= x1; x += 20) d += ` L ${x} ${y + Math.sin(x / 60 + faz) * amp + Math.sin(x / 23 + faz * 1.7) * amp * 0.35}`;
  return d + ` L ${x1} ${alt} Z`;
};
const Damla: React.FC<{x: number; y: number; s?: number; renk?: string; op?: number}> = ({x, y, s = 1, renk = C.su, op = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={op}>
    <path d="M 0 -60 C 18 -32 36 -12 36 12 C 36 34 20 48 0 48 C -20 48 -36 34 -36 12 C -36 -12 -18 -32 0 -60 Z" fill={renk} />
    <path d="M -16 6 C -16 -6 -10 -16 -4 -24" stroke="#fff" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.7} />
  </g>
);
const Kabarciklar: React.FC<{x0: number; x1: number; ust: number; alt: number; t: number; n?: number; op?: number}> = ({x0, x1, ust, alt, t, n = 14, op = 1}) => (
  <g opacity={op}>
    {Array.from({length: n}, (_, i) => {
      const u = (t * (0.25 + rnd(i) * 0.3) + rnd(i + 3)) % 1;
      const y = karis(alt, ust, u);
      if (y < ust + 8) return null;
      return <circle key={i} cx={karis(x0, x1, rnd(i + 7)) + Math.sin(t * 3 + i) * 6} cy={y} r={4 + rnd(i + 1) * 7} fill="none" stroke="#fff" strokeWidth={3} opacity={0.75 * (1 - u * 0.6)} />;
    })}
  </g>
);
const Tik: React.FC<{x: number; y: number; s?: number; u: number; renk?: string}> = ({x, y, s = 1, u, renk = C.yesil}) => (
  <g transform={`translate(${x},${y}) scale(${s * Math.max(0.001, u)})`} opacity={Math.min(1, u)}>
    <circle r={44} fill={renk} />
    <path d="M -20 0 L -6 15 L 22 -16" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </g>
);
const Kart: React.FC<{x: number; y: number; w: number; h: number; op?: number; dy?: number; children?: React.ReactNode}> = ({x, y, w, h, op = 1, dy = 0, children}) => (
  <g opacity={op} transform={`translate(0,${dy})`}>
    <rect x={x + 6} y={y + 10} width={w} height={h} rx={40} fill={C.derin} opacity={0.12} />
    <rect x={x} y={y} width={w} height={h} rx={40} fill="#fff" />
    {children}
  </g>
);
const Etiket: React.FC<{x: number; y: number; yazi: string; boy?: number; renk?: string; op?: number; anchor?: 'start' | 'middle' | 'end'; kalin?: number}> = ({x, y, yazi, boy = 46, renk = C.derin, op = 1, anchor = 'middle', kalin = 800}) => (
  <text x={x} y={y} fontFamily={METIN} fontWeight={kalin} fontSize={boy} fill={renk} textAnchor={anchor} opacity={op}>{yazi}</text>
);

// ---- sahneler --------------------------------------------------------------------------
// 0: vücut suyla doluyor
const Insan: React.FC = () => (
  <>
    <circle cx={540} cy={520} r={92} />
    <rect x={512} y={590} width={56} height={60} />
    <rect x={398} y={632} width={284} height={430} rx={72} />
    <rect x={326} y={652} width={66} height={380} rx={33} />
    <rect x={688} y={652} width={66} height={380} rx={33} />
    <rect x={418} y={1000} width={106} height={420} rx={48} />
    <rect x={556} y={1000} width={106} height={420} rx={48} />
  </>
);
const S0: React.FC<{t: number}> = ({t}) => {
  const dol = gir(t, an(0, 0), an(0, 3) - an(0, 0) + 0.4);
  const y = karis(1430, 826, dol);
  const yuzde = Math.round(60 * dol);
  return (
    <g>
      <defs><clipPath id="insanKes"><Insan /></clipPath></defs>
      <g fill="#ffffff" opacity={0.9}><Insan /></g>
      <g clipPath="url(#insanKes)">
        <path d={dalga(300, 780, y + 14, 12, t * 2.2 + 1, 1440)} fill={C.su2} />
        <path d={dalga(300, 780, y, 14, t * 2.6, 1440)} fill={C.su} />
        <Kabarciklar x0={420} x1={660} ust={y + 30} alt={1420} t={t} n={18} op={dol} />
      </g>
      <g opacity={gir(t, an(0, 2), 0.4)}>
        <path d={`M 768 ${y} L 800 ${y}`} stroke={C.derin} strokeWidth={5} strokeDasharray="12 10" />
        <Etiket x={812} y={y + 30} yazi={`%${yuzde}`} boy={92} anchor="start" />
        <Etiket x={816} y={y + 76} yazi="su" boy={42} anchor="start" kalin={600} />
      </g>
    </g>
  );
};

// 1: ısı dengesi — termometre, güneş, ter damlaları
const S1: React.FC<{t: number}> = ({t}) => {
  const serin = gir(t, an(1, 4), 1.4);
  const civa = karis(620, 900, serin);
  const renk = serin < 0.5 ? C.mercan : C.su;
  return (
    <g>
      <g transform={`translate(250,560) rotate(${t * 20})`}>
        {Array.from({length: 12}, (_, i) => <rect key={i} x={-8} y={-150} width={16} height={46} rx={8} fill={C.gunes} transform={`rotate(${i * 30})`} />)}
        <circle r={86} fill={C.gunes} />
      </g>
      <rect x={470} y={540} width={140} height={720} rx={70} fill="#fff" />
      <circle cx={540} cy={1290} r={110} fill="#fff" />
      <rect x={510} y={civa} width={60} height={1290 - civa} rx={30} fill={renk} style={{transition: 'none'}} />
      <circle cx={540} cy={1290} r={80} fill={renk} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={620} y={640 + i * 130} width={44} height={8} rx={4} fill={C.derin} opacity={0.35} />)}
      <Etiket x={690} y={civa + 18} yazi={serin > 0.6 ? '36,5°C' : '39°C'} boy={56} anchor="start" />
      {Array.from({length: 8}, (_, i) => {
        const u = ((t - an(1, 4)) * 0.7 + rnd(i)) % 1;
        if (t < an(1, 4)) return null;
        return <Damla key={i} x={i % 2 ? 300 + rnd(i + 2) * 80 : 200 + rnd(i + 4) * 60} y={karis(760, 1360, u)} s={0.55 + rnd(i) * 0.3} op={(1 - u) * serin} renk={C.su2} />;
      })}
    </g>
  );
};

// 2: böbrekler — su akışı, taşlar dağılıyor
const BOBREK = 'M 0 -170 C 120 -170 150 -40 128 50 C 104 150 40 190 -14 168 C -70 146 -46 70 -58 24 C -70 -20 -120 -10 -120 -70 C -120 -136 -64 -170 0 -170 Z';
const S2: React.FC<{t: number}> = ({t}) => {
  const akis = gir(t, an(2, 2), 0.6);
  const tas = 1 - gir(t, an(2, 8), 1.2);
  const mesane = gir(t, an(2, 2), 3.5);
  const ureter = (dir: number) => `M ${540 + dir * 130} 820 C ${540 + dir * 110} 980 ${540 + dir * 70} 1080 ${540 + dir * 40} 1180`;
  return (
    <g>
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <path d={ureter(dir)} stroke="#f0d3c6" strokeWidth={26} fill="none" strokeLinecap="round" />
          <path d={ureter(dir)} stroke={C.su} strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray="26 34" strokeDashoffset={-t * 160} opacity={akis} />
          <g transform={`translate(${540 + dir * 230},760) scale(${dir * -1},1)`}>
            <path d={BOBREK} fill="#e0766f" />
            <path d={BOBREK} fill="none" stroke="#b9524c" strokeWidth={8} />
            <path d="M -70 -60 Q -20 -20 -60 40" stroke="#f3a19a" strokeWidth={16} fill="none" strokeLinecap="round" />
            {[0, 1, 2].map((i) => <polygon key={i} points="0,-14 13,-4 8,12 -9,12 -13,-4" fill="#d8d1c3" stroke="#9c9486" strokeWidth={3} transform={`translate(${30 + i * 26},${-30 + i * 44}) scale(${tas})`} opacity={tas} />)}
          </g>
        </g>
      ))}
      <ellipse cx={540} cy={1270} rx={140} ry={110} fill="#f0d3c6" />
      <clipPath id="mesaneKes"><ellipse cx={540} cy={1270} rx={124} ry={94} /></clipPath>
      <g clipPath="url(#mesaneKes)"><path d={dalga(400, 680, karis(1370, 1210, mesane), 6, t * 3, 1380)} fill={C.su} /></g>
      <Etiket x={540} y={540} yazi="Atıklar suyla atılır" boy={44} op={gir(t, an(2, 1), 0.4)} />
    </g>
  );
};

// 3: beyin — dikkat ve ruh hali çubukları düşüyor
const S3: React.FC<{t: number}> = ({t}) => {
  const kayip = gir(t, an(3, 4), 1.0);
  const etki = gir(t, an(3, 6), 1.2);
  const cubuk = (y: number, ad: string, deger: number, op: number) => (
    <g opacity={op}>
      <Etiket x={170} y={y - 20} yazi={ad} boy={40} anchor="start" />
      <rect x={170} y={y} width={740} height={48} rx={24} fill="#fff" />
      <rect x={170} y={y} width={740 * deger} height={48} rx={24} fill={deger < 0.75 ? C.gunes : C.yesil} />
    </g>
  );
  const sallan = Math.sin(t * 2) * 3;
  return (
    <g>
      <g transform={`translate(540,720) rotate(${sallan})`}>
        {[[-110, -40, 110], [0, -90, 120], [110, -40, 110], [-70, 60, 110], [70, 60, 110]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={C.pembe} />)}
        <path d="M -150 -40 Q -110 -100 -60 -70 M -40 -150 Q 0 -110 40 -150 M 70 -70 Q 120 -110 160 -50 M -120 70 Q -70 30 -30 90 M 30 80 Q 80 30 130 80 M 0 -60 L 0 140" stroke="#d97b95" strokeWidth={10} fill="none" strokeLinecap="round" />
      </g>
      <g opacity={gir(t, an(3, 2), 0.4)} transform={`translate(860,520) scale(${zipla(t, an(3, 2))})`}>
        <Damla x={0} y={0} s={1.3} />
        <Etiket x={0} y={150} yazi="−%1–2" boy={64} renk={C.mercan} />
      </g>
      {cubuk(1110, 'Dikkat', karis(1, 0.66, etki), gir(t, an(3, 5) - 0.4, 0.4))}
      {cubuk(1270, 'Ruh hali', karis(1, 0.7, gir(t, an(3, 9), 1.0)), gir(t, an(3, 8) - 0.4, 0.4))}
      <rect x={0} y={0} width={1080} height={1920} fill={C.gunes} opacity={0.05 * kayip} />
    </g>
  );
};

// 4: baş ağrısı / yorgunluk — şimşekler, boş pil, "SUSUZLUK"
const S4: React.FC<{t: number}> = ({t}) => {
  const damga = zipla(t, an(4, 6) - 0.05, 0.4);
  const pil = karis(0.8, 0.18, gir(t, an(4, 3), 0.8));
  return (
    <g>
      <circle cx={540} cy={800} r={210} fill={C.ten} />
      <path d="M 330 760 Q 340 560 540 560 Q 740 560 750 760 Q 700 640 540 640 Q 380 640 330 760 Z" fill="#5a3b28" />
      <path d="M 450 800 L 500 815 M 580 815 L 630 800" stroke="#3a2a20" strokeWidth={9} strokeLinecap="round" />
      <path d="M 480 900 Q 540 870 600 900" stroke="#3a2a20" strokeWidth={9} fill="none" strokeLinecap="round" />
      {[[300, 620, -20], [780, 600, 20], [250, 860, -10], [830, 860, 10]].map(([x, y, r], i) => {
        const f = 0.4 + 0.6 * Math.abs(Math.sin(t * 7 + i * 1.7));
        return <path key={i} d="M 0 -60 L -22 6 L 4 6 L -14 64 L 30 -14 L 4 -14 L 20 -60 Z" fill={C.gunes} transform={`translate(${x},${y}) rotate(${r}) scale(1.3)`} opacity={f * (1 - 0.5 * damga)} />;
      })}
      <g opacity={gir(t, an(4, 3) - 0.3, 0.4)} transform="translate(420,1120)">
        <rect width={220} height={110} rx={20} fill="none" stroke={C.derin} strokeWidth={10} />
        <rect x={222} y={32} width={20} height={46} rx={6} fill={C.derin} />
        <rect x={14} y={14} width={192 * pil} height={82} rx={10} fill={pil < 0.3 ? C.mercan : C.yesil} />
      </g>
      <g transform={`translate(540,1360) rotate(-6) scale(${karis(1.8, 1, Math.min(1, damga))})`} opacity={Math.min(1, damga)}>
        <rect x={-260} y={-62} width={520} height={110} rx={18} fill="#fff" stroke={C.mercan} strokeWidth={9} />
        <Etiket x={0} y={22} yazi="SUSUZLUK?" boy={72} renk={C.mercan} />
      </g>
    </g>
  );
};

// 5: sindirim — mide + bağırsak boyunca akış
const BAGIRSAK = 'M 600 860 C 760 880 780 960 640 980 C 460 1000 330 1000 340 1070 C 350 1140 740 1110 740 1180 C 740 1250 380 1220 380 1290 C 380 1360 560 1360 560 1420';
const S5: React.FC<{t: number}> = ({t}) => {
  const akis = gir(t, an(5, 1), 0.6);
  return (
    <g>
      <path d="M 470 560 C 470 640 380 650 390 760 C 400 870 560 900 620 860 C 680 820 690 720 620 700 C 560 684 560 640 560 560 Z" fill="#f4a59a" stroke="#d8776c" strokeWidth={10} />
      <path d={BAGIRSAK} stroke="#f4b9a6" strokeWidth={70} fill="none" strokeLinecap="round" />
      <path d={BAGIRSAK} stroke="#e39a86" strokeWidth={70} fill="none" strokeLinecap="round" opacity={0.35} strokeDasharray="4 30" />
      <path d={BAGIRSAK} stroke={C.su} strokeWidth={22} fill="none" strokeLinecap="round" strokeDasharray="40 50" strokeDashoffset={-t * 220} opacity={akis} />
      <g opacity={gir(t, an(5, 0), 0.4)}>
        <Damla x={515} y={480} s={0.7 + 0.08 * Math.sin(t * 5)} />
      </g>
      <Tik x={870} y={1280} s={1.4} u={zipla(t, an(5, 4))} />
    </g>
  );
};

// 6: eklemler, gözler, cilt — üç kart
const S6: React.FC<{t: number}> = ({t}) => {
  const k = [an(6, 0), an(6, 2), an(6, 4)].map((x) => zipla(t, x - 0.15, 0.5));
  const satir = (i: number, y: number, ad: string, alt: string, simge: React.ReactNode) => (
    <Kart x={110} y={y} w={860} h={250} op={Math.min(1, k[i])} dy={(1 - Math.min(1, k[i])) * 60}>
      <g transform={`translate(260,${y + 125})`}>{simge}</g>
      <Etiket x={430} y={y + 118} yazi={ad} boy={64} anchor="start" />
      <Etiket x={430} y={y + 178} yazi={alt} boy={36} anchor="start" kalin={600} renk="#3d6f8c" />
    </Kart>
  );
  const kirp = Math.abs(Math.sin(t * 1.3)) > 0.97 ? 0.1 : 1;
  return (
    <g>
      {satir(0, 520, 'Eklemler', 'Kayganlık ve rahat hareket', (
        <g>
          <rect x={-22} y={-110} width={44} height={86} rx={20} fill="#efe6d6" stroke="#bfb3a0" strokeWidth={5} />
          <rect x={-22} y={24} width={44} height={86} rx={20} fill="#efe6d6" stroke="#bfb3a0" strokeWidth={5} />
          <ellipse cx={0} cy={0} rx={50} ry={20 + 3 * Math.sin(t * 4)} fill={C.su2} />
        </g>
      ))}
      {satir(1, 820, 'Gözler', 'Nemli ve rahat bakış', (
        <g>
          <path d="M -90 0 Q 0 -70 90 0 Q 0 70 -90 0 Z" fill="#fff" stroke={C.derin} strokeWidth={7} transform={`scale(1,${kirp})`} />
          <circle r={30} fill={C.su} transform={`scale(1,${kirp})`} />
          <circle cx={10} cy={-10} r={9} fill="#fff" opacity={kirp} />
          <Damla x={70} y={60} s={0.4} />
        </g>
      ))}
      {satir(2, 1120, 'Cilt', 'Esnek ve nemli kalır', (
        <g>
          <circle r={80} fill={C.ten} />
          {[0, 1, 2, 3].map((j) => { const a = t * 1.2 + j * 1.57; return <circle key={j} cx={Math.cos(a) * 100} cy={Math.sin(a) * 100} r={9} fill={C.su2} />; })}
          <path d="M -30 10 Q 0 36 30 10" stroke="#a46d4f" strokeWidth={7} fill="none" strokeLinecap="round" />
          <circle cx={-26} cy={-18} r={7} fill="#a46d4f" /><circle cx={26} cy={-18} r={7} fill="#a46d4f" />
        </g>
      ))}
    </g>
  );
};

// 7: ne kadar? — iki şişe
const Sise: React.FC<{x: number; t: number; oran: number; dol: number; ad: string; litre: string; bardak: string}> = ({x, t, oran, dol, ad, litre, bardak}) => {
  const ust = 640, alt = 1270, seviye = karis(alt, karis(alt, ust + 40, oran), dol);
  const id = `sise${x}`;
  return (
    <g>
      <rect x={x - 40} y={540} width={80} height={46} rx={10} fill={C.derin} />
      <path d={`M ${x - 50} 586 L ${x + 50} 586 L ${x + 50} 610 Q ${x + 140} 630 ${x + 140} 700 L ${x + 140} ${alt - 30} Q ${x + 140} ${alt} ${x + 110} ${alt} L ${x - 110} ${alt} Q ${x - 140} ${alt} ${x - 140} ${alt - 30} L ${x - 140} 700 Q ${x - 140} 630 ${x - 50} 610 Z`} fill="#ffffff" opacity={0.85} id={id} />
      <clipPath id={`${id}k`}><rect x={x - 132} y={600} width={264} height={alt - 608} rx={26} /></clipPath>
      <g clipPath={`url(#${id}k)`}>
        <path d={dalga(x - 140, x + 140, seviye, 8, t * 3 + x, alt)} fill={C.su} />
        <Kabarciklar x0={x - 100} x1={x + 100} ust={seviye + 20} alt={alt} t={t} n={10} op={dol} />
      </g>
      {[0.25, 0.5, 0.75].map((u) => <rect key={u} x={x + 90} y={karis(alt, ust + 40, u)} width={36} height={6} rx={3} fill={C.derin} opacity={0.3} />)}
      <Etiket x={x} y={480} yazi={ad} boy={54} />
      <Etiket x={x} y={1370} yazi={litre} boy={78} op={dol} />
      <Etiket x={x} y={1420} yazi={bardak} boy={32} kalin={600} renk="#3d6f8c" op={dol} />
    </g>
  );
};
const S7: React.FC<{t: number}> = ({t}) => (
  <g>
    <Sise x={300} t={t} oran={0.8} dol={gir(t, an(7, 3), 1.6)} ad="Kadın" litre="≈ 2 L" bardak="günde, toplam" />
    <Sise x={780} t={t} oran={1} dol={gir(t, an(7, 8), 1.6)} ad="Erkek" litre="≈ 2,5 L" bardak="günde, toplam" />
  </g>
);

// 8: ipucu — saat + idrar rengi ölçeği
const S8: React.FC<{t: number}> = ({t}) => {
  const renkler = ['#fbf7d9', '#f7eca0', '#f1d65c', '#dfaf2f', '#c3861a'];
  const olcek = gir(t, an(8, 3) - 0.2, 0.5);
  const tik = zipla(t, an(8, 4), 0.5);
  return (
    <g>
      <g transform="translate(540,690)" opacity={gir(t, an(8, 0), 0.4)}>
        <circle r={150} fill="#fff" />
        <circle r={150} fill="none" stroke={C.derin} strokeWidth={12} />
        {Array.from({length: 12}, (_, i) => <rect key={i} x={-4} y={-136} width={8} height={20} rx={4} fill={C.derin} transform={`rotate(${i * 30})`} />)}
        <rect x={-6} y={-90} width={12} height={96} rx={6} fill={C.derin} transform={`rotate(${t * 40})`} />
        <rect x={-5} y={-120} width={10} height={126} rx={5} fill={C.su} transform={`rotate(${t * 240})`} />
        <circle r={14} fill={C.derin} />
        <Damla x={150} y={-110} s={0.7} />
      </g>
      <g opacity={olcek} transform={`translate(0,${(1 - olcek) * 40})`}>
        {renkler.map((r, i) => (
          <g key={i}>
            <rect x={110 + i * 176} y={1060} width={156} height={220} rx={30} fill={r} stroke="#fff" strokeWidth={8} />
          </g>
        ))}
        <Tik x={188} y={1000} u={tik} />
        <Tik x={364} y={1000} u={zipla(t, an(8, 4) + 0.2, 0.5)} />
        <Etiket x={276} y={1350} yazi="İyi" boy={44} renk={C.yesil} op={Math.min(1, tik)} />
        <Etiket x={804} y={1350} yazi="Su iç!" boy={44} renk={C.mercan} op={gir(t, an(8, 5), 0.4)} />
      </g>
    </g>
  );
};

// 9: bardak doluyor
const S9: React.FC<{t: number}> = ({t}) => {
  const dok = gir(t, an(9, 1) - 0.2, 2.6);
  const akiyor = t > an(9, 1) - 0.3 && t < an(9, 1) + 2.6;
  const seviye = karis(1290, 820, dok);
  return (
    <g>
      <defs><clipPath id="bardakKes"><path d="M 360 700 L 720 700 L 680 1300 L 400 1300 Z" /></clipPath></defs>
      {akiyor && <rect x={528} y={380} width={24} height={seviye - 380} rx={12} fill={C.su} opacity={0.95} />}
      <path d="M 350 690 L 730 690 L 688 1310 L 392 1310 Z" fill="#ffffff" opacity={0.7} />
      <g clipPath="url(#bardakKes)">
        <path d={dalga(340, 740, seviye, akiyor ? 12 : 6, t * 4, 1310)} fill={C.su} />
        <path d={dalga(340, 740, seviye + 14, 6, t * 3 + 2, 1310)} fill={C.su2} opacity={0.35} />
        <Kabarciklar x0={410} x1={670} ust={seviye + 20} alt={1290} t={t} n={20} op={dok} />
      </g>
      <path d="M 350 690 L 730 690 L 688 1310 L 392 1310 Z" fill="none" stroke="#fff" strokeWidth={12} strokeLinejoin="round" />
      <path d="M 390 740 L 420 1240" stroke="#fff" strokeWidth={14} strokeLinecap="round" opacity={0.6} />
    </g>
  );
};
const SAHNELER = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9];
const BASLIK: [string, string][] = [
  ['', ''], ['FAYDA 1', 'Isı dengesi'], ['FAYDA 2', 'Böbrek sağlığı'], ['FAYDA 3', 'Odak ve ruh hali'], ['FAYDA 4', 'Enerji'],
  ['FAYDA 5', 'Sindirim'], ['FAYDA 6', 'Eklem · göz · cilt'], ['NE KADAR?', 'Günlük su ihtiyacı'], ['İPUCU', 'Susamayı bekleme'], ['', ''],
];

// ---- yazılar ---------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1560, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(11,60,93,.88)', borderRadius: 26, padding: '18px 32px 20px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 50, lineHeight: 1.24, letterSpacing: -0.4}}>
        {satir.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 14, opacity: Math.max(0.001, u), transform: `translateY(${(1 - u) * 8}px)`, color: k === aktif ? C.su2 : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 52px 'Inter'", 'ğüşıöçİ'), document.fonts.load("600 30px 'Inter'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);
  const kapanis = gir(t, an(9, 6) - 0.1, 0.6);
  const kanca = 1 - gir(t, SAHNE[1] - 0.25, 0.4);
  return (
    <AbsoluteFill style={{background: C.acik}}>
      <Audio src={staticFile('suicmek/mix.wav')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="arka" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.acik} /><stop offset="100%" stopColor={C.orta} /></linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#arka)" />
        {/* arka planda yavaş yükselen kabarcıklar */}
        {Array.from({length: 16}, (_, i) => {
          const u = (t * (0.03 + rnd(i) * 0.03) + rnd(i + 11)) % 1;
          return <circle key={i} cx={rnd(i + 5) * 1080} cy={karis(1980, -60, u)} r={10 + rnd(i + 2) * 34} fill="#fff" opacity={0.35} />;
        })}
        <path d={dalga(0, 1080, 1780 + Math.sin(t) * 8, 14, t * 1.4, 1920)} fill={C.su2} opacity={0.5} />
        <path d={dalga(0, 1080, 1810, 12, t * 1.9 + 2, 1920)} fill={C.su} opacity={0.6} />
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
      <div style={{position: 'absolute', left: 50, right: 50, top: 150, textAlign: 'center', opacity: kanca}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 40, letterSpacing: 8, color: C.su}}>SU İÇMENİN FAYDALARI</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 76, lineHeight: 1.08, color: C.derin, marginTop: 14, letterSpacing: -1.5}}>
          {K.filter((k) => k.c === 0).slice(0, 4).map((k, i) => <span key={i} style={{display: 'inline-block', marginRight: 18, opacity: gir(t, k.s - 0.06, 0.2)}}>{k.w.replace('.', '')}</span>)}
        </div>
      </div>
      {/* sahne başlıkları */}
      {BASLIK.map(([ust, alt], i) => {
        if (!ust) return null;
        const op = sahneOp(t, i), u = gir(t, SAHNE[i], 0.45);
        if (op <= 0.001) return null;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', opacity: op, transform: `translateY(${(1 - u) * 30}px)`}}>
            <div style={{display: 'inline-block', background: C.su, color: '#fff', fontFamily: METIN, fontWeight: 800, fontSize: 34, letterSpacing: 6, padding: '10px 28px', borderRadius: 40}}>{ust}</div>
            <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 84, color: C.derin, marginTop: 18, letterSpacing: -2}}>{alt}</div>
          </div>
        );
      })}
      {/* 7. sahne notu */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1480, textAlign: 'center', opacity: gir(t, an(7, 13) - 0.1, 0.4) * sahneOp(t, 7), fontFamily: METIN, fontWeight: 600, fontSize: 34, color: C.derin}}>
        Yaklaşık %20–30'u yiyeceklerden gelir
      </div>
      {/* kapanış */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', opacity: gir(t, an(9, 0) - 0.2, 0.5)}}>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 40, letterSpacing: 8, color: C.su}}>BİR BARDAK SU AL</div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 110, color: C.derin, marginTop: 10, letterSpacing: -3, opacity: kapanis, transform: `scale(${karis(0.9, 1, kapanis)})`}}>Sağlığına iç.</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center', opacity: kapanis}}>
        <div style={{fontFamily: METIN, fontWeight: 600, fontSize: 24, color: C.derin, opacity: 0.75, lineHeight: 1.5}}>
          Kaynaklar: EFSA, Dietary Reference Values for Water (2010) · Popkin ve ark.,<br />Nutrition Reviews (2010) · NHS · Harvard T.H. Chan School of Public Health
        </div>
        <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 34, letterSpacing: 10, color: C.derin, marginTop: 16}}>BOZ CONCEPT HOME</div>
      </div>
      {t < an(9, 6) - 0.2 && <Altyazi t={t} />}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={1080} height={1920} />;

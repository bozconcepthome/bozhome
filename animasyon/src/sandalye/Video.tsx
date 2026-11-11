// "Sandalye bir zamanlar tahttı" — 30 sn dikey animasyon. Görüntünün tamamı SVG, her an kelime zamanından gelir.
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/patrick-hand/latin.css';
import '@fontsource/patrick-hand/latin-ext.css';
import veri from '../../public/sandalye/kelimeler.json';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const FL = 1200; // zemin çizgisi (dünya y)
const CX = 540; // sandalyenin dünya x'i
const YAZI = "'Patrick Hand', 'Inter', sans-serif";

const MUREKKEP = '#2e2a25';
const KIRMIZI = '#c2452d';
const ALTIN = '#dba63c';
const TEN = '#f6e7cf';

// Sahne anı kelimeden gelir: an(1, 3) ikinci satırın dördüncü kelimesi.
const an = (satir: number, kelime = 0) => K.filter((k) => k.c === satir)[kelime].s;
const gir = (t: number, t0: number, sure = 0.8) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1)});
const karis = (a: number, b: number, u: number) => a + (b - a) * u;
const zipla = (t: number, t0: number, sure = 0.45) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))});
const dus = (t: number, t0: number, sure = 0.55) =>
  interpolate(t, [t0, t0 + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bounce});

// ---- kelime anları -------------------------------------------------------
const A = {
  bir: an(0, 5), oturamaz: an(0, 8),
  misir: an(1, 0), firavun: an(1, 3), soylu: an(1, 5), ayricalik: an(1, 6),
  halk: an(2, 0), yerde: an(2, 2), tabure: an(2, 5),
  orta: an(3, 0), tek: an(3, 5), oda: an(3, 8), reis: an(3, 11),
  herkese: an(4, 0), sandalye4: an(4, 2), yuzyil: an(4, 5),
  yani: an(5, 0), oturdugun: an(5, 2), birZaman: an(5, 4), taht: an(5, 6),
};

// ---- karakter --------------------------------------------------------------
type KisiP = {
  x: number; dir?: number; s?: number; hipH?: number; footF?: number; yuru?: number; faz?: number; egim?: number;
  onKol?: [number, number]; arkaKol?: [number, number]; yuz?: 'gul' | 'o' | 'duz'; sapka?: 'nemes' | 'peruk' | 'kukuleta' | 'bere' | null;
  renk?: string; sakal?: boolean; tac?: number; op?: number;
};
const Kisi: React.FC<KisiP> = ({x, dir = 1, s = 1, hipH = 190, footF = 0, yuru = 0, faz = 0, egim = 0, onKol = [8, 4], arkaKol = [-8, -4], yuz = 'gul', sapka = null, renk = '#4f8a8b', sakal = false, tac = -1, op = 1}) => {
  if (op <= 0.001) return null;
  const B = 97;
  const hip = {x: 0, y: -hipH};
  const ayak = (isaret: number) => ({
    x: footF * dir + isaret * 16 + Math.sin(faz) * 40 * yuru * isaret,
    y: -Math.max(0, Math.cos(faz) * isaret) * 24 * yuru,
  });
  const diz = (f: {x: number; y: number}) => {
    let vx = f.x - hip.x, vy = f.y - hip.y;
    let d = Math.hypot(vx, vy);
    const dm = Math.min(d, B * 2 - 0.5);
    const h = Math.sqrt(B * B - (dm / 2) ** 2);
    vx /= d; vy /= d;
    const m = {x: hip.x + vx * dm / 2, y: hip.y + vy * dm / 2};
    const p1 = {x: m.x - vy * h, y: m.y + vx * h}, p2 = {x: m.x + vy * h, y: m.y - vx * h};
    const sec = p1.x * dir > p2.x * dir + 0.01 ? p1 : p2.x * dir > p1.x * dir + 0.01 ? p2 : p1.y < p2.y ? p1 : p2;
    const son = {x: hip.x + vx * dm, y: hip.y + vy * dm};
    return {k: sec, f: son};
  };
  const r = (egim * Math.PI) / 180;
  const u = {x: Math.sin(r) * dir, y: -Math.cos(r)};
  const boyun = {x: hip.x + u.x * 150, y: hip.y + u.y * 150};
  const kafa = {x: boyun.x + u.x * 48, y: boyun.y + u.y * 48};
  const omuz = {x: hip.x + u.x * 132, y: hip.y + u.y * 132};
  const kol = ([a1, a2]: [number, number]) => {
    const v = (a: number, L: number) => ({x: Math.sin((a * Math.PI) / 180) * dir * L, y: Math.cos((a * Math.PI) / 180) * L});
    const d1 = v(a1, 80), d2 = v(a2, 76);
    const e = {x: omuz.x + d1.x, y: omuz.y + d1.y};
    return {e, h: {x: e.x + d2.x, y: e.y + d2.y}};
  };
  const bacak = (isaret: number) => {
    const {k, f} = diz(ayak(isaret));
    return <path d={`M ${hip.x} ${hip.y} L ${k.x} ${k.y} L ${f.x} ${f.y} l ${dir * 20} 0`} />;
  };
  const kolCiz = (a: [number, number]) => {
    const {e, h} = kol(a);
    return (
      <>
        <path d={`M ${omuz.x} ${omuz.y} L ${e.x} ${e.y} L ${h.x} ${h.y}`} />
        <circle cx={h.x} cy={h.y} r={9} fill={TEN} strokeWidth={5} />
      </>
    );
  };
  const R = 46;
  return (
    <g transform={`translate(${x},${FL}) scale(${s})`} opacity={op} fill="none" stroke={MUREKKEP} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round">
      {kolCiz(arkaKol)}
      {bacak(-1)}
      <path d={`M ${hip.x} ${hip.y} L ${boyun.x} ${boyun.y}`} stroke={MUREKKEP} strokeWidth={50} />
      <path d={`M ${hip.x} ${hip.y} L ${boyun.x} ${boyun.y}`} stroke={renk} strokeWidth={40} />
      {bacak(1)}
      <g transform={`translate(${kafa.x},${kafa.y})`}>
        {sapka === 'nemes' && (
          <g strokeWidth={6}>
            <path d={`M -44 -36 L 44 -36 L 66 70 L -66 70 Z`} fill="#2f5f9e" />
            {[-12, 14, 40].map((y) => <path key={y} d={`M ${-49 - (y + 36) * 0.2} ${y} L ${49 + (y + 36) * 0.2} ${y}`} stroke={ALTIN} strokeWidth={9} />)}
          </g>
        )}
        {sapka === 'peruk' && <rect x={-56} y={-50} width={112} height={112} rx={26} fill="#2b2622" strokeWidth={5} />}
        <circle r={R} fill={TEN} strokeWidth={7} />
        {sapka === 'nemes' && <path d={`M -44 -22 Q 0 -62 44 -22`} stroke={ALTIN} strokeWidth={14} />}
        {sapka === 'peruk' && <path d={`M -45 -16 Q 0 -70 45 -16`} stroke="#2b2622" strokeWidth={18} />}
        {sapka === 'peruk' && <path d={`M -43 -8 Q 0 -44 43 -8`} stroke={ALTIN} strokeWidth={7} />}
        {sapka === 'kukuleta' && <path d={`M -47 -6 Q -50 -58 0 -58 Q 50 -58 47 -6 Q 0 -34 -47 -6 Z`} fill="#8a6a43" strokeWidth={6} />}
        {sapka === 'bere' && <path d={`M -52 -24 Q -40 -78 10 -70 Q 62 -62 50 -22 Q 0 -44 -52 -24 Z`} fill="#8e2f2a" strokeWidth={6} />}
        {sakal && <path d={`M ${dir * 8 - 30} 18 Q ${dir * 12} 86 ${dir * 8 + 34} 16 Q ${dir * 10} 34 ${dir * 8 - 30} 18 Z`} fill="#cfc6b6" strokeWidth={5} />}
        <circle cx={dir * 6 - 13} cy={-6} r={5.5} fill={MUREKKEP} stroke="none" />
        <circle cx={dir * 6 + 13} cy={-6} r={5.5} fill={MUREKKEP} stroke="none" />
        {yuz === 'gul' && <path d={`M ${dir * 8 - 13} 14 Q ${dir * 8} 28 ${dir * 8 + 13} 14`} strokeWidth={5} />}
        {yuz === 'duz' && <path d={`M ${dir * 8 - 11} 18 L ${dir * 8 + 11} 18`} strokeWidth={5} />}
        {yuz === 'o' && <ellipse cx={dir * 8} cy={20} rx={8} ry={10} fill={MUREKKEP} stroke="none" />}
        {tac >= 0 && (
          <g transform={`translate(0,${karis(-520, -40, tac)}) rotate(${karis(-18, 0, tac)})`} strokeWidth={6}>
            <path d="M -42 0 L -48 -52 L -22 -26 L 0 -62 L 22 -26 L 48 -52 L 42 0 Z" fill={ALTIN} />
            <circle cx={0} cy={-18} r={6} fill={KIRMIZI} strokeWidth={3} />
          </g>
        )}
      </g>
      {kolCiz(onKol)}
    </g>
  );
};

// ---- sandalyeler (zemin noktasında, oturak üstü y=-112, yüz sağa dönük) ------
const Modern: React.FC<{x?: number; y?: number; op?: number; s?: number}> = ({x = CX, y = 0, op = 1, s = 1}) =>
  op <= 0.001 ? null : (
    <g transform={`translate(${x},${FL + y}) scale(${s})`} opacity={op} stroke={MUREKKEP} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M -50 -108 L -64 -340" stroke={MUREKKEP} strokeWidth={24} />
      <path d="M -50 -108 L -64 -340" stroke="#b9824a" strokeWidth={12} />
      <rect x={-84} y={-350} width={40} height={74} rx={12} fill="#c4905a" />
      <path d="M -48 -100 L -56 0 M 50 -100 L 58 0" stroke={MUREKKEP} strokeWidth={22} />
      <path d="M -48 -100 L -56 0 M 50 -100 L 58 0" stroke="#b9824a" strokeWidth={10} />
      <rect x={-64} y={-116} width={128} height={22} rx={9} fill="#c4905a" />
    </g>
  );
const Taht: React.FC<{op?: number}> = ({op = 1}) =>
  op <= 0.001 ? null : (
    <g transform={`translate(${CX},${FL})`} opacity={op} stroke={MUREKKEP} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M -92 -112 L -92 -410 Q -70 -452 -48 -410 L -40 -112 Z" fill={ALTIN} />
      {[-380, -330, -280, -230, -180].map((y) => <path key={y} d={`M -90 ${y} L -44 ${y}`} stroke="#2f5f9e" strokeWidth={14} />)}
      <path d="M -52 -98 L -52 -14 M 54 -98 L 54 -14" stroke={MUREKKEP} strokeWidth={26} />
      <path d="M -52 -98 L -52 -14 M 54 -98 L 54 -14" stroke={ALTIN} strokeWidth={13} />
      <path d="M -74 -2 L -34 -2 L -40 -22 L -64 -22 Z M 34 -2 L 78 -2 L 66 -22 L 44 -22 Z" fill="#b8862b" />
      <rect x={-74} y={-122} width={150} height={30} rx={8} fill={ALTIN} />
      <path d="M -70 -107 L 72 -107" stroke="#2f5f9e" strokeWidth={8} />
      <path d="M -44 -200 L 62 -200 L 62 -122" fill="none" strokeWidth={22} stroke={MUREKKEP} />
      <path d="M -44 -200 L 62 -200 L 62 -122" fill="none" strokeWidth={10} stroke={ALTIN} />
    </g>
  );
const Koltuk: React.FC<{op?: number}> = ({op = 1}) =>
  op <= 0.001 ? null : (
    <g transform={`translate(${CX},${FL})`} opacity={op} stroke={MUREKKEP} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M -90 -112 L -90 -400 L -66 -452 L -42 -400 L -42 -112 Z" fill="#7a5433" />
      <path d="M -66 -390 L -66 -150" stroke="#5a3c22" strokeWidth={8} />
      <circle cx={-66} cy={-410} r={8} fill="#5a3c22" strokeWidth={4} />
      <rect x={-78} y={-104} width={150} height={104} fill="#7a5433" />
      <path d="M -50 -80 L 44 -80 L 44 -24 L -50 -24 Z" fill="#8c6440" strokeWidth={5} />
      <rect x={-84} y={-124} width={164} height={26} rx={6} fill="#8c6440" />
      <path d="M -44 -196 L 60 -196 L 60 -124" fill="none" strokeWidth={22} stroke={MUREKKEP} />
      <path d="M -44 -196 L 60 -196 L 60 -124" fill="none" strokeWidth={10} stroke="#8c6440" />
    </g>
  );

// ---- dünyalar --------------------------------------------------------------
const Oda: React.FC = () => (
  <g stroke={MUREKKEP} strokeWidth={6} strokeLinejoin="round">
    <rect x={-700} y={-400} width={2500} height={FL + 400} fill="#eadcbd" stroke="none" />
    <rect x={-700} y={FL} width={2500} height={1200} fill="#c9a877" stroke="none" />
    {[1320, 1470, 1650].map((y) => <path key={y} d={`M -700 ${y} L 1800 ${y}`} stroke="#b89462" strokeWidth={4} />)}
    <rect x={-700} y={FL - 34} width={2500} height={34} fill="#f3ead3" strokeWidth={5} />
    <rect x={170} y={650} width={230} height={290} rx={8} fill="#bfe0ea" />
    <path d="M 285 650 L 285 940 M 170 795 L 400 795" strokeWidth={5} />
    <path d="M 150 635 L 420 635" strokeWidth={12} strokeLinecap="round" />
    <path d="M 160 642 Q 215 770 168 950 L 150 950 L 150 642 Z" fill="#d98f6c" strokeWidth={5} />
    <rect x={690} y={700} width={150} height={120} fill="#f7f0de" />
    <path d="M 705 800 L 745 750 L 775 782 L 800 758 L 826 800 Z" fill="#9fb58a" strokeWidth={4} />
    <path d="M 930 1200 L 930 820" strokeWidth={9} strokeLinecap="round" />
    <path d="M 884 820 L 976 820 L 954 728 L 906 728 Z" fill="#f0c965" />
    <ellipse cx={930} cy={1198} rx={40} ry={8} fill={MUREKKEP} />
    <ellipse cx={CX} cy={FL + 46} rx={270} ry={40} fill="#b5574a" strokeWidth={5} />
    <ellipse cx={CX} cy={FL + 46} rx={215} ry={27} fill="none" stroke="#f0d9a8" strokeWidth={5} />
  </g>
);
const Misir: React.FC<{t: number}> = ({t}) => (
  <g stroke={MUREKKEP} strokeWidth={6} strokeLinejoin="round">
    <rect x={-700} y={-400} width={2500} height={FL + 400} fill="#f3d79a" stroke="none" />
    <circle cx={830} cy={520} r={74} fill="#f7b93e" strokeWidth={5} />
    <path d="M -240 1010 L 110 560 L 460 1010 Z" fill="#dcb26a" />
    <path d="M 110 560 L 200 1010 L 460 1010 Z" fill="#c99b54" strokeWidth={4} />
    <path d="M 560 1010 L 790 720 L 1020 1010 Z" fill="#dcb26a" />
    <path d="M 790 720 L 850 1010 L 1020 1010 Z" fill="#c99b54" strokeWidth={4} />
    <path d={`M -700 1010 Q -200 ${968 + Math.sin(t) * 2} 300 1012 T 1800 1000 L 1800 ${FL} L -700 ${FL} Z`} fill="#e6c27c" strokeWidth={5} />
    <rect x={-700} y={FL} width={2500} height={1200} fill="#d2aa66" stroke="none" />
    <path d={`M -700 ${FL} L 1800 ${FL}`} />
    {[-260, -40, 180, 400, 620, 840, 1060].map((x) => <path key={x} d={`M ${x} ${FL} L ${x - 60} ${FL + 720}`} stroke="#bb9352" strokeWidth={4} />)}
    <path d={`M -700 ${FL + 150} L 1800 ${FL + 150}`} stroke="#bb9352" strokeWidth={4} />
  </g>
);
const Salon: React.FC<{t: number}> = ({t}) => (
  <g stroke={MUREKKEP} strokeWidth={6} strokeLinejoin="round">
    <rect x={-700} y={-400} width={2500} height={FL + 400} fill="#9a8d7a" stroke="none" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((r) =>
      [0, 1, 2, 3, 4, 5, 6].map((c) => <rect key={`${r}-${c}`} x={-330 + c * 260 + (r % 2) * 130} y={330 + r * 110} width={150} height={56} rx={8} fill="#a69986" stroke="#877a68" strokeWidth={4} />),
    )}
    <path d="M 120 900 L 120 640 Q 215 500 310 640 L 310 900 Z" fill="#f3dfa6" />
    <path d="M 215 560 L 215 900 M 120 730 L 310 730" strokeWidth={5} />
    <path d="M 800 800 L 800 690" strokeWidth={12} strokeLinecap="round" />
    <path d={`M 776 690 Q ${800 + Math.sin(t * 9) * 8} ${600 + Math.sin(t * 13) * 10} 800 ${590 + Math.sin(t * 7) * 6} Q ${812 + Math.sin(t * 11) * 6} 640 824 690 Z`} fill="#f2a23a" strokeWidth={5} />
    <rect x={-700} y={FL} width={2500} height={1200} fill="#6f5339" stroke="none" />
    <path d={`M -700 ${FL} L 1800 ${FL}`} />
    {[1330, 1490, 1680].map((y) => <path key={y} d={`M -700 ${y} L 1800 ${y}`} stroke="#5a422c" strokeWidth={4} />)}
    {/* sıra */}
    <path d={`M 70 ${FL - 78} L 90 ${FL} M 370 ${FL - 78} L 350 ${FL}`} strokeWidth={18} strokeLinecap="round" />
    <rect x={40} y={FL - 96} width={360} height={22} rx={6} fill="#8c6440" />
  </g>
);
const Duz: React.FC = () => (
  <g>
    <rect x={-700} y={-400} width={2500} height={FL + 400} fill="#efe3c4" />
    <rect x={-700} y={FL} width={2500} height={1200} fill="#decca2" />
    <path d={`M -700 ${FL} L 1800 ${FL}`} stroke={MUREKKEP} strokeWidth={6} />
  </g>
);

// ---- yardımcı çizimler ------------------------------------------------------
const Yildiz: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <path transform={`translate(${x},${y}) scale(${s})`} d="M 0 -26 Q 4 -4 26 0 Q 4 4 0 26 Q -4 4 -26 0 Q -4 -4 0 -26 Z" fill="#fff6c9" stroke={MUREKKEP} strokeWidth={4} />
);
const Tac: React.FC<{x: number; y: number; s: number; op?: number}> = ({x, y, s, op = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={op} stroke={MUREKKEP} strokeWidth={6} strokeLinejoin="round">
    <path d="M -48 0 L -56 -60 L -26 -30 L 0 -72 L 26 -30 L 56 -60 L 48 0 Z" fill={ALTIN} />
    <circle cx={0} cy={-20} r={7} fill={KIRMIZI} strokeWidth={3} />
  </g>
);

// ---- yazılar ---------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.04 <= t).pop();
  if (!aktif || aktif.c === 0) return null; // ilk cümle dev yazıyla veriliyor
  const satir = K.filter((k) => k.c === aktif.c);
  const goster = aktif.c === 5 ? satir.slice(0, 4) : satir; // son cümlenin sonu dev yazı
  if (aktif.c === 5 && satir.indexOf(aktif) >= 4) return null;
  if (t > satir[satir.length - 1].e + 0.6) return null;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1390, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(38,33,28,.82)', borderRadius: 28, padding: '18px 36px 24px', textAlign: 'center', fontFamily: YAZI, fontSize: 66, lineHeight: 1.2}}>
        {goster.map((k, i) => (
          <span key={i} style={{opacity: t >= k.s - 0.04 ? 1 : 0.001, color: k === aktif ? '#ffd84a' : '#fff'}}>
            {k.w}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};
const DevYazi: React.FC<{t: number; kelimeler: Kelime[]; top: number; renk?: string; cikis: number; boyut?: number}> = ({t, kelimeler, top, renk = MUREKKEP, cikis, boyut = 104}) => (
  <div style={{position: 'absolute', left: 60, right: 60, top, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: YAZI, fontSize: boyut, lineHeight: 1.05, color: renk, opacity: 1 - gir(t, cikis, 0.5)}}>
    {kelimeler.map((k, i) => {
      const u = gir(t, k.s - 0.05, 0.22);
      return (
        <span key={i} style={{display: 'inline-block', opacity: u, transform: `translateY(${(1 - u) * 22}px)`, marginRight: 14, whiteSpace: 'nowrap'}}>
          {k.w}
        </span>
      );
    })}
  </div>
);

// ---- video -----------------------------------------------------------------
const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [bekle] = React.useState(() => delayRender('yazı tipi'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("68px 'Patrick Hand'", 'ığüşöçİ'), document.fonts.ready]).then(() => continueRender(bekle));
  }, [bekle]);

  // dünyaların karışımı
  const misirIn = gir(t, A.misir - 0.6, 0.9), salonIn = gir(t, A.orta - 0.6, 0.9), duzIn = gir(t, A.herkese - 0.6, 0.9), odaDon = gir(t, A.yani - 0.6, 0.9);
  const misir = misirIn * (1 - salonIn), salon = salonIn * (1 - duzIn), duz = duzIn * (1 - odaDon);
  const oda1 = 1 - misirIn; // açılıştaki oda

  // kamera: {ölçek, merkez x}. Geçişler bir sonraki cümleden hemen önce, yavaşça.
  const gecis = [gir(t, A.misir - 0.7, 1.1), gir(t, A.halk - 0.5, 1.1), gir(t, A.orta - 0.7, 1.1), gir(t, A.herkese - 0.7, 1.2), gir(t, A.yani - 0.6, 1.4)];
  const duraklar: [number, number][] = [[1.3 + gir(t, 0, A.misir) * 0.07, 600], [1.3, 560], [1.04, 430], [1.16, 470], [1.0, 540], [1.34 + gir(t, A.yani, 4.5) * 0.08, 540]];
  let [olcek, mx] = duraklar[0];
  gecis.forEach((g, i) => { olcek = karis(olcek, duraklar[i + 1][0], g); mx = karis(mx, duraklar[i + 1][1], g); });
  const kamera = `translate(${540 - mx * olcek},${FL - FL * olcek}) scale(${olcek})`;
  const nefes = Math.sin(t * 2.2) * 1.2;

  // --- 0: oda, sıradan sandalye, yaklaşan kişi
  const senYuru = gir(t, A.bir - 0.9, 1.3);
  const senX = karis(1160, 690, senYuru);
  const irkil = gir(t, A.oturamaz, 0.3);
  const yasak = zipla(t, A.oturamaz);

  // --- 1: Mısır
  const firYuru = gir(t, A.misir + 0.2, A.firavun - A.misir - 0.5);
  const firOtur = gir(t, A.firavun - 0.1, 0.6);
  const soyluGel = gir(t, A.soylu - 0.7, 0.8);
  const pir = (k: number) => Math.max(0, Math.sin((t - A.ayricalik) * 5 + k)) * gir(t, A.ayricalik, 0.3) * (1 - gir(t, A.halk + 0.4, 0.5));

  // --- 2: halk
  const halkGel = gir(t, A.halk - 0.2, 1.2);
  const yereOtur = gir(t, A.yerde - 0.08, 0.5);
  const tabureOtur = gir(t, A.tabure - 0.08, 0.5);
  const soru = zipla(t, A.halk + 0.15) * (1 - gir(t, A.yerde - 0.3, 0.3));

  // --- 3: Orta Çağ
  const halka = gir(t, A.tek - 0.05, 0.5) * (1 - gir(t, A.oda + 0.2, 0.4));
  const reisYuru = gir(t, A.tek + 0.2, A.oda - A.tek - 0.2);
  const reisOtur = gir(t, A.oda + 0.05, 0.6);

  // --- 4: herkese bir sandalye
  const xs = [150, 345, 540, 735, 930];
  const sira: Record<number, number> = {1: 0, 3: 1, 0: 2, 4: 3}; // düşme sırası (ortadaki zaten yerinde)
  const adim = (A.yuzyil - A.sandalye4 - 0.3) / 3;
  const dusAni = (i: number) => A.sandalye4 - 0.05 + sira[i] * adim;
  const renkler = ['#b5574a', '#7c8f4e', '#4f8a8b', '#c98b3a', '#7a6aa0'];
  const yil = Math.round(karis(1400, 1900, gir(t, A.herkese, A.yuzyil + 0.6 - A.herkese)) / 10) * 10;

  // --- 5: bugün, taht
  const sevinc = gir(t, A.oturdugun, 0.4) * (1 - gir(t, A.birZaman, 0.4));
  const tacIn = dus(t, A.taht - 0.1, 0.6);
  const tahtHayal = gir(t, A.taht, 0.5);
  const senOtur4 = gir(t, A.herkese + 0.35, 0.6);

  const satir0 = K.filter((k) => k.c === 0), satir5 = K.filter((k) => k.c === 5);

  return (
    <AbsoluteFill style={{background: '#eadcbd'}}>
      <Audio src={staticFile('sandalye/ses.mp3')} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <filter id="gren" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.55 -0.2" />
          </filter>
          <radialGradient id="vinyet" cx="50%" cy="46%" r="75%">
            <stop offset="55%" stopColor="#3a2a12" stopOpacity="0" />
            <stop offset="100%" stopColor="#3a2a12" stopOpacity="0.42" />
          </radialGradient>
          <radialGradient id="isik" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe9a0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffe9a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={kamera}>
          <Oda />
          {misir > 0.001 && <g opacity={misirIn}><Misir t={t} /></g>}
          {salonIn > 0.001 && duzIn < 0.999 && <g opacity={salonIn}><Salon t={t} /></g>}
          {duzIn > 0.001 && <g opacity={duz < duzIn ? duz : duzIn}><Duz /></g>}

          {/* 5: tahtın hayali ve ışık */}
          {tahtHayal > 0 && <circle cx={CX} cy={FL - 300} r={karis(200, 430, tahtHayal)} fill="url(#isik)" opacity={tahtHayal * 0.9} />}
          <Taht op={Math.max(misir, tahtHayal * 0.5)} />
          <Koltuk op={salon} />
          <Modern op={1 - Math.max(misir, salon)} />

          {/* 0: gelen kişi + yasak işareti + sandalyenin üstünde taç */}
          <Kisi x={senX + irkil * 34} dir={-1} yuru={Math.sin(senYuru * Math.PI)} faz={t * 9} egim={-irkil * 9} op={oda1}
            onKol={[karis(8, 95, irkil), karis(4, 150, irkil)]} yuz={irkil > 0.3 ? 'o' : 'gul'} />
          {yasak > 0 && (
            <g opacity={oda1}>
              <Tac x={CX - 10} y={FL - 420 + nefes * 3} s={yasak} />
              <g transform={`translate(${CX + 4},${FL - 200}) scale(${yasak})`} stroke={KIRMIZI} strokeWidth={15} fill="none" strokeLinecap="round">
                <circle r={62} fill="rgba(255,255,255,.55)" />
                <path d="M -42 -42 L 42 42" />
              </g>
            </g>
          )}

          {/* 1-2: firavun, soylu, halk */}
          {misir > 0.001 && (
            <g opacity={misir}>
              <Kisi x={karis(1120, 800, soyluGel)} dir={-1} sapka="peruk" renk="#f4efe2" yuru={Math.sin(soyluGel * Math.PI)} faz={t * 9}
                onKol={[karis(8, 120, gir(t, A.soylu, 0.4)), karis(4, 165 + Math.sin(t * 5) * 14, gir(t, A.soylu, 0.4))]} op={gir(t, A.soylu - 0.7, 0.2)} />
              <Kisi x={karis(karis(1060, 610, firYuru), CX - 4, firOtur)} dir={firOtur > 0 ? 1 : -1} sapka="nemes" renk={ALTIN}
                hipH={karis(190, 122, firOtur) + nefes} footF={karis(0, 90, firOtur)} yuru={Math.sin(firYuru * Math.PI)} faz={t * 8}
                onKol={firOtur > 0.5 ? [50, 88] : [8, 4]} arkaKol={firOtur > 0.5 ? [40, 85] : [-8, -4]} />
              {[[-150, -470, 0], [130, -400, 2], [-170, -230, 4], [150, -160, 1]].map(([dx, dy, k], i) => <Yildiz key={i} x={CX + dx} y={FL + dy} s={pir(k)} />)}
              {/* halk */}
              <Kisi x={karis(-330, 40, halkGel)} dir={1} sapka="kukuleta" renk="#a98a62" yuru={Math.sin(halkGel * Math.PI)} faz={t * 9}
                hipH={karis(190, 30, yereOtur)} footF={karis(0, 170, yereOtur)} egim={-yereOtur * 12} arkaKol={[karis(-8, -40, yereOtur), karis(-4, -10, yereOtur)]} yuz="duz" />
              <g opacity={gir(t, A.yerde + 0.25, 0.35)} stroke={MUREKKEP} strokeWidth={7} strokeLinecap="round">
                <path d={`M 172 ${FL - 52} L 162 ${FL} M 252 ${FL - 52} L 262 ${FL}`} strokeWidth={14} />
                <rect x={156} y={FL - 66} width={112} height={20} rx={6} fill="#a9824f" />
              </g>
              <Kisi x={karis(-140, 268, halkGel) - tabureOtur * 56} dir={1} sapka="kukuleta" renk="#8f9a6b" yuru={Math.sin(halkGel * Math.PI)} faz={t * 9 + 1.5}
                hipH={karis(190, 74, tabureOtur)} footF={karis(0, 96, tabureOtur)} yuz="duz" onKol={tabureOtur > 0.5 ? [40, 80] : [8, 4]} />
              <text x={150} y={FL - 520} fontFamily={YAZI} fontSize={150 * soru} fill={KIRMIZI} textAnchor="middle" stroke="none">?</text>
            </g>
          )}

          {/* 3: Orta Çağ evi */}
          {salon > 0.001 && (
            <g opacity={salon}>
              {[[110, '#8f9a6b', 0.8, 'kukuleta'], [215, '#a98a62', 0.66, null], [320, '#b5574a', 0.8, 'kukuleta']].map(([x, renk, s, sp], i) => (
                <Kisi key={i} x={x as number} s={s as number} dir={1} renk={renk as string} sapka={sp as 'kukuleta' | null} hipH={(96 + 22) / (s as number) + nefes} footF={92}
                  onKol={[35, 80]} arkaKol={[30, 78]} yuz={t > A.oda ? 'gul' : 'duz'} />
              ))}
              {halka > 0 && <ellipse cx={CX - 6} cy={FL - 215} rx={170} ry={285} fill="none" stroke="#ffd84a" strokeWidth={10} strokeDasharray="1700" strokeDashoffset={1700 * (1 - halka)} strokeLinecap="round" opacity={halka > 0.02 ? 1 : 0} />}
              <Kisi x={karis(karis(1090, 612, reisYuru), CX - 4, reisOtur)} dir={reisOtur > 0 ? 1 : -1} sapka="bere" sakal renk="#8e2f2a"
                hipH={karis(190, 124, reisOtur) + nefes} footF={karis(0, 90, reisOtur)} yuru={Math.sin(reisYuru * Math.PI)} faz={t * 8}
                onKol={reisOtur > 0.5 ? [50, 88] : [8, 4]} arkaKol={reisOtur > 0.5 ? [40, 85] : [-8, -4]} op={gir(t, A.tek + 0.1, 0.3)} />
            </g>
          )}

          {/* 4-5: herkese bir sandalye; ortadaki kişi sona kadar kalır */}
          {duzIn > 0.001 && (
            <>
              <g opacity={duz}>
                {xs.map((x, i) => i !== 2 && <Modern key={i} x={x} y={karis(-1500, 0, dus(t, dusAni(i), 0.55))} op={t > dusAni(i) ? 1 : 0} s={0.82} />)}
                {xs.map((x, i) => {
                  if (i === 2) return null;
                  const o = gir(t, dusAni(i) + 0.5, 0.45);
                  return <Kisi key={i} x={karis(x + 62, x - 3, o)} s={0.82} dir={1} renk={renkler[i]} hipH={karis(190, 122, o) + nefes} footF={karis(0, 88, o)}
                    yuz={o > 0.6 ? 'gul' : 'duz'} onKol={o > 0.5 ? [45, 85] : [8, 4]} arkaKol={o > 0.5 ? [38, 82] : [-8, -4]} op={gir(t, A.herkese - 0.2, 0.4)} />;
                })}
              </g>
              <Kisi x={karis(CX + 66, CX - 4, senOtur4)} dir={1} hipH={karis(190, 122, senOtur4) + nefes} footF={karis(0, 90, senOtur4)} op={gir(t, A.herkese - 0.2, 0.4)}
                onKol={sevinc > 0.01 ? [karis(48, 150, sevinc), karis(86, 175, sevinc)] : senOtur4 > 0.5 ? [48, 86] : [8, 4]}
                arkaKol={sevinc > 0.01 ? [karis(40, -150, sevinc), karis(84, -175, sevinc)] : senOtur4 > 0.5 ? [40, 84] : [-8, -4]}
                tac={t > A.taht - 0.1 ? tacIn : -1} yuz={t > A.taht + 0.15 ? 'o' : 'gul'} />
            </>
          )}
        </g>

        {/* yıl sayacı */}
        {duz > 0.01 && (
          <text x={540} y={470} textAnchor="middle" fontFamily={YAZI} fontSize={190} fill={MUREKKEP} opacity={duz * gir(t, A.herkese, 0.3)}>{yil}</text>
        )}
        <rect width={1080} height={1920} filter="url(#gren)" opacity={0.5} style={{mixBlendMode: 'multiply'}} />
        <rect width={1080} height={1920} fill="url(#vinyet)" />
      </svg>

      <DevYazi t={t} kelimeler={satir0.slice(0, 5)} top={210} cikis={A.misir - 0.7} boyut={92} />
      <DevYazi t={t} kelimeler={satir0.slice(5)} top={318} renk={KIRMIZI} cikis={A.misir - 0.7} boyut={80} />
      <DevYazi t={t} kelimeler={satir5.slice(4)} top={185} renk={KIRMIZI} cikis={999} boyut={124} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', justifyContent: 'center', opacity: gir(t, A.taht + 0.7, 0.5)}}>
        <div style={{background: 'rgba(38,33,28,.82)', borderRadius: 28, padding: '16px 44px 20px', fontFamily: YAZI, fontSize: 60, letterSpacing: 7, color: '#fff'}}>BOZ CONCEPT HOME</div>
      </div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

const sure = Math.round(30 * FPS);
export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={sure} fps={FPS} width={1080} height={1920} />;

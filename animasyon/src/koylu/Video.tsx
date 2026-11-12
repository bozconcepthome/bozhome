// "Osmanlı'da Köylü Olsaydın?" — 5 dk YouTube anlatım videosu (1920x1080). Hasan temsilî bir karakterdir.
// Her an kelime zamanından gelir (public/koylu/kelimeler.json). Ses: public/koylu/mix.wav
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Still, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-ext-700-italic.css';
import veri from '../../public/koylu/kelimeler.json';
import {At, Bugday, Cami, Defter, Ev, Gok, H, Kavak, Kilise, Kisi, METIN, Okuz, R, SERIF, Sikke, Tepeler, W, gir, karis, kis, rnd, yumus, zipla} from './ortak';

type Kelime = {w: string; s: number; e: number; c: number};
const K = veri as Kelime[];
const FPS = 30;
const SURE = Math.ceil(Math.max(...K.map((k) => k.e)) + 1.0);
const an = (c: number, i = 0) => K.filter((k) => k.c === c)[i].s;
const kelimeAni = (c: number, kok: string) => { const k = K.filter((x) => x.c === c).find((x) => x.w.toLocaleLowerCase('tr').startsWith(kok)); return k ? k.s : an(c); };

// sahne -> ilk satır
const SAHNE_SATIR = [0, 4, 7, 8, 10, 15, 16, 20, 21, 24, 28, 30, 33, 34, 37, 39, 42];
const BOLUM = ['', 'Köy', 'Reaya', 'Tahrir', 'Toprak', 'Komşular', 'Sipahi', 'Takvim', 'Tarla', 'Vergi', 'Pazar', 'Adalet', 'Kış', 'Değişim', 'Celali', 'Son', ''];
const SB = SAHNE_SATIR.map((c, i) => (i === 0 ? 0 : an(c) - 0.45));
const sahneOp = (t: number, i: number) => (i === 0 ? 1 : gir(t, SB[i] - 0.3, 0.6)) * (i === SB.length - 1 ? 1 : 1 - gir(t, SB[i + 1] - 0.3, 0.6));

// ---- yardımcılar -------------------------------------------------------------------------
const Etiket: React.FC<{x: number; y: number; g: number; children: React.ReactNode; renk?: string; boyut?: number}> = ({x, y, g, children, renk = '#1f1a16', boyut = 34}) =>
  g <= 0.001 ? null : (
    <g transform={`translate(${x},${y}) scale(${0.6 + 0.4 * Math.min(1, g)})`} opacity={Math.min(1, g)}>
      <foreignObject x={-500} y={-40} width={1000} height={90}>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <div style={{background: renk, color: '#fff', borderRadius: 40, padding: '10px 26px 8px', fontFamily: METIN, fontWeight: 800, fontSize: boyut, whiteSpace: 'nowrap', boxShadow: '0 10px 26px rgba(0,0,0,.28)'}}>{children}</div>
        </div>
      </foreignObject>
    </g>
  );
const Isaret: React.FC<{x: number; y: number; g: number; tip: 'x' | 'ok'; s?: number}> = ({x, y, g, tip, s = 1}) =>
  g <= 0.001 ? null : (
    <g transform={`translate(${x},${y}) scale(${s * Math.min(1, g)})`} opacity={Math.min(1, g)}>
      <circle r={46} fill={tip === 'x' ? '#c0392b' : '#3f7a4a'} stroke="#fff" strokeWidth={6} />
      {tip === 'x' ? <path d="M -18 -18 L 18 18 M 18 -18 L -18 18" stroke="#fff" strokeWidth={10} strokeLinecap="round" /> : <path d="M -18 2 L -4 16 L 20 -14" stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none" />}
    </g>
  );
const Kagit: React.FC = () => (<g><rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#e9dcbd" /><rect x={-200} y={-200} width={W + 400} height={H + 400} fill="url(#kagitDoku)" opacity={0.7} /></g>);

// ---- sahneler ----------------------------------------------------------------------------
const Kanca: React.FC<{t: number}> = ({t}) => {
  const p1 = gir(t, an(1) - 0.3, 0.5) * (1 - gir(t, an(2) - 0.4, 0.4));
  const p2 = gir(t, an(2) - 0.3, 0.5) * (1 - gir(t, an(3) - 0.4, 0.4));
  const p3 = gir(t, an(3) - 0.3, 0.5);
  const flu = Math.max(p1, p2 * 0.6, p3);
  return (
    <g>
      <g filter={flu > 0.05 ? 'url(#fluArka)' : undefined}>
        <Gok zaman="safak" />
        <circle cx={1400} cy={560} r={300} fill="url(#gunes)" />
        <Tepeler y={640} renk="#9a8a7a" seed={1} genlik={50} op={0.7} />
        <Tepeler y={720} renk="#8a7a5a" seed={3} genlik={30} />
        {[0, 1, 2, 3, 4].map((i) => <Ev key={i} x={560 + i * 150} y={760} w={120 + (i % 2) * 40} h={70} t={t} duman={i === 2 ? 1 : 0} />)}
        <Cami x={1330} y={760} s={0.55} />
        {[0, 1, 2].map((i) => <Kavak key={i} x={480 + i * 520} y={770} s={0.9} t={t} />)}
        <rect x={-200} y={760} width={W + 400} height={500} fill="#b99a62" />
        <Bugday x={0} y={1080} w={W} boy={70} t={t} sik={9} />
        <g transform={`translate(${karis(-200, 700, Math.min(1, t / 14))},860)`}>
          <Okuz x={0} y={0} s={0.55} faz={t * 5} yuru={1} />
          <Kisi tur="hasan" x={-120} y={0} s={0.6} faz={t * 5} yuru={1} kol={[60, 70]} />
        </g>
      </g>
      {/* 1: saray / ordu / toprak */}
      <g opacity={p1}>
        {[['Saray', 0, kelimeAni(1, 'sarayın')], ['Ordu', 1, kelimeAni(1, 'ordunun')], ['Toprak', 2, kelimeAni(1, 'toprağın')], ['Öküz', 3, kelimeAni(1, 'öküz')], ['Buğday', 4, kelimeAni(1, 'buğday')]].map(([ad, i, ta]) => {
          const g = zipla(t, (ta as number) - 0.1);
          const x = 330 + (i as number) * 315;
          const red = (i as number) < 2;
          return (
            <g key={ad as string} opacity={Math.min(1, g)} transform={`translate(${x},470) scale(${0.7 + 0.3 * Math.min(1, g)})`}>
              <circle r={120} fill={red ? '#3a3632' : '#f4ead2'} stroke="#fff" strokeWidth={6} />
              {i === 0 && <g fill="#cfc6b6"><rect x={-70} y={-10} width={140} height={60} /><path d="M -50 -10 Q -50 -60 0 -70 Q 50 -60 50 -10 Z" /><rect x={-80} y={-70} width={10} height={120} /><rect x={70} y={-70} width={10} height={120} /></g>}
              {i === 1 && <g>{[-40, 0, 40].map((dx) => <g key={dx}><path d={`M ${dx} 50 L ${dx} -60`} stroke="#cfc6b6" strokeWidth={6} /><path d={`M ${dx} -60 L ${dx + 40} -45 L ${dx} -30 Z`} fill="#b03a2e" /></g>)}</g>}
              {i === 2 && <g><rect x={-80} y={-20} width={160} height={70} fill="#b99a62" /><path d="M -80 -20 L 80 -20" stroke="#7a5a3a" strokeWidth={4} />{[0, 1, 2, 3].map((k) => <path key={k} d={`M -70 ${-5 + k * 15} L 70 ${-5 + k * 15}`} stroke="#8a6a44" strokeWidth={3} />)}</g>}
              {i === 3 && <Okuz x={-10} y={50} s={0.6} />}
              {i === 4 && <g>{[-20, -8, 4, 16].map((dx, k) => <g key={k}><path d={`M ${dx} 60 Q ${dx + 4} 0 ${dx + 10} -50`} stroke="#c99a3b" strokeWidth={4} fill="none" /><ellipse cx={dx + 10} cy={-60} rx={7} ry={20} fill="#d9b45a" /></g>)}</g>}
              <text y={170} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={36} fill="#fff" style={{paintOrder: 'stroke'}} stroke="#000" strokeWidth={6}>{ad as string}</text>
              {red && <g opacity={gir(t, (ta as number) + 0.3, 0.2)}><path d="M -90 -90 L 90 90 M 90 -90 L -90 90" stroke="#c0392b" strokeWidth={16} strokeLinecap="round" /></g>}
            </g>
          );
        })}
      </g>
      {/* 2: başlık */}
      <g opacity={p2}>
        <foreignObject x={0} y={300} width={W} height={400}>
          <div style={{textAlign: 'center', color: '#fff', textShadow: '0 6px 30px rgba(0,0,0,.6)'}}>
            <div style={{fontFamily: METIN, fontWeight: 800, fontSize: 40, letterSpacing: 12, opacity: 0.9}}>BİR YIL · 1580'LER</div>
            <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 132, lineHeight: 1.05}}>Osmanlı'da köylü olsaydın?</div>
          </div>
        </foreignObject>
      </g>
      {/* 3: Hasan */}
      <g opacity={p3}>
        <Kisi tur="hasan" x={620} y={1060} s={3.4} kol={[14, 8]} kol2={[-14, -8]} />
        <g transform="translate(1250,380)">
          <foreignObject x={-450} y={-120} width={900} height={500}>
            <div style={{color: '#fff', fontFamily: METIN, textShadow: '0 4px 20px rgba(0,0,0,.6)'}}>
              <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 110}}>Hasan</div>
              <div style={{fontWeight: 800, fontSize: 34, background: 'rgba(0,0,0,.5)', display: 'inline-block', padding: '8px 18px', borderRadius: 12}}>temsilî karakter</div>
              <div style={{fontWeight: 600, fontSize: 30, marginTop: 26, opacity: gir(t, kelimeAni(3, 'belgeler') - 0.1, 0.4), lineHeight: 1.45, background: 'rgba(0,0,0,.45)', padding: '14px 20px', borderRadius: 14}}>
                Dayanak: tahrir defterleri, sancak kanunnameleri,<br />şer'iyye sicilleri ve tarihçilerin çalışmaları
              </div>
            </div>
          </foreignObject>
        </g>
      </g>
    </g>
  );
};
const Koy: React.FC<{t: number}> = ({t}) => {
  const aile = gir(t, an(5) - 0.2, 0.5);
  const ayse = gir(t, an(6) - 0.3, 0.5);
  const gunes = interpolate(t, [an(4), an(5) + 1], [0, 1], kis);
  return (
    <g>
      <Gok zaman="gun" />
      <circle cx={karis(300, 1600, gunes)} cy={600 - Math.sin(gunes * Math.PI) * 420} r={220} fill="url(#gunes)" />
      <circle cx={karis(300, 1600, gunes)} cy={600 - Math.sin(gunes * Math.PI) * 420} r={46} fill="#fff6dc" />
      <Tepeler y={560} renk="#a8a090" seed={2} genlik={70} op={0.7} />
      <Tepeler y={640} renk="#9a8a64" seed={5} genlik={30} />
      <rect x={-200} y={700} width={W + 400} height={600} fill="#c4a571" />
      {[[200, 700, 260], [520, 690, 200], [760, 705, 240], [1080, 690, 220], [1350, 700, 260]].map(([x, y, w], i) => <Ev key={i} x={x} y={y} w={w} h={130} t={t} duman={i === 1 || i === 3 ? 1 : 0} />)}
      <Cami x={1650} y={700} s={0.8} />
      {[120, 980, 1560].map((x) => <Kavak key={x} x={x} y={710} t={t} />)}
      <path d="M 0 880 Q 900 820 1920 900" stroke="#b08a5a" strokeWidth={60} fill="none" opacity={0.5} />
      <g opacity={aile} transform="translate(0,0)">
        {[['hasan', 760, 1.25, 'Hasan', kelimeAni(5, 'hasan')], ['ayse', 900, 1.25, 'Ayşe', kelimeAni(5, 'ayşe')], ['cocuk', 1020, 1.25, 'iki oğlu', kelimeAni(5, 'iki')], ['cocuk', 1090, 1.15, '', kelimeAni(5, 'iki')], ['nine', 1210, 1.2, 'annesi', kelimeAni(5, 'yaşlı')]].map(([tur, x, s, ad, ta], i) => {
          const g = zipla(t, (ta as number) - 0.1);
          return <g key={i} opacity={Math.min(1, g)}>
            <Kisi tur={tur as 'hasan'} x={x as number} y={1000} s={s as number} faz={0} yuz="gul" kol={tur === 'cocuk' ? [20, 10] : [12, 8]} />
            {ad && <Etiket x={x as number} y={720} g={g} boyut={26}>{ad as string}</Etiket>}
          </g>;
        })}
        <Etiket x={980} y={530} g={zipla(t, kelimeAni(5, 'kerpiç'))} renk={R.kerpicK} boyut={28}>kerpiç ev</Etiket>
      </g>
      {/* Ayşe: tandır ve yün */}
      <g opacity={ayse}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#000" opacity={0.35} />
        <g transform="translate(560,980)">
          <ellipse cx={0} cy={0} rx={150} ry={30} fill="#000" opacity={0.3} />
          <path d="M -120 0 Q -130 -150 0 -170 Q 130 -150 120 0 Z" fill="#b5835a" />
          <ellipse cx={0} cy={-160} rx={70} ry={18} fill="#3a2418" />
          <ellipse cx={0} cy={-164} rx={50} ry={10} fill="#ff9a3c" opacity={0.6 + Math.sin(t * 9) * 0.2} />
          {[0, 1].map((i) => { const f = (t * 0.4 + i / 2) % 1; return <circle key={i} cx={Math.sin(t + i) * 12} cy={-190 - f * 140} r={12 + f * 20} fill="#d9d4cc" opacity={(1 - f) * 0.5} />; })}
        </g>
        <Kisi tur="ayse" x={800} y={1000} s={1.5} kol={[70, 110]} kol2={[50, 100]} />
        <ellipse cx={870} cy={850} rx={50} ry={14} fill="#e9c98a" opacity={zipla(t, kelimeAni(6, 'ekmek'))} />
        <g opacity={zipla(t, kelimeAni(6, 'yün'))} transform="translate(1250,940)">
          <Kisi tur="ayse" x={0} y={60} s={1.3} kol={[110, 160]} kol2={[90, 140]} />
          <path d={`M 40 -220 L 40 -60`} stroke="#8a6a44" strokeWidth={6} transform={`rotate(${Math.sin(t * 12) * 10},40,-140)`} />
          <ellipse cx={40} cy={-90} rx={22} ry={30} fill="#efe6d4" />
          <circle cx={-60} cy={-160} r={46} fill="#f4eee2" />
        </g>
        <Etiket x={560} y={700} g={zipla(t, kelimeAni(6, 'ekmek'))} boyut={30}>ekmek</Etiket>
        <Etiket x={1250} y={660} g={zipla(t, kelimeAni(6, 'yün'))} boyut={30}>yün eğirme</Etiket>
        <Etiket x={960} y={560} g={zipla(t, kelimeAni(6, 'hasatta'))} boyut={30} renk="#5f7d4a">hasatta tarlada</Etiket>
      </g>
    </g>
  );
};
const Toplum: React.FC<{t: number}> = ({t}) => {
  const ust = zipla(t, kelimeAni(7, 'yönetenler'), 0.5), alt = zipla(t, kelimeAni(7, 'reaya'), 0.5), hasan = gir(t, kelimeAni(7, 'hasan') - 0.1, 0.4);
  return (
    <g>
      <Kagit />
      <path d="M 960 140 L 1360 520 L 560 520 Z" fill="#8f1f1c" opacity={0.85 * Math.min(1, ust)} />
      <path d="M 520 560 L 1400 560 L 1720 980 L 200 980 Z" fill="#6b5a3a" opacity={0.85 * Math.min(1, alt)} />
      <g opacity={Math.min(1, ust)}>
        <Kisi tur="sipahi" x={860} y={500} s={0.75} /><Kisi tur="kadi" x={960} y={500} s={0.75} /><Kisi tur="katip" x={1060} y={500} s={0.75} />
        <text x={960} y={300} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#fff">ASKERÎ</text>
        <text x={960} y={340} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={26} fill="#fff">yönetenler</text>
      </g>
      <g opacity={Math.min(1, alt)}>
        {Array.from({length: 11}, (_, i) => <Kisi key={i} tur={i === 5 ? 'hasan' : i % 3 === 0 ? 'ayse' : i % 2 ? 'koylu' : 'koylu2'} x={420 + i * 108} y={940} s={0.8} />)}
        <text x={960} y={660} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={48} fill="#fff">REAYA</text>
        <text x={960} y={705} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={28} fill="#fff">vergi verenler</text>
      </g>
      {hasan > 0 && <g opacity={hasan}><circle cx={960} cy={860} r={110} fill="none" stroke="#f2c94c" strokeWidth={10} /><Etiket x={1150} y={780} g={hasan} renk="#c99a3b">Hasan</Etiket></g>}
    </g>
  );
};
const Tahrir: React.FC<{t: number}> = ({t}) => {
  const yaz = interpolate(t, [an(8), an(9) + 1.5], [0, 1], kis);
  const z = gir(t, an(9) - 0.2, 1.0);
  return (
    <g>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#3a2a20" />
      <circle cx={400} cy={300} r={500} fill="url(#mum)" opacity={0.6} />
      <g transform={`translate(${karis(960, 1180, z)},${karis(600, 560, z)}) scale(${karis(0.85, 1.35, z)})`}>
        <Defter x={0} y={0} satir={yaz} vurgu="Hasan veled-i Ali" vurguOp={gir(t, kelimeAni(9, 'ali') - 0.15, 0.3)} />
      </g>
      <g opacity={1 - z}><Kisi tur="katip" x={300} y={1000} s={1.8} kol={[80, 120 + Math.sin(t * 6) * 8]} kol2={[60, 100]} /></g>
      <Etiket x={960} y={110} g={zipla(t, kelimeAni(8, 'tahrir'))} renk="#8f1f1c">Tahrir: köy köy sayım</Etiket>
      <Etiket x={1180} y={880} g={zipla(t, kelimeAni(9, 'bir', ) + 0.1 > an(9) ? kelimeAni(9, 'hane') : an(9))} renk="#2d4a43">Ali oğlu Hasan · 1 hane</Etiket>
    </g>
  );
};
const Toprak: React.FC<{t: number}> = ({t}) => {
  const tarlalar = Array.from({length: 30}, (_, i) => ({x: 120 + (i % 6) * 290 + rnd(i) * 30, y: 140 + Math.floor(i / 6) * 180 + rnd(i + 3) * 20, w: 250 + rnd(i + 5) * 30, h: 150, renk: ['#c9a96a', '#a9b46a', '#b98a5a', '#d6c48a'][i % 4]}));
  const miri = zipla(t, kelimeAni(11, 'miri'), 0.4);
  const tapu = gir(t, an(12) - 0.3, 0.5) * (1 - gir(t, an(13) - 0.3, 0.3));
  const sat = gir(t, an(13) - 0.3, 0.5) * (1 - gir(t, an(14) - 0.3, 0.3));
  const cift = gir(t, an(14) - 0.3, 0.6);
  const vurgu = 14;
  return (
    <g>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#a98e5e" />
      {tarlalar.map((f, i) => <g key={i}><rect x={f.x} y={f.y} width={f.w} height={f.h} fill={f.renk} stroke="#7a6040" strokeWidth={4} />{Array.from({length: 6}, (_, k) => <path key={k} d={`M ${f.x + 10} ${f.y + 20 + k * 22} L ${f.x + f.w - 10} ${f.y + 20 + k * 22}`} stroke="#000" strokeOpacity={0.08} strokeWidth={3} />)}</g>)}
      <rect x={tarlalar[vurgu].x} y={tarlalar[vurgu].y} width={tarlalar[vurgu].w} height={tarlalar[vurgu].h} fill="none" stroke="#f2c94c" strokeWidth={12} opacity={gir(t, an(10), 0.5)} />
      <Etiket x={tarlalar[vurgu].x + 130} y={tarlalar[vurgu].y - 30} g={gir(t, an(10), 0.5)} renk="#c99a3b">Hasan'ın tarlası</Etiket>
      {miri > 0 && <g transform={`translate(960,540) rotate(-8) scale(${karis(1.8, 1, Math.min(1, miri))})`} opacity={Math.min(1, miri)}>
        <rect x={-360} y={-110} width={720} height={220} rx={20} fill="none" stroke="#b03a2e" strokeWidth={14} />
        <text x={0} y={-5} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={96} fill="#b03a2e">MİRİ ARAZİ</text>
        <text x={0} y={70} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#b03a2e">toprak devletindir</text>
      </g>}
      {tapu > 0 && <g opacity={tapu}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#000" opacity={0.35} />
        <g transform="translate(960,540) rotate(-2)">
          <rect x={-420} y={-300} width={840} height={600} fill={R.kagit} />
          <text x={0} y={-200} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={80} fill={R.murekkep}>Tapu</text>
          <text x={0} y={-140} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill={R.murekkep}>toprağı kullanma hakkı</text>
          {[['ekme', 'ekme'], ['biçme', 'biçme'], ['oğluna bırakma', 'oğluna']].map(([ad, kok], i) => {
            const g = zipla(t, kelimeAni(12, kok));
            return <g key={ad} opacity={Math.min(1, g)} transform={`translate(-260,${-40 + i * 100})`}><Isaret x={0} y={0} g={g} tip="ok" s={0.7} /><text x={60} y={14} fontFamily={METIN} fontWeight={800} fontSize={48} fill={R.murekkep}>{ad}</text></g>;
          })}
        </g>
      </g>}
      {sat > 0 && <g opacity={sat}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#000" opacity={0.4} />
        <g transform="translate(620,520)"><rect x={-200} y={-140} width={400} height={280} fill="#c9a96a" stroke="#fff" strokeWidth={8} /><text x={0} y={20} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={44} fill="#fff">SATILIK</text><Isaret x={150} y={-120} g={zipla(t, kelimeAni(13, 'satamaz'))} tip="x" s={1.4} /></g>
        <g opacity={gir(t, kelimeAni(13, 'bırakıp') - 0.1, 0.4)} transform="translate(1300,520)">
          {[0, 1, 2].map((i) => <Sikke key={i} x={-40 + i * 40} y={karis(-300, 20 - i * 6, gir(t, kelimeAni(13, 'çiftbozan') - 0.3 + i * 0.12, 0.4))} r={46} />)}
          <text x={0} y={140} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={44} fill="#fff">çiftbozan vergisi</text>
          <text x={0} y={190} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={30} fill="#fff">toprağı bırakıp gidene</text>
        </g>
      </g>}
      {cift > 0 && <g opacity={cift}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#c4a571" />
        <Gok zaman="gun" />
        <rect x={-200} y={620} width={W + 400} height={700} fill="#b08a5a" />
        {Array.from({length: 14}, (_, i) => <path key={i} d={`M -100 ${660 + i * 30} L ${karis(-100, 2020, Math.min(1, (t - an(14)) / 4))} ${660 + i * 30}`} stroke="#8a6a44" strokeWidth={6} opacity={0.6} />)}
        <g transform={`translate(${karis(300, 1400, Math.min(1, (t - an(14) + 0.3) / 4.5))},0)`}>
          <Okuz x={0} y={900} s={1} faz={t * 6} yuru={1} /><Okuz x={-40} y={930} s={1} faz={t * 6 + 1} yuru={1} renk="#8a5a3a" />
          <path d="M -150 840 L -260 880" stroke="#5a4030" strokeWidth={10} />
          <Kisi tur="hasan" x={-320} y={940} s={1.2} faz={t * 6} yuru={1} kol={[60, 80]} kol2={[40, 70]} />
        </g>
        <Etiket x={960} y={300} g={zipla(t, kelimeAni(14, 'çift'))} renk="#2d4a43" boyut={40}>1 çift = bir çift öküzün sürebildiği toprak</Etiket>
      </g>}
    </g>
  );
};
const Komsular: React.FC<{t: number}> = ({t}) => (
  <g>
    <Gok zaman="gun" />
    <Tepeler y={620} renk="#a8a090" seed={4} genlik={60} op={0.7} />
    <rect x={-200} y={720} width={W + 400} height={600} fill="#c4a571" />
    <path d="M 960 720 L 960 1080" stroke="#fff" strokeWidth={6} strokeDasharray="20 16" opacity={0.6} />
    <g opacity={gir(t, an(15) - 0.2, 0.5)}>{[0, 1, 2].map((i) => <Ev key={i} x={120 + i * 230} y={760} w={190} h={110} t={t} duman={i === 1 ? 1 : 0} />)}<Cami x={620} y={760} s={0.75} /></g>
    <g opacity={gir(t, kelimeAni(15, 'komşu') - 0.1, 0.5)}>{[0, 1, 2].map((i) => <Ev key={i} x={1080 + i * 230} y={760} w={190} h={110} t={t} duman={i === 0 ? 1 : 0} />)}<Kilise x={1640} y={760} s={0.85} /></g>
    <Etiket x={480} y={880} g={zipla(t, kelimeAni(15, 'müslüman'))} renk="#5f7d4a">Müslüman köy</Etiket>
    <Etiket x={1440} y={880} g={zipla(t, kelimeAni(15, 'hristiyan'))} renk="#6b4a7a">Hristiyan köy</Etiket>
    <Etiket x={1440} y={420} g={zipla(t, kelimeAni(15, 'cizye'))} renk="#8f1f1c" boyut={28}>cizye: gayrimüslim erkeklerin ödediği vergi</Etiket>
  </g>
);
const Sipahi: React.FC<{t: number}> = ({t}) => {
  const gel = Math.min(1, Math.max(0, (t - an(16) + 0.5) / 3));
  const sema = gir(t, an(17) - 0.2, 0.5) * (1 - gir(t, an(18) - 0.3, 0.3));
  const git = Math.max(0, (t - an(18)) / 4);
  const ordu = gir(t, an(19) - 0.2, 0.5);
  return (
    <g>
      <Gok zaman="gun" />
      <Tepeler y={600} renk="#a8a090" seed={6} genlik={50} op={0.7} />
      <rect x={-200} y={700} width={W + 400} height={600} fill="#c4a571" />
      {[0, 1, 2, 3].map((i) => <Ev key={i} x={100 + i * 260} y={740} w={200} h={120} t={t} />)}
      <g opacity={gir(t, an(18), 0.8)}>{[0, 1, 2, 3, 4].map((i) => <g key={i}><path d={`M ${1400 + i * 90} 700 L ${1440 + i * 90} 640 L ${1480 + i * 90} 700 Z`} fill="#efe6d4" /><path d={`M ${1440 + i * 90} 640 L ${1440 + i * 90} 600 L ${1470 + i * 90} 612 L ${1440 + i * 90} 624`} fill="#b03a2e" stroke="#5a4030" strokeWidth={2} /></g>)}</g>
      <At x={karis(-200, 800, gel) + git * 900} y={980} s={1.25} faz={t * 8} yuru={gel < 1 || git > 0 ? 1 : 0} binici />
      <Kisi tur="hasan" x={1100} y={1000} s={1.25} dir={-1} />
      <Etiket x={karis(-200, 800, gel) + git * 900} y={660} g={zipla(t, kelimeAni(16, 'sipahisi'))} renk="#8f1f1c">Sipahi</Etiket>
      {sema > 0 && <g opacity={sema}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#1f1a16" opacity={0.75} />
        {[['Padişah', 300, 'taç'], ['Tımar', 760, 'berat'], ['Sipahi', 1210, 'at'], ['Köy', 1640, 'vergi']].map(([ad, x], i) => {
          const g = zipla(t, an(17) + i * 1.2);
          return <g key={ad as string} opacity={Math.min(1, g)}><circle cx={x as number} cy={500} r={120} fill={['#c99a3b', '#efe3c6', '#8f1f1c', '#c4a571'][i]} stroke="#fff" strokeWidth={6} /><text x={x as number} y={515} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={38} fill={i === 1 ? R.murekkep : '#fff'}>{ad as string}</text>{i < 3 && <path d={`M ${(x as number) + 130} 500 L ${(x as number) + 320} 500`} stroke="#fff" strokeWidth={8} markerEnd="url(#ok)" opacity={gir(t, an(17) + i * 1.2 + 0.4, 0.3)} />}</g>;
        })}
        <text x={960} y={760} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={36} fill="#fff">Sipahi toprağın sahibi değil; vergisini toplar, karşılığında savaşa gider.</text>
      </g>}
      {ordu > 0 && <g opacity={ordu}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#1f1a16" opacity={0.6} />
        <g transform="translate(560,560)"><path d="M -110 120 L -130 -60 Q 0 -140 130 -60 L 110 120 Z" fill="#c9a96a" stroke="#fff" strokeWidth={6} /><text x={0} y={30} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#5a4030">buğday</text></g>
        <path d="M 760 560 L 1120 560" stroke="#fff" strokeWidth={10} markerEnd="url(#ok)" />
        <g transform="translate(1380,680)"><At x={0} y={0} s={0.9} binici /></g>
        <text x={1380} y={760} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#fff">ordu</text>
      </g>}
    </g>
  );
};
const Takvim: React.FC<{t: number}> = ({t}) => {
  const don = interpolate(t, [an(20), an(21) - 0.3], [-90, 270], {...kis, easing: yumus});
  return (
    <g>
      <Kagit />
      <g transform="translate(960,560)">
        <path d="M 0 -380 A 380 380 0 0 1 0 380 Z" fill="#a9c27a" opacity={gir(t, kelimeAni(20, 'hızır'), 0.5)} />
        <path d="M 0 380 A 380 380 0 0 1 0 -380 Z" fill="#9bb3c9" opacity={gir(t, kelimeAni(20, 'kasım'), 0.5)} />
        <circle r={380} fill="none" stroke={R.murekkep} strokeWidth={8} />
        <circle cx={190} cy={-60} r={60} fill="#f2c94c" opacity={gir(t, kelimeAni(20, 'hızır'), 0.5)} />
        {Array.from({length: 8}, (_, i) => <circle key={i} cx={-200 + (i % 4) * 50} cy={-80 + Math.floor(i / 4) * 60} r={10} fill="#fff" opacity={gir(t, kelimeAni(20, 'kasım'), 0.5)} />)}
        <path d={`M 0 0 L ${Math.cos((don * Math.PI) / 180) * 330} ${Math.sin((don * Math.PI) / 180) * 330}`} stroke={R.kirmizi} strokeWidth={12} strokeLinecap="round" />
        <circle r={20} fill={R.kirmizi} />
        <text x={190} y={80} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={64} fill={R.murekkep} opacity={gir(t, kelimeAni(20, 'hızır'), 0.5)}>Hızır</text>
        <text x={190} y={130} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={28} fill={R.murekkep} opacity={gir(t, kelimeAni(20, 'hızır'), 0.5)}>Mayıs başı → yaz</text>
        <text x={-190} y={80} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={64} fill={R.murekkep} opacity={gir(t, kelimeAni(20, 'kasım'), 0.5)}>Kasım</text>
        <text x={-190} y={130} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={28} fill={R.murekkep} opacity={gir(t, kelimeAni(20, 'kasım'), 0.5)}>Kasım başı → kış</text>
      </g>
    </g>
  );
};
const Tarla: React.FC<{t: number}> = ({t}) => {
  const ekin = gir(t, an(22) - 0.3, 0.5) * (1 - gir(t, an(23) - 0.3, 0.3));
  const hasat = gir(t, an(23) - 0.3, 0.5);
  const harman = gir(t, kelimeAni(23, 'harmanda') - 0.3, 0.6);
  const sur = Math.min(1, (t - an(21)) / 6);
  return (
    <g>
      <Gok zaman="gun" />
      <Tepeler y={560} renk="#9fae86" seed={7} genlik={60} op={0.8} />
      <rect x={-200} y={640} width={W + 400} height={700} fill="#8f6a44" />
      {Array.from({length: 12}, (_, i) => <path key={i} d={`M -100 ${680 + i * 34} L ${karis(-100, 2000, sur)} ${680 + i * 34}`} stroke="#6b4a2e" strokeWidth={5} opacity={0.6} />)}
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={200 + i * 380} cy={650 + (i % 2) * 20} r={6} fill="#e64a5a" opacity={0.8} />)}
      <g transform={`translate(${karis(200, 1500, sur)},0)`}>
        <Okuz x={0} y={940} s={1.1} faz={t * 6} yuru={1} /><Okuz x={-40} y={975} s={1.1} faz={t * 6 + 1} yuru={1} renk="#8a5a3a" />
        <path d="M -160 870 L -290 920 L -300 960" stroke="#5a4030" strokeWidth={10} fill="none" />
        <Kisi tur="hasan" x={-360} y={990} s={1.3} faz={t * 6} yuru={1} kol={[60, 80]} kol2={[40, 70]} />
      </g>
      <Etiket x={960} y={180} g={zipla(t, kelimeAni(21, 'hıdırellez'))} renk="#5f7d4a">Hıdırellez · yaz başlar</Etiket>
      <Etiket x={960} y={270} g={zipla(t, kelimeAni(21, 'sabana'))} renk="#5a4030" boyut={30}>öküzle çekilen tahta saban</Etiket>
      {ekin > 0 && <g opacity={ekin}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#9ec0de" />
        <rect x={-200} y={620} width={W + 400} height={700} fill="#8f6a44" />
        {[['Buğday', 0, '#d9b45a', 'buğday'], ['Arpa', 1, '#c9b46a', 'arpa'], ['Bağ, bahçe', 2, '#6f8a4f', 'bağ'], ['Nadas', 3, '#8f6a44', 'nadasa']].map(([ad, i, renk, kok]) => {
          const g = zipla(t, kelimeAni(22, kok as string));
          const x = 60 + (i as number) * 460;
          return <g key={ad as string} opacity={Math.min(1, g)}>
            <rect x={x} y={640} width={420} height={420} fill={i === 3 ? '#9a7a54' : '#a07a4e'} stroke="#6b4a2e" strokeWidth={6} />
            {(i as number) < 2 && <Bugday x={x + 10} y={1040} w={400} boy={240} t={t} renk={renk as string} sik={10} />}
            {i === 2 && Array.from({length: 5}, (_, k) => <g key={k}><path d={`M ${x + 40 + k * 80} 1040 L ${x + 40 + k * 80} 820`} stroke="#6b4a2e" strokeWidth={6} /><ellipse cx={x + 40 + k * 80} cy={830} rx={40} ry={30} fill="#6f8a4f" /><circle cx={x + 30 + k * 80} cy={860} r={10} fill="#6a2a5a" /></g>)}
            <Etiket x={x + 210} y={600} g={g} renk={i === 3 ? '#6b4a2e' : '#2d4a43'}>{ad as string}</Etiket>
          </g>;
        })}
      </g>}
      {hasat > 0 && <g opacity={hasat}>
        <Gok zaman="aksam" />
        <rect x={-200} y={640} width={W + 400} height={700} fill="#c9a24a" />
        {harman < 0.99 && <g opacity={1 - harman}>
          <Bugday x={0} y={1080} w={W} boy={260} t={t} sik={8} />
          <Kisi tur="hasan" x={karis(1500, 700, Math.min(1, (t - an(23)) / 3))} y={1000} s={1.4} dir={-1} egim={-20} kol={[120 + Math.sin(t * 7) * 30, 160]} kol2={[90, 120]} />
        </g>}
        {harman > 0 && <g opacity={harman}>
          <ellipse cx={960} cy={880} rx={700} ry={180} fill="#d9c38a" stroke="#a88a5a" strokeWidth={10} />
          {Array.from({length: 40}, (_, i) => <ellipse key={i} cx={960 + Math.cos(i) * rnd(i) * 600} cy={880 + Math.sin(i * 1.7) * rnd(i + 1) * 150} rx={30} ry={8} fill="#e9cf7a" />)}
          {(() => { const a = t * 1.1; const x = 960 + Math.cos(a) * 420, y = 880 + Math.sin(a) * 100; const d = Math.sin(a) > 0 ? -1 : 1; return <g><Okuz x={x} y={y + 40} s={0.9} dir={d} faz={t * 7} yuru={1} /><rect x={x - d * 160 - 60} y={y + 10} width={120} height={30} fill="#7a5a3a" /><Kisi tur="hasan" x={x - d * 160} y={y + 10} s={0.9} dir={d} /></g>; })()}
          {Array.from({length: 30}, (_, i) => { const f = (t * 0.6 + rnd(i)) % 1; return <ellipse key={i} cx={600 + rnd(i + 2) * 720 + f * 80} cy={860 - f * 220} rx={4} ry={2} fill="#f2e3b0" opacity={(1 - f) * 0.7} />; })}
          <Etiket x={960} y={560} g={harman} renk="#5a4030">harman: ekin döven ile dövülür</Etiket>
        </g>}
      </g>}
    </g>
  );
};
const Vergi: React.FC<{t: number}> = ({t}) => {
  const ayir = gir(t, kelimeAni(25, 'onda') - 0.2, 0.8);
  const nakit = gir(t, an(26) - 0.3, 0.5) * (1 - gir(t, an(27) - 0.3, 0.3));
  const kanun = gir(t, an(27) - 0.3, 0.5);
  return (
    <g>
      <Gok zaman="aksam" />
      <rect x={-200} y={620} width={W + 400} height={700} fill="#c9a24a" />
      {Array.from({length: 10}, (_, i) => {
        const vergi = i === 9;
        const x = 300 + i * 120 + (vergi ? ayir * 360 : 0), y = 860 - (vergi ? Math.sin(ayir * Math.PI) * 120 : 0);
        return <g key={i} transform={`translate(${x},${y})`}><path d="M -50 80 L -60 -40 Q 0 -80 60 -40 L 50 80 Z" fill={vergi ? '#d9c38a' : '#c9a96a'} stroke={vergi ? '#b03a2e' : '#7a5a3a'} strokeWidth={vergi ? 6 : 4} /></g>;
      })}
      <Kisi tur="koylu2" x={1760} y={1000} s={1.3} dir={-1} kol={[70, 100]} />
      <Etiket x={1760} y={660} g={zipla(t, an(24) + 0.3)} renk="#8f1f1c" boyut={28}>sipahinin adamı</Etiket>
      <Kisi tur="hasan" x={180} y={1000} s={1.3} />
      <g opacity={zipla(t, kelimeAni(25, 'onda'))}><text x={960} y={360} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={200} fill="#fff" style={{paintOrder: 'stroke'}} stroke="#5a4030" strokeWidth={8}>1/10</text></g>
      <Etiket x={960} y={460} g={zipla(t, kelimeAni(25, 'öşür'))} renk="#5a4030">Öşür</Etiket>
      <Etiket x={960} y={540} g={zipla(t, kelimeAni(25, 'fazlası'))} renk="#8f1f1c" boyut={28}>bazı yerlerde daha fazlası</Etiket>
      {nakit > 0 && <g opacity={nakit}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#2a2018" opacity={0.75} />
        <path d="M 860 760 Q 800 600 900 560 L 1020 560 Q 1120 600 1060 760 Z" fill="#8a6a44" />
        {Array.from({length: 7}, (_, i) => <Sikke key={i} x={960 + (i - 3) * 30} y={karis(-100, 600, gir(t, an(26) + i * 0.25, 0.5))} r={34} />)}
        <text x={960} y={300} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={64} fill="#fff">Çift resmi</text>
        <text x={960} y={370} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={34} fill="#fff" opacity={gir(t, kelimeAni(26, 'yöreye'), 0.4)}>yöreye göre değişen miktar · nakit (akçe)</text>
      </g>}
      {kanun > 0 && <g opacity={kanun}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#2a2018" opacity={0.8} />
        <g transform="translate(960,560)">
          <rect x={-440} y={-300 * gir(t, an(27), 1.2)} width={880} height={600 * gir(t, an(27), 1.2)} fill={R.kagit} />
          <rect x={-470} y={-330} width={940} height={50} rx={25} fill="#c9b48a" /><rect x={-470} y={280} width={940} height={50} rx={25} fill="#c9b48a" />
          {Array.from({length: 8}, (_, i) => <path key={i} d={`M -360 ${-200 + i * 56} ${Array.from({length: 14}, (_, j) => `q 13 ${-8 - rnd(i * 9 + j) * 10} 26 0`).join(' ')} `} stroke={R.murekkep} strokeWidth={3} fill="none" opacity={gir(t, an(27) + 0.5 + i * 0.15, 0.3)} />)}
          <circle cx={300} cy={200} r={60} fill="#9e2f25" opacity={zipla(t, kelimeAni(27, 'kanunname'))} />
        </g>
        <Etiket x={960} y={130} g={zipla(t, kelimeAni(27, 'kanunname'))} renk="#8f1f1c">Sancak kanunnamesi</Etiket>
        <Etiket x={960} y={215} g={zipla(t, kelimeAni(27, 'keyfi'))} renk="#2d4a43" boyut={30}>vergiler yazılı kurallara bağlı</Etiket>
      </g>}
    </g>
  );
};
const Pazar: React.FC<{t: number}> = ({t}) => {
  const sikke = gir(t, an(28) - 0.2, 0.5) * (1 - gir(t, kelimeAni(28, 'nakit') - 0.2, 0.3));
  const gx = interpolate(t, [kelimeAni(28, 'nakit'), an(29) + 3], [300, 1500], kis);
  return (
    <g>
      <Gok zaman="gun" />
      <rect x={-200} y={420} width={W + 400} height={460} fill="#d9c49a" />
      {Array.from({length: 6}, (_, i) => <g key={i}><rect x={60 + i * 320} y={520} width={260} height={300} fill="#c69a6a" /><path d={`M ${40 + i * 320} 520 L ${340 + i * 320} 520 L ${320 + i * 320} 600 L ${60 + i * 320} 600 Z`} fill={['#b03a2e', '#2d4a43', '#c99a3b'][i % 3]} />{Array.from({length: 5}, (_, k) => <path key={k} d={`M ${60 + i * 320 + k * 52} 520 L ${60 + i * 320 + k * 52} 600`} stroke="#fff" strokeOpacity={0.3} strokeWidth={10} />)}<rect x={80 + i * 320} y={700} width={220} height={60} fill="#8a6a44" />{[0, 1, 2].map((k) => <circle key={k} cx={120 + i * 320 + k * 70} cy={690} r={22} fill={['#d9b45a', '#c0392b', '#efe6d4'][(i + k) % 3]} />)}</g>)}
      <rect x={-200} y={880} width={W + 400} height={400} fill="#a9967a" />
      {Array.from({length: 7}, (_, i) => <Kisi key={i} tur={(['koylu', 'ayse', 'koylu2', 'katip'] as const)[i % 4]} x={(rnd(i) * 1800 + t * (i % 2 ? 30 : -30) + 2000) % 2000 - 40} y={1020 + (i % 2) * 20} s={1.1} dir={i % 2 ? 1 : -1} faz={t * 6 + i} yuru={1} />)}
      <g><Kisi tur="hasan" x={gx} y={1050} s={1.35} faz={t * 6} yuru={t > kelimeAni(28, 'nakit') ? 1 : 0} kol={[60, 90]} /><path d={`M ${gx + 50} 850 Q ${gx + 40} 790 ${gx + 80} 780 L ${gx + 120} 780 Q ${gx + 150} 800 ${gx + 140} 850 Z`} fill="#c9a96a" opacity={t < an(29) ? 1 : 0} /></g>
      {[['tuz', 'tuz', '#f4f2ee'], ['demir', 'demir', '#6b6f74'], ['kumaş', 'kumaş', '#7a2e2a']].map(([ad, kok, renk], i) => {
        const g = zipla(t, kelimeAni(29, kok));
        return <g key={ad} opacity={Math.min(1, g)} transform={`translate(${620 + i * 340},260) scale(${Math.min(1, g)})`}><circle r={100} fill="#fffaf0" stroke="#fff" strokeWidth={6} /><rect x={-50} y={-40} width={100} height={80} rx={i === 1 ? 4 : 20} fill={renk} stroke="#555" strokeWidth={3} /><text y={150} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#fff" style={{paintOrder: 'stroke'}} stroke="#000" strokeWidth={6}>{ad}</text></g>;
      })}
      {sikke > 0 && <g opacity={sikke}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#1f1a16" opacity={0.8} />
        <g transform={`translate(960,500) scale(${Math.abs(Math.cos(t * 1.4)) * 0.4 + 0.8},1)`}><Sikke x={0} y={0} r={200} /></g>
        <text x={960} y={820} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={80} fill="#fff">Akçe</text>
        <text x={960} y={880} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={34} fill="#fff">küçük bir gümüş sikke</text>
      </g>}
    </g>
  );
};
const Kadi: React.FC<{t: number}> = ({t}) => {
  const arsiv = gir(t, an(32) - 0.3, 0.6);
  return (
    <g>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#4a3a2c" />
      <rect x={-200} y={760} width={W + 400} height={500} fill="#6b4a32" />
      <rect x={-200} y={760} width={W + 400} height={500} fill="url(#hali)" opacity={0.4} />
      {[0, 1].map((i) => <path key={i} d={`M ${500 + i * 800} 160 L ${500 + i * 800} 520 Q ${600 + i * 800} 420 ${700 + i * 800} 520 L ${700 + i * 800} 160 Z`} fill="#e9d8b0" opacity={0.25} />)}
      <rect x={760} y={640} width={460} height={140} rx={20} fill="#7a2e2a" />
      <Kisi tur="kadi" x={990} y={780} s={1.5} kol={[50, 80]} kol2={[40, 70]} />
      <Kisi tur="katip" x={1360} y={980} s={1.3} dir={-1} kol={[80, 120 + Math.sin(t * 6) * 8]} />
      <rect x={1240} y={880} width={120} height={30} fill={R.kagit} />
      <Kisi tur="hasan" x={560} y={1020} s={1.45} kol={[100, 140]} yuz={t < an(31) ? 'uzgun' : 'duz'} />
      <Kisi tur="sipahi" x={360} y={1020} s={1.45} />
      <Etiket x={990} y={150} g={zipla(t, kelimeAni(31, 'kadıya'))} renk="#2d4a43">Kadı mahkemesi</Etiket>
      <Etiket x={1360} y={640} g={zipla(t, kelimeAni(31, 'deftere'))} renk="#5a4a6a" boyut={28}>karar deftere yazılır</Etiket>
      <text x={460} y={620} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={110} fill="#f2c94c" opacity={gir(t, an(30), 0.3) * (1 - gir(t, an(31), 0.3))}>?</text>
      {arsiv > 0 && <g opacity={arsiv}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#d9d4ca" />
        {Array.from({length: 5}, (_, r) => <g key={r}><rect x={0} y={120 + r * 190} width={W} height={20} fill="#8a8a8a" />{Array.from({length: 26}, (_, c) => <rect key={c} x={20 + c * 72 + rnd(r * 30 + c) * 6} y={120 + r * 190 - 150 + rnd(r * 9 + c) * 20} width={58} height={150 - rnd(r * 9 + c) * 20} fill={['#6b3a2a', '#4a3a2a', '#7a5a3a', '#3a2a20'][(r + c) % 4]} />)}</g>)}
        <Etiket x={960} y={540} g={zipla(t, kelimeAni(32, 'sicilleri'))} renk="#8f1f1c" boyut={44}>Şer'iyye sicilleri · bugün arşivlerde</Etiket>
        {[['şikâyetler', 'şikâyet'], ['borçlar', 'borç'], ['anlaşmazlıklar', 'anlaşmazlık']].map(([ad, kok], i) => <Etiket key={ad} x={560 + i * 400} y={700} g={zipla(t, kelimeAni(32, kok))} boyut={30}>{ad}</Etiket>)}
      </g>}
    </g>
  );
};
const Kis: React.FC<{t: number}> = ({t}) => (
  <g>
    <Gok zaman="kis" />
    <Tepeler y={560} renk="#dfe5ea" seed={8} genlik={60} />
    <rect x={-200} y={700} width={W + 400} height={600} fill="#eef1f3" />
    {[[200, 260], [520, 200], [800, 240], [1120, 220], [1400, 260]].map(([x, w], i) => <Ev key={i} x={x} y={760} w={w} h={130} t={t} duman={1} kar={1} isik />)}
    <g transform="translate(1720,760)"><rect x={-90} y={-160} width={180} height={160} fill="#9a7a54" /><path d="M -110 -160 L 0 -230 L 110 -160 Z" fill="#7a5a3a" /><path d="M -110 -160 L 0 -228 L 110 -160 Z" fill="#fff" opacity={0.85} /><text x={0} y={30} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={30} fill="#5a4030">ambar</text></g>
    {Array.from({length: 160}, (_, i) => <circle key={i} cx={(rnd(i) * 2100 + Math.sin(t + i) * 30) % 2000 - 40} cy={(rnd(i + 3) * 1200 + t * (40 + rnd(i) * 50)) % 1150 - 40} r={2 + rnd(i + 1) * 4} fill="#fff" opacity={0.85} />)}
    <Etiket x={960} y={200} g={zipla(t, kelimeAni(33, 'kasım'))} renk="#3d5a7a">Kasım günleri · kış</Etiket>
  </g>
);
const Degisim: React.FC<{t: number}> = ({t}) => {
  const k = gir(t, kelimeAni(35, 'gümüş') - 0.1, 2.2);
  const savas = gir(t, kelimeAni(35, 'savaşlar') - 0.2, 0.6) * (1 - gir(t, an(36) - 0.3, 0.3));
  const avariz = gir(t, an(36) - 0.3, 0.5);
  return (
    <g>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#2a2420" />
      <text x={960} y={300} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={90} fill="#efe3c6" opacity={gir(t, an(34), 0.5) * (1 - gir(t, an(35), 0.4))}>…her şey değişir.</text>
      <g opacity={gir(t, an(35) - 0.2, 0.4) * (1 - savas) * (1 - avariz)}>
        <Sikke x={560} y={560} r={karis(150, 95, k)} />
        <text x={560} y={800} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#efe3c6">gümüşün değeri düşer</text>
        <path d="M 1000 760 L 1700 760 M 1000 760 L 1000 360" stroke="#efe3c6" strokeWidth={4} />
        <path d={`M 1000 720 ${Array.from({length: 12}, (_, i) => `L ${1000 + i * 60} ${720 - Math.pow(i / 11, 1.6) * 330 * gir(t, kelimeAni(35, 'fiyatlar') - 0.2, 1.5)}`).join(' ')}`} stroke="#e74c3c" strokeWidth={10} fill="none" strokeLinecap="round" />
        <text x={1350} y={820} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#efe3c6" opacity={gir(t, kelimeAni(35, 'fiyatlar'), 0.4)}>fiyatlar artar</text>
      </g>
      {savas > 0 && <g opacity={savas}>
        {Array.from({length: 9}, (_, i) => <g key={i} transform={`translate(${200 + i * 200},${700 + (i % 2) * 40})`}><path d="M 0 0 L 0 -320" stroke="#3a2a20" strokeWidth={8} /><path d={`M 0 -320 Q 60 ${-300 + Math.sin(t * 5 + i) * 12} 120 -310 L 120 -230 Q 60 ${-220 + Math.sin(t * 5 + i + 1) * 12} 0 -240 Z`} fill={i % 2 ? '#8f1f1c' : '#2d4a43'} /></g>)}
        <text x={960} y={920} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={56} fill="#efe3c6">uzun savaşlar</text>
      </g>}
      {avariz > 0 && <g opacity={avariz}>
        {[1590, 1591, 1592, 1593, 1594, 1595, 1596].map((y, i) => {
          const g = zipla(t, an(36) + 0.6 + i * 0.6);
          return <g key={y} opacity={Math.min(1, g)} transform={`translate(${260 + i * 230},${520 + (i % 2) * 40}) rotate(${(i % 3) - 1 * 3})`}>
            <rect x={-95} y={-130} width={190} height={240} fill="#efe3c6" />
            <text x={0} y={-60} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={42} fill={R.murekkep}>{y}</text>
            <g transform="rotate(-14)"><rect x={-86} y={-10} width={172} height={64} fill="none" stroke="#b03a2e" strokeWidth={6} /><text x={0} y={36} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={34} fill="#b03a2e">AVARIZ</text></g>
          </g>;
        })}
        <text x={960} y={260} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={44} fill="#efe3c6">savaş vergisi her yıl</text>
        <text x={960} y={900} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={26} fill="#efe3c6" opacity={0.7}>yıllar temsilîdir</text>
      </g>}
    </g>
  );
};
const Celali: React.FC<{t: number}> = ({t}) => {
  const kac = gir(t, an(38) - 0.3, 0.6);
  return (
    <g>
      <Gok zaman="kasvet" />
      <Tepeler y={620} renk="#4a3a30" seed={9} genlik={80} />
      <rect x={-200} y={720} width={W + 400} height={600} fill="#5a4a3a" />
      {[0, 1].map((i) => <g key={i}>{Array.from({length: 6}, (_, k) => { const f = (t * 0.2 + k / 6) % 1; return <circle key={k} cx={1450 + i * 220 + Math.sin(t + k) * 20 + f * 60} cy={700 - f * 420} r={30 + f * 90} fill="#3a3430" opacity={(1 - f) * 0.7} />; })}</g>)}
      {[0, 1, 2].map((i) => <Ev key={i} x={1380 + i * 200} y={730} w={170} h={100} />)}
      {Array.from({length: 6}, (_, i) => <At key={i} x={((t * 260 + i * 220) % 2400) - 300} y={640 + (i % 2) * 30} s={0.55} faz={t * 10 + i} yuru={1} renk="#1f1a16" />)}
      <Etiket x={960} y={180} g={zipla(t, kelimeAni(37, 'celali'))} renk="#8f1f1c">Celali isyanları</Etiket>
      {kac > 0 && <g opacity={kac}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#3a3028" opacity={0.6} />
        <path d="M -200 1000 Q 960 880 2100 960" stroke="#8a7a5a" strokeWidth={120} fill="none" />
        {Array.from({length: 7}, (_, i) => <Kisi key={i} tur={(['hasan', 'ayse', 'cocuk', 'koylu', 'nine', 'koylu2', 'cocuk'] as const)[i]} x={((t - an(38)) * 90 + i * 150) % 2100 - 100} y={990 - i * 3} s={1.05} faz={t * 6 + i} yuru={1} kol={[60, 90]} />)}
        <g transform={`translate(${((t - an(38)) * 90 + 1150) % 2200 - 150},980)`}><Okuz x={0} y={0} s={0.7} faz={t * 6} yuru={1} /><rect x={-260} y={-90} width={160} height={70} fill="#7a5a3a" /><circle cx={-240} cy={-10} r={26} fill="none" stroke="#3a2a20" strokeWidth={8} /><circle cx={-120} cy={-10} r={26} fill="none" stroke="#3a2a20" strokeWidth={8} /></g>
        <g transform="translate(1560,330)" opacity={gir(t, kelimeAni(38, 'tarihçiler'), 0.5)}>
          <path d="M -260 -60 Q -100 -130 120 -110 Q 260 -90 280 -10 Q 240 80 60 90 Q -140 110 -260 60 Q -300 0 -260 -60 Z" fill="#c9b48a" stroke="#efe3c6" strokeWidth={5} />
          {[[-60, -10, -260, -120], [0, 10, 40, -160], [40, 20, 260, 140], [-20, 30, -220, 160]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M ${x0} ${y0} L ${karis(x0, x1, gir(t, kelimeAni(38, 'tarihçiler') + i * 0.2, 0.8))} ${karis(y0, y1, gir(t, kelimeAni(38, 'tarihçiler') + i * 0.2, 0.8))}`} stroke="#b03a2e" strokeWidth={8} markerEnd="url(#ok)" />)}
          <text x={0} y={150} textAnchor="middle" fontFamily={METIN} fontWeight={600} fontSize={24} fill="#efe3c6">Anadolu (temsilî)</text>
        </g>
        <Etiket x={760} y={180} g={zipla(t, kelimeAni(38, 'büyük'))} renk="#8f1f1c" boyut={44}>Büyük Kaçgun · 1600'lerin başı</Etiket>
      </g>}
    </g>
  );
};
const Son: React.FC<{t: number}> = ({t}) => {
  const genis = gir(t, an(40) - 0.3, 1.2);
  const soru = gir(t, an(41) - 0.3, 0.5);
  return (
    <g>
      <Gok zaman="aksam" />
      <circle cx={1500} cy={640} r={260} fill="url(#gunes)" />
      <Tepeler y={640} renk="#6a5a5a" seed={10} genlik={50} op={0.8} />
      <rect x={-200} y={720} width={W + 400} height={600} fill="#7a6a4a" />
      <g transform={`translate(960,800) scale(${karis(1, 0.45, genis)}) translate(-960,-800)`}>
        <path d="M 960 1080 L 900 740 M 960 1080 L 1300 760" stroke="#9a8a6a" strokeWidth={60} fill="none" />
        {[0, 1, 2].map((i) => <Ev key={i} x={300 + i * 180} y={760} w={150} h={90} t={t} duman={1} />)}
        <Kisi tur="hasan" x={960} y={1060} s={2.2} dir={-1} yuz="uzgun" />
      </g>
      {genis > 0 && <g opacity={genis}>{Array.from({length: 90}, (_, i) => <Kisi key={i} tur={(['koylu', 'ayse', 'koylu2', 'hasan'] as const)[i % 4]} x={40 + (i % 18) * 106 + rnd(i) * 30} y={820 + Math.floor(i / 18) * 52} s={0.32} faz={t * 4 + i} yuru={0.4} />)}</g>}
      <Etiket x={960} y={200} g={zipla(t, kelimeAni(40, 'emeğine'))} renk="#5a4030" boyut={42}>İmparatorluğun gücü: köylünün emeği</Etiket>
      <Etiket x={960} y={160} g={zipla(t, kelimeAni(39, 'bilmiyoruz')) * (1 - gir(t, an(40) - 0.3, 0.3))} renk="#3a3028" boyut={36}>Hasan'a ne oldu? Bilmiyoruz.</Etiket>
      {soru > 0 && <g opacity={soru}>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#1f1a16" opacity={0.6} />
        <text x={960} y={330} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={90} fill="#fff">Sen olsan?</text>
        {[['KALIRDIM', 640, '#2d4a43', 'kalır'], ['KAÇARDIM', 1280, '#8f1f1c', 'kaçar']].map(([ad, x, renk, kok]) => {
          const g = zipla(t, kelimeAni(41, kok as string));
          return <g key={ad as string} opacity={Math.min(1, g)} transform={`translate(${x},560) scale(${Math.min(1, g)})`}><rect x={-240} y={-90} width={480} height={180} rx={36} fill={renk as string} stroke="#fff" strokeWidth={6} /><text y={22} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={64} fill="#fff">{ad as string}</text></g>;
        })}
        <text x={960} y={820} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={48} fill="#fff" opacity={gir(t, kelimeAni(41, 'yorumlara'), 0.4)}>💬 Yorumlara yaz</text>
      </g>}
    </g>
  );
};
const Outro: React.FC<{t: number}> = ({t}) => {
  const abone = gir(t, an(43) - 0.2, 0.5);
  const tik = gir(t, kelimeAni(43, 'abone'), 0.25);
  return (
    <g>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#1d2328" />
      <circle cx={600} cy={560} r={420} fill="url(#mum)" opacity={0.5} />
      <Kisi tur="yeniceri" x={600} y={980} s={3.2} op={gir(t, an(42), 0.6)} />
      <g opacity={gir(t, an(42) + 0.2, 0.6)}>
        <text x={1260} y={360} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={40} fill="#c99a3b" letterSpacing={8}>SONRAKİ BÖLÜM</text>
        <text x={1260} y={470} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={86} fill="#fff">Osmanlı'da bir</text>
        <text x={1260} y={570} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={86} fill="#fff">yeniçeri olsaydın?</text>
      </g>
      {abone > 0 && <g opacity={abone} transform={`translate(1260,760) scale(${1 - tik * 0.08 + Math.max(0, tik - 0.5) * 0.16})`}>
        <rect x={-230} y={-60} width={460} height={120} rx={20} fill={tik > 0.5 ? '#5a5a5a' : '#cc0000'} />
        <text y={20} textAnchor="middle" fontFamily={METIN} fontWeight={800} fontSize={52} fill="#fff">{tik > 0.5 ? 'ABONE OLUNDU' : 'ABONE OL'}</text>
        <g transform="translate(300,0)" opacity={gir(t, kelimeAni(43, 'abone') + 0.4, 0.3)}><path d="M -26 20 L -26 -8 Q -26 -34 0 -38 Q 26 -34 26 -8 L 26 20 L 34 28 L -34 28 Z" fill="#fff" /><circle cx={0} cy={36} r={8} fill="#fff" /></g>
      </g>}
    </g>
  );
};
const SAHNELER = [Kanca, Koy, Toplum, Tahrir, Toprak, Komsular, Sipahi, Takvim, Tarla, Vergi, Pazar, Kadi, Kis, Degisim, Celali, Son, Outro];

// ---- altyazı ------------------------------------------------------------------------------
const Altyazi: React.FC<{t: number}> = ({t}) => {
  const aktif = K.filter((k) => k.s - 0.05 <= t).pop();
  if (!aktif) return null;
  const satir = K.filter((k) => k.c === aktif.c);
  if (t > satir[satir.length - 1].e + 0.4) return null;
  // uzun satırları iki parçaya böl
  const parcalar: Kelime[][] = [];
  let p: Kelime[] = [], uz = 0;
  satir.forEach((k) => { if (uz + k.w.length > 58 && p.length) { parcalar.push(p); p = []; uz = 0; } p.push(k); uz += k.w.length + 1; });
  parcalar.push(p);
  const goster = parcalar.find((pp) => pp.includes(aktif)) ?? parcalar[0];
  return (
    <div style={{position: 'absolute', left: 160, right: 160, bottom: 56, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(12,10,8,.78)', borderRadius: 18, padding: '12px 28px 14px', textAlign: 'center', fontFamily: METIN, fontWeight: 800, fontSize: 44, lineHeight: 1.25, letterSpacing: -0.3}}>
        {goster.map((k, i) => {
          const u = interpolate(t, [k.s - 0.05, k.s + 0.08], [0, 1], kis);
          return <span key={i} style={{display: 'inline-block', marginRight: 12, opacity: Math.max(0.001, u), color: k === aktif ? '#ffc27a' : '#fff'}}>{k.w}</span>;
        })}
      </div>
    </div>
  );
};

const Tanimlar: React.FC<{t: number}> = ({t}) => (
  <defs>
    <radialGradient id="gunes"><stop offset="0%" stopColor="#fff2cf" stopOpacity="0.95" /><stop offset="100%" stopColor="#fff2cf" stopOpacity="0" /></radialGradient>
    <radialGradient id="mum"><stop offset="0%" stopColor="#f3c37a" stopOpacity="0.8" /><stop offset="100%" stopColor="#f3c37a" stopOpacity="0" /></radialGradient>
    <radialGradient id="gumus" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#f4f6f8" /><stop offset="55%" stopColor="#c3c7cb" /><stop offset="100%" stopColor="#8a8f94" /></radialGradient>
    <pattern id="kagitDoku" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M 0 14 L 14 0" stroke="#b9a983" strokeOpacity="0.2" strokeWidth="1" /></pattern>
    <pattern id="kerpicDoku" width="40" height="22" patternUnits="userSpaceOnUse"><path d="M 0 11 L 40 11 M 0 22 L 40 22 M 20 0 L 20 11" stroke="#8a6a44" strokeWidth="1.5" opacity="0.6" /></pattern>
    <pattern id="hali" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#8f2a24" /><path d="M 40 6 L 74 40 L 40 74 L 6 40 Z" fill="none" stroke="#e8c27a" strokeWidth="4" /><circle cx="40" cy="40" r="8" fill="#2d4a43" /></pattern>
    <marker id="ok" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" /></marker>
    <filter id="fluArka"><feGaussianBlur stdDeviation="8" /></filter>
    <radialGradient id="vinyet" cx="50%" cy="50%" r="72%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#1e140a" stopOpacity="0.5" /></radialGradient>
    <filter id="gren" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 12)} /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.2" /></filter>
  </defs>
);

const yaziBekle = () => {
  const [b] = React.useState(() => delayRender('yazı tipleri'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 44px 'Inter'", 'ğüşıöçİÂ'), document.fonts.load("600 30px 'Inter'", 'ğüşıöçİ'), document.fonts.load("italic 700 90px 'Playfair Display'", 'ğüşıöçİ'), document.fonts.ready]).then(() => continueRender(b));
  }, [b]);
};

const Video: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  yaziBekle();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('koylu/mix.wav')} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Tanimlar t={t} />
        {SAHNELER.map((Sahne, i) => {
          const op = sahneOp(t, i);
          if (op <= 0.001) return null;
          const bas = SB[i], bit = i < SB.length - 1 ? SB[i + 1] : SURE;
          const z = 1 + 0.045 * Math.min(1.2, Math.max(0, (t - bas) / (bit - bas)));
          return <g key={i} opacity={op} transform={`translate(${W / 2},${H / 2}) scale(${z}) translate(${-W / 2},${-H / 2})`}><Sahne t={t} /></g>;
        })}
        <rect width={W} height={H} fill="url(#vinyet)" />
        <rect width={W} height={H} filter="url(#gren)" opacity={0.05} />
      </svg>
      {/* bölüm rozeti */}
      {SB.map((b, i) => {
        if (!BOLUM[i]) return null;
        const g = gir(t, b + 0.3, 0.4) * (1 - gir(t, b + 3.5, 0.4));
        if (g <= 0.001) return null;
        return <div key={i} style={{position: 'absolute', left: 48, top: 40, opacity: g, transform: `translateX(${(1 - g) * -30}px)`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: METIN}}>
          <div style={{background: '#c99a3b', color: '#1f1a16', fontWeight: 800, fontSize: 26, padding: '8px 16px', borderRadius: 10}}>{String(i).padStart(2, '0')}</div>
          <div style={{background: 'rgba(15,12,10,.7)', color: '#fff', fontWeight: 800, fontSize: 30, padding: '8px 20px', borderRadius: 10}}>{BOLUM[i]}</div>
        </div>;
      })}
      <div style={{position: 'absolute', right: 40, top: 40, fontFamily: METIN, fontWeight: 600, fontSize: 22, color: '#fff', background: 'rgba(0,0,0,.4)', padding: '6px 14px', borderRadius: 10, opacity: t < 30 || t > SURE - 20 ? 0.85 : 0}}>Temsilî animasyon · Hasan hayalî bir karakterdir</div>
      <Altyazi t={t} />
    </AbsoluteFill>
  );
};

// YouTube kapak görseli (1280x720)
const Kapak: React.FC = () => {
  yaziBekle();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg width={1280} height={720} viewBox="0 0 1920 1080">
        <Tanimlar t={0} />
        <Gok zaman="aksam" />
        <circle cx={1500} cy={600} r={380} fill="url(#gunes)" />
        <Tepeler y={660} renk="#6a5a5a" seed={10} genlik={50} op={0.8} />
        <rect x={-200} y={740} width={W + 400} height={500} fill="#8a6a44" />
        {[0, 1, 2, 3].map((i) => <Ev key={i} x={1100 + i * 200} y={780} w={170} h={100} />)}
        <Cami x={1820} y={780} s={0.6} />
        <Bugday x={0} y={1080} w={W} boy={160} t={0} sik={10} />
        <Kisi tur="hasan" x={430} y={1240} s={4.6} kol={[14, 8]} kol2={[-14, -8]} />
        <rect width={W} height={H} fill="url(#vinyet)" />
      </svg>
      <div style={{position: 'absolute', left: 520, right: 30, top: 70, fontFamily: METIN, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,.75)'}}>
        <div style={{display: 'inline-block', background: '#c99a3b', color: '#1f1a16', fontWeight: 800, fontSize: 30, padding: '6px 16px', borderRadius: 10, textShadow: 'none'}}>1580'LER · ANADOLU</div>
        <div style={{fontWeight: 800, fontSize: 96, lineHeight: 0.98, marginTop: 14, letterSpacing: -2}}>OSMANLI'DA<br /><span style={{color: '#ffc27a'}}>KÖYLÜ</span> OLSAYDIN?</div>
        <div style={{fontWeight: 800, fontSize: 34, marginTop: 18, background: 'rgba(143,31,28,.9)', display: 'inline-block', padding: '8px 16px', borderRadius: 10, textShadow: 'none'}}>Vergi, toprak, sipahi… bir yıl</div>
      </div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <>
    <Composition id="Video" component={Video} durationInFrames={SURE * FPS} fps={FPS} width={W} height={H} />
    <Still id="Kapak" component={Kapak} width={1280} height={720} />
  </>
);

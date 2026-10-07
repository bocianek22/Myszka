/* =====================================================================
   ✏️  CONFIG — wszystko, co osobiste, zmieniasz TYLKO tutaj
   ===================================================================== */
const CONFIG = {
  // Imię — wstawiane w miejsce {imie} w wiadomości
  imie: 'Julcia',

  // Główna wiadomość (pisze się litera po literze pod bukietem)
  wiadomosc:
    '{imie}, jestem daleko, ale myślami cały czas przy Tobie. ' +
    'Ten bukiet nigdy nie zwiędnie. Mam nadzieję, że zobaczymy się niebawem. ❤️',

  // Podpis pod wiadomością
  podpis: 'Twój Łukasz',

  // Ekran startowy
  napisStartowy: 'Mam dla Ciebie coś…',
  przycisk: 'Kliknij 💌',

  // Licznik „Do zobaczenia za X dni” — data w formacie RRRR-MM-DD
  pokazLicznik: false,
  dataPowrotu: '2026-12-20',

  // Muzyka: nazwa pliku leżącego obok index.html ('' = bez muzyki).
  // Jeśli pliku nie ma, strona po prostu działa bez dźwięku.
  muzyka: '',
  glosnosc: 0.6, // 0–1 (iPhone ignoruje i gra z głośnością systemową)

  // Szybkość pisania: średnia liczba milisekund na literę
  tempoPisania: 55,
};

/* ===================================================================== */

(() => {
  'use strict';

  /* ---------- Ustawienia środowiska ---------- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowTier = coarse || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;

  const Q = lowTier
    ? { stars: 75, flies: 12, petals: 12, hearts: 6, burst: 22, sparks: 8, maxFx: 150, swayEvery: 2 }
    : { stars: 170, flies: 26, petals: 26, hearts: 12, burst: 38, sparks: 14, maxFx: 320, swayEvery: 1 };

  if (reduced) document.documentElement.classList.add('reduced');

  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;
  const f1 = (n) => Math.round(n * 10) / 10;

  const introEl = $('#intro');
  const sceneEl = $('#scene');
  const openBtn = $('#open');
  const svg = $('#bouquet');
  const msgEl = $('#msg');
  const msgSrEl = $('#msg-sr');
  const sigEl = $('#sig');
  const countdownEl = $('#countdown');
  const hintEl = $('#hint');
  const muteBtn = $('#mute');
  const bgCanvas = $('#bg');
  const fxCanvas = $('#fx');
  const bgCtx = bgCanvas.getContext('2d');
  const fxCtx = fxCanvas.getContext('2d');

  $('#intro-title').textContent = CONFIG.napisStartowy;
  openBtn.textContent = CONFIG.przycisk;

  /* =====================================================================
     MUZYKA
     ===================================================================== */
  let audio = null;
  let muted = false;

  function startMusic() {
    if (!CONFIG.muzyka) return;
    try {
      audio = new Audio(CONFIG.muzyka);
    } catch (e) {
      return;
    }
    audio.loop = true;
    audio.volume = Math.min(1, Math.max(0, CONFIG.glosnosc));
    audio.addEventListener('playing', () => { muteBtn.hidden = false; }, { once: true });
    audio.addEventListener('error', () => { audio = null; muteBtn.hidden = true; });
    const p = audio.play(); // musi być wywołane bezpośrednio w obsłudze kliknięcia (iOS)
    if (p && p.catch) p.catch(() => {});
  }

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!audio) return;
    muted = !muted;
    audio.muted = muted;
    if (!muted && audio.paused) audio.play().catch(() => {});
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'Włącz muzykę' : 'Wycisz muzykę');
  });

  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (!muted) audio.play().catch(() => {});
  });

  /* =====================================================================
     BUKIET (SVG)
     ===================================================================== */
  const NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function timing(e, delay, dur) {
    e.style.setProperty('--d', delay.toFixed(2) + 's');
    e.style.setProperty('--t', dur.toFixed(2) + 's');
  }
  // Element, który „wyskakuje” (skaluje się od 0) wokół punktu (x, y)
  function popAt(parent, x, y, rot, delay, dur, sx = 1, sy = 1) {
    const holder = S('g', { transform: `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${sx} ${sy})` }, parent);
    const g = S('g', { class: 'pop' }, holder);
    timing(g, delay, dur);
    return g;
  }

  // Kolory: [podstawa płatka, środek, czubek]
  const PAL = {
    roseRed: ['#6e0b22', '#c9184a', '#ff5c80'],
    roseDeep: ['#4f0614', '#9d0a1c', '#e5383b'],
    rosePink: ['#a83367', '#ee7ba3', '#ffd0de'],
    rosePeach: ['#b8541c', '#f4a259', '#ffe1b0'],
    tulipRed: ['#7d0a12', '#e63946', '#ff9aa8'],
    tulipYellow: ['#c06a00', '#ffb703', '#fff0a0'],
    tulipPink: ['#8e1c58', '#e05297', '#ffc3e0'],
    daisy: ['#cfc2e6', '#f7f2ff', '#ffffff'],
    daisyPink: ['#e59ab9', '#fde0ec', '#fff8fb'],
    sun: ['#b85a00', '#f9a602', '#ffe066'],
    sunGold: ['#9c4400', '#e88d00', '#ffcf40'],
  };

  // Rozkład kwiatów w układzie 400×520: [x, y, typ, rozmiar, paleta]
  const LAYOUT = [
    [200, 80, 'sunflower', 44, 'sun'],
    [118, 122, 'rose', 33, 'rosePink'],
    [284, 116, 'tulip', 31, 'tulipYellow'],
    [56, 196, 'daisy', 28, 'daisy'],
    [346, 186, 'rose', 29, 'rosePeach'],
    [168, 172, 'tulip', 29, 'tulipPink'],
    [246, 176, 'daisy', 31, 'daisy'],
    [312, 254, 'sunflower', 31, 'sunGold'],
    [92, 266, 'tulip', 26, 'tulipRed'],
    [140, 240, 'rose', 35, 'roseDeep'],
    [266, 272, 'daisy', 24, 'daisyPink'],
    [206, 252, 'rose', 41, 'roseRed'],
    [232, 122, 'tulip', 24, 'tulipRed'],
    [168, 306, 'daisy', 22, 'daisyPink'],
    [248, 322, 'rose', 25, 'rosePeach'],
  ];

  const GX = 200;
  const GY = 438;
  const swayItems = [];
  let bouquetDone = 0; // czas (s) zakończenia całej animacji wzrostu

  function buildDefs() {
    const defs = S('defs', {}, svg);
    for (const id in PAL) {
      const [a, b, c] = PAL[id];
      const g = S('radialGradient', { id: 'g-' + id, cx: 0.5, cy: 1, r: 1.05, fx: 0.5, fy: 1 }, defs);
      S('stop', { offset: 0, 'stop-color': a }, g);
      S('stop', { offset: 0.55, 'stop-color': b }, g);
      S('stop', { offset: 1, 'stop-color': c }, g);
    }
    const stem = S('linearGradient', { id: 'g-stem', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 520, x2: 0, y2: 60 }, defs);
    S('stop', { offset: 0, 'stop-color': '#1f4a33' }, stem);
    S('stop', { offset: 1, 'stop-color': '#4f9a63' }, stem);

    const leaf = S('linearGradient', { id: 'g-leaf', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    S('stop', { offset: 0, 'stop-color': '#2f7a4a' }, leaf);
    S('stop', { offset: 1, 'stop-color': '#7cc48a' }, leaf);

    const euca = S('linearGradient', { id: 'g-euca', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    S('stop', { offset: 0, 'stop-color': '#6f9a86' }, euca);
    S('stop', { offset: 1, 'stop-color': '#b5d3bf' }, euca);

    const sunC = S('radialGradient', { id: 'g-suncenter' }, defs);
    S('stop', { offset: 0, 'stop-color': '#2b1508' }, sunC);
    S('stop', { offset: 0.75, 'stop-color': '#5a3112' }, sunC);
    S('stop', { offset: 1, 'stop-color': '#7d4a1c' }, sunC);

    const daisyC = S('radialGradient', { id: 'g-daisycenter', cx: 0.4, cy: 0.35 }, defs);
    S('stop', { offset: 0, 'stop-color': '#fff1a1' }, daisyC);
    S('stop', { offset: 0.6, 'stop-color': '#ffc93c' }, daisyC);
    S('stop', { offset: 1, 'stop-color': '#d98e04' }, daisyC);

    const ribbon = S('linearGradient', { id: 'g-ribbon', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    S('stop', { offset: 0, 'stop-color': '#ffb3c8' }, ribbon);
    S('stop', { offset: 1, 'stop-color': '#d6336c' }, ribbon);
  }

  /* ---------- Kształty płatków (rysowane w górę od punktu 0,0) ---------- */
  const roundPetal = (r, w = 0.78) =>
    `M0 0C${f1(-w * r)} ${f1(-0.15 * r)} ${f1(-w * r * 1.05)} ${f1(-0.95 * r)} 0 ${f1(-r)}` +
    `C${f1(w * r * 1.05)} ${f1(-0.95 * r)} ${f1(w * r)} ${f1(-0.15 * r)} 0 0Z`;
  const pointedPetal = (h, w) =>
    `M0 0C${f1(-w)} ${f1(-0.1 * h)} ${f1(-w * 1.05)} ${f1(-0.72 * h)} 0 ${f1(-h)}` +
    `C${f1(w * 1.05)} ${f1(-0.72 * h)} ${f1(w)} ${f1(-0.1 * h)} 0 0Z`;
  const narrowPetal = (r, w) =>
    `M0 0C${f1(-w)} ${f1(-0.3 * r)} ${f1(-w)} ${f1(-0.92 * r)} 0 ${f1(-r)}` +
    `C${f1(w)} ${f1(-0.92 * r)} ${f1(w)} ${f1(-0.3 * r)} 0 0Z`;

  function rose(head, r, pal, t0) {
    const fill = `url(#g-${pal})`;
    const edge = PAL[pal][0];
    const rings = [
      { n: 5, rr: r, off: 0, delay: 0.42, dur: 1.1 },
      { n: 5, rr: r * 0.76, off: 36, delay: 0.22, dur: 1.0 },
      { n: 4, rr: r * 0.52, off: 15, delay: 0.05, dur: 0.9 },
    ];
    let end = t0;
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++) {
        const d = t0 + ring.delay + i * 0.05 + rand(0, 0.08);
        const p = popAt(head, 0, 0, (i * 360) / ring.n + ring.off + rand(-7, 7), d, ring.dur);
        S('path', { d: roundPetal(ring.rr * rand(0.92, 1.05)), fill, stroke: edge, 'stroke-width': 0.7, 'stroke-opacity': 0.45 }, p);
        end = Math.max(end, d + ring.dur);
      }
    }
    // zwinięty środek róży
    const c = popAt(head, 0, 0, rand(0, 360), t0, 0.8);
    S('circle', { r: f1(r * 0.3), fill }, c);
    S('path', {
      d: `M${f1(-r * 0.2)} 0A${f1(r * 0.2)} ${f1(r * 0.2)} 0 1 1 ${f1(r * 0.08)} ${f1(r * 0.17)}` +
         `M${f1(-r * 0.07)} ${f1(-r * 0.02)}A${f1(r * 0.09)} ${f1(r * 0.09)} 0 1 1 ${f1(r * 0.06)} ${f1(r * 0.07)}`,
      fill: 'none', stroke: edge, 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-opacity': 0.75,
    }, c);
    return end;
  }

  function tulip(head, r, pal, t0) {
    const fill = `url(#g-${pal})`;
    const edge = PAL[pal][0];
    const h = r * 1.4;
    const w = r * 0.6;
    const parts = [
      { rot: -21, sx: 1, delay: 0 },
      { rot: 21, sx: 1, delay: 0.08 },
      { rot: rand(-3, 3), sx: 0.92, delay: 0.2 },
    ];
    let end = t0;
    for (const pt of parts) {
      const d = t0 + pt.delay + rand(0, 0.06);
      const p = popAt(head, 0, 0, pt.rot, d, 1.15, pt.sx, 1);
      S('path', { d: pointedPetal(h, w), fill, stroke: edge, 'stroke-width': 0.8, 'stroke-opacity': 0.5 }, p);
      end = Math.max(end, d + 1.15);
    }
    return end;
  }

  function daisy(head, r, pal, t0) {
    const n = 16;
    const fill = `url(#g-${pal})`;
    let end = t0;
    for (let i = 0; i < n; i++) {
      const d = t0 + 0.15 + i * 0.035 + rand(0, 0.05);
      const p = popAt(head, 0, 0, (i * 360) / n + rand(-4, 4), d, 0.85);
      S('path', { d: narrowPetal(r * rand(0.92, 1.04), r * 0.17), fill, stroke: '#c9b8de', 'stroke-width': 0.5, 'stroke-opacity': 0.7 }, p);
      end = Math.max(end, d + 0.85);
    }
    const c = popAt(head, 0, 0, 0, t0, 0.7);
    S('circle', { r: f1(r * 0.3), fill: 'url(#g-daisycenter)' }, c);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996;
      const rr = Math.sqrt(i / 9) * r * 0.2;
      S('circle', { cx: f1(Math.cos(a) * rr), cy: f1(Math.sin(a) * rr), r: f1(r * 0.035), fill: '#b86f00', opacity: 0.6 }, c);
    }
    return end;
  }

  function sunflower(head, r, pal, t0) {
    const fill = `url(#g-${pal})`;
    const edge = PAL[pal][0];
    let end = t0;
    const n = 20;
    for (const [rr, off, extra] of [[r, 0, 0.25], [r * 0.84, 180 / n, 0.1]]) {
      for (let i = 0; i < n; i++) {
        const d = t0 + extra + i * 0.03 + rand(0, 0.05);
        const p = popAt(head, 0, 0, (i * 360) / n + off + rand(-3, 3), d, 0.9);
        S('path', { d: pointedPetal(rr * rand(0.93, 1.04), r * 0.17), fill, stroke: edge, 'stroke-width': 0.6, 'stroke-opacity': 0.5 }, p);
        end = Math.max(end, d + 0.9);
      }
    }
    const c = popAt(head, 0, 0, 0, t0, 0.8);
    S('circle', { r: f1(r * 0.44), fill: 'url(#g-suncenter)', stroke: '#8a5a2b', 'stroke-width': 1 }, c);
    const seeds = 38;
    for (let i = 1; i < seeds; i++) {
      const a = i * 2.39996;
      const rr = Math.sqrt(i / seeds) * r * 0.39;
      S('circle', { cx: f1(Math.cos(a) * rr), cy: f1(Math.sin(a) * rr), r: f1(r * 0.03), fill: i % 2 ? '#a0703c' : '#1c0d04', opacity: 0.85 }, c);
    }
    return end;
  }

  const FLOWERS = { rose, tulip, daisy, sunflower };

  function stemPath(sx, sy, gx, gy, fx, fy) {
    const cx = gx + (fx - gx) * 0.18;
    const cy = gy - (gy - fy) * 0.62;
    return { d: `M${f1(sx)} ${f1(sy)}L${f1(gx)} ${f1(gy)}Q${f1(cx)} ${f1(cy)} ${f1(fx)} ${f1(fy)}`, cx, cy };
  }

  function addStem(layer, d, width, color, delay, speed) {
    const path = S('path', { d, class: 'stem', stroke: color, 'stroke-width': width }, layer);
    const len = path.getTotalLength();
    path.setAttribute('stroke-dasharray', `${f1(len)} ${f1(len + 30)}`);
    path.style.setProperty('--off', f1(len + 6));
    const dur = len / speed;
    timing(path, delay, dur);
    return { path, len, dur };
  }

  function makeSway(groups, amp) {
    const item = { groups, amp, f: rand(0.16, 0.26), ph: rand(0, TAU), head: null };
    swayItems.push(item);
    return item;
  }

  function buildBouquet() {
    svg.textContent = '';
    swayItems.length = 0;
    buildDefs();

    const backLayer = S('g', {}, svg);
    const stemLayer = S('g', {}, svg);
    const leafLayer = S('g', {}, svg);
    const flowerLayer = S('g', {}, svg);
    const ribbonLayer = S('g', {}, svg);

    let end = 0;

    /* --- Gałązki eukaliptusa (tło) --- */
    for (const [fx, fy] of [[22, 300], [378, 296], [150, 60], [262, 50]]) {
      const tx = fx + rand(-8, 8);
      const ty = fy + rand(-8, 8);
      const g = S('g', {}, backLayer);
      const sx = GX - (tx - GX) * 0.12 + rand(-4, 4);
      const { d } = stemPath(sx, rand(498, 510), GX + rand(-3, 3), GY + rand(-3, 3), tx, ty);
      const delay = rand(0.1, 0.7);
      const st = addStem(g, d, 2, '#5f8a73', delay, rand(170, 210));
      const count = 7;
      for (let i = 0; i < count; i++) {
        const frac = 0.42 + (i / (count - 1)) * 0.56;
        const at = st.len * frac;
        const pt = st.path.getPointAtLength(at);
        const pt2 = st.path.getPointAtLength(Math.max(0, at - 2));
        const ang = Math.atan2(pt.y - pt2.y, pt.x - pt2.x) * DEG;
        const side = i % 2 ? 1 : -1;
        const ld = delay + st.dur * frac;
        const p = popAt(g, pt.x, pt.y, ang + side * 62, ld, 0.7);
        const s = rand(6, 8.5) * (1.1 - frac * 0.4);
        S('ellipse', { cx: f1(s * 1.15), cy: 0, rx: f1(s * 1.15), ry: f1(s), fill: 'url(#g-euca)', stroke: '#4f7a66', 'stroke-width': 0.6 }, p);
        end = Math.max(end, ld + 0.7);
      }
      makeSway([g], rand(1.2, 2));
    }

    /* --- Gipsówka: drobne białe kwiatuszki (tło) --- */
    for (const [fx, fy] of [[96, 150], [306, 150], [44, 250], [356, 250]]) {
      const tx = fx + rand(-8, 8);
      const ty = fy + rand(-8, 8);
      const g = S('g', {}, backLayer);
      const sx = GX - (tx - GX) * 0.12 + rand(-4, 4);
      const { d } = stemPath(sx, rand(498, 510), GX + rand(-3, 3), GY + rand(-3, 3), tx, ty);
      const delay = rand(0.3, 1.0);
      const st = addStem(g, d, 1.3, '#4c7a5c', delay, rand(170, 220));
      const t0 = delay + st.dur * 0.95;
      for (let i = 0; i < 13; i++) {
        const a = rand(0, TAU);
        const dist = rand(5, 19);
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist * 0.8 - 4;
        const p = popAt(g, tx, ty, 0, t0 + rand(0, 0.5), 0.6);
        S('path', { d: `M0 0L${f1(dx)} ${f1(dy)}`, stroke: '#5d8a69', 'stroke-width': 0.6 }, p);
        S('circle', { cx: f1(dx), cy: f1(dy), r: f1(rand(1.6, 2.7)), fill: i % 4 ? '#fffaf5' : '#ffe0ec' }, p);
        end = Math.max(end, t0 + 1.1);
      }
      makeSway([g], rand(1.5, 2.4));
    }

    /* --- Kwiaty --- */
    const order = LAYOUT.slice().sort((a, b) => a[1] - b[1]); // z tyłu (wyżej) → z przodu (niżej)
    order.forEach(([x, y, type, size, pal]) => {
      const fx = x + rand(-6, 6);
      const fy = y + rand(-6, 6);
      const r = size * rand(1.0, 1.14);
      const gx = GX + rand(-4, 4);
      const gy = GY + rand(-3, 3);
      const sx = GX - (fx - GX) * 0.12 + rand(-5, 5);
      const { d, cx, cy } = stemPath(sx, rand(496, 512), gx, gy, fx, fy);

      const sg = S('g', {}, stemLayer);
      const lg = S('g', {}, leafLayer);
      const fg = S('g', {}, flowerLayer);

      const delay = rand(0, 1.3);
      const st = addStem(sg, d, rand(2.8, 3.6), 'url(#g-stem)', delay, rand(150, 200));

      // liście na łodydze
      const leaves = Math.random() < 0.55 ? 2 : 1;
      for (let i = 0; i < leaves; i++) {
        const frac = rand(0.38, 0.68) + i * 0.1;
        const at = st.len * frac;
        const pt = st.path.getPointAtLength(at);
        const pt2 = st.path.getPointAtLength(Math.max(0, at - 2));
        const tan = Math.atan2(pt.y - pt2.y, pt.x - pt2.x) * DEG;
        const side = (i === 0) === (fx < GX) ? -1 : 1;
        const ld = delay + st.dur * frac;
        const L = rand(22, 32);
        const p = popAt(lg, pt.x, pt.y, tan + side * rand(38, 55), ld, 0.9);
        S('path', {
          d: `M0 0C${f1(L * 0.25)} ${f1(-L * 0.3)} ${f1(L * 0.72)} ${f1(-L * 0.28)} ${f1(L)} 0` +
             `C${f1(L * 0.7)} ${f1(L * 0.22)} ${f1(L * 0.25)} ${f1(L * 0.24)} 0 0Z`,
          fill: 'url(#g-leaf)', stroke: '#1f5134', 'stroke-width': 0.6,
        }, p);
        S('path', { d: `M1 0Q${f1(L * 0.5)} ${f1(-L * 0.05)} ${f1(L * 0.92)} 0`, fill: 'none', stroke: '#a8dcb0', 'stroke-width': 0.7, 'stroke-opacity': 0.7 }, p);
        end = Math.max(end, ld + 0.9);
      }

      // główka kwiatu
      const tangent = Math.atan2(fy - cy, fx - cx) * DEG + 90;
      const isFace = type !== 'tulip';
      const baseRot = isFace ? tangent * 0.3 + rand(-8, 8) : tangent;
      const sy = isFace ? rand(0.84, 0.95) : 1;
      const pos = S('g', {}, fg);
      const head = S('g', { class: 'pop' }, pos);
      const t0 = delay + st.dur * 0.94;
      timing(head, t0, 0.6);
      const fEnd = FLOWERS[type](head, r, pal, t0);
      end = Math.max(end, fEnd);

      const item = makeSway([sg, lg, fg], rand(1.1, 2.2));
      item.head = { el: pos, x: fx, y: fy, rot: baseRot, sy };
      pos.setAttribute('transform', `translate(${f1(fx)} ${f1(fy)}) rotate(${f1(baseRot)}) scale(1 ${sy.toFixed(2)})`);
    });

    /* --- Wstążka --- */
    const ribbonT = 1.5;
    const rb = popAt(ribbonLayer, GX, GY, 0, ribbonT, 0.9);
    const loop = 'M0 0C-12 -22 -40 -20 -36 -2C-34 12 -12 10 0 0Z';
    const tail = 'M-2 4Q-9 28 -22 54L-13 51L-7 60Q1 32 3 5Z';
    S('path', { d: tail, fill: 'url(#g-ribbon)', stroke: '#a3164f', 'stroke-width': 0.8 }, rb);
    S('path', { d: tail, fill: 'url(#g-ribbon)', stroke: '#a3164f', 'stroke-width': 0.8, transform: 'scale(-1 1)' }, rb);
    S('rect', { x: -15, y: -7, width: 30, height: 14, rx: 4, fill: 'url(#g-ribbon)', stroke: '#a3164f', 'stroke-width': 0.8 }, rb);
    S('path', { d: loop, fill: 'url(#g-ribbon)', stroke: '#a3164f', 'stroke-width': 0.8 }, rb);
    S('path', { d: loop, fill: 'url(#g-ribbon)', stroke: '#a3164f', 'stroke-width': 0.8, transform: 'scale(-1 1)' }, rb);
    S('circle', { r: 6.5, fill: '#f6c96b', stroke: '#b8862b', 'stroke-width': 0.8 }, rb);
    S('circle', { cx: -2, cy: -2, r: 2, fill: '#fff4d1', opacity: 0.8 }, rb);
    end = Math.max(end, ribbonT + 0.9);

    bouquetDone = end;
  }

  /* ---------- Kołysanie na wietrze ---------- */
  let swayStart = 0;
  let swayFrame = 0;
  function updateSway(t) {
    if (!swayItems.length || reduced) return;
    if (++swayFrame % Q.swayEvery) return;
    const ramp = Math.min(1, (t - swayStart) / 5);
    for (const it of swayItems) {
      const wave = Math.sin(t * it.f * TAU + it.ph) + 0.35 * Math.sin(t * it.f * 2.3 * TAU + it.ph * 1.7);
      const a = (it.amp * ramp * wave).toFixed(2);
      const tr = `rotate(${a} ${GX} ${GY})`;
      for (const g of it.groups) g.setAttribute('transform', tr);
      if (it.head) {
        const h = it.head;
        const nod = h.rot + it.amp * ramp * 1.2 * Math.sin(t * it.f * 1.6 * TAU + it.ph + 1);
        h.el.setAttribute('transform', `translate(${f1(h.x)} ${f1(h.y)}) rotate(${nod.toFixed(2)}) scale(1 ${h.sy.toFixed(2)})`);
      }
    }
  }

  /* =====================================================================
     CZĄSTECZKI (Canvas)
     ===================================================================== */
  let W = 0;
  let H = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const c of [bgCanvas, fxCanvas]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    }
    if (reduced) drawBg(0, 0);
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  function sprite(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.translate(size / 2, size / 2);
    draw(x, size);
    return c;
  }

  function heartPath(x, k) {
    x.beginPath();
    x.moveTo(0, k * 0.95);
    x.bezierCurveTo(-k * 1.55, -k * 0.05, -k * 0.95, -k * 1.3, 0, -k * 0.45);
    x.bezierCurveTo(k * 0.95, -k * 1.3, k * 1.55, -k * 0.05, 0, k * 0.95);
    x.closePath();
  }

  const HEART_COLORS = ['#ff4d6d', '#ff8fab', '#ffb3c6', '#e5383b', '#f6c96b', '#ff6f91'];
  const PETAL_COLORS = [['#ff4d6d', '#ffc2d1'], ['#e5383b', '#ff8fa3'], ['#ffb3c6', '#fff0f5'], ['#ffb703', '#fff0a0'], ['#f4a259', '#ffe1b0'], ['#fbf7ff', '#ffffff']];

  const heartSprites = HEART_COLORS.map((col) => sprite(64, (x) => {
    x.shadowColor = col;
    x.shadowBlur = 8;
    heartPath(x, 19);
    const g = x.createLinearGradient(0, -22, 0, 20);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, col);
    g.addColorStop(1, col);
    x.fillStyle = g;
    x.fill();
    x.shadowBlur = 0;
    x.globalAlpha = 0.55;
    x.fillStyle = '#fff';
    x.beginPath();
    x.ellipse(-8, -10, 4, 2.4, -0.6, 0, TAU);
    x.fill();
  }));

  const petalSprites = PETAL_COLORS.map(([a, b]) => sprite(48, (x) => {
    const k = 18;
    x.beginPath();
    x.moveTo(0, -k);
    x.bezierCurveTo(k * 0.95, -k * 0.6, k * 0.6, k * 0.85, 0, k);
    x.bezierCurveTo(-k * 0.6, k * 0.85, -k * 0.95, -k * 0.6, 0, -k);
    const g = x.createLinearGradient(0, -k, 0, k);
    g.addColorStop(0, b);
    g.addColorStop(1, a);
    x.fillStyle = g;
    x.fill();
  }));

  const glow = (col, size) => sprite(size, (x, s) => {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.18, col);
    g.addColorStop(0.45, col + '55');
    g.addColorStop(1, col + '00');
    x.fillStyle = g;
    x.fillRect(-s / 2, -s / 2, s, s);
  });
  const fireflySprite = glow('#ffe08a', 64);
  const sparkSprite = glow('#ffd6a0', 32);
  const starSprite = glow('#dfe6ff', 16);

  /* ---------- Gwiazdy i świetliki (tło) ---------- */
  const stars = Array.from({ length: Q.stars }, () => ({
    x: Math.random(),
    y: Math.pow(Math.random(), 1.4),
    s: rand(2, 5.5),
    base: rand(0.25, 0.75),
    amp: rand(0.15, 0.45),
    sp: rand(0.6, 2.2),
    ph: rand(0, TAU),
  }));
  const flies = Array.from({ length: Q.flies }, () => ({
    x: Math.random(),
    y: rand(0.25, 1),
    s: rand(12, 26),
    f1: rand(0.05, 0.12),
    f2: rand(0.04, 0.1),
    ph: rand(0, TAU),
    pp: rand(0.4, 1.1),
    sp: rand(10, 22),
  }));

  function drawBg(t, dt) {
    const c = bgCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of stars) {
      const a = reduced ? s.base : s.base + s.amp * Math.sin(t * s.sp + s.ph);
      c.globalAlpha = Math.max(0, Math.min(1, a));
      c.drawImage(starSprite, s.x * W - s.s / 2, s.y * H - s.s / 2, s.s, s.s);
    }
    for (const fl of flies) {
      if (!reduced) {
        fl.x += (Math.cos(t * fl.f1 * TAU + fl.ph) * fl.sp * dt) / W;
        fl.y += (Math.sin(t * fl.f2 * TAU + fl.ph * 1.3) * fl.sp * dt) / H;
        if (fl.x < -0.05) fl.x = 1.05;
        if (fl.x > 1.05) fl.x = -0.05;
        if (fl.y < 0.1) fl.y = 1.05;
        if (fl.y > 1.05) fl.y = 0.1;
      }
      const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * fl.pp * TAU + fl.ph);
      c.globalAlpha = 0.15 + 0.7 * pulse * pulse;
      c.drawImage(fireflySprite, fl.x * W - fl.s / 2, fl.y * H - fl.s / 2, fl.s, fl.s);
    }
    c.globalAlpha = 1;
  }

  /* ---------- Płatki, serduszka, fajerwerki (pierwszy plan) ---------- */
  const ambient = [];
  const fx = [];
  let ambientOn = false;
  let ambientT = 0;

  function spawnPetal(initial) {
    return {
      kind: 'petal',
      x: rand(0, W),
      y: initial ? rand(-H * 0.6, -10) : rand(-40, -12),
      vy: rand(24, 50),
      sw: rand(14, 34),
      sf: rand(0.25, 0.6),
      ph: rand(0, TAU),
      rot: rand(0, TAU),
      vr: rand(-1.3, 1.3),
      flip: rand(0, TAU),
      vf: rand(1.5, 3.6),
      s: rand(10, 16),
      a: rand(0.6, 0.9),
      spr: pick(petalSprites),
    };
  }
  function spawnHeart() {
    return {
      kind: 'heart',
      x0: rand(W * 0.06, W * 0.94),
      x: 0,
      y: H + rand(10, 40),
      vy: -rand(22, 48),
      sw: rand(10, 26),
      sf: rand(0.2, 0.5),
      ph: rand(0, TAU),
      rot: rand(-0.3, 0.3),
      s: rand(12, 22),
      a: rand(0.45, 0.8),
      spr: pick(heartSprites),
    };
  }

  function startAmbient() {
    if (reduced || ambientOn) return;
    ambientOn = true;
    for (let i = 0; i < Math.ceil(Q.petals / 2); i++) ambient.push(spawnPetal(true));
  }

  function drawSprite(c, spr, x, y, size, rot, sx, sy, alpha) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    c.globalAlpha = alpha;
    c.setTransform(dpr * cos * sx, dpr * sin * sx, -dpr * sin * sy, dpr * cos * sy, dpr * x, dpr * y);
    c.drawImage(spr, -size / 2, -size / 2, size, size);
  }

  function burst(x, y) {
    const n = Q.burst;
    const power = reduced ? 0.3 : 1;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rand(-0.18, 0.18);
      const sp = rand(130, 330) * power;
      const heart = Math.random() < 0.62;
      fx.push({
        kind: heart ? 'heart' : 'petal',
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 70 * power,
        rot: heart ? rand(-0.4, 0.4) : rand(0, TAU),
        vr: heart ? rand(-1.5, 1.5) : rand(-5, 5),
        flip: rand(0, TAU),
        vf: rand(3, 7),
        s: heart ? rand(18, 32) : rand(13, 21),
        spr: heart ? pick(heartSprites) : pick(petalSprites),
        life: 0,
        max: rand(1.3, 2.2),
        g: reduced ? 20 : 230,
      });
    }
    if (!reduced) {
      for (let i = 0; i < Q.sparks; i++) {
        const ang = rand(0, TAU);
        const sp = rand(200, 420);
        fx.push({ kind: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, s: rand(10, 20), life: 0, max: rand(0.5, 0.9), g: 60, rot: 0, vr: 0 });
      }
      fx.push({ kind: 'ring', x, y, life: 0, max: 0.6 });
    }
    if (fx.length > Q.maxFx) fx.splice(0, fx.length - Q.maxFx);
    wake();
  }

  function drawFx(t, dt) {
    const c = fxCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    // ambientowe płatki i serduszka
    if (ambientOn) {
      ambientT += dt;
      const petalsNow = ambient.reduce((n, p) => n + (p.kind === 'petal'), 0);
      const heartsNow = ambient.length - petalsNow;
      if (petalsNow < Q.petals && Math.random() < dt * 2.2) ambient.push(spawnPetal(false));
      if (heartsNow < Q.hearts && Math.random() < dt * 0.9) ambient.push(spawnHeart());
    }
    for (let i = ambient.length - 1; i >= 0; i--) {
      const p = ambient[i];
      if (p.kind === 'petal') {
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        const x = p.x + Math.sin(ambientT * p.sf * TAU + p.ph) * p.sw;
        if (p.y > H + 30) { ambient.splice(i, 1); continue; }
        drawSprite(c, p.spr, x, p.y, p.s, p.rot, Math.cos(p.flip), 1, p.a);
      } else {
        p.y += p.vy * dt;
        const x = p.x0 + Math.sin(ambientT * p.sf * TAU + p.ph) * p.sw;
        if (p.y < -30) { ambient.splice(i, 1); continue; }
        const fade = Math.min(1, (H + 20 - p.y) / 140) * Math.min(1, Math.max(0, p.y) / (H * 0.35));
        drawSprite(c, p.spr, x, p.y, p.s, p.rot + Math.sin(ambientT * 1.3 + p.ph) * 0.15, 1, 1, p.a * fade);
      }
    }

    // fajerwerki
    const drag = Math.pow(0.16, dt);
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { fx.splice(i, 1); continue; }
      if (p.kind === 'ring') {
        const e = 1 - Math.pow(1 - k, 3);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.globalAlpha = (1 - k) * 0.55;
        c.strokeStyle = '#ffd6e3';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(p.x, p.y, 8 + 85 * e, 0, TAU);
        c.stroke();
        continue;
      }
      p.vx *= drag;
      p.vy = p.vy * drag + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const alpha = 1 - k * k;
      const grow = Math.min(1, p.life * 7);
      if (p.kind === 'spark') {
        c.globalCompositeOperation = 'lighter';
        drawSprite(c, sparkSprite, p.x, p.y, p.s * (1 - k * 0.5), 0, 1, 1, alpha);
        c.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'petal') {
        p.flip += p.vf * dt;
        drawSprite(c, p.spr, p.x, p.y, p.s * grow, p.rot, Math.cos(p.flip), 1, alpha);
      } else {
        drawSprite(c, p.spr, p.x, p.y, p.s * grow, p.rot, 1, 1, alpha);
      }
    }
    c.globalAlpha = 1;
  }

  /* ---------- Główna pętla ---------- */
  let running = false;
  let last = 0;
  let T = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    T += dt;
    if (!reduced) drawBg(T, dt);
    drawFx(T, dt);
    updateSway(T);
    if (reduced && fx.length === 0) {
      running = false;
      fxCtx.setTransform(1, 0, 0, 1, 0, 0);
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      return;
    }
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  /* =====================================================================
     WIADOMOŚĆ — maszyna do pisania
     ===================================================================== */
  function graphemes(text) {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('pl', { granularity: 'grapheme' }).segment(text), (s) => s.segment);
    }
    const out = [];
    for (const ch of Array.from(text)) {
      const prev = out[out.length - 1];
      if (prev && (/[️‍\u{1F3FB}-\u{1F3FF}]/u.test(ch) || prev.endsWith('‍'))) out[out.length - 1] += ch;
      else out.push(ch);
    }
    return out;
  }

  // Cały tekst jest od razu w układzie (niewidoczny), więc nic nie „skacze” podczas pisania.
  function buildMessage(text) {
    msgEl.textContent = '';
    const chars = [];
    let word = null;
    for (const g of graphemes(text)) {
      if (/^\s+$/.test(g)) {
        word = null;
        const sp = document.createElement('span');
        sp.className = 'ch';
        sp.textContent = ' ';
        msgEl.appendChild(sp);
        chars.push(sp);
        continue;
      }
      if (!word) {
        word = document.createElement('span');
        word.className = 'w';
        msgEl.appendChild(word);
      }
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = g;
      word.appendChild(c);
      chars.push(c);
    }
    return chars;
  }

  function typeOut(chars, done) {
    if (reduced) {
      chars.forEach((c) => c.classList.add('on'));
      setTimeout(done, 1600);
      return;
    }
    const caret = document.createElement('span');
    caret.className = 'caret';
    let i = 0;
    const step = () => {
      if (i >= chars.length) {
        caret.classList.add('end');
        setTimeout(() => caret.remove(), 1500);
        done();
        return;
      }
      const c = chars[i++];
      c.classList.add('on');
      c.parentNode.insertBefore(caret, c.nextSibling);
      let d = CONFIG.tempoPisania * rand(0.6, 1.45);
      const g = c.textContent;
      if (g === ',') d += 240;
      else if (/[.!?…]/.test(g)) d += 520;
      setTimeout(step, d);
    };
    step();
  }

  function countdownHTML() {
    if (!CONFIG.pokazLicznik || !CONFIG.dataPowrotu) return '';
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(CONFIG.dataPowrotu).trim());
    if (!m) return '';
    const target = new Date(+m[1], +m[2] - 1, +m[3]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((target - today) / 864e5);
    if (days < 0) return '';
    if (days === 0) return 'Do zobaczenia już <b>dziś</b>! 🥰';
    if (days === 1) return 'Do zobaczenia już <b>jutro</b>! 🥰';
    return `Do zobaczenia za <b>${days}</b> dni ✈️`;
  }

  /* =====================================================================
     SCENARIUSZ
     ===================================================================== */
  let started = false;
  let tapsEnabled = false;
  let hintShown = false;

  const fullText = CONFIG.wiadomosc.split('{imie}').join(CONFIG.imie);
  msgSrEl.textContent = fullText + ' — ' + CONFIG.podpis;
  sigEl.textContent = CONFIG.podpis;
  countdownEl.innerHTML = countdownHTML();
  hintEl.textContent = coarse ? 'Dotknij ekranu ✨' : 'Kliknij gdziekolwiek ✨';
  const chars = buildMessage(fullText);

  function start() {
    if (started) return;
    started = true;
    startMusic();
    introEl.classList.add('hide');

    buildBouquet();
    sceneEl.classList.add('on');
    svg.getBoundingClientRect(); // wymuś reflow, by przejścia CSS wystartowały od zera
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.classList.add('grow');
        swayStart = T;
      });
    });

    tapsEnabled = true;
    const total = reduced ? 1.2 : bouquetDone;
    setTimeout(startAmbient, total * 1000 * 0.85);

    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const wait = new Promise((r) => setTimeout(r, (reduced ? 1.4 : Math.max(2.5, total * 0.72)) * 1000));
    Promise.all([fontsReady, wait]).then(() => {
      typeOut(chars, () => {
        sigEl.classList.add('on');
        setTimeout(() => countdownEl.classList.add('on'), 900);
        setTimeout(() => {
          if (!hintShown) hintEl.classList.add('on');
        }, 2200);
      });
    });
  }

  openBtn.addEventListener('click', start);

  sceneEl.addEventListener('click', (e) => {
    if (!tapsEnabled) return;
    burst(e.clientX, e.clientY);
    hintShown = true;
    if (hintEl.classList.contains('on')) hintEl.classList.add('off');
  });

  resize();
  if (reduced) drawBg(0, 0);
  else wake();
})();

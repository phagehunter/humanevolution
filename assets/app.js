/* Twenty-Four Cousins — interface script.
   Data is embedded by build.py as <script type="application/json" id="species-data">. */
(function () {
  'use strict';

  const DATA = JSON.parse(document.getElementById('species-data').textContent);
  const SPECIES = DATA.species;          // oldest first
  const BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));
  const SOURCES = DATA.sources;

  const GROUP_COLOR = {
    'Pre-australopith': 'var(--c-pre)',
    'Australopithecus': 'var(--c-australopithecus)',
    'Paranthropus': 'var(--c-paranthropus)',
    'Homo': 'var(--c-homo)',
    'Sapiens': 'var(--c-sapiens)'
  };
  const GROUP_HEX = {
    'Pre-australopith': '#9fb0c4', 'Australopithecus': '#b99253', 'Paranthropus': '#cf7452', 'Homo': '#c5a059', 'Sapiens': '#efe6cf'
  };
  const colorOf = s => GROUP_COLOR[s.group] || 'var(--gold)';
  const hexOf = s => GROUP_HEX[s.group] || '#c5a059';

  /* ── time scale: square-root so the crowded last half-million years stay legible ── */
  const T_MAX = 7.4;
  const pos = t => 1 - Math.sqrt(Math.max(0, t) / T_MAX);      // 0 (oldest, left) .. 1 (now, right)
  const TICKS = [7, 5, 3, 2, 1, 0.5, 0.2, 0.05, 0];
  const tickLabel = t => t === 0 ? 'now' : t >= 1 ? `${t} Ma` : `${Math.round(t * 1000)} ka`;

  const fmtTime = t => {
    if (t === 0) return 'present day';
    if (t >= 1) return `${t.toFixed(t % 1 === 0 ? 0 : 2)} million years ago`;
    return `${Math.round(t * 1000).toLocaleString()},000 years ago`;
  };
  const fmtSpan = s => {
    const a = s.time.max, b = s.time.min;
    const f = t => t === 0 ? 'now' : t >= 1 ? `${t.toFixed(t % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '')} Ma` : `${Math.round(t * 1000)} ka`;
    return `${f(a)} – ${f(b)}`;
  };
  const num = (v, unit = '') => v == null ? '—' : `${Math.round(v).toLocaleString()}${unit}`;
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function epochOf(t) {
    if (t > 5.333) return 'Miocene';
    if (t > 2.58) return 'Pliocene';
    if (t > 0.774) return 'Early Pleistocene';
    if (t > 0.129) return 'Middle Pleistocene';
    if (t > 0.0117) return 'Late Pleistocene';
    return 'Holocene';
  }
  function commentaryOf(t) {
    if (t > 6.3) return 'The deep dawn. Toumaï, the Sahelanthropus skull from Chad, is the oldest candidate for an upright ape.';
    if (t > 5.8) return 'Orrorin in the Tugen Hills of Kenya: a thigh bone built for walking, arms still built for trees.';
    if (t > 4.5) return 'A quiet stretch in this list. Ardipithecus kadabba (5.8–5.2 Ma) lived here but is not one of the twenty-four, so no cell lights up.';
    if (t > 4.2) return 'Ardi. Ardipithecus ramidus walked on two legs in a woodland, with a grasping big toe for climbing.';
    if (t > 3.9) return 'The first australopiths. Au. anamensis has a shin bone unmistakably built for upright walking.';
    if (t > 3.3) return 'Lucy’s world. Au. afarensis leaves footprints at Laetoli; a cousin, Au. bahrelghazali, lives far to the west in Chad. The oldest known stone tools (Lomekwi, 3.3 Ma) date to this time.';
    if (t > 2.6) return 'Southern Africa joins the story with Au. africanus. The robust Paranthropus line begins with the Black Skull.';
    if (t > 2.0) return 'The Oldowan toolkit appears (about 2.6 Ma). Early Homo, robust Paranthropus and the last australopiths share the landscape.';
    if (t > 1.5) return 'Out of Africa. The Dmanisi people are in the Caucasus by 1.8 Ma; Homo erectus and ergaster carry the Acheulean hand-axe (from 1.76 Ma).';
    if (t > 0.8) return 'Homo erectus spreads across Asia. The earliest widely accepted evidence of controlled fire is about 1 million years old.';
    if (t > 0.4) return 'Middle Pleistocene humans: Homo heidelbergensis in Europe and Africa, Homo antecessor at Atapuerca, big-game hunters with wooden spears.';
    if (t > 0.2) return 'The crowded chapter. Around 300,000 years ago Neanderthals, Homo naledi, Kabwe-type Africans, late Homo erectus and the first Homo sapiens all exist at once. Denisovans, known mainly from DNA, are not in this list.';
    if (t > 0.04) return 'The pruning. Homo sapiens leaves Africa for good; Neanderthals vanish about 40,000 years ago; the Hobbit holds out on Flores until about 50,000 years ago.';
    return 'Today. One human species remains, eight billion strong, carrying fragments of Neanderthal and Denisovan DNA.';
  }

  /* ───────── Scrubber ───────── */
  const slider = document.getElementById('slider');
  const grid = document.getElementById('scrub-grid');
  const tEl = document.getElementById('scrub-time');
  const uEl = document.getElementById('scrub-unit');
  const epochEl = document.getElementById('scrub-epoch');
  const aliveEl = document.getElementById('scrub-alive');
  const ccEl = document.getElementById('scrub-cc');
  const cmEl = document.getElementById('scrub-commentary');

  (function buildTicks() {
    const box = document.getElementById('slider-ticks');
    TICKS.forEach((t, i) => {
      const p = pos(t) * 100;
      box.appendChild(el('div', { class: 'tick', style: `left:${p}%` }));
      const lab = el('div', { class: 'tick-label' + (i === 0 ? ' first' : i === TICKS.length - 1 ? ' last' : '') + ([5, 2, 0.5, 0.05].includes(t) ? ' minor' : ''), style: `left:${p}%` }, tickLabel(t));
      box.appendChild(lab);
    });
  })();

  SPECIES.forEach(s => {
    const c = el('button', { class: 'cell', type: 'button', 'data-id': s.id, style: `--group:${colorOf(s)}`, 'aria-label': `${s.name}: open profile` });
    c.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="nm">${esc(s.short)}</span>
      <span class="cc">${s.cranial_cc.mean ? num(s.cranial_cc.mean) + ' cc' : 'no cranium'} · ${s.height_cm.mean ? num(s.height_cm.mean) + ' cm' : 'height ?'}</span>
      <span class="bar" aria-hidden="true"></span>`;
    c.addEventListener('click', () => openPanel(s.id));
    grid.appendChild(c);
  });

  function sliderToTime(v) { const p = v / 1000; return T_MAX * Math.pow(1 - p, 2); }
  function timeToSlider(t) { return Math.round((1 - Math.sqrt(t / T_MAX)) * 1000); }

  function updateScrubber() {
    const t = sliderToTime(+slider.value);
    const tr = t < 0.0005 ? 0 : t;
    if (tr === 0) { tEl.textContent = 'Now'; uEl.textContent = 'the present day'; }
    else if (tr >= 1) { tEl.textContent = tr.toFixed(2); uEl.textContent = 'million years ago'; }
    else { tEl.textContent = Math.round(tr * 1000).toLocaleString(); uEl.textContent = 'thousand years ago'; }
    slider.setAttribute('aria-valuetext', fmtTime(tr));
    epochEl.textContent = epochOf(tr);
    let alive = 0, ccSum = 0, ccN = 0;
    grid.querySelectorAll('.cell').forEach(c => {
      const s = BY_ID[c.dataset.id];
      const on = tr <= s.time.max && tr >= s.time.min;
      c.classList.toggle('alive', on);
      const bar = c.querySelector('.bar');
      if (on) { alive++; if (s.cranial_cc.mean) { ccSum += s.cranial_cc.mean; ccN++; }
        const span = s.time.max - s.time.min || 1; bar.style.width = `${((s.time.max - tr) / span) * 100}%`; }
      else bar.style.width = '0%';
    });
    aliveEl.textContent = alive;
    ccEl.textContent = ccN ? Math.round(ccSum / ccN).toLocaleString() : '—';
    cmEl.textContent = commentaryOf(tr);
  }
  slider.addEventListener('input', updateScrubber);
  slider.value = timeToSlider(1.8);
  updateScrubber();

  /* ───────── Timeline ───────── */
  (function buildTimeline() {
    const rows = document.getElementById('tl-rows');
    SPECIES.forEach(s => {
      const left = pos(s.time.max) * 100, width = (pos(s.time.min) - pos(s.time.max)) * 100;
      const r = el('button', { class: 'tl-row', type: 'button', 'data-id': s.id, style: `--group:${colorOf(s)}`, 'aria-label': `${s.name}, lived ${fmtSpan(s)}. Open profile.` });
      r.innerHTML = `<span class="nm">${esc(s.name)}</span>
        <span class="track"><span class="bar${width < 0.6 ? ' dashed' : ''}" style="left:${left.toFixed(2)}%;width:${Math.max(width, 0.4).toFixed(2)}%"></span></span>
        <span class="cc">${s.cranial_cc.mean ? num(s.cranial_cc.mean) + ' cc' : '—'}</span>`;
      r.addEventListener('click', () => openPanel(s.id));
      rows.appendChild(r);
    });
    const ax = document.getElementById('tl-axis');
    TICKS.forEach((t, i) => ax.appendChild(el('span', { class: i === 0 ? 'first' : i === TICKS.length - 1 ? 'last' : '', style: `left:${pos(t) * 100}%` }, tickLabel(t))));
    const g = document.getElementById('tl-grid');
    TICKS.forEach(t => g.appendChild(el('i', { style: `left:${pos(t) * 100}%` })));
    const ep = document.getElementById('tl-epochs');
    [['Miocene', 7.4], ['Pliocene', 5.333], ['Pleistocene', 2.58], ['Holocene', 0.0117]].forEach(([n, start], i, arr) => {
      const x = pos(start) * 100;
      const span = el('span', { style: `left:${x}%` + (i === arr.length - 1 ? ';transform:translateX(-100%)' : '') }, n);
      ep.appendChild(span);
    });
  })();

  /* ───────── Brain chart ───────── */
  (function buildChart() {
    const svg = document.getElementById('chart');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 960, H = 520, ML = 64, MR = 24, MT = 28, MB = 56;
    const pw = W - ML - MR, ph = H - MT - MB;
    const yMax = 1800;
    const x = t => ML + pos(t) * pw;
    const y = c => MT + (1 - c / yMax) * ph;
    const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

    const grid = mk('g', { class: 'grid' });
    for (let c = 0; c <= yMax; c += 300) grid.appendChild(mk('line', { x1: ML, x2: W - MR, y1: y(c), y2: y(c) }));
    TICKS.forEach(t => grid.appendChild(mk('line', { x1: x(t), x2: x(t), y1: MT, y2: H - MB })));
    svg.appendChild(grid);

    const axis = mk('g', { class: 'axis' });
    axis.appendChild(mk('line', { x1: ML, x2: W - MR, y1: H - MB, y2: H - MB }));
    axis.appendChild(mk('line', { x1: ML, x2: ML, y1: MT, y2: H - MB }));
    TICKS.forEach((t, i) => { const tx = mk('text', { x: x(t), y: H - MB + 18, 'text-anchor': i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle' }); tx.textContent = tickLabel(t); axis.appendChild(tx); });
    for (let c = 0; c <= yMax; c += 300) { const ty = mk('text', { x: ML - 8, y: y(c) + 4, 'text-anchor': 'end' }); ty.textContent = c.toLocaleString(); axis.appendChild(ty); }
    const yl = mk('text', { class: 'axis-title', x: -(MT + ph / 2), y: 14, transform: 'rotate(-90)', 'text-anchor': 'middle' }); yl.textContent = 'Cranial capacity (cc)'; axis.appendChild(yl);
    const xl = mk('text', { class: 'axis-title', x: ML + pw / 2, y: H - 12, 'text-anchor': 'middle' }); xl.textContent = 'Time before present (square-root scale)'; axis.appendChild(xl);
    svg.appendChild(axis);

    const LABEL = { // dx, dy, anchor: 'start' = right of the span, 'end' = left of it, 'middle' = centred
      'homo-sapiens': [6, 4, 'start'], 'homo-neanderthalensis': [-6, -8, 'end'], 'homo-heidelbergensis': [-6, 4, 'end'],
      'homo-rhodesiensis': [0, 18, 'middle'], 'homo-erectus': [0, 18, 'middle'], 'homo-naledi': [6, 4, 'start'], 'homo-floresiensis': [6, 4, 'start'],
      'homo-antecessor': [-6, 4, 'end'], 'homo-ergaster': [-6, -6, 'end'], 'homo-georgicus': [6, 12, 'start'], 'homo-rudolfensis': [-6, 4, 'end'],
      'homo-habilis': [0, 18, 'middle'], 'paranthropus-boisei': [0, 18, 'middle'], 'paranthropus-robustus': [6, 4, 'start'], 'paranthropus-aethiopicus': [-6, 4, 'end'],
      'australopithecus-garhi': [6, 4, 'start'], 'australopithecus-sediba': [6, 4, 'start'], 'australopithecus-africanus': [0, 18, 'middle'],
      'australopithecus-afarensis': [0, -10, 'middle'], 'australopithecus-anamensis': [-6, 4, 'end'], 'ardipithecus-ramidus': [0, 18, 'middle'], 'sahelanthropus-tchadensis': [0, -10, 'middle']
    };
    const tip = document.getElementById('tooltip');
    const boxes = mk('g');
    const labels = mk('g');
    SPECIES.filter(s => s.cranial_cc.mean != null).forEach(s => {
      const c = s.cranial_cc;
      const x0 = x(s.time.max), x1 = Math.max(x(s.time.min), x(s.time.max) + 6);
      const xm = (x0 + x1) / 2;
      const cmin = c.min ?? c.mean, cmax = c.max ?? c.mean;
      const ym = y(c.mean);
      const g = mk('g', { class: 'sp-mark', tabindex: 0, role: 'button', 'data-id': s.id, 'aria-label': `${s.name}: ${num(c.mean)} cc, lived ${fmtSpan(s)}` });
      // time span at typical brain size
      g.appendChild(mk('rect', { class: 'span', x: x0, y: ym - 3.5, width: x1 - x0, height: 7, rx: 3.5, fill: hexOf(s) }));
      // cranial range whisker at the middle of the span
      if (cmax > cmin) {
        g.appendChild(mk('line', { class: 'whisker', x1: xm, x2: xm, y1: y(cmax), y2: y(cmin), stroke: hexOf(s), 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }));
        g.appendChild(mk('line', { x1: xm - 4, x2: xm + 4, y1: y(cmax), y2: y(cmax), stroke: hexOf(s), 'stroke-width': 1.2 }));
        g.appendChild(mk('line', { x1: xm - 4, x2: xm + 4, y1: y(cmin), y2: y(cmin), stroke: hexOf(s), 'stroke-width': 1.2 }));
      }
      // generous invisible hit area
      g.appendChild(mk('rect', { class: 'hit', x: x0 - 4, y: Math.min(y(cmax), ym) - 8, width: x1 - x0 + 8, height: Math.abs(y(cmin) - y(cmax)) + 16, fill: 'transparent' }));
      boxes.appendChild(g);
      const [dx, dy, anchor] = LABEL[s.id] || [6, 4, 'start'];
      const lx = anchor === 'start' ? x1 + dx : anchor === 'end' ? x0 + dx : xm + dx;
      const t = mk('text', { class: 'lbl', x: lx, y: ym + dy, 'text-anchor': anchor }); t.textContent = s.short; labels.appendChild(t);
      const show = ev => {
        tip.innerHTML = `<b>${esc(s.name)}</b><span class="m">${fmtSpan(s)} · ${num(c.mean)} cc (${num(c.min)}–${num(c.max)})</span><br>${esc(c.note)}`;
        tip.classList.add('show'); move(ev);
      };
      const move = ev => { const b = g.getBoundingClientRect(); const px = ev.clientX ?? b.left, py = ev.clientY ?? b.top; tip.style.left = Math.min(px + 14, window.innerWidth - 280) + 'px'; tip.style.top = Math.max(8, py - 10) + 'px'; };
      const hide = () => tip.classList.remove('show');
      g.addEventListener('mouseenter', show); g.addEventListener('mousemove', move); g.addEventListener('mouseleave', hide);
      g.addEventListener('focus', show); g.addEventListener('blur', hide);
      g.addEventListener('click', () => { hide(); openPanel(s.id); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hide(); openPanel(s.id); } });
    });
    svg.appendChild(boxes); svg.appendChild(labels);
    const nocc = SPECIES.filter(s => s.cranial_cc.mean == null).map(s => `<i>${esc(s.name)}</i>`).join(' and ');
    document.getElementById('chart-note').innerHTML = `<strong>Not plotted:</strong> ${nocc}, known only from jaws, teeth and limb bones. Each bar runs across a species’ time range at its typical cranial capacity; the dashed whisker shows the spread of published values. Hover or focus a bar for details, select it for the profile.`;
  })();

  /* ───────── Trait grid ───────── */
  const TRAITS = [
    { key: 'biped', label: 'Bipedalism', ranks: ['low probability', 'high probability', 'yes', 'modern'] },
    { key: 'foots', label: 'Feet', ranks: ['climbing', 'walk'] },
    { key: 'arms', label: 'Hands', ranks: ['climbing', 'manipulate', 'manipulate with precision'] },
    { key: 'hip', label: 'Hip', ranks: ['wide', 'slim', 'modern', 'very modern'] },
    { key: 'vertical', label: 'Posture', ranks: ['no', 'yes', 'modern'] },
    { key: 'jaw', label: 'Jaw', ranks: ['conical', 'V shape', 'U shape', 'modern'] },
    { key: 'torus', label: 'Brow ridge', ranks: ['ultra protruding', 'very protruding', 'less protruding', 'little protruding', 'flat'] },
    { key: 'prognathism', label: 'Prognathism', ranks: ['very high', 'high', 'medium-high', 'medium', 'reduced', 'absent'] },
    { key: 'diet', label: 'Diet', ranks: ['dry fruits', 'soft fruits', 'hard fruits', 'omnivore', 'carnivorous'] },
    { key: 'tecno_type', label: 'Tools', ranks: ['no', 'primitive', 'mode 1', 'mode 2', 'mode 3', 'mode 4'] }
  ];
  function rankColor(i, n) {
    if (i < 0) return null;
    const t = n <= 1 ? .5 : i / (n - 1);
    const stops = [[107, 58, 42], [164, 104, 61], [197, 160, 89], [227, 194, 124]];
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const f = t * (stops.length - 1) - seg;
    const c = stops[seg].map((v, k) => Math.round(v + (stops[seg + 1][k] - v) * f));
    return `rgb(${c.join(',')})`;
  }
  (function buildTraits() {
    const thead = document.querySelector('#trait-table thead tr');
    TRAITS.forEach(t => thead.appendChild(el('th', { scope: 'col' }, esc(t.label))));
    const tbody = document.querySelector('#trait-table tbody');
    SPECIES.forEach(s => {
      const tr = el('tr', { 'data-id': s.id });
      const th = el('th', { scope: 'row' });
      const b = el('button', { type: 'button', 'aria-label': `${s.name}: open profile` }, esc(s.name));
      b.addEventListener('click', () => openPanel(s.id));
      th.appendChild(b); tr.appendChild(th);
      TRAITS.forEach(t => {
        const v = (s.traits[t.key] || '').trim();
        const i = t.ranks.indexOf(v);
        const col = rankColor(i, t.ranks.length);
        const td = el('td', {});
        td.innerHTML = `<span class="v${col ? '' : ' none'}" title="${esc(t.label)}: ${esc(v || 'no data')}" style="${col ? 'background:' + col : ''}">${esc(v || '—')}</span>`;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  })();

  /* ───────── Compare ───────── */
  const COMPARE = [['diet', 'Diet'], ['tecno_type', 'Tools'], ['biped', 'Bipedalism'], ['arms', 'Hands'], ['jaw', 'Jaw'], ['torus', 'Brow ridge'], ['habitat', 'Habitat'], ['hip', 'Hip']];
  const selA = document.getElementById('cmp-a'), selB = document.getElementById('cmp-b');
  [selA, selB].forEach(sel => SPECIES.forEach(s => sel.appendChild(el('option', { value: s.id }, esc(s.name)))));
  selA.value = 'homo-sapiens'; selB.value = 'homo-neanderthalensis';
  function renderCmp(side, s, other) {
    const when = document.getElementById(`cmp-${side}-when`);
    when.innerHTML = `<b>${fmtSpan(s)}</b> · ${esc(s.country)}`;
    const sil = document.getElementById(`cmp-${side}-sil`);
    const cc = s.cranial_cc.mean, h = s.height_cm.mean;
    const ccPx = cc ? 26 + (cc / 1500) * 64 : 0;
    const hPx = h ? 50 + ((h - 90) / (185 - 90)) * 100 : 0;
    sil.innerHTML = (cc ? `<div class="skull" style="width:${ccPx}px;height:${ccPx}px"><span class="tag">${num(cc)} cc</span></div>` : `<div class="unknown">brain size unknown</div>`) +
      (h ? `<div class="body" style="height:${hPx}px"><span class="tag">${num(h)} cm</span></div>` : `<div class="unknown">height unknown</div>`);
    document.getElementById(`cmp-${side}-fact`).textContent = s.fact;
    const list = document.getElementById(`cmp-${side}-traits`);
    list.innerHTML = COMPARE.map(([k, l]) => {
      const v = (s.traits[k] || '').trim() || '—', ov = (other.traits[k] || '').trim();
      const same = v === ov && v !== '—';
      return `<li><span class="k">${l}</span><span class="v ${same ? 'same' : 'diff'}"><span class="sr-only">${same ? 'same as the other: ' : 'differs: '}</span>${esc(v)}</span></li>`;
    }).join('');
    document.getElementById(`cmp-${side}-open`).onclick = () => openPanel(s.id);
  }
  function updateCompare() { const a = BY_ID[selA.value], b = BY_ID[selB.value]; renderCmp('a', a, b); renderCmp('b', b, a); }
  selA.addEventListener('change', updateCompare); selB.addEventListener('change', updateCompare);
  document.getElementById('cmp-swap').addEventListener('click', () => { const t = selA.value; selA.value = selB.value; selB.value = t; updateCompare(); });
  updateCompare();

  /* ───────── Species index buttons ───────── */
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));

  /* ───────── Panel (dialog) ───────── */
  const panel = document.getElementById('panel'), scrim = document.getElementById('scrim');
  let lastFocus = null;
  const FOCUSABLE = 'button, [href], select, input, [tabindex]:not([tabindex="-1"])';
  function openPanel(id, fromHash) {
    const s = BY_ID[id]; if (!s) return;
    lastFocus = document.activeElement;
    const c = s.cranial_cc, h = s.height_cm;
    document.getElementById('p-nick').textContent = [s.group, s.nickname ? `“${s.nickname}”` : null].filter(Boolean).join(' · ');
    document.getElementById('p-name').textContent = s.name;
    document.getElementById('p-fact').textContent = s.fact;
    document.getElementById('p-time').textContent = fmtSpan(s);
    document.getElementById('p-time-sub').textContent = epochOf(s.time.max) === epochOf(s.time.min) ? epochOf(s.time.max) : `${epochOf(s.time.max)} → ${epochOf(s.time.min)}`;
    document.getElementById('p-cc').textContent = c.mean ? `${num(c.mean)} cc` : '—';
    document.getElementById('p-cc-sub').textContent = c.mean ? (c.min !== c.max ? `range ${num(c.min)}–${num(c.max)}` : 'single specimen') : 'no cranium known';
    document.getElementById('p-h').textContent = h.mean ? `${num(h.mean)} cm` : '—';
    document.getElementById('p-h-sub').textContent = h.mean ? (h.min != null && h.max != null && h.min !== h.max ? `range ${num(h.min)}–${num(h.max)}` : 'estimate') : 'no reliable estimate';
    const attrs = (idd, items) => { document.getElementById(idd).innerHTML = items.map(([k, v]) => `<div class="a"><div class="k">${k}</div><div class="v">${esc(v || '—')}</div></div>`).join(''); };
    attrs('p-disc', [['First found', s.found], ['Named', s.named], ['Type site', s.type_site], ['Country', s.country], ['Range', s.region], ['Habitat (dataset)', s.traits.habitat]]);
    attrs('p-anat', [['Bipedalism', s.traits.biped], ['Posture', s.traits.vertical], ['Foot', s.traits.foots], ['Hand', s.traits.arms], ['Hip', s.traits.hip], ['Jaw', s.traits.jaw], ['Brow ridge', s.traits.torus], ['Prognathism', s.traits.prognathism], ['Foramen magnum', s.traits.foramen], ['Canines', `${s.traits.canine_size}, ${s.traits.canine_shape}`], ['Incisors', s.traits.incisor], ['Enamel', s.traits.enamel], ['Sexual dimorphism', s.traits.sexdim], ['Skeleton', s.traits.skeleton]]);
    attrs('p-beh', [['Stone tools', s.traits.tecno], ['Tool industry', s.traits.tecno_type], ['Diet', s.traits.diet], ['Left Africa', s.traits.migrated]]);
    document.getElementById('p-notes').innerHTML = `<p><strong>Dates.</strong> ${esc(s.time.note)}</p><p><strong>Brain.</strong> ${esc(c.note)}</p><p><strong>Stature.</strong> ${esc(h.note)}</p><p><strong>Status.</strong> ${esc(s.status)}</p>`;
    document.getElementById('p-src').innerHTML = 'Sources: ' + s.sources.map(k => SOURCES[k] ? `<a href="${SOURCES[k].url}" target="_blank" rel="noopener">${esc(SOURCES[k].label.split(',')[0])}</a>` : esc(k)).join('; ') + '. Trait descriptors: Kaggle teaching dataset (unverified).';
    document.getElementById('p-link').href = `#${s.id}`;
    document.getElementById('p-index').href = `#${s.id}`;

    panel.classList.add('open'); scrim.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.querySelectorAll('.tl-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
    if (!fromHash) history.replaceState(null, '', `#${s.id}`);
    panel.scrollTop = 0;
    document.getElementById('panel-close').focus();
  }
  function closePanel() {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open'); scrim.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.querySelectorAll('.tl-row.active').forEach(r => r.classList.remove('active'));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.getElementById('panel-close').addEventListener('click', closePanel);
  scrim.addEventListener('click', closePanel);
  document.getElementById('p-index').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
    if (e.key === 'Tab' && panel.classList.contains('open')) {
      const f = [...panel.querySelectorAll(FOCUSABLE)].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.getElementById('p-copy').addEventListener('click', async e => {
    const url = location.origin + location.pathname + document.getElementById('p-link').getAttribute('href');
    try { await navigator.clipboard.writeText(url); e.target.textContent = 'Link copied'; setTimeout(() => e.target.textContent = 'Copy link', 1600); }
    catch { prompt('Copy this link', url); }
  });

  /* deep links: #homo-naledi scrolls to the card and opens the profile */
  function handleHash() { const id = location.hash.replace('#', ''); if (BY_ID[id]) openPanel(id, true); }
  window.addEventListener('hashchange', handleHash);
  if (location.hash) setTimeout(handleHash, 50);

  /* ───────── Nav ───────── */
  (function nav() {
    const nav = document.getElementById('nav'), toggle = document.getElementById('nav-toggle');
    const links = [...document.querySelectorAll('.nav-link')];
    toggle.addEventListener('click', () => { const open = nav.classList.toggle('menu-open'); toggle.setAttribute('aria-expanded', String(open)); });
    links.forEach(l => l.addEventListener('click', () => { nav.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); }));
    const targets = links.map(l => document.getElementById(l.dataset.target)).filter(Boolean);
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
      const probe = window.scrollY + 120; let active = null;
      targets.forEach(t => { if (t.offsetTop <= probe) active = t.id; });
      links.forEach(l => { if (l.dataset.target === active) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  })();
})();

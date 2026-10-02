// Laboratorium: animowana probówka z wytrącaniem osadu i zlewka z sodem, wodą i fenoloftaleiną.
// Animacje: Web Animations API. Przy „ogranicz ruch” od razu pokazujemy wynik.

import { h } from './dom.js';
import { richText, formatFormula } from './formula.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  kids.flat().forEach((k) => k && el.append(k));
  return el;
};
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
const anim = (el, frames, opts) => {
  const a = el.animate(frames, { fill: 'forwards', ...opts, duration: reduced() ? 1 : opts.duration });
  return a.finished.catch(() => {});
};
const rnd = (a, b) => a + Math.random() * (b - a);

export function renderLab(exp) {
  return exp.kind === 'precipitate' ? precipitateLab(exp) : gasLab(exp);
}

// ---------------------------------------------------------------- probówki z osadem
function precipitateLab(exp) {
  const root = h('div', { class: 'lab' });
  let tubeIdx = 0;
  let running = false;
  let token = 0; // unieważnia trwającą animację po resecie/zmianie probówki

  const stage = h('div', { class: 'lab-stage' });
  const info = h('div', { class: 'lab-info', 'aria-live': 'polite' });
  const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Wybierz probówkę' });
  const addBtn = h('button', { class: 'btn big', type: 'button' }, `Dodaj ${exp.reagent.formula} kroplami`);
  const resetBtn = h('button', { class: 'btn quiet', type: 'button' }, 'Od nowa');

  const paintTabs = () =>
    tabs.replaceChildren(
      ...exp.tubes.map((t, i) =>
        h('button', { type: 'button', 'aria-pressed': String(i === tubeIdx), onClick: () => { if (i !== tubeIdx) { tubeIdx = i; reset(); paintTabs(); } }, html: `<span>Probówka ${t.id}: </span><span class="chem">${formatFormula(t.salt)}</span>` })
      )
    );

  function reset() {
    token++;
    running = false;
    addBtn.disabled = false;
    addBtn.hidden = false;
    info.replaceChildren(introFor(exp.tubes[tubeIdx]));
    stage.replaceChildren(buildTube(exp.tubes[tubeIdx], exp));
  }

  const introFor = (t) =>
    h('div', { class: 'lab-note' }, h('p', null, h('strong', null, `Probówka ${t.id}`), ' – roztwór: ', h('span', { class: 'chem', html: formatFormula(t.salt) }), ` (${t.saltName}).`), h('p', { class: 'muted' }, `Dodaj ${exp.reagent.name} i obserwuj, co się dzieje.`));

  addBtn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    addBtn.disabled = true;
    const my = token;
    const t = exp.tubes[tubeIdx];
    await runPrecipitate(stage, t, exp, () => my === token);
    if (my !== token) return;
    running = false;
    addBtn.hidden = true;
    info.replaceChildren(
      h(
        'div',
        { class: 'lab-result' },
        h('div', { class: 'eyebrow' }, 'Obserwacja'),
        h('p', null, t.observation),
        h('div', { class: 'eyebrow' }, 'Wniosek'),
        h('p', null, t.conclusion),
        h('div', { class: 'eyebrow' }, 'Równanie reakcji'),
        h('p', { class: 'lab-eq chem', html: formatFormula(t.eq) })
      )
    );
  });
  resetBtn.addEventListener('click', reset);

  paintTabs();
  reset();
  root.append(
    h('h2', null, exp.title),
    h('p', { class: 'muted' }, `Cel: ${exp.aim}`),
    tabs,
    stage,
    h('div', { class: 'btn-row', style: 'justify-content:center' }, addBtn, resetBtn),
    info
  );
  return root;
}

function buildTube(t, exp) {
  const svg = svgEl('svg', { viewBox: '0 0 240 330', class: 'lab-svg', role: 'img', 'aria-label': `Probówka z roztworem ${t.salt}` });
  const clip = svgEl('clipPath', { id: 'tube-clip' }, svgEl('path', { d: 'M80 50 H160 V232 A40 40 0 0 1 80 232 Z' }));
  svg.append(svgEl('defs', {}, clip));
  // roztwór
  const liquid = svgEl('rect', { x: 80, y: 120, width: 80, height: 200, 'clip-path': 'url(#tube-clip)', class: 'liquid' });
  liquid.style.fill = t.liquid;
  liquid.style.fillOpacity = '0.78';
  liquid.style.transition = reduced() ? 'none' : 'fill 2.5s, fill-opacity 2.5s';
  const sediment = svgEl('g', { 'clip-path': 'url(#tube-clip)' });
  const particles = svgEl('g', { 'clip-path': 'url(#tube-clip)' });
  const drops = svgEl('g');
  // szkło
  const glass = svgEl('path', { d: 'M80 50 V232 A40 40 0 0 0 160 232 V50', class: 'glass' });
  const rim = svgEl('path', { d: 'M72 50 H168', class: 'glass' });
  // zakraplacz
  const dropper = svgEl('g', { class: 'dropper' });
  dropper.append(svgEl('rect', { x: 112, y: 2, width: 16, height: 26, rx: 8, fill: '#e2e8ef' }), svgEl('path', { d: 'M114 28 H126 L122 52 H118 Z', fill: '#cfd8e3' }));
  dropper.style.opacity = '0';
  // tło pod osadem: warstwa osadu
  const sedH = t.gel ? 110 : 52;
  const sed = svgEl('rect', { x: 80, y: 320 - sedH, width: 80, height: sedH, fill: t.precip, class: 'sediment' });
  sed.style.fillOpacity = t.gel ? '0.88' : '1';
  sed.style.transformBox = 'fill-box';
  sed.style.transformOrigin = 'bottom';
  sed.style.transform = 'scaleY(0)';
  sediment.append(sed);
  svg.append(liquid, sediment, particles, drops, glass, rim, dropper);
  svg._parts = { liquid, sed, particles, drops, dropper, sedH };
  return svg;
}

async function runPrecipitate(stage, t, exp, alive) {
  const { liquid, sed, particles, drops, dropper } = stage.querySelector('svg')._parts;
  await anim(dropper, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  const burst = (n) => {
    for (let i = 0; i < n; i++) {
      const c = svgEl('circle', { cx: rnd(88, 152), cy: rnd(112, 200), r: rnd(2.5, 5.5), fill: t.precip });
      c.style.opacity = '0';
      particles.append(c);
      anim(c, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: 0.9, transform: `translateY(${rnd(2, 10)}px)`, offset: 0.25 }, { opacity: 0.9, transform: `translateY(${rnd(50, 110)}px)` }], { duration: rnd(2500, 3800), easing: 'ease-in' });
    }
  };
  for (let i = 0; i < 6; i++) {
    if (!alive()) return;
    const d = svgEl('circle', { cx: 120, cy: 56, r: 4.5, fill: exp.reagent.color });
    drops.append(d);
    await anim(d, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(62px)', opacity: 1 }], { duration: 420, easing: 'ease-in' });
    d.remove();
    const ring = svgEl('circle', { cx: 120, cy: 120, r: 4, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.5 });
    ring.style.transformBox = 'fill-box';
    ring.style.transformOrigin = 'center';
    drops.append(ring);
    anim(ring, [{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(5)', opacity: 0 }], { duration: 600 }).then(() => ring.remove());
    burst(5 + i * 3);
    if (i === 1) { liquid.style.fillOpacity = '0.5'; }
    await sleep(380);
  }
  if (!alive()) return;
  await anim(dropper, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
  // osad opada, nad nim zostaje przezroczysty roztwór (żel – mętny)
  liquid.style.fill = t.gel ? t.precip : '#cfe0ee';
  liquid.style.fillOpacity = t.gel ? '0.55' : '0.22';
  await anim(sed, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 2800, easing: 'ease-out' });
  if (!alive()) return;
  if (t.gel) {
    // galaretowaty osad: wyraźnie „chmurzasty” kontur na górze warstwy
    const wave = svgEl('path', { d: `M80 ${320 - stage.querySelector('svg')._parts.sedH} q10 -8 20 0 t20 0 t20 0 t20 0 V330 H80 Z`, fill: t.precip, opacity: 0.9, 'clip-path': 'url(#tube-clip)' });
    particles.append(wave);
  }
  await sleep(400);
}

// ---------------------------------------------------------------- sód z wodą
function gasLab(exp) {
  const root = h('div', { class: 'lab' });
  let running = false;
  let token = 0;
  const stage = h('div', { class: 'lab-stage' });
  const info = h('div', { class: 'lab-info', 'aria-live': 'polite' });
  const addBtn = h('button', { class: 'btn big', type: 'button' }, 'Wrzuć sód do wody');
  const fireBtn = h('button', { class: 'btn big', type: 'button', hidden: true }, 'Zbliż płomień do gazu');
  const resetBtn = h('button', { class: 'btn quiet', type: 'button' }, 'Od nowa');

  function reset() {
    token++;
    running = false;
    addBtn.hidden = false;
    addBtn.disabled = false;
    fireBtn.hidden = true;
    stage.replaceChildren(buildBeaker());
    info.replaceChildren(h('div', { class: 'lab-note' }, h('p', null, exp.setup), h('p', { class: 'muted' }, 'W naczyniu: woda i fenoloftaleina (bezbarwny roztwór).')));
  }

  addBtn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    addBtn.disabled = true;
    const my = token;
    await runSodium(stage, () => my === token);
    if (my !== token) return;
    running = false;
    addBtn.hidden = true;
    fireBtn.hidden = false;
    info.replaceChildren(
      h('div', { class: 'lab-result' }, h('div', { class: 'eyebrow' }, 'Obserwacja (na razie)'), h('p', null, exp.observations[0]), h('p', { class: 'muted' }, 'Gaz zebrał się w probówce. Zbliż do niego płomień.'))
    );
  });

  fireBtn.addEventListener('click', async () => {
    fireBtn.hidden = true;
    const my = token;
    await runFlame(stage, () => my === token);
    if (my !== token) return;
    info.replaceChildren(
      h(
        'div',
        { class: 'lab-result' },
        h('div', { class: 'eyebrow' }, 'Obserwacje'),
        h('ul', null, exp.observations.map((o) => h('li', null, o))),
        h('div', { class: 'eyebrow' }, 'Wnioski'),
        h('ul', null, exp.conclusions.map((o) => h('li', null, o))),
        h('div', { class: 'eyebrow' }, 'Równanie reakcji'),
        h('p', { class: 'lab-eq chem', html: formatFormula(exp.eq) })
      )
    );
  });
  resetBtn.addEventListener('click', reset);

  reset();
  root.append(h('h2', null, exp.title), h('p', { class: 'muted' }, `Cel: ${exp.aim}`), stage, h('div', { class: 'btn-row', style: 'justify-content:center' }, addBtn, fireBtn, resetBtn), info);
  return root;
}

function buildBeaker() {
  const svg = svgEl('svg', { viewBox: '0 0 280 360', class: 'lab-svg', role: 'img', 'aria-label': 'Zlewka z wodą i fenoloftaleiną, lejek i probówka na gaz' });
  const clipB = svgEl('clipPath', { id: 'beaker-clip' }, svgEl('path', { d: 'M50 200 H230 V312 Q230 324 218 324 H62 Q50 324 50 312 Z' }));
  const clipT = svgEl('clipPath', { id: 'gtube-clip' }, svgEl('path', { d: 'M121 70 Q121 62 129 62 H151 Q159 62 159 70 V176 H121 Z' }));
  svg.append(svgEl('defs', {}, clipB, clipT));
  const water = svgEl('rect', { x: 50, y: 214, width: 180, height: 120, 'clip-path': 'url(#beaker-clip)', class: 'liquid' });
  water.style.fill = '#bcd6ee';
  water.style.fillOpacity = '0.35';
  water.style.transition = reduced() ? 'none' : 'fill 4s, fill-opacity 4s';
  // probówka (woda w środku zostanie wyparta przez gaz)
  const tubeWater = svgEl('rect', { x: 121, y: 62, width: 38, height: 114, 'clip-path': 'url(#gtube-clip)' });
  tubeWater.style.fill = '#bcd6ee';
  tubeWater.style.fillOpacity = '0.35';
  const gas = svgEl('rect', { x: 121, y: 62, width: 38, height: 114, 'clip-path': 'url(#gtube-clip)', fill: '#ffffff' });
  gas.style.fillOpacity = '0';
  const tubeGlass = svgEl('path', { d: 'M121 176 V70 Q121 62 129 62 H151 Q159 62 159 70 V176', class: 'glass' });
  const funnel = svgEl('path', { d: 'M126 176 H154 L154 200 L196 262 H84 L126 200 Z', class: 'glass', fill: 'rgba(255,255,255,0.05)' });
  const beaker = svgEl('path', { d: 'M50 190 V312 Q50 324 62 324 H218 Q230 324 230 312 V190', class: 'glass' });
  const bubbles = svgEl('g');
  const na = svgEl('circle', { cx: 40, cy: 120, r: 9, fill: '#d7dde4', stroke: '#9aa7b5', 'stroke-width': 1.5, class: 'na-piece' });
  na.style.opacity = '0';
  const label = svgEl('text', { x: 140, y: 350, 'text-anchor': 'middle', class: 'lab-label' });
  label.textContent = 'woda + fenoloftaleina';
  svg.append(water, tubeWater, gas, bubbles, funnel, tubeGlass, beaker, na, label);
  svg._parts = { water, tubeWater, gas, bubbles, na };
  return svg;
}

async function runSodium(stage, alive) {
  const { water, tubeWater, gas, bubbles, na } = stage.querySelector('svg')._parts;
  na.style.opacity = '1';
  // wpada do wody pod lejek
  await anim(na, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,70px)', offset: 0.35 }, { transform: 'translate(98px,126px)' }], { duration: 1000, easing: 'ease-in' });
  if (!alive()) return;
  water.style.fill = '#e83e8c';
  water.style.fillOpacity = '0.8';
  // sód „biega” po powierzchni
  anim(na, [{ transform: 'translate(98px,126px)' }, { transform: 'translate(88px,128px)' }, { transform: 'translate(108px,125px)' }, { transform: 'translate(95px,127px)' }, { transform: 'translate(98px,126px)' }], { duration: 3600, easing: 'ease-in-out' });
  const total = reduced() ? 1 : 24;
  for (let i = 0; i < total; i++) {
    if (!alive()) return;
    const c = svgEl('circle', { cx: rnd(120, 142), cy: 250, r: rnd(2, 4), fill: 'none', stroke: '#ffffff', 'stroke-width': 1.3 });
    bubbles.append(c);
    anim(c, [{ transform: 'translateY(0)', opacity: 0.9 }, { transform: `translate(${rnd(-6, 6)}px,-80px)`, opacity: 0.9, offset: 0.55 }, { transform: `translate(${rnd(-4, 4)}px,-170px)`, opacity: 0 }], { duration: 1500, easing: 'ease-out' }).then(() => c.remove());
    // poziom wody w probówce spada, a gaz się zbiera
    const frac = (i + 1) / total;
    tubeWater.setAttribute('y', String(62 + 114 * frac));
    tubeWater.setAttribute('height', String(114 * (1 - frac)));
    gas.style.fillOpacity = String(0.1 + 0.12 * frac);
    await sleep(150);
  }
  await sleep(700);
}

async function runFlame(stage, alive) {
  const svg = stage.querySelector('svg');
  const flame = svgEl('path', { d: 'M140 28 C128 40 128 52 134 58 C136 52 140 50 140 44 C146 50 150 54 146 62 C158 54 156 40 140 28 Z', fill: '#ffb347' });
  flame.style.opacity = '0';
  flame.style.transformBox = 'fill-box';
  flame.style.transformOrigin = 'bottom center';
  const pop = svgEl('text', { x: 200, y: 46, 'text-anchor': 'middle', class: 'lab-pop' });
  pop.textContent = 'puk!';
  pop.style.opacity = '0';
  pop.style.transformBox = 'fill-box';
  pop.style.transformOrigin = 'center';
  svg.append(flame, pop);
  await anim(flame, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.3)' }, { opacity: 0, transform: 'scale(0.6)' }], { duration: 900 });
  anim(pop, [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500 });
  const gas = svg._parts.gas;
  gas.style.fillOpacity = '0';
  await sleep(700);
}

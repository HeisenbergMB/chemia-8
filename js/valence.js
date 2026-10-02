// Kalkulator wzorów „na krzyż”: wartościowości -> indeksy -> skrócenie -> wzór i nazwa.
// Korzysta z tych samych danych co tabela rozpuszczalności (data/solubility.json) + tlenek O.

import { h } from './dom.js';
import { formatFormula } from './formula.js';
import { compoundFormula, compoundName } from './solubility.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const OXIDE = { id: 'O', sym: 'O', charge: 2, poly: false, label: 'O²⁻', name: 'tlenek' };

/** Kroki rozumowania dla pary kation + anion. */
export function crossSteps(cat, an) {
  const g = gcd(cat.charge, an.charge);
  const rawCat = an.charge; // indeks metalu przed skróceniem
  const rawAn = cat.charge; // indeks reszty przed skróceniem
  const idx = (n) => (n > 1 ? String(n) : '');
  const rawFormula = `${cat.sym}${idx(rawCat)}${an.poly && rawAn > 1 ? `(${an.sym})` : an.sym}${idx(rawAn)}`;
  return {
    g,
    rawFormula,
    formula: compoundFormula(cat, an),
    name: compoundName(cat, an),
    rawCat,
    rawAn,
  };
}

export function renderValence(data) {
  const root = h('div');
  const anions = [OXIDE, ...data.anions];
  let sel = { cat: 'Al', an: 'O' };

  function chips(label, items, key, text) {
    return h(
      'div',
      { class: 'sol-pick' },
      h('div', { class: 'eyebrow' }, label),
      h('div', { class: 'seg', role: 'group', 'aria-label': label }, items.map((it) => h('button', { type: 'button', 'aria-pressed': String(sel[key] === it.id), onClick: () => { sel[key] = it.id; render(); }, html: text(it) })))
    );
  }

  function render() {
    const cat = data.cations.find((c) => c.id === sel.cat);
    const an = anions.find((a) => a.id === sel.an);
    const s = crossSteps(cat, an);
    const reduce = s.g > 1;
    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/podstawy' }, '← Podstawy z klas 7–8'),
      h('h1', null, 'Wzór „na krzyż”'),
      h(
        'section',
        { class: 'card' },
        h('p', { class: 'muted' }, 'Wybierz metal i resztę (tlen, chlor, grupę OH…). Zobaczysz, jak powstaje wzór.'),
        chips('Metal', data.cations, 'cat', (c) => `<span class="chem">${c.label}</span>`),
        chips('Reszta', anions, 'an', (a) => `<span class="chem">${a.label}</span>`)
      ),
      h(
        'section',
        { class: 'card', 'aria-live': 'polite' },
        h('div', { class: 'eyebrow' }, 'Kroki'),
        h(
          'ol',
          { class: 'cross-steps' },
          h('li', null, 'Zapisz symbole: ', h('strong', { class: 'chem' }, `${cat.sym} ${an.poly ? '(' + an.sym + ')' : an.sym}`)),
          h('li', null, `Wartościowości: ${cat.sym} – ${ROMAN[cat.charge]}, ${an.sym} – ${ROMAN[an.charge]}.`),
          h('li', null, 'Na krzyż: wartościowość jednego staje się indeksem drugiego: ', h('strong', { class: 'chem', html: formatFormula(s.rawFormula) })),
          reduce ? h('li', null, `Oba indeksy dzielą się przez ${s.g}, więc skracamy.`) : h('li', null, 'Indeksów nie da się skrócić (nie mają wspólnego dzielnika większego od 1).')
        ),
        h('div', { class: 'feedback ok' }, h('div', { class: 'eyebrow' }, 'Wzór'), h('div', { class: 'sol-formula chem', html: formatFormula(s.formula) }), h('p', { class: 'sol-name' }, s.name)),
        h('p', { class: 'muted small' }, 'Indeks 1 się nie zapisuje. Grupę OH, NO₃ lub SO₄ bierzemy w nawias, gdy jest jej więcej niż jedna.')
      )
    );
  }
  render();
  return root;
}

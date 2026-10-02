// Bilansowanie równania: współczynniki ustawiane przyciskami − i +.
// Po sprawdzeniu błędne współczynniki są wskazane, a tabela pokazuje bilans atomów (✓ / ✗, nie tylko kolor).

import { h } from './dom.js';
import { formatFormula } from './formula.js';
import { parseEquation, parseFormula } from './chem.js';

export const MAX_COEF = 9;

/** Z poprawnego równania: lista składników z oczekiwanymi współczynnikami. */
export function parseBalance(eq) {
  const p = parseEquation(eq);
  return {
    left: p.left,
    right: p.right,
    all: [...p.left.map((s) => ({ ...s, side: 'L' })), ...p.right.map((s) => ({ ...s, side: 'R' }))],
  };
}

/** Równanie bez współczynników (do pokazania w treści pytania). */
export function skeleton(eq) {
  const p = parseEquation(eq);
  const f = (s) => `${s.formula}${s.mark}`;
  return `${p.left.map(f).join(' + ')} -> ${p.right.map(f).join(' + ')}`;
}

/** Bilans atomów dla zadanych współczynników: [{ el, left, right, ok }] */
export function atomTable(all, coefs) {
  const L = {};
  const R = {};
  all.forEach((s, i) => {
    const target = s.side === 'L' ? L : R;
    const { atoms } = parseFormula(s.formula);
    for (const k in atoms) target[k] = (target[k] || 0) + atoms[k] * coefs[i];
  });
  const els = [...new Set([...Object.keys(L), ...Object.keys(R)])];
  return els.map((el) => ({ el, left: L[el] || 0, right: R[el] || 0, ok: (L[el] || 0) === (R[el] || 0) }));
}

/** opts: { eq, onChange(), showAtoms } */
export function createBalance({ eq, onChange = () => {}, showAtoms = false }) {
  const { all } = parseBalance(eq);
  const expected = all.map((s) => s.coef);
  const coefs = all.map(() => 1);
  let locked = false;
  let verdict = null; // null | true | false
  let atomsOpen = false;

  const root = h('div', { class: 'balance' });

  const step = (i, d) => {
    if (locked) return;
    coefs[i] = Math.min(MAX_COEF, Math.max(1, coefs[i] + d));
    render();
    onChange();
  };

  function render() {
    const parts = [];
    all.forEach((s, i) => {
      if (i > 0) parts.push(h('span', { class: 'bal-op', 'aria-hidden': 'true' }, i === all.findIndex((x) => x.side === 'R') ? '→' : '+'));
      const wrong = verdict === false && coefs[i] !== expected[i];
      const right = verdict === false && coefs[i] === expected[i];
      const name = s.formula.replace(/\^/g, '');
      parts.push(
        h(
          'div',
          { class: `bal-item${wrong ? ' bad' : ''}${right || verdict === true ? ' ok' : ''}`, role: 'group', 'aria-label': `Współczynnik przed ${name}: ${coefs[i]}` },
          h('div', { class: 'bal-stepper' },
            h('button', { type: 'button', class: 'bal-btn', 'aria-label': `Zmniejsz współczynnik przed ${name}`, disabled: locked || coefs[i] <= 1, onClick: () => step(i, -1) }, '−'),
            h('output', { class: 'bal-coef', 'aria-live': 'polite' }, String(coefs[i])),
            h('button', { type: 'button', class: 'bal-btn', 'aria-label': `Zwiększ współczynnik przed ${name}`, disabled: locked || coefs[i] >= MAX_COEF, onClick: () => step(i, +1) }, '+')
          ),
          h('div', { class: 'bal-formula chem', html: formatFormula(s.formula + s.mark) }),
          wrong ? h('div', { class: 'bal-mark' }, `✗ powinno być ${expected[i]}`) : verdict !== null && (right || verdict) ? h('div', { class: 'bal-mark ok' }, '✓') : null
        )
      );
    });

    const showTable = (showAtoms && atomsOpen) || verdict === false;
    const rows = atomTable(all, coefs);
    root.replaceChildren(
      ...[
      h('div', { class: 'bal-eq' }, parts),
      showAtoms && verdict === null
        ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn quiet', onClick: () => { atomsOpen = !atomsOpen; render(); } }, atomsOpen ? 'Ukryj bilans atomów' : 'Pokaż bilans atomów'))
        : null,
      showTable
        ? h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'atom-table' },
              h('caption', { class: 'visually-hidden' }, 'Bilans atomów po obu stronach równania'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Pierwiastek'), h('th', { scope: 'col' }, 'Lewa strona'), h('th', { scope: 'col' }, 'Prawa strona'), h('th', { scope: 'col' }, ''))),
              h('tbody', null, rows.map((r) => h('tr', { class: r.ok ? '' : 'bad' }, h('th', { scope: 'row' }, r.el), h('td', null, String(r.left)), h('td', null, String(r.right)), h('td', null, r.ok ? '✓ zgadza się' : '✗ nie zgadza się'))))
            )
          )
        : null
      ].filter(Boolean)
    );
  }
  render();

  const userEq = () => {
    const f = (s, i) => `${coefs[i] > 1 ? coefs[i] : ''}${s.formula}${s.mark}`;
    const L = all.map((s, i) => [s, i]).filter(([s]) => s.side === 'L').map(([s, i]) => f(s, i));
    const R = all.map((s, i) => [s, i]).filter(([s]) => s.side === 'R').map(([s, i]) => f(s, i));
    return `${L.join(' + ')} -> ${R.join(' + ')}`;
  };

  return {
    el: root,
    full: () => true, // domyślne współczynniki to 1, można od razu sprawdzać
    correct: () => coefs.every((c, i) => c === expected[i]),
    userEquation: userEq,
    isBalanced: () => atomTable(all, coefs).every((r) => r.ok),
    lock: () => { locked = true; render(); },
    reveal: (ok) => { locked = true; verdict = ok; render(); },
  };
}

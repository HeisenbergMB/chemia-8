// Tabela rozpuszczalności i kalkulator „czy reakcja zajdzie?”.
// Wzory, nazwy i zbilansowane równania powstają z danych (data/solubility.json),
// więc tabela, kalkulator i pytania nie mogą się rozjechać.

import { h } from './dom.js';
import { formatFormula } from './formula.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export const codeOf = (data, catId, anId) => {
  const ci = data.cations.find((c) => c.id === catId);
  const ai = data.anions.findIndex((a) => a.id === anId);
  return ci ? ci.row[ai] : null;
};
export const getCat = (data, id) => data.cations.find((c) => c.id === id);
export const getAn = (data, id) => data.anions.find((a) => a.id === id);

/** Wzór związku z kationu i anionu, np. Fe2(SO4)3, Al(OH)3, CuSO4. */
export function compoundFormula(cat, an) {
  const g = gcd(cat.charge, an.charge);
  const nc = an.charge / g; // liczba kationów
  const na = cat.charge / g; // liczba anionów
  const catPart = cat.sym + (nc > 1 ? nc : '');
  const anPart = na > 1 && an.poly ? `(${an.sym})${na}` : an.sym + (na > 1 ? na : '');
  return catPart + anPart;
}

export const compoundName = (cat, an) => `${an.name} ${cat.gen}`;

/** Reakcja: sól (cat+an) + zasada (baseCat+OH). Zwraca werdykt, powód i równanie. */
export function reaction(data, catId, anId, baseId) {
  const cat = getCat(data, catId);
  const an = getAn(data, anId);
  const baseCat = getCat(data, baseId);
  const OH = getAn(data, 'OH');
  const salt = compoundFormula(cat, an);
  const base = compoundFormula(baseCat, OH);
  const hydr = compoundFormula(cat, OH);
  const prod = compoundFormula(baseCat, an);
  const saltCode = codeOf(data, catId, anId);
  const hydrCode = codeOf(data, catId, 'OH');
  const info = { salt, base, hydr, prod, saltCode, hydrCode, cat, an, baseCat };
  if (saltCode !== 'R') {
    return { ...info, ok: false, reason: 'salt', text: `${salt} nie rozpuszcza się w wodzie dobrze, więc nie ma go w roztworze w postaci jonów i reakcja nie zachodzi.` };
  }
  if (hydrCode === 'R') {
    return { ...info, ok: false, reason: 'hydroxide', text: `Po zamianie partnerów powstałyby ${hydr} i ${prod}, a oba są rozpuszczalne. Nic się nie wytrąca, więc reakcja nie zachodzi.` };
  }
  const g = gcd(cat.charge, an.charge);
  const x = an.charge / g; // kationów w soli
  const y = cat.charge / g; // anionów w soli
  const bc = x * cat.charge; // cząsteczek zasady
  const c = (n) => (n > 1 ? n : '');
  const eq = `${salt} + ${c(bc)}${base} -> ${c(x)}${hydr}↓ + ${c(y)}${prod}`;
  const why = hydrCode === 'S' ? `${hydr} jest tylko średnio rozpuszczalny, ale w zapisie z lekcji wytrąca się jako osad.` : `${hydr} jest trudno rozpuszczalny, więc wytrąca się jako osad.`;
  return { ...info, ok: true, reason: 'precipitate', text: why, eq };
}

const CODE_WORD = { R: 'rozpuszczalny', S: 'średnio rozpuszczalny', T: 'trudno rozpuszczalny' };

// ---------------------------------------------------------------- tabela
export function renderSolubility(data, preset) {
  const root = h('div');
  let sel = preset || { cat: 'Cu', an: 'OH' };

  function render() {
    const cat = getCat(data, sel.cat);
    const an = getAn(data, sel.an);
    const f = compoundFormula(cat, an);
    const code = codeOf(data, sel.cat, sel.an);
    const canReact = sel.an !== 'OH';

    const table = h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'sol-table' },
        h('caption', { class: 'visually-hidden' }, 'Tabela rozpuszczalności soli i wodorotlenków w wodzie'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Kation \\ anion'), data.anions.map((a) => h('th', { scope: 'col' }, h('span', { class: 'chem' }, a.label))))),
        h(
          'tbody',
          null,
          data.cations.map((c) =>
            h(
              'tr',
              null,
              h('th', { scope: 'row' }, h('span', { class: 'chem' }, c.label)),
              data.anions.map((a, i) => {
                const cd = c.row[i];
                const on = c.id === sel.cat && a.id === sel.an;
                return h(
                  'td',
                  null,
                  h('button', {
                    type: 'button',
                    class: `sol-cell c-${cd}${on ? ' on' : ''}`,
                    'aria-pressed': String(on),
                    'aria-label': `${compoundFormula(c, a)}: ${CODE_WORD[cd]}`,
                    onClick: () => { sel = { cat: c.id, an: a.id }; render(); }
                  }, cd)
                );
              })
            )
          )
        )
      )
    );

    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/rozpuszczalnosc' }, '← Tabela rozpuszczalności'),
      h('h1', null, 'Tabela rozpuszczalności'),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Wybrany związek'),
        h('div', { class: 'sol-detail', 'aria-live': 'polite' },
          h('div', { class: 'sol-formula chem', html: formatFormula(f) }),
          h('div', null, h('div', { class: 'sol-name' }, compoundName(cat, an)), h('div', { class: `sol-badge c-${code}` }, `${code} · ${CODE_WORD[code]}`))
        ),
        canReact ? h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `#/solubility/react/${sel.cat}/${sel.an}` }, `Czy ${f} reaguje z NaOH?`)) : null
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', null, 'Stuknij komórkę, aby zobaczyć związek'),
        table,
        h('ul', { class: 'sol-legend' }, Object.entries(data.legend).map(([k, v]) => h('li', null, h('span', { class: `sol-cell static c-${k}`, 'aria-hidden': 'true' }, k), h('span', null, v)))),
        h('p', { class: 'muted small' }, 'Zawsze podpisujemy rozpuszczalność literą i słowami, a nie samym kolorem.')
      )
    );
  }
  render();
  return root;
}

// ---------------------------------------------------------------- czy reakcja zajdzie
export function renderReact(data, preset) {
  const root = h('div');
  const salts = data.anions.filter((a) => a.id !== 'OH');
  let sel = { cat: (preset && preset.cat) || 'Cu', an: (preset && preset.an && preset.an !== 'OH' ? preset.an : 'SO4'), base: 'Na' };

  function chips(label, items, key, text) {
    return h(
      'div',
      { class: 'sol-pick' },
      h('div', { class: 'eyebrow' }, label),
      h('div', { class: 'seg', role: 'group', 'aria-label': label }, items.map((it) => h('button', { type: 'button', 'aria-pressed': String(sel[key] === it.id), onClick: () => { sel[key] = it.id; render(); }, html: text(it) })))
    );
  }

  function render() {
    const r = reaction(data, sel.cat, sel.an, sel.base);
    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/rozpuszczalnosc' }, '← Tabela rozpuszczalności'),
      h('h1', null, 'Czy reakcja zajdzie?'),
      h(
        'section',
        { class: 'card' },
        h('p', { class: 'muted' }, 'Sól + zasada → wodorotlenek + sól. Wybierz sól i zasadę.'),
        chips('Kation soli', data.cations, 'cat', (c) => `<span class="chem">${c.label}</span>`),
        chips('Anion soli', salts, 'an', (a) => `<span class="chem">${a.label}</span>`),
        chips('Zasada', data.bases.map((id) => getCat(data, id)), 'base', (c) => `<span class="chem">${formatFormula(compoundFormula(c, getAn(data, 'OH')))}</span>`)
      ),
      h(
        'section',
        { class: 'card', 'aria-live': 'polite' },
        h('div', { class: 'eyebrow' }, 'Sprawdzamy'),
        h('ol', { class: 'sol-steps' },
          h('li', null, 'Sól ', h('strong', { class: 'chem', html: formatFormula(r.salt) }), ` (${compoundName(r.cat, r.an)}): `, h('span', { class: `sol-badge c-${r.saltCode}` }, `${r.saltCode} · ${CODE_WORD[r.saltCode]}`)),
          h('li', null, 'Powstały wodorotlenek ', h('strong', { class: 'chem', html: formatFormula(r.hydr) }), ': ', h('span', { class: `sol-badge c-${r.hydrCode}` }, `${r.hydrCode} · ${CODE_WORD[r.hydrCode]}`))
        ),
        h('div', { class: `feedback ${r.ok ? 'ok' : 'bad'}` },
          h('h3', null, r.ok ? '✓ Reakcja zachodzi' : '✗ Reakcja nie zachodzi'),
          h('p', null, r.text),
          r.ok ? h('p', { class: 'sol-eq chem', html: formatFormula(r.eq) }) : null
        ),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn secondary', href: '#/solubility' }, 'Zobacz w tabeli'))
      )
    );
  }
  render();
  return root;
}

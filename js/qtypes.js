// Rejestr typów pytań – JEDNO miejsce, które zna typ: jak go zwalidować, narysować i ocenić.
// Dodanie typu = nowy wpis w QTYPES (+ test w tests/qtypes.test.js). Quiz, sprawdzian, kontrola danych
// i liczniki w menu czytają stąd; nigdzie nie ma drugiej listy typów.
//
// Wpis: {
//   typed        – true: odpowiedź budowana/wpisywana (ekran „Układanie zapisu”); false: wybór z listy
//   bigSubmit    – true: duży przycisk „Sprawdź” (klocki, dopasowanie), false: przycisk przy klawiaturze
//   showsValue   – czy po odpowiedzi pokazujemy „Twoja odpowiedź” (dopasowanie: nie)
//   balanceReport– czy przy błędzie dołączamy raport bilansu zapisu użytkownika
//   correctHtml(q)        – poprawna odpowiedź jako HTML
//   validate(q, v)        – kontrola danych; v.err(msg), v.text(tekst, etykieta, { balance })
//   mount(q, env)         – (tylko typed) buduje kontrolkę, patrz niżej
// }
// mount(q, env) -> { body, after?, value(), ready(), lock(ok), isCorrect(), done?() }
//   env: { check (przycisk zatwierdzenia), submit(), exam, hints }

import { richText, formatFormula } from './formula.js';
import { createChemKeyboard } from './chemkeyboard.js';
import { createBlocks } from './blocks.js';
import { createMatch } from './match.js';
import { createBalance } from './balance.js';
import { h } from './dom.js';
import { parseEquation, parseSpecies, parseFormula, checkBalance, equationsMatch, formulasMatch } from './chem.js';

const withButton = (el, check) => h('div', null, el, h('div', { class: 'btn-row' }, check));

/** Walidacja równania będącego poprawną odpowiedzią: musi się bilansować. */
function balancedOrErr(v, label, str) {
  try {
    const r = checkBalance(parseEquation(str));
    if (!r.ok) v.err(`${label} niezbilansowane: ${r.diffs.join('; ')}`);
  } catch (e) {
    v.err(`${label}: ${e.message}`);
  }
}

export const QTYPES = {
  choice: {
    typed: false,
    correctHtml: (q) => richText(q.options[q.answer]),
    validate(q, v) {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5) return v.err('options: 2–5 odpowiedzi');
      if (new Set(q.options).size !== q.options.length) v.err('options: powtarzające się odpowiedzi');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) v.err(`answer poza zakresem (${q.answer})`);
      q.options.forEach((o, i) => v.text(o, `option ${i}`, { balance: i === q.answer }));
    },
  },

  formula: {
    typed: true,
    bigSubmit: false,
    showsValue: true,
    balanceReport: false,
    correctHtml: (q) => formatFormula(q.answer),
    validate(q, v) {
      if (typeof q.answer !== 'string') return v.err('formula: brak answer');
      try {
        parseFormula(q.answer);
      } catch (e) {
        v.err(`answer: ${e.message}`);
      }
    },
    mount(q, env) {
      const kb = createChemKeyboard({ onChange: (val) => (env.check.disabled = !val.trim()), onEnter: env.submit, submitButton: env.check });
      return {
        body: h('div', null, kb.inputEl),
        after: kb.keysEl,
        value: kb.getValue,
        ready: () => !!kb.getValue().trim(),
        lock: () => kb.lock(),
        isCorrect: () => formulasMatch(kb.getValue(), q.answer, q.accept || []),
        done: () => kb.hideKeys(),
      };
    },
  },

  equation: {
    typed: true,
    bigSubmit: false,
    showsValue: true,
    balanceReport: true,
    correctHtml: (q) => formatFormula(q.answer),
    validate(q, v) {
      balancedOrErr(v, 'answer', q.answer);
    },
    mount(q, env) {
      const kb = createChemKeyboard({ onChange: (val) => (env.check.disabled = !val.trim()), onEnter: env.submit, submitButton: env.check });
      return {
        body: h('div', null, kb.inputEl),
        after: kb.keysEl,
        value: kb.getValue,
        ready: () => !!kb.getValue().trim(),
        lock: () => kb.lock(),
        isCorrect: () => equationsMatch(kb.getValue(), q.answer),
        done: () => kb.hideKeys(),
      };
    },
  },

  blocks: {
    typed: true,
    bigSubmit: true,
    showsValue: true,
    balanceReport: true,
    correctHtml: (q) => formatFormula(q.tokens.join(' ')),
    validate(q, v) {
      if (!Array.isArray(q.tokens) || q.tokens.length < 3) return v.err('blocks: tokens (min. 3)');
      balancedOrErr(v, 'tokens', q.tokens.join(' '));
      for (const t of [...q.tokens.filter((x) => !['->', '+'].includes(x)), ...(q.extra || [])]) {
        try {
          parseSpecies(t);
          parseFormula(parseSpecies(t).formula);
        } catch (e) {
          v.err(`klocek "${t}": ${e.message}`);
        }
      }
      const pool = [...q.tokens, ...(q.extra || [])];
      if ((q.extra || []).some((x) => q.tokens.includes(x))) v.err('extra: klocek-pułapka powtarza poprawny klocek');
      if (pool.length > 10) v.err('blocks: za dużo klocków (max 10)');
    },
    mount(q, env) {
      const bl = createBlocks({ tokens: q.tokens, extra: q.extra || [], onChange: () => (env.check.disabled = !bl.full()) });
      return {
        body: withButton(bl.el, env.check),
        value: bl.value,
        ready: bl.full,
        lock: (ok) => bl.reveal(ok),
        isCorrect: () => equationsMatch(bl.value(), q.tokens.join(' ')),
      };
    },
  },

  match: {
    typed: true,
    bigSubmit: true,
    showsValue: false,
    balanceReport: false,
    correctHtml: (q) => q.pairs.map(([l, r]) => `${richText(l)} → <strong>${richText(r)}</strong>`).join('<br>'),
    validate(q, v) {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.length > 6) return v.err('match: pairs (2–6 par)');
      const rights = [...q.pairs.map((p) => p[1]), ...(q.extra || [])];
      if (new Set(rights).size !== rights.length) v.err('match: odpowiedzi (prawa strona + extra) muszą być unikalne');
      if (new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length) v.err('match: powtarzające się wiersze po lewej');
      q.pairs.forEach(([l, r], i) => {
        v.text(l, `pair ${i} lewa`, { balance: false });
        v.text(r, `pair ${i} prawa`, { balance: false });
      });
      (q.extra || []).forEach((x, i) => v.text(x, `extra ${i}`, { balance: false }));
      if (rights.length > 8) v.err('match: za dużo odpowiedzi (max 8)');
    },
    mount(q, env) {
      const mt = createMatch({ pairs: q.pairs, extra: q.extra || [], onChange: () => (env.check.disabled = !mt.full()) });
      return { body: withButton(mt.el, env.check), value: () => '', ready: mt.full, lock: (ok) => mt.reveal(ok), isCorrect: mt.correct };
    },
  },

  balance: {
    typed: true,
    bigSubmit: true,
    showsValue: true,
    balanceReport: true,
    correctHtml: (q) => formatFormula(q.eq),
    validate(q, v) {
      try {
        const p = parseEquation(q.eq);
        const r = checkBalance(p);
        if (!r.ok) v.err(`eq niezbilansowane: ${r.diffs.join('; ')}`);
        const cs = [...p.left, ...p.right].map((s) => s.coef);
        const g = cs.reduce((a, b) => {
          while (b) [a, b] = [b, a % b];
          return a;
        });
        if (g !== 1) v.err(`współczynniki nie są najmniejsze (NWD = ${g}): ${q.eq}`);
        if (Math.max(...cs) > 9) v.err('współczynnik > 9 (przyciski sięgają 9)');
        if (Math.max(...cs) === 1) v.err('wszystkie współczynniki równe 1 – nic do bilansowania');
        if (p.left.length + p.right.length > 6) v.err('za dużo składników (max 6)');
      } catch (e) {
        v.err(`eq: ${e.message}`);
      }
    },
    mount(q, env) {
      const bl = createBalance({ eq: q.eq, showAtoms: env.hints });
      env.check.disabled = false; // można od razu sprawdzić (domyślnie współczynniki 1)
      return { body: withButton(bl.el, env.check), value: bl.userEquation, ready: () => true, lock: (ok) => bl.reveal(ok), isCorrect: bl.correct };
    },
  },
};

export const TYPES = Object.keys(QTYPES);
export const TYPED_TYPES = TYPES.filter((t) => QTYPES[t].typed);

/** Poprawna odpowiedź jako HTML (do podsumowań). */
export const correctHtml = (q) => QTYPES[q.type].correctHtml(q);

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QTYPES, TYPES, TYPED_TYPES, correctHtml } from '../js/qtypes.js';

/** Waliduje pytanie i zwraca listę zgłoszonych błędów. */
function validate(q) {
  const errs = [];
  const { __noGroup, ...item } = q;
  const group = __noGroup ? undefined : { bank: ['fragment A', 'fragment B', 'fragment C'] }; // grupa z bankiem odpowiedzi (dla typu bank)
  QTYPES[item.type].validate(item, { err: (m) => errs.push(m), text: () => {}, group });
  return errs;
}

const GOOD = {
  choice: { type: 'choice', options: ['a', 'b', 'c'], answer: 1 },
  formula: { type: 'formula', answer: 'Ca^2+' },
  equation: { type: 'equation', answer: 'NaOH -> Na^+ + OH^-' },
  blocks: { type: 'blocks', tokens: ['NaOH', '->', 'Na^+', '+', 'OH^-'], extra: ['Na'] },
  match: { type: 'match', pairs: [['Na', 'sód'], ['K', 'potas']], extra: ['wapń'] },
  balance: { type: 'balance', eq: '2Na + 2H2O -> 2NaOH + H2' },
  write: { type: 'write', answers: ['are you fond of', 'are you really fond of'], keyword: 'fond', maxWords: 5 },
  bank: { type: 'bank', group: 'g-en-01', answer: 2 },
};

const BAD = {
  choice: [{ options: ['a'], answer: 0 }, { options: ['a', 'a'], answer: 0 }, { options: ['a', 'b'], answer: 5 }],
  formula: [{ answer: 5 }, { answer: 'Xx9Q(' }],
  equation: [{ answer: 'Na -> Na^+ + OH^-' }, { answer: 'bez strzałki' }],
  blocks: [{ tokens: ['NaOH', '->'] }, { tokens: ['Na', '->', 'NaOH'] }, { tokens: GOOD.blocks.tokens, extra: ['NaOH'] }, { tokens: GOOD.blocks.tokens, extra: ['A', 'B', 'C', 'D', 'E', 'F'] }],
  match: [{ pairs: [['a', 'b']] }, { pairs: [['a', 'x'], ['b', 'x']] }, { pairs: [['a', 'x'], ['a', 'y']] }],
  balance: [{ eq: 'H2 + O2 -> H2O' }, { eq: '4Na + 4H2O -> 4NaOH + 2H2' }, { eq: 'Na + H2O -> NaOH + H2' }],
  write: [
    { answers: [] },
    { answers: ['  '] },
    { answers: ['Are you fond of', 'are you  fond of.'] }, // ta sama odpowiedź po normalizacji
    { answers: ['are you fond of', 'are you really fond of'], maxWords: 3 },
    { answers: ['do you like'], keyword: 'fond' },
    { answers: ['are you fonder of'], keyword: 'fond' }, // wyraz kluczowy zmieniony
    { answers: ['a'], maxWords: 0 },
    { answers: 'nie lista' },
  ],
  bank: [{ answer: 3 }, { answer: -1 }, { group: undefined }, { __noGroup: true }],
};

test('rejestr zawiera wszystkie typy używane w danych i pochodne listy są spójne', () => {
  assert.deepEqual([...TYPES].sort(), Object.keys(GOOD).sort());
  assert.deepEqual([...TYPED_TYPES].sort(), TYPES.filter((t) => QTYPES[t].typed).sort());
  assert.ok(!TYPED_TYPES.includes('choice'));
});

for (const t of Object.keys(GOOD)) {
  test(`typ „${t}”: poprawne pytanie przechodzi walidację`, () => assert.deepEqual(validate(GOOD[t]), []));

  test(`typ „${t}”: błędne pytania są zgłaszane`, () => {
    for (const bad of BAD[t]) assert.ok(validate({ ...GOOD[t], ...bad }).length > 0, `nie zgłoszono błędu dla ${JSON.stringify(bad)}`);
  });

  test(`typ „${t}”: ma poprawną odpowiedź w HTML`, () => {
    assert.ok(correctHtml(GOOD[t]).length > 0);
  });

  test(`typ „${t}”: wpis w rejestrze jest kompletny`, () => {
    const d = QTYPES[t];
    assert.equal(typeof d.validate, 'function');
    assert.equal(typeof d.correctHtml, 'function');
    if (d.typed) {
      assert.equal(typeof d.mount, 'function');
      for (const k of ['bigSubmit', 'showsValue', 'balanceReport']) assert.equal(typeof d[k], 'boolean', `${t}.${k}`);
    }
  });
}

test('typ „choice”: pole fixed musi być true/false', () => {
  assert.deepEqual(validate({ ...GOOD.choice, options: ['TRUE', 'FALSE'], answer: 0, fixed: true }), []);
  assert.ok(validate({ ...GOOD.choice, fixed: 'tak' }).length > 0);
});

test('typ „write” nie używa stylu wzoru chemicznego i pozwala na samoocenę; chemiczne nie', () => {
  assert.equal(QTYPES.write.plain, true);
  assert.equal(QTYPES.write.selfGrade, true);
  for (const t of ['formula', 'equation', 'blocks', 'match', 'balance']) assert.ok(!QTYPES[t].plain && !QTYPES[t].selfGrade, t);
});

test('typ „write”: odpowiedzi użytkownika i klucza trafiają do HTML bez wstrzykiwania znaczników', () => {
  assert.equal(QTYPES.write.valueHtml('<b>x</b> & y'), '&lt;b&gt;x&lt;/b&gt; &amp; y');
  assert.equal(correctHtml({ type: 'write', answers: ['a<b', 'c'] }), 'a&lt;b / c');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEquation, checkBalance, equationsMatch, formulasMatch } from '../js/chem.js';

test('bilans: poprawne i błędne równanie', () => {
  assert.equal(checkBalance(parseEquation('2Na + 2H2O -> 2NaOH + H2')).ok, true);
  assert.equal(checkBalance(parseEquation('Na + H2O -> NaOH + H2')).ok, false);
});

test('bilans uwzględnia ładunki jonów', () => {
  assert.equal(checkBalance(parseEquation('NaOH -> Na^+ + OH^-')).ok, true);
  assert.equal(checkBalance(parseEquation('NaOH -> Na^2+ + OH^-')).ok, false);
});

test('porównanie równań ignoruje kolejność składników i strzałki ↑ ↓', () => {
  assert.equal(equationsMatch('NaOH -> OH^- + Na^+', 'NaOH -> Na^+ + OH^-'), true);
  assert.equal(equationsMatch('2Na + 2H2O -> 2NaOH + H2↑', '2Na + 2H2O -> H2 + 2NaOH'), true);
  assert.equal(equationsMatch('NaOH -> Na^+', 'NaOH -> Na^+ + OH^-'), false);
});

test('porównanie wzorów dopuszcza alternatywne zapisy', () => {
  assert.equal(formulasMatch('Ca^2+', 'Ca^2+'), true);
  assert.equal(formulasMatch('Ca2+', 'Ca^2+', ['Ca2+']), true);
  assert.equal(formulasMatch('Mg^2+', 'Ca^2+'), false);
});

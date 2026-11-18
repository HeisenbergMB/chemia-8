import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, matchesAnswer, wordCount, containsWord } from '../js/answer.js';

test('normalizacja: wielkość liter, spacje, końcowa kropka, apostrofy typograficzne', () => {
  assert.equal(normalizeAnswer('  Are  you   FOND of. '), 'are you fond of');
  assert.equal(normalizeAnswer('He didn’t go'), "he didn't go"); // ’ z iPada
  assert.equal(normalizeAnswer('He didn‘t go'), "he didn't go");
  assert.equal(normalizeAnswer('really?!'), 'really');
  assert.equal(normalizeAnswer('   '), '');
});

test('pisownia i łączniki pozostają ścisłe', () => {
  assert.equal(matchesAnswer('dishwasher', ['dish washer']), false);
  assert.equal(matchesAnswer('well-known', ['well known']), false);
  assert.equal(matchesAnswer('colour', ['color']), false);
});

test('dopasowanie do listy akceptowanych odpowiedzi; pusty tekst nigdy nie pasuje', () => {
  const answers = ['mind if I turn up', 'mind my turning up'];
  assert.equal(matchesAnswer('Mind if I turn up.', answers), true);
  assert.equal(matchesAnswer('mind my turning up', answers), true);
  assert.equal(matchesAnswer('mind if I turned up', answers), false);
  assert.equal(matchesAnswer('', ['']), false);
  assert.equal(matchesAnswer('   ', ['a']), false);
});

test('liczba wyrazów: skrócenia liczą się osobno (jak w poleceniu konkursu)', () => {
  assert.equal(wordCount('spend two minutes brushing'), 4);
  assert.equal(wordCount("he wouldn't have gone"), 5); // wouldn't = would + not
  assert.equal(wordCount("I'll"), 2);
  assert.equal(wordCount(''), 0);
});

test('wyraz kluczowy musi wystąpić jako osobny wyraz, w niezmienionej formie', () => {
  assert.equal(containsWord('are you fond of', 'fond'), true);
  assert.equal(containsWord('are you fonder of', 'fond'), false);
  assert.equal(containsWord('I was used to', 'used'), true);
  assert.equal(containsWord('unused', 'used'), false);
  assert.equal(containsWord("he can't", 'can'), false); // can't to inny wyraz niż can
});

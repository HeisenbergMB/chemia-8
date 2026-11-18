// Zadania konkursowe z angielskiego w prawdziwym quizie (jsdom): zadanie z tekstem, bank odpowiedzi, odpowiedź wpisana,
// samoocena przed zapisem do powtórek. Przedmiot próbny bez cechy „chem” (znak $ to zwykły tekst).

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootApp } from './helpers/app-env.js';

const subjects = JSON.parse(readFileSync(new URL('../data/subjects.json', import.meta.url), 'utf8'));
subjects.subjects = [subjects.subjects[0], { id: 'en-test', title: 'Angielski próbny', desc: 'test', icon: 'book', status: 'active', features: [], types: ['choice', 'match', 'write', 'bank'], idTag: 'en' }];

const TEXT = 'The park cost $750,000 and $3,000 more. Tom (1)___ every day. Then (2)___ came a storm.';
const files = {
  'data/subjects.json': subjects,
  'data/en-test/curriculum.json': { modules: [{ id: 'm-en', title: 'Moduł', desc: 'opis', topics: [{ id: 'en-1', title: 'Czytanie', status: 'active', desc: 'opis' }] }] },
  'data/en-test/topics/en-1/theory.json': {
    cards: [{ id: 't-en-01', title: 'Karta', body: 'Treść.' }],
    flash: [{ id: 'f-en-01', front: 'a', back: 'b' }],
    groups: [
      { id: 'g-en-01', instruction: 'Uzupełnij luki **jednym** wyrazem.', text: TEXT },
      { id: 'g-en-02', instruction: 'Wybierz fragment pasujący do luki.', bank: ['It was raining.', 'He stayed home.', 'Nobody came.'] },
    ],
  },
  'data/en-test/topics/en-1/questions.json': [
    { id: 'q-en-001', type: 'write', level: 1, group: 'g-en-01', gap: 1, q: 'Luka (1)', answers: ['walks', 'runs'], explain: 'Czas Present Simple, 3. osoba.' },
    { id: 'q-en-002', type: 'write', level: 1, q: 'Przekształć: I didn’t go. (NOT) I ___ there.', answers: ["did not go", "didn't go"], explain: 'Przeczenie w Past Simple.' },
    { id: 'q-en-003', type: 'bank', level: 1, group: 'g-en-02', q: 'Który fragment pasuje do luki 1?', answer: 1, explain: 'Wyjaśnienie wyboru fragmentu.' },
    { id: 'q-en-004', type: 'choice', level: 1, fixed: true, q: 'The park was expensive.', options: ['TRUE', 'FALSE'], answer: 0, explain: 'Tekst podaje cenę parku.' },
  ],
};

let app, runQuiz, store, DATA;
const byId = (id) => DATA.questions.find((q) => q.id === id);
const settle = () => new Promise((r) => setTimeout(r, 30));

before(async () => {
  app = await bootApp({ files });
  await app.goto('#/subject/en-test');
  await settle();
  ({ runQuiz } = await import('../js/quiz.js'));
  store = await import('../js/store.js');
  ({ DATA } = await import('../js/data.js'));
});

const start = (ids, opts = {}) => {
  const root = app.document.createElement('div');
  app.document.body.append(root);
  runQuiz(root, ids.map(byId), opts);
  return root;
};
const type = (root, text) => {
  const input = root.querySelector('.text-input');
  input.value = text;
  input.dispatchEvent(new app.window.Event('input'));
  return input;
};
const submit = (root) => root.querySelector('.kb-submit').click();

test('dane przedmiotu próbnego załadowane, $ nie jest wzorem, grupa pokazuje polecenie i tekst', () => {
  assert.equal(DATA.groups.length, 2);
  assert.equal(DATA.questions.every((q) => q.topic === 'en-1'), true);
  const root = start(['q-en-001']);
  const txt = root.querySelector('.group-text');
  assert.ok(txt.textContent.includes('$750,000 and $3,000'), 'kwoty zostają tekstem');
  assert.equal(root.querySelectorAll('.chem').length, 0);
  assert.equal(root.querySelector('.group-instr strong').textContent, 'jednym');
  assert.equal(txt.querySelector('mark').textContent, '(1)___', 'zaznaczona bieżąca luka');
  assert.equal(txt.querySelectorAll('mark').length, 1);
});

test('pole odpowiedzi nie dopuszcza autokorekty iPada', () => {
  const input = start(['q-en-002']).querySelector('.text-input');
  for (const [k, v] of [['autocapitalize', 'none'], ['autocorrect', 'off'], ['spellcheck', 'false'], ['autocomplete', 'off']]) assert.equal(input.getAttribute(k), v, k);
});

test('TRUE/FALSE ma stałą kolejność odpowiedzi', () => {
  for (let i = 0; i < 12; i++) {
    const root = start(['q-en-004']);
    assert.deepEqual([...root.querySelectorAll('.option .text')].map((e) => e.textContent), ['TRUE', 'FALSE']);
  }
});

test('odpowiedź poprawna: ignoruje wielkość liter, spacje i apostrof typograficzny', () => {
  store.update((s) => (s.cards = {}));
  const root = start(['q-en-002']);
  type(root, "  DIDN’T   go. ");
  submit(root);
  assert.ok(root.querySelector('.feedback.ok'), 'zaliczone');
  assert.equal(store.get().cards['q-en-002'].box, 2);
});

test('błędna odpowiedź: samoocena wstrzymuje zapis do powtórek; „też poprawna” zalicza', () => {
  store.update((s) => (s.cards = {}));
  const root = start(['q-en-001']);
  type(root, 'goes');
  submit(root);
  assert.ok(root.querySelector('.feedback.bad h3').textContent.includes('Porównaj'));
  assert.equal(store.get().cards['q-en-001'], undefined, 'jeszcze nic nie zapisano w powtórkach');
  assert.ok(root.textContent.includes('walks / runs'), 'pokazano klucz');
  [...root.querySelectorAll('button')].find((b) => b.textContent.includes('też jest poprawna')).click();
  assert.ok(root.querySelector('.feedback.ok'));
  assert.equal(store.get().cards['q-en-001'].box, 2, 'zaliczona jak poprawna odpowiedź');
  root.querySelector('.btn.big').click(); // zobacz wynik
  assert.ok(root.textContent.includes('100%'));
});

test('błędna odpowiedź: „Nie, to błąd” zapisuje błąd i pytanie wraca raz na końcu', () => {
  store.update((s) => (s.cards = {}));
  const root = start(['q-en-001']);
  type(root, 'goes');
  submit(root);
  [...root.querySelectorAll('button')].find((b) => b.textContent.includes('to błąd')).click();
  assert.ok(root.querySelector('.feedback.bad'));
  assert.equal(store.get().cards['q-en-001'].box, 1);
  assert.ok(root.textContent.includes('wróci jeszcze raz'));
  root.querySelector('.btn.big').click();
  assert.ok(root.querySelector('.text-input'), 'to samo pytanie drugi raz');
});

test('bank odpowiedzi: litery stałe, wybór i ocena', () => {
  const root = start(['q-en-003']);
  assert.deepEqual([...root.querySelectorAll('.option .letter')].map((e) => e.textContent), ['A', 'B', 'C']);
  assert.ok(root.querySelector('.group-text') === null, 'grupa z samym bankiem nie ma tekstu');
  [...root.querySelectorAll('.option')][1].click();
  root.querySelector('.btn.big').click();
  assert.ok(root.querySelector('.feedback.ok'));
  const root2 = start(['q-en-003']);
  [...root2.querySelectorAll('.option')][2].click();
  root2.querySelector('.btn.big').click();
  assert.ok(root2.querySelector('.feedback.bad'));
  assert.ok(root2.textContent.includes('B – He stayed home.'), 'poprawna odpowiedź z literą i treścią fragmentu');
});

test('tryb sprawdzian: odpowiedź wpisana oceniana od razu, bez samooceny', () => {
  store.update((s) => (s.cards = {}));
  const root = start(['q-en-002'], { exam: true });
  type(root, 'wrong');
  root.querySelector('.kb-submit').click();
  assert.ok(root.textContent.includes('Wynik sprawdzianu'));
  assert.ok(root.textContent.includes('Twoja odpowiedź: wrong'));
  assert.ok(root.textContent.includes('did not go / didn\'t go'));
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

// Przełączanie między dwoma aktywnymi przedmiotami (drugi to sztuczny przedmiot testowy bez cechy „chem”).

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootApp } from './helpers/app-env.js';

const subjects = JSON.parse(readFileSync(new URL('../data/subjects.json', import.meta.url), 'utf8'));
subjects.subjects.push({ id: 'probny', title: 'Przedmiot próbny', desc: 'tylko do testów', icon: 'book', status: 'active', features: [] });
const files = {
  'data/subjects.json': subjects,
  'data/probny/curriculum.json': { modules: [{ id: 'm-pr', title: 'Moduł próbny', desc: 'opis modułu', topics: [{ id: 'pr-1', title: 'Dział próbny', status: 'active', desc: 'opis działu' }] }] },
  'data/probny/topics/pr-1/theory.json': { cards: [{ id: 't-pr-01', title: 'Karta próbna', body: 'Treść karty próbnej.' }], flash: [{ id: 'f-pr-01', front: 'przód', back: 'tył' }] },
  'data/probny/topics/pr-1/questions.json': [{ id: 'q-pr-001', type: 'choice', level: 1, q: 'Pytanie próbne?', options: ['a', 'b'], answer: 0, explain: 'Wyjaśnienie pytania próbnego.' }],
};

let app;
const settle = () => new Promise((r) => setTimeout(r, 80));
const saved = () => JSON.parse(localStorage.getItem('chemia8.v1'));

before(async () => {
  app = await bootApp({ files });
});

test('chemia: działają trasy chemiczne i widać jej działy', async () => {
  assert.equal(await app.goto('#/valence'), '#/valence');
  await app.goto('#/');
  assert.ok(app.side.textContent.includes('Wodorotlenki rozpuszczalne'));
  assert.ok(app.links().includes('#/subject/probny'));
});

test('przełączenie na drugi przedmiot: jego dane, bez tras chemicznych, wybór zapisany', async () => {
  await app.goto('#/subject/probny');
  await settle();
  assert.equal(app.window.location.hash, '#/');
  assert.ok(app.main.textContent.includes('Dział próbny'), 'na stronie głównej powinny być działy nowego przedmiotu');
  assert.ok(!app.side.textContent.includes('Wodorotlenki'), 'działy chemii nie powinny zostać w menu');
  assert.equal(saved().settings.subject, 'probny');
  assert.equal(await app.goto('#/valence'), '#/', 'trasy cechy chem nie działają w przedmiocie bez tej cechy');
  assert.equal(await app.goto('#/lab/sod'), '#/');
  assert.equal(await app.goto('#/topic/pr-1'), '#/topic/pr-1');
  assert.equal(await app.goto('#/topic/wodorotlenki-rozp'), '#/topic/wodorotlenki-rozp');
  assert.ok(app.main.textContent.includes('Wróć na start'), 'dział z innego przedmiotu: ekran „nie znaleziono”');
});

test('sprawdzian z drugiego przedmiotu: zakres tylko jego, wynik zapisany z przedmiotem i widoczny tylko tam', async () => {
  await app.goto('#/exam');
  assert.ok(app.main.textContent.includes('Zakres: Dział próbny.'), 'zakres obejmuje tylko dział przedmiotu próbnego');
  assert.ok(app.main.textContent.includes('Jeszcze nie rozwiązano'));
  await app.goto('#/exam/run');
  assert.ok(app.main.textContent.includes('Pytanie próbne'), 'pytanie z przedmiotu próbnego');
  [...app.main.querySelectorAll('.option')][0].click(); // poprawna odpowiedź (answer: 0)
  app.main.querySelector('.btn.big').click(); // w sprawdzianie: dalej / zakończ
  const exam = saved().exams.at(-1);
  assert.equal(exam.subject, 'probny');
  assert.equal(exam.scope, null);
  assert.equal(exam.total, 1);
  await app.goto('#/exam');
  assert.ok(!app.main.textContent.includes('Jeszcze nie rozwiązano'), 'wynik widać w historii przedmiotu próbnego');
});

test('powrót do chemii przywraca jej dane i trasy; postęp obu przedmiotów jest w jednym zapisie', async () => {
  await app.goto('#/subject/chemia');
  await settle();
  assert.ok(app.side.textContent.includes('Wodorotlenki rozpuszczalne'));
  assert.equal(await app.goto('#/valence'), '#/valence');
  assert.equal(saved().settings.subject, 'chemia');
  await app.goto('#/exam');
  assert.ok(app.main.textContent.includes('Jeszcze nie rozwiązano'), 'wynik sprawdzianu z innego przedmiotu nie trafia do historii chemii');
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

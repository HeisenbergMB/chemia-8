// Pytania z arkuszy są ukryte w ćwiczeniach do pierwszego zatwierdzenia arkusza.

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp } from './helpers/app-env.js';
import { files } from './helpers/sheet-fixture.js';

let app, store, DATA, practice, startDraft;
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const ids = (qs) => qs.map((q) => q.id).sort();
const commit = (sheet) => store.addExamResult({ t: Date.now(), subject: 'en-test', scope: `sheet:${sheet}`, pct: 50, score: 4, total: 9, points: 4, max: 9 });

before(async () => {
  app = await bootApp({ files });
  await app.goto('#/subject/en-test');
  await settle();
  store = await import('../js/store.js');
  ({ DATA } = await import('../js/data.js'));
  practice = await import('../js/practice.js');
  ({ startDraft } = await import('../js/sheet-run.js'));
});

beforeEach(() => store.update((s) => { s.exams = []; s.draft = null; s.cards = {}; }));

test('przed zatwierdzeniem w ćwiczeniach jest tylko pytanie spoza arkuszy', () => {
  assert.deepEqual(ids(practice.practiceQuestions()), ['q-en-109']);
  assert.equal(practice.sealedCount(), 8);
  assert.equal(practice.sealedIds().size, 8);
  assert.deepEqual(ids(practice.practiceOf('en-1')), ['q-en-109']);
});

test('rozpoczęty, ale niezatwierdzony arkusz nie odblokowuje pytań', () => {
  startDraft('s-en-01', 'en-test');
  assert.equal(practice.sealedCount(), 8);
});

test('pytania współdzielone przez dwa arkusze czekają na zatwierdzenie obu', () => {
  commit('s-en-01');
  assert.equal(practice.sealedCount(), 8, 'arkusz 2 ma te same pytania i nie jest zatwierdzony');
  commit('s-en-02');
  assert.equal(practice.sealedCount(), 0);
  assert.equal(practice.practiceQuestions().length, 9);
});

test('wynik arkusza z innego przedmiotu niczego nie odblokowuje', () => {
  store.addExamResult({ t: 1, subject: 'chemia', scope: 'sheet:s-en-01', pct: 1, score: 1, total: 1 });
  commit('s-en-01');
  store.addExamResult({ t: 2, subject: 'chemia', scope: 'sheet:s-en-02', pct: 1, score: 1, total: 1 });
  assert.equal(practice.sealedCount(), 8);
});

test('ekran działu: quiz tylko z pytań dostępnych, z informacją o ukrytych', async () => {
  await app.goto('#/topic/en-1');
  assert.ok(app.main.textContent.includes('Jeszcze 8 pytań czeka w arkuszu'));
  assert.ok(app.main.textContent.includes('Wszystkie pytania (1)'));
  assert.ok(app.main.textContent.includes('0 z 1 opanowanych'), 'postęp liczy tylko dostępne pytania');
  commit('s-en-01');
  commit('s-en-02');
  await app.goto('#/topic/en-1');
  assert.ok(app.main.textContent.includes('Wszystkie pytania (9)'));
  assert.ok(!app.main.textContent.includes('czeka w arkuszu'));
});

test('quiz działu nie pokazuje pytań z arkusza, a po zatwierdzeniu je pokazuje', async () => {
  await app.goto('#/quiz/en-1/all');
  assert.ok(app.main.textContent.includes('Pytanie ćwiczeniowe spoza arkusza'));
  assert.ok(!app.main.textContent.includes('Luka (1)'));
  assert.ok(app.main.textContent.includes('Pytanie 1 z 1'));
});

test('powtórka na dziś i ćwiczenie dodatkowe też pomijają pytania z arkusza', async () => {
  await app.goto('#/review');
  assert.ok(app.main.textContent.includes('Pytanie 1 z 1'), 'tylko jedno nowe pytanie');
  await app.goto('#/review/extra');
  assert.ok(app.main.textContent.includes('Pytanie 1 z 1'));
});

test('gdy wszystkie pytania czekają w arkuszach: ekran główny tłumaczy dlaczego, a quiz nie startuje', async () => {
  // wszystkie pytania ćwiczeniowe zostają „opróżnione” przez przedmiot, w którym każde pytanie jest w arkuszu
  const only = DATA.questions.filter((q) => q.id !== 'q-en-109');
  const keep = DATA.questions;
  DATA.questions = only;
  try {
    await app.goto('#/');
    assert.ok(app.main.textContent.includes('Pytania z arkusza są ukryte'));
    assert.ok(![...app.main.querySelectorAll('a')].some((a) => a.getAttribute('href') === '#/review'));
    await app.goto('#/quiz/en-1/all');
    assert.ok(app.main.textContent.includes('Pytania z arkusza są ukryte'));
    await app.goto('#/topic/en-1');
    assert.ok(![...app.main.querySelectorAll('a')].some((a) => (a.getAttribute('href') || '').startsWith('#/quiz')));
  } finally {
    DATA.questions = keep;
  }
});

test('opis arkusza informuje o ukryciu pytań', async () => {
  await app.goto('#/sheet/s-en-01');
  assert.ok(app.main.textContent.includes('ukryte w ćwiczeniach'));
});

test('chemia (bez arkuszy) dostaje pełną listę pytań – bez zmian', async () => {
  await app.goto('#/subject/chemia');
  await settle();
  assert.equal(practice.practiceQuestions(), DATA.questions, 'ta sama tablica');
  assert.equal(practice.sealedCount(), 0);
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

// Prawdziwa treść angielskiego (data/angielski): arkusz jest spójny, klucz się sprawdza sam ze sobą, a wszystkie ekrany działają.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp } from './helpers/app-env.js';
import { loadData } from '../tools/load-data.js';
import { gradeSheet, sheetMax } from '../js/sheets.js';

const { data, sheets, problems } = loadData('angielski');
const byId = new Map(data.questions.map((q) => [q.id, q]));

test('dane angielskiego wczytują się bez problemów', () => {
  assert.deepEqual(problems, []);
  assert.ok(sheets && sheets.sheets.length >= 1);
});

for (const sheet of sheets.sheets) {
  const format = sheets.formats.find((f) => f.id === sheet.format);

  test(`arkusz ${sheet.id}: punktacja ${format.points}, czas ${format.minutes} min`, () => assert.equal(sheetMax(sheet, byId), format.points));

  test(`arkusz ${sheet.id}: klucz oceniony samym sobą daje komplet punktów`, () => {
    const answers = {};
    for (const t of sheet.tasks) for (const id of t.items) {
      const q = byId.get(id);
      answers[id] = q.type === 'write' ? q.answers[0] : q.answer;
    }
    const r = gradeSheet(sheet, byId, answers);
    const wrong = r.tasks.flatMap((t) => t.items).filter((i) => !i.ok).map((i) => i.q.id);
    assert.deepEqual(wrong, []);
    assert.equal(r.points, format.points);
  });

  test(`arkusz ${sheet.id}: każda wersja odpowiedzi z klucza jest uznawana, a pusta i losowa nie`, () => {
    for (const t of sheet.tasks) for (const id of t.items) {
      const q = byId.get(id);
      if (q.type !== 'write') continue;
      for (const a of q.answers) {
        const r = gradeSheet({ tasks: [{ items: [id] }] }, byId, { [id]: a.toUpperCase() + '.' });
        assert.equal(r.points, 1, `${id}: "${a}"`);
      }
      assert.equal(gradeSheet({ tasks: [{ items: [id] }] }, byId, { [id]: 'xyzzy' }).points, 0, id);
    }
  });

  test(`arkusz ${sheet.id}: pytania wyboru mają rozłożoną pozycję poprawnej odpowiedzi`, () => {
    const mc = sheet.tasks.flatMap((t) => t.items).map((id) => byId.get(id)).filter((q) => q.type === 'choice' && !q.fixed);
    const counts = [0, 0, 0, 0];
    for (const q of mc) counts[q.answer]++;
    assert.ok(Math.max(...counts) <= Math.ceil(mc.length * 0.4), `za dużo odpowiedzi na jednej pozycji: ${counts}`);
  });
}

test('prawda/fałsz w arkuszu: nie same TRUE ani same FALSE', () => {
  const tf = data.questions.filter((q) => q.fixed);
  const t = tf.filter((q) => q.answer === 0).length;
  assert.ok(t >= 3 && t <= tf.length - 3, `TRUE: ${t} z ${tf.length}`);
});

let app;
before(async () => {
  app = await bootApp();
  await app.goto('#/subject/angielski');
  await new Promise((r) => setTimeout(r, 80));
});

test('crawl po angielskim: wszystkie linki prowadzą do istniejących ekranów', async () => {
  const seen = new Map();
  const queue = ['#/', '#/sheets'];
  while (queue.length) {
    const h = queue.shift();
    if (seen.has(h)) continue;
    const end = await app.goto(h);
    seen.set(h, { end, text: app.main.textContent.trim() });
    for (const l of app.links()) if (!seen.has(l) && !l.startsWith('#/subject/') && !l.endsWith('/run')) queue.push(l);
  }
  for (const [h, { end, text }] of seen) {
    assert.equal(end, h, `${h} przekierowuje na ${end}`);
    assert.ok(text.length > 20 && !text.includes('Wróć na start'), `${h}: pusty lub „nie znaleziono”`);
  }
  for (const k of ['topic', 'theory', 'flash', 'quiz', 'sheets', 'sheet']) assert.ok([...seen.keys()].some((h) => h.split('/')[1] === k), `brak ekranu ${k}`);
  assert.ok(!app.main.textContent.includes('NaOH'), 'żadnej chemii');
  assert.ok(![...seen.keys()].some((h) => h.startsWith('#/exam')), 'brak losowego sprawdzianu (arkusze mają samoocenę)');
  assert.ok([...seen.keys()].some((h) => h.startsWith('#/quiz')), 'są pytania ćwiczeniowe, więc quizy działów działają od razu');
});

test('ćwiczenia: pytania z arkusza ukryte, a osobnych pytań ćwiczeniowych jest dość na quizy i powtórki', async () => {
  const { practiceQuestions } = await import('../js/practice.js');
  const inSheets = new Set(sheets.sheets.flatMap((sh) => sh.tasks.flatMap((t) => t.items)));
  const pool = practiceQuestions();
  assert.ok(pool.every((q) => !inSheets.has(q.id)), 'w ćwiczeniach nie ma pytań z niezatwierdzonego arkusza');
  assert.ok(pool.length >= 100, `pytań ćwiczeniowych: ${pool.length}`);
  for (const topic of ['czytanie', 'gramatyka', 'slownictwo', 'kultura']) assert.ok(pool.filter((q) => q.topic === topic).length >= 10, `dział ${topic} ma za mało pytań ćwiczeniowych`);
  assert.ok(pool.filter((q) => q.type !== 'choice').length >= 30, 'ćwiczenia zawierają też pytania wpisywane');
});

test('wszystkie pytania angielskiego dają się wyrenderować w quizie i na sprawdzianie', async () => {
  const { runQuiz } = await import('../js/quiz.js');
  const { DATA } = await import('../js/data.js');
  assert.equal(DATA.subject.id, 'angielski');
  for (const q of DATA.questions) {
    for (const exam of [false, true]) {
      const root = app.document.createElement('div');
      runQuiz(root, [q], { exam });
      assert.ok(root.querySelector('.question'), `${q.id}: brak pytania`);
      assert.ok(root.querySelector('.options, .text-input'), `${q.id}: brak kontrolki odpowiedzi`);
    }
  }
});

test('arkusz wojewódzki: „który akapit” i tak/nie mają kompaktowe przyciski, a wybór zapisuje się w szkicu', async () => {
  const store = await import('../js/store.js');
  store.update((st) => (st.draft = null));
  await app.goto('#/sheet/s-en-woj-01/run');
  const next = () => [...app.main.querySelectorAll('button')].find((b) => b.textContent.includes('Następne zadanie')).click();
  next(); // zadanie II: który akapit
  const first = app.main.querySelector('.sheet-item');
  assert.deepEqual([...first.querySelectorAll('.pick')].map((b) => b.textContent), ['1', '2', '3', '4', '5', '6']);
  first.querySelectorAll('.pick')[2].click();
  const id = Object.keys(store.get().draft.answers)[0];
  assert.equal(store.get().draft.answers[id], 2, 'zapisany indeks odpowiedzi (akapit 3)');
  for (let i = 0; i < 7; i++) next(); // do zadania IX: yes/no
  assert.deepEqual([...app.main.querySelector('.sheet-item').querySelectorAll('.pick')].map((b) => b.textContent), ['yes', 'no']);
  store.update((st) => (st.draft = null));
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

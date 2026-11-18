import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSheets, gradeSheet, cleanAnswers, clock, remainingMs, deadlineOf, sheetMax, TASK_KINDS, KIND_LABELS, itemPoints } from '../js/sheets.js';
import { SCHEMA_VERSION, MIGRATIONS, normalize, addExamResult, get as getState } from '../js/store.js';
import { sheetsJson, ctx } from './helpers/sheet-fixture.js';

const errorsOf = (data) => {
  const errs = [];
  validateSheets(data, ctx(), (w, m) => errs.push(`${w}: ${m}`));
  return errs;
};
const clone = (o) => JSON.parse(JSON.stringify(o));

test('poprawny arkusz przechodzi kontrolę', () => assert.deepEqual(errorsOf(sheetsJson), []));

test('kontrola arkusza zgłasza typowe błędy', () => {
  const mutate = (fn) => {
    const d = clone(sheetsJson);
    fn(d.sheets[0], d);
    return errorsOf(d).join('\n');
  };
  assert.match(mutate((s) => (s.tasks[0].items = ['q-en-101'])), /suma punktów 8 ≠ 9/);
  assert.match(mutate((s) => s.tasks[1].items.push('q-en-101')), /więcej niż raz/);
  assert.match(mutate((s) => (s.tasks[1].items[0] = 'q-nie-ma')), /nieznane pytanie/);
  assert.match(mutate((s) => (s.tasks[2].instruction = '')), /własne instruction/);
  assert.match(mutate((s) => (s.tasks[0].kind = 'zgadywanka')), /nieznany rodzaj/);
  assert.match(mutate((s) => (s.tasks[0].group = 'g-nie-ma')), /nieznana grupa/);
  assert.match(mutate((s) => (s.tasks[1].group = 'g-en-01')), /nie zgadza się z grupą/);
  assert.match(mutate((s) => (s.format = 'f-nie-ma')), /nieznany format/);
  assert.match(mutate((s) => (s.tasks = [])), /brak zadań/);
  // luki w tekście (1), (2) muszą odpowiadać polom gap; (0) to przykład i nie wymaga pytania
  assert.match(mutate((s) => s.tasks[1].items.reverse() && (s.tasks[1].items = ['q-en-103'])), /luki w tekście \(1,2\) nie pasują/);
});

test('typy spoza arkusza (np. match) nie są dozwolone w arkuszu', () => {
  const c = ctx();
  c.byId.set('q-en-109', { id: 'q-en-109', type: 'match', pairs: [['a', 'b'], ['c', 'd']] });
  const d = clone(sheetsJson);
  d.sheets[0].tasks[2].items.push('q-en-109');
  const errs = [];
  validateSheets(d, c, (w, m) => errs.push(m));
  assert.ok(errs.some((e) => /nie jest dostępny w arkuszu/.test(e)));
});

test('każdy rodzaj zadania ma polską nazwę', () => {
  assert.ok(TASK_KINDS.length >= 18);
  for (const k of TASK_KINDS) assert.ok(KIND_LABELS[k], k);
});

test('ocena: punkty, pytania z własną punktacją, brak odpowiedzi', () => {
  const sheet = sheetsJson.sheets[0];
  const { byId } = ctx();
  assert.equal(sheetMax(sheet, byId), 9);
  assert.equal(itemPoints(byId.get('q-en-106')), 2);
  const answers = { 'q-en-101': 0, 'q-en-102': 0, 'q-en-103': ' Has.', 'q-en-106': 'Not as tall as', 'q-en-107': 1 };
  const r = gradeSheet(sheet, byId, answers);
  assert.equal(r.max, 9);
  assert.equal(r.points, 1 + 1 + 2 + 1); // 101 ok, 102 źle, 103 ok, 104 brak, 105 brak, 106 (2 pkt) ok, 107 ok, 108 brak
  assert.deepEqual(r.tasks.map((t) => t.points), [1, 1, 2, 1]);
  assert.equal(r.pct, Math.round((5 / 9) * 100));
});

test('uznanie własnej odpowiedzi działa tylko dla typów z samooceną', () => {
  const sheet = sheetsJson.sheets[0];
  const { byId } = ctx();
  const answers = { 'q-en-103': 'owns', 'q-en-102': 0, 'q-en-107': 2 };
  const r = gradeSheet(sheet, byId, answers, { 'q-en-103': true, 'q-en-102': true, 'q-en-107': true });
  const flat = r.tasks.flatMap((t) => t.items);
  assert.equal(flat.find((i) => i.q.id === 'q-en-103').ok, true, 'write: uznane');
  assert.equal(flat.find((i) => i.q.id === 'q-en-102').ok, false, 'choice: klucz jest jednoznaczny');
  assert.equal(flat.find((i) => i.q.id === 'q-en-107').ok, false, 'bank: klucz jest jednoznaczny');
  assert.equal(flat.find((i) => i.q.id === 'q-en-104').ok, false, 'bez odpowiedzi nie można uznać');
});

test('czyszczenie odpowiedzi: usunięte pytania i zły kształt odpadają', () => {
  const { byId } = ctx();
  const dirty = { 'q-en-101': 1, 'q-en-102': 7, 'q-en-103': 'has', 'q-en-107': -1, 'q-usuniete': 'x', 'q-en-108': 2, 'q-en-104': 5 };
  assert.deepEqual(cleanAnswers(sheetsJson.sheets[0], byId, dirty), { 'q-en-101': 1, 'q-en-103': 'has', 'q-en-108': 2 });
});

test('zegar: format czasu i pozostały czas liczony z zegara, nie z odliczania', () => {
  assert.equal(clock(90 * 60000), '1:30:00');
  assert.equal(clock(4 * 60000 + 30000), '04:30');
  assert.equal(clock(1), '00:01');
  const draft = { startedAt: 1000 };
  const format = { minutes: 10 };
  assert.equal(deadlineOf(draft, format), 601000);
  assert.equal(remainingMs(draft, format, 301000), 300000);
  assert.equal(remainingMs(draft, format, 9e9), 0);
});

test('migracja 3 -> 4 dodaje draft; wersja jest podniesiona', () => {
  assert.ok(SCHEMA_VERSION >= 4);
  assert.equal(typeof MIGRATIONS[3], 'function');
  const s = normalize({ version: 3, cards: { a: { box: 1 } }, flash: {}, settings: { fontScale: 'm', subject: 'chemia', examDates: {} }, exams: [] });
  assert.equal(s.draft, null);
  assert.deepEqual(s.cards, { a: { box: 1 } });
  const kept = normalize({ version: 4, cards: {}, draft: { sheet: 's-1', answers: {} } });
  assert.equal(kept.draft.sheet, 's-1');
});

test('historia wyników jest ograniczona osobno dla przedmiotu i zakresu (arkusze nie wypierają sprawdzianów)', () => {
  const st = getState();
  st.exams = [];
  for (let i = 0; i < 5; i++) addExamResult({ t: i, subject: 'chemia', scope: null, pct: 50 });
  for (let i = 0; i < 40; i++) addExamResult({ t: 100 + i, subject: 'angielski', scope: 'sheet:s-en-01', pct: i });
  const chem = st.exams.filter((e) => e.subject === 'chemia');
  const sheets = st.exams.filter((e) => e.scope === 'sheet:s-en-01');
  assert.equal(chem.length, 5);
  assert.equal(sheets.length, 30);
  assert.equal(sheets[0].pct, 10, 'zostają najnowsze');
});

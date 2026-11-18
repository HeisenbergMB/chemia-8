import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, normalize, importJson, exportJson, SCHEMA_VERSION, MIGRATIONS } from '../js/store.js';

test('każda wersja poniżej SCHEMA_VERSION ma migrację', () => {
  for (let v = 1; v < SCHEMA_VERSION; v++) assert.equal(typeof MIGRATIONS[v], 'function', `brak migracji ${v} -> ${v + 1}`);
});

test('stary zapis (bez pola version) trafia na bieżącą wersję i zachowuje postęp', () => {
  const old = { cards: { 'q-wr-001': { box: 3, due: 1, seen: 2, ok: 2, bad: 0, last: 1 } }, flash: { 'f-wr-01': true }, settings: { fontScale: 'l', examDate: '2026-10-05' } };
  const s = normalize(old);
  assert.equal(s.version, SCHEMA_VERSION);
  assert.equal(s.cards['q-wr-001'].box, 3);
  assert.equal(s.flash['f-wr-01'], true);
  assert.equal(s.settings.fontScale, 'l');
  assert.deepEqual(s.settings.examDates, {}, 'stara zaszyta data jest czyszczona');
  assert.equal(s.settings.subject, 'chemia');
});

test('data sprawdzianu wybrana przez użytkownika przetrwa migrację', () => {
  const s = normalize({ cards: {}, settings: { examDate: '2027-01-15' } });
  assert.deepEqual(s.settings.examDates, { chemia: '2027-01-15' }, 'data trafia do przedmiotu chemia');
  assert.equal('examDate' in s.settings, false);
});

test('dane z nowszej wersji są odrzucane', () => {
  assert.throws(() => migrate({ version: SCHEMA_VERSION + 1, cards: {} }), /nowszej/);
  const r = importJson(JSON.stringify({ app: 'chemia-8', data: { version: SCHEMA_VERSION + 1, cards: {} } }));
  assert.equal(r.ok, false);
});

test('import odrzuca obcy plik', () => {
  assert.equal(importJson('{"a":1}').ok, false);
  assert.equal(importJson('nie json').ok, false);
});

test('zapis z nowszej wersji aplikacji nie jest nadpisywany', async () => {
  const stored = JSON.stringify({ version: SCHEMA_VERSION + 1, cards: { x: { box: 5 } }, flash: {}, settings: {}, exams: [] });
  const fake = { data: { 'chemia8.v1': stored }, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } };
  globalThis.localStorage = fake;
  try {
    const fresh = await import('../js/store.js?nowszy');
    fresh.update((s) => (s.cards.y = { box: 1 }));
    assert.equal(fake.data['chemia8.v1'], stored);
  } finally {
    delete globalThis.localStorage;
  }
});

test('migracja 2 -> 3: wyniki sprawdzianów dostają przedmiot chemia, postęp zostaje bez zmian', () => {
  const v2 = {
    version: 2,
    settings: { fontScale: 'm', examDate: '2027-02-01' },
    cards: { 'q-wr-001': { box: 2, due: 5, seen: 3, ok: 2, bad: 1, last: 4 } },
    flash: { 'f-wr-01': true },
    exams: [{ t: 1, scope: null, pct: 80 }, { t: 2, scope: 'wodorotlenki', pct: 90 }],
  };
  const s = normalize(v2);
  assert.equal(s.version, SCHEMA_VERSION);
  assert.deepEqual(s.cards, v2.cards);
  assert.deepEqual(s.flash, v2.flash);
  assert.deepEqual(s.exams.map((e) => e.subject), ['chemia', 'chemia']);
  assert.deepEqual(s.exams.map((e) => e.pct), [80, 90]);
  assert.equal(s.settings.examDates.chemia, '2027-02-01');
});

test('eksport z poprzedniej wersji aplikacji (app: "chemia-8") nadal da się wczytać; nowy eksport ma nową nazwę', () => {
  const old = JSON.stringify({ app: 'chemia-8', data: { version: 2, cards: {}, flash: {}, settings: { examDate: '' }, exams: [] } });
  assert.equal(importJson(old).ok, true);
  assert.equal(JSON.parse(exportJson()).app, 'powtorka-8');
  assert.equal(importJson(exportJson()).ok, true);
});

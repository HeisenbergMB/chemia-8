import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, normalize, importJson, SCHEMA_VERSION, MIGRATIONS } from '../js/store.js';

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
  assert.equal(s.settings.examDate, '', 'stara zaszyta data jest czyszczona');
});

test('data sprawdzianu wybrana przez użytkownika przetrwa migrację', () => {
  assert.equal(normalize({ cards: {}, settings: { examDate: '2027-01-15' } }).settings.examDate, '2027-01-15');
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

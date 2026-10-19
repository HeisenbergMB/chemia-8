import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExam, EXAM_SIZE } from '../js/exam.js';
import { record, isDue, INTERVALS_MIN } from '../js/leitner.js';
import * as store from '../js/store.js';
import { staleFiles } from '../tools/build.js';
import { currentIds, readLock, diffLock } from '../tools/lock-ids.js';

const questions = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'));

test('sprawdzian: właściwa liczba, bez powtórzeń, z każdego działu', () => {
  const topics = new Set(questions.map((q) => q.topic));
  for (let i = 0; i < 50; i++) {
    const ex = buildExam(questions);
    assert.equal(ex.length, EXAM_SIZE);
    assert.equal(new Set(ex.map((q) => q.id)).size, ex.length);
    assert.ok(new Set(ex.map((q) => q.topic)).size >= Math.min(topics.size, EXAM_SIZE));
  }
});

test('sprawdzian z pustej listy jest pusty', () => assert.deepEqual(buildExam([]), []));

test('Leitner: pierwsza dobra odpowiedź → pudełko 2, zła → 1, termin zgodny z interwałem', () => {
  const now = 1_000_000;
  record('t-1', true, now);
  assert.equal(store.get().cards['t-1'].box, 2);
  assert.equal(store.get().cards['t-1'].due, now + INTERVALS_MIN[1] * 60000);
  record('t-1', false, now + 1);
  assert.equal(store.get().cards['t-1'].box, 1);
  assert.equal(isDue(store.get().cards['t-1'], now + 1 + INTERVALS_MIN[0] * 60000), true);
});

test('Leitner: dobra odpowiedź przed terminem nie awansuje karty', () => {
  const now = 2_000_000;
  record('t-2', true, now); // box 2
  record('t-2', true, now + 1000); // przed terminem
  assert.equal(store.get().cards['t-2'].box, 2);
});

test('pliki generowane (version.js, sw.js) są aktualne', () => assert.deepEqual(staleFiles(), []));

test('żadne id pytania/fiszki nie zniknęło ani nie zmieniło działu (ids.lock.json)', () => {
  const { missing, moved } = diffLock(readLock(), currentIds());
  assert.deepEqual(missing, []);
  assert.deepEqual(moved, []);
});

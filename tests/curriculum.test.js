import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assemble, questionsInScope, packTopics } from '../js/curriculum.js';
import { buildExam } from '../js/exam.js';
import { loadData } from '../tools/load-data.js';

const curriculum = {
  modules: [
    { id: 'm1', title: 'M1', desc: 'd', topics: [{ id: 'a', title: 'A', status: 'active', desc: 'd' }, { id: 'b', title: 'B', status: 'soon', desc: 'd' }] },
    { id: 'm2', title: 'M2', desc: 'd', topics: [{ id: 'c', title: 'C', status: 'active', desc: 'd' }] },
  ],
};
const packs = {
  a: { theory: { cards: [{ id: 't-a-1' }], flash: [{ id: 'f-a-1' }] }, questions: [{ id: 'q-a-1' }, { id: 'q-a-2' }] },
  c: { theory: { cards: [], flash: [] }, questions: [{ id: 'q-c-1' }] },
};

test('assemble: dział wynika z paczki, a temat „soon” nie wymaga paczki', () => {
  const d = assemble(curriculum, packs);
  assert.deepEqual(d.topics.map((t) => [t.id, t.module]), [['a', 'm1'], ['b', 'm1'], ['c', 'm2']]);
  assert.deepEqual(d.questions.map((q) => [q.id, q.topic]), [['q-a-1', 'a'], ['q-a-2', 'a'], ['q-c-1', 'c']]);
  assert.equal(d.cards[0].topic, 'a');
  assert.deepEqual(packTopics(curriculum).map((t) => t.id), ['a', 'c']);
});

test('questionsInScope: moduł zawęża pytania, brak zakresu = wszystko', () => {
  const d = assemble(curriculum, packs);
  assert.equal(questionsInScope(d).length, 3);
  assert.deepEqual(questionsInScope(d, 'm2').map((q) => q.id), ['q-c-1']);
  assert.deepEqual(questionsInScope(d, 'nie-ma'), []);
});

test('rzeczywiste dane: sprawdzian z modułu zawiera tylko pytania z tego modułu', () => {
  const { data, problems } = loadData();
  assert.deepEqual(problems, []);
  for (const m of data.modules) {
    const scope = questionsInScope(data, m.id);
    const topics = new Set(data.topics.filter((t) => t.module === m.id).map((t) => t.id));
    const ex = buildExam(scope);
    assert.ok(ex.length > 0);
    assert.ok(ex.every((q) => topics.has(q.topic)));
  }
});

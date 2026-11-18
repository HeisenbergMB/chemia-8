import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintData } from '../tools/lint-content.js';
import { nextOf, nextIds } from '../tools/next-id.js';
import { loadData, loadSubjects } from '../tools/load-data.js';

const topics = [{ id: 'gram', status: 'active' }, { id: 'slow', status: 'active' }];
const base = (qs, extra = {}) => ({ questions: qs, cards: [], flash: [], topics, ...extra });
const q = (id, extra) => ({ id, topic: 'gram', level: 1, explain: 'Wyjaśnienie pytania.', ...extra });
const msgs = (found, level) => found.filter((f) => !level || f.level === level).map((f) => f.msg);

test('słowo kluczowe musi być w treści wielkimi literami w nawiasie', () => {
  const ok = q('q-1', { type: 'write', q: 'I am sure. (MUST)\nHe ___ there.', keyword: 'must', answers: ['must have been'] });
  const bad = q('q-2', { type: 'write', q: 'I am sure.\nHe ___ there.', keyword: 'must', answers: ['must have been'] });
  assert.deepEqual(lintData(base([ok])), []);
  assert.match(msgs(lintData(base([bad])), 'error')[0], /\(MUST\)/);
});

test('wzór liter pasuje do odpowiedzi także wtedy, gdy zdanie zawiera pojedyncze litery (a, I)', () => {
  const ok1 = q('q-1', { type: 'write', q: 'The more I read, the more k _ _ _ l _ _ _ e I have.', answers: ['knowledge'] });
  const ok2 = q('q-2', { type: 'write', q: 'Look it up in a d _ c _ _ _ _ _ _ y.', answers: ['dictionary'] });
  const bad = q('q-3', { type: 'write', q: 'You need a pair of s _ _ s _ _ _ s to cut paper.', answers: ['sunrise'] });
  assert.deepEqual(lintData(base([ok1, ok2])), []);
  assert.equal(msgs(lintData(base([bad])), 'error').length, 1);
});

test('skrócenie w luce jednowyrazowej z tekstu jest ostrzeżeniem, a w wielowyrazowej odpowiedzi nie', () => {
  const gap = q('q-1', { type: 'write', q: 'Luka (1)', group: 'g-1', gap: 1, answers: ["doesn't"] });
  const multi = q('q-2', { type: 'write', q: 'Luka (2)', group: 'g-1', gap: 2, answers: ["wouldn't have been"] });
  assert.equal(msgs(lintData(base([gap]))).length, 1);
  assert.deepEqual(lintData(base([multi])), []);
});

test('klucz pytania o podkreśloną część ma być zapisany jak pytanie', () => {
  const bad = q('q-1', { type: 'write', q: 'Kate bought ++a jacket++.', answers: ['what did kate buy'] });
  const ok = q('q-2', { type: 'write', q: 'Kate bought ++a jacket++.', answers: ['What did Kate buy?'] });
  assert.equal(msgs(lintData(base([bad]))).length, 1);
  assert.deepEqual(lintData(base([ok])), []);
});

test('pozycja poprawnej odpowiedzi liczy się tylko w arkuszu; długość – wszędzie', () => {
  const mk = (i, answer, long) => q(`q-${i}`, { type: 'choice', q: `Pytanie ${i}`, options: ['aaa', 'bbb', 'ccc'].map((o, k) => (k === answer && long ? 'a much longer correct option text' : o)), answer });
  const same = Array.from({ length: 9 }, (_, i) => mk(i, 0, false));
  assert.deepEqual(lintData(base(same)), [], 'poza arkuszem pozycja nie ma znaczenia (quiz miesza opcje)');
  const sheets = { sheets: [{ id: 's', tasks: [{ items: same.map((x) => x.id) }] }] };
  assert.match(msgs(lintData(base(same), sheets))[0], /jednej pozycji/);
  const longer = Array.from({ length: 9 }, (_, i) => mk(i, i % 3, true));
  assert.match(msgs(lintData(base(longer)))[0], /dłuższa/);
});

test('ujawnienie klucza w kartach: słownictwo tak, struktury gramatyczne nie', () => {
  const vocab = { id: 'q-1', topic: 'slow', level: 1, explain: 'Wyjaśnienie pytania.', type: 'write', q: 'The ___ was big. (ENORMOUS)', answers: ['enormous'] };
  const gram = q('q-2', { type: 'write', q: 'Luka', answers: ['would rather not go'] });
  const data = base([vocab, gram], { cards: [{ id: 't-1', topic: 'slow', title: 'Synonimy', body: 'huge – enormous' }, { id: 't-2', topic: 'gram', title: 'Struktury', body: 'would rather not go' }] });
  const sheets = { sheets: [{ id: 's', tasks: [{ items: ['q-1', 'q-2'] }] }] };
  const found = lintData(data, sheets);
  assert.equal(found.length, 1);
  assert.match(found[0].where, /q-1/);
});

test('next-id: kolejne numery z istniejących elementów', () => {
  assert.deepEqual(nextOf([{ id: 'q-en-gram-009' }, { id: 'q-en-gram-104' }], 'q'), { code: 'en-gram', next: 105, width: 3 });
  assert.deepEqual(nextOf([{ id: 'f-pd-03' }], 'f'), { code: 'pd', next: 4, width: 2 });
  assert.equal(nextOf([], 'q'), null);
  const ids = nextIds('angielski', 'gramatyka');
  assert.match(ids.question, /^q-en-gram-\d{3}$/);
  const { data } = loadData('angielski');
  const max = Math.max(...data.questions.filter((x) => x.topic === 'gramatyka').map((x) => Number(x.id.split('-').pop())));
  assert.equal(ids.question, `q-en-gram-${String(max + 1).padStart(3, '0')}`);
});

test('prawdziwe dane: kontrola treści nie znajduje błędów', () => {
  for (const s of loadSubjects().active) {
    const { data, sheets } = loadData(s.id);
    assert.deepEqual(msgs(lintData(data, sheets), 'error'), [], s.id);
  }
});

test('blind-sheet: wypisuje zadania bez kluczy i wyjaśnień', async () => {
  const { blindText } = await import('../tools/blind-sheet.js');
  const loaded = loadData('angielski');
  const text = blindText(loaded, { sheetId: 's-en-sz-01' });
  assert.match(text, /## Zadanie 8/);
  for (const q of loaded.data.questions.filter((x) => x.topic === 'czytanie' || x.topic === 'gramatyka')) {
    assert.ok(!text.includes(q.explain), `wyjaśnienie ${q.id} wyciekło`);
    if (q.type === 'write' && q.answers[0].length > 12) assert.ok(!text.includes(q.answers[0]), `klucz ${q.id} wyciekł`);
  }
  assert.ok(blindText(loaded, { topic: 'kultura' }).includes('[q-en-kult-001]'));
  assert.throws(() => blindText(loaded, { sheetId: 'nie-ma' }), /nie ma arkusza/);
  const inSheets = new Set(loaded.sheets.sheets.flatMap((sh) => sh.tasks.flatMap((t) => t.items)));
  const practice = blindText(loaded, { topic: 'czytanie,gramatyka', practice: true });
  const ids = [...practice.matchAll(/\[(q-en-[\w-]+)\]/g)].map((m) => m[1]);
  assert.ok(ids.length > 20 && ids.every((id) => !inSheets.has(id)), 'tylko pytania spoza arkuszy');
  assert.ok(blindText(loaded, { topic: 'czytanie' }).includes('q-en-czyt-001'), 'bez --practice są też pytania arkusza');
});

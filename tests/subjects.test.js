// Warstwa przedmiotów: lista z data/subjects.json, przełączanie w aplikacji, trasy cech (chem) i izolacja stanu.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootApp } from './helpers/app-env.js';
import { loadSubjects, loadData } from '../tools/load-data.js';
import { activeSubjects, hasFeature, subjectPath, curriculumPath, topicPackPath } from '../js/curriculum.js';

test('ścieżki danych przedmiotu', () => {
  assert.equal(subjectPath('chemia', 'solubility.json'), 'data/chemia/solubility.json');
  assert.equal(curriculumPath('angielski'), 'data/angielski/curriculum.json');
  assert.equal(topicPackPath('chemia', 'podstawy', 'questions'), 'data/chemia/topics/podstawy/questions.json');
});

test('cechy i aktywność przedmiotów', () => {
  const subjects = [{ id: 'a', status: 'active', features: ['chem'] }, { id: 'b', status: 'soon', features: [] }];
  assert.deepEqual(activeSubjects(subjects).map((s) => s.id), ['a']);
  assert.equal(hasFeature(subjects[0], 'chem'), true);
  assert.equal(hasFeature(subjects[1], 'chem'), false);
  assert.equal(hasFeature(undefined, 'chem'), false);
});

test('subjects.json: każdy aktywny przedmiot ma dane, a chemia ma cechę chem', () => {
  const { subjects, active, problems } = loadSubjects();
  assert.deepEqual(problems, []);
  assert.ok(subjects.length >= 1);
  for (const s of active) {
    const { data, problems: p } = loadData(s.id);
    assert.deepEqual(p, [], `dane przedmiotu ${s.id}`);
    assert.ok(data.questions.length > 0, `${s.id}: brak pytań`);
  }
  assert.equal(hasFeature(active.find((s) => s.id === 'chemia'), 'chem'), true);
});

// do testów dokładamy przedmiot „wkrótce” (prawdziwy angielski jest już aktywny)
const subjectsJson = JSON.parse(readFileSync(new URL('../data/subjects.json', import.meta.url), 'utf8'));
subjectsJson.subjects.push({ id: 'wkrotce', title: 'Wkrótce', desc: 'test', icon: 'book', status: 'soon', features: [], types: ['choice'], idTag: 'xx' });

let app;
before(async () => {
  app = await bootApp({ files: { 'data/subjects.json': subjectsJson } });
});

test('aplikacja startuje na zapisanym przedmiocie (domyślnie chemia) z jego danymi', () => {
  assert.ok(app.main.textContent.includes('Powtórka'));
  const state = JSON.parse(localStorage.getItem('chemia8.v1') || 'null');
  assert.ok(state === null || state.settings.subject === 'chemia');
});

test('przełącznik przedmiotu jest w menu, a przedmiot „wkrótce” nie ma linku', async () => {
  await app.goto('#/');
  const links = app.links();
  assert.ok(links.includes('#/subject/chemia'), 'brak linku do przedmiotu chemia');
  assert.ok(links.includes('#/subject/angielski'), 'angielski jest aktywny');
  assert.ok(!links.includes('#/subject/wkrotce'), 'przedmiot „wkrótce” nie powinien być linkiem');
  assert.ok(app.side.textContent.includes('Wkrótce'), 'przedmiot „wkrótce” jest widoczny w menu');
});

test('przełączenie na ten sam przedmiot wraca na start i niczego nie psuje', async () => {
  const final = await app.goto('#/subject/chemia');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(app.window.location.hash, '#/');
  assert.ok(app.main.textContent.length > 50);
  void final;
});

test('przedmiot „wkrótce” albo nieistniejący – ekran „nie znaleziono”, bez zmiany wyboru', async () => {
  for (const id of ['wkrotce', 'nie-ma']) {
    await app.goto(`#/subject/${id}`);
    assert.ok(app.main.textContent.includes('Nie znaleziono przedmiotu'), id);
  }
  const state = JSON.parse(localStorage.getItem('chemia8.v1'));
  assert.equal(state.settings.subject, 'chemia');
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

test('domyślna data sprawdzianu z subjects.json: zapisana wygrywa, pusta wyłącza odliczanie', async () => {
  const { effectiveExamDate } = await import('../js/curriculum.js');
  const subj = { examDate: '2026-12-03' };
  assert.equal(effectiveExamDate(undefined, subj), '2026-12-03', 'brak zapisu → data domyślna');
  assert.equal(effectiveExamDate('2027-01-10', subj), '2027-01-10', 'zapisana data uczniowi wygrywa');
  assert.equal(effectiveExamDate('', subj), '', 'uczeń wyczyścił datę → bez odliczania');
  assert.equal(effectiveExamDate(undefined, { id: 'x' }), '');
  const { subjects } = loadSubjects();
  assert.equal(subjects.find((s) => s.id === 'angielski').examDate, '2026-12-03', 'egzamin rejonowy 3.12.2026');
});

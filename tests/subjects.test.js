// Warstwa przedmiotów: lista z data/subjects.json, przełączanie w aplikacji, trasy cech (chem) i izolacja stanu.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
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

let app;
before(async () => {
  app = await bootApp();
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
  assert.ok(!links.includes('#/subject/angielski'), 'przedmiot „wkrótce” nie powinien być linkiem');
  assert.ok(app.side.textContent.includes('Angielski'), 'przedmiot „wkrótce” jest widoczny w menu');
});

test('przełączenie na ten sam przedmiot wraca na start i niczego nie psuje', async () => {
  const final = await app.goto('#/subject/chemia');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(app.window.location.hash, '#/');
  assert.ok(app.main.textContent.length > 50);
  void final;
});

test('przedmiot „wkrótce” albo nieistniejący – ekran „nie znaleziono”, bez zmiany wyboru', async () => {
  for (const id of ['angielski', 'nie-ma']) {
    await app.goto(`#/subject/${id}`);
    assert.ok(app.main.textContent.includes('Nie znaleziono przedmiotu'), id);
  }
  const state = JSON.parse(localStorage.getItem('chemia8.v1'));
  assert.equal(state.settings.subject, 'chemia');
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

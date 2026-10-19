// Test dymny całej aplikacji w jsdom: przechodzi po wszystkich linkach, które ekrany same pokazują
// (menu, strony główne, przyciski działów, narzędzia z curriculum.json), i sprawdza reguły – bez zrzutów treści.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp } from './helpers/app-env.js';
import { loadData } from '../tools/load-data.js';
import { matches } from '../js/router.js';

let app;
const visited = new Map(); // hash -> { final, text }

before(async () => {
  app = await bootApp();
  const queue = ['#/'];
  while (queue.length) {
    const hash = queue.shift();
    if (visited.has(hash)) continue;
    const final = await app.goto(hash);
    visited.set(hash, { final, text: app.main.textContent.trim() });
    for (const l of app.links()) if (!visited.has(l)) queue.push(l);
  }
});

test('crawl odwiedza wszystkie rodzaje ekranów', () => {
  const kinds = new Set([...visited.keys()].map((h) => h.split('/')[1]));
  for (const k of ['module', 'topic', 'theory', 'flash', 'quiz', 'review', 'exam', 'lab', 'indicators', 'solubility', 'valence', 'settings']) {
    assert.ok(kinds.has(k), `żaden link nie prowadzi do ekranu „${k}”`);
  }
});

test('każdy link z aplikacji prowadzi do istniejącego ekranu (bez przekierowania na start i bez „nie znaleziono”)', () => {
  for (const [hash, { final, text }] of visited) {
    assert.equal(final, hash, `${hash} przekierowuje na ${final} – brak takiej trasy`);
    assert.ok(text.length > 20, `${hash}: pusty ekran`);
    assert.ok(!text.includes('Wróć na start'), `${hash}: ekran „nie znaleziono”: ${text.slice(0, 80)}`);
  }
});

test('każdy adres pasuje do dokładnie jednej trasy (żadna nie zasłania innej)', async () => {
  const { routes } = await import('../js/app.js');
  for (const hash of visited.keys()) assert.equal(matches(routes, hash).length, 1, `${hash} pasuje do ${matches(routes, hash).length} tras`);
});

test('każdy dział z curriculum.json ma ekran, teorię, fiszki i quiz', () => {
  const { data } = loadData();
  for (const t of data.topics.filter((x) => x.status === 'active')) {
    for (const kind of ['topic', 'theory', 'flash', 'quiz']) assert.ok(visited.has(`#/${kind}/${t.id}`), `brak ekranu #/${kind}/${t.id}`);
  }
  for (const m of data.modules) assert.ok(visited.has(`#/module/${m.id}`) && visited.has(`#/module/${m.id}/exam`), `brak ekranów modułu ${m.id}`);
});

test('nieznany adres wraca na ekran główny', async () => {
  assert.equal(await app.goto('#/nie-ma-takiej-trasy'), '#/');
  assert.equal(await app.goto('#/module/nie-ma'), '#/module/nie-ma');
  assert.ok(app.main.textContent.includes('Wróć na start'));
});

test('w trakcie przechodzenia nie było błędów JS', () => assert.deepEqual(app.errors, []));

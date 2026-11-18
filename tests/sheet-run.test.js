// Arkusz konkursowy w prawdziwej aplikacji (jsdom): trasy, rozwiązywanie, czas, wznowienie, przegląd, zatwierdzenie.

import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp } from './helpers/app-env.js';
import { files } from './helpers/sheet-fixture.js';
import { matches } from '../js/router.js';

let app, runSheet, startDraft, store, DATA, sheetById, formatById, groupById;
const T0 = 1_000_000_000_000;
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const state = () => JSON.parse(localStorage.getItem('chemia8.v1'));

before(async () => {
  app = await bootApp({ files });
  await app.goto('#/subject/en-test');
  await settle();
  ({ runSheet, startDraft } = await import('../js/sheet-run.js'));
  store = await import('../js/store.js');
  ({ DATA, sheetById, formatById, groupById } = await import('../js/data.js'));
});

const opened = [];
beforeEach(() => store.update((s) => { s.draft = null; s.cards = {}; s.exams = []; }));
afterEach(() => opened.splice(0).forEach((c) => c.destroy()));

/** Uruchamia arkusz bezpośrednio, z kontrolowanym zegarem. */
function open({ id = 's-en-01', startAt = T0, now = { t: T0 }, fresh = true } = {}) {
  const sheet = sheetById(id);
  if (fresh) startDraft(id, 'en-test', startAt);
  const root = app.document.createElement('div');
  app.document.body.append(root);
  const ctl = runSheet(root, { sheet, format: formatById(sheet.format), byId: new Map(DATA.questions.map((q) => [q.id, q])), groupOf: groupById, now: () => now.t, tickMs: 1e9, saveMs: 0 });
  opened.push(ctl);
  return { root, ctl, now };
}
const btn = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const typeInto = (input, v) => { input.value = v; input.dispatchEvent(new app.window.Event('input')); };

test('trasy arkuszy: lista, opis i start nie nakładają się i działają', async () => {
  const { routes } = await import('../js/app.js');
  for (const h of ['#/sheets', '#/sheet/s-en-01', '#/sheet/s-en-01/run']) assert.equal(matches(routes, h).length, 1, h);
  assert.equal(await app.goto('#/sheets'), '#/sheets');
  assert.ok(app.main.textContent.includes('Etap próbny') && app.main.textContent.includes('Arkusz próbny 1'));
  assert.ok(app.links().includes('#/sheet/s-en-01'));
  assert.equal(await app.goto('#/sheet/s-en-01'), '#/sheet/s-en-01');
  assert.ok(app.main.textContent.includes('10 minut, 9 punktów, 4 zadań'));
  assert.equal(await app.goto('#/sheet/nie-ma'), '#/sheet/nie-ma');
  assert.ok(app.main.textContent.includes('Nie znaleziono arkusza'));
  assert.ok(app.side.textContent.includes('Arkusze konkursowe'), 'link w menu');
  store.update((s) => (s.draft = null));
});

test('start z ekranu zakłada szkic i pokazuje zadanie I z timerem', async () => {
  await app.goto('#/sheet/s-en-01/run');
  assert.equal(state().draft.sheet, 's-en-01');
  assert.equal(state().draft.subject, 'en-test');
  assert.ok(app.main.querySelector('.timer').textContent.match(/^\d\d:\d\d$/));
  assert.ok(app.main.textContent.includes('Zadanie I'));
  assert.ok(app.main.textContent.includes('Tom lives in Łódź'));
  app.main.querySelector('.timer');
});

test('odpowiedzi zostają po przejściu między zadaniami i są zapisywane', async () => {
  const { root } = open();
  // zadanie I: TRUE/FALSE (kliknięcie zaznacza, drugie cofa)
  const tf = [...root.querySelectorAll('.sheet-item')][0].querySelectorAll('.pick');
  assert.deepEqual([...tf].map((b) => b.textContent), ['TRUE', 'FALSE']);
  tf[0].click();
  assert.equal(root.querySelector('.sheet-item .pick').getAttribute('aria-pressed'), 'true');
  tf[0].click();
  assert.equal(state().draft.answers['q-en-101'], undefined, 'cofnięty wybór znika z szkicu');
  tf[0].click();
  btn(root, 'Następne zadanie').click();
  assert.ok(root.textContent.includes('Zadanie II'));
  const inputs = root.querySelectorAll('.text-input');
  typeInto(inputs[0], 'has');
  btn(root, 'Poprzednie zadanie').click();
  assert.equal(root.querySelector('.pick[aria-pressed="true"]').textContent, 'TRUE');
  btn(root, 'Następne zadanie').click();
  assert.equal(root.querySelector('.text-input').value, 'has');
  await settle(20);
  assert.equal(state().draft.answers['q-en-103'], 'has');
  assert.equal(state().draft.answers['q-en-101'], 0);
  assert.ok(root.querySelector('.sheet-head').textContent.includes('Odpowiedzi: 2 z 8'));
});

test('luka z przykładem (0): tekst jest cały, a pola odpowiadają numerom luk', () => {
  const { root } = open();
  btn(root, 'Następne zadanie').click();
  assert.ok(root.querySelector('.group-text').textContent.includes('(0)___'));
  assert.deepEqual([...root.querySelectorAll('.sheet-item')].map((li) => li.querySelector('.no').textContent), ['1.', '2.']);
});

test('bank: litery A–C obok zadania i wybór litery przy pytaniu', () => {
  const { root } = open();
  for (let i = 0; i < 3; i++) btn(root, 'Następne zadanie').click();
  assert.equal(root.querySelectorAll('.bank li').length, 3);
  const picks = root.querySelectorAll('.sheet-item')[0].querySelectorAll('.pick');
  assert.deepEqual([...picks].map((b) => b.textContent), ['A', 'B', 'C']);
  picks[1].click();
  assert.equal(store.get().draft.answers['q-en-107'], 1);
});

test('upływ czasu: automatyczne zakończenie z przeglądem, bez zapisu do powtórek', () => {
  const { root, ctl, now } = open();
  btn(root, 'Następne zadanie').click();
  typeInto(root.querySelector('.text-input'), 'has');
  now.t = T0 + 5 * 60000;
  ctl.tick();
  assert.equal(store.get().draft.finishedAt, null, 'po 5 minutach jeszcze trwa');
  assert.equal(root.querySelector('.timer').textContent, '05:00');
  now.t = T0 + 10 * 60000 + 5000;
  ctl.tick();
  assert.equal(store.get().draft.finishedAt, T0 + 10 * 60000, 'koniec w chwili terminu, nie później');
  assert.ok(root.textContent.includes('Czas minął'));
  assert.equal(root.querySelectorAll('.text-input').length, 0, 'odpowiedzi zablokowane');
  assert.deepEqual(store.get().cards, {}, 'powtórki dopiero po zatwierdzeniu');
});

test('opuszczenie ekranu zatrzymuje zegar: arkusz nie kończy się w tle', () => {
  const { root, ctl, now } = open();
  root.remove();
  now.t = T0 + 99 * 60000;
  ctl.tick();
  assert.equal(store.get().draft.finishedAt, null);
  assert.equal(state().draft.finishedAt, null);
});

test('wznowienie po przeładowaniu: odpowiedzi wracają, czas płynie od pierwotnego startu', () => {
  const first = open({ now: { t: T0 } });
  btn(first.root, 'Następne zadanie').click();
  typeInto(first.root.querySelector('.text-input'), 'has');
  store.save();
  first.ctl.destroy();
  const second = open({ fresh: false, now: { t: T0 + 4 * 60000 } });
  assert.ok(second.root.textContent.includes('Zadanie II'), 'wraca na ostatnie zadanie');
  assert.equal(second.root.querySelector('.text-input').value, 'has');
  assert.equal(second.root.querySelector('.timer').textContent, '06:00');
});

test('po upływie czasu przy ponownym wejściu od razu przegląd', () => {
  startDraft('s-en-01', 'en-test', T0);
  const { root } = open({ fresh: false, now: { t: T0 + 11 * 60000 } });
  assert.ok(root.textContent.includes('przegląd'));
  assert.equal(root.querySelectorAll('.text-input').length, 0);
});

test('zakończenie ręczne: potwierdzenie w stronie (bez window.confirm), przegląd z kluczem i samooceną', () => {
  const { root, now } = open();
  btn(root, 'Zakończ arkusz').click();
  assert.ok(root.textContent.includes('bez odpowiedzi'), 'ostrzeżenie o pustych odpowiedziach');
  btn(root, 'Wróć do arkusza').click();
  [...root.querySelectorAll('.sheet-item')][0].querySelectorAll('.pick')[0].click(); // 101 poprawnie
  [...root.querySelectorAll('.sheet-item')][1].querySelectorAll('.pick')[0].click(); // 102 źle
  btn(root, 'Następne zadanie').click();
  const inputs = root.querySelectorAll('.text-input');
  typeInto(inputs[0], 'owns'); // dobre: has – ale uczeń uzna
  typeInto(inputs[1], 'goes');
  now.t = T0 + 2 * 60000;
  btn(root, 'Zakończ arkusz').click();
  btn(root, 'Zakończ i sprawdź').click();
  assert.equal(store.get().draft.finishedAt, T0 + 2 * 60000);
  assert.equal(root.querySelector('.score').textContent, '2 / 9', '101 i 104');
  const toggle = btn(root, 'Moja odpowiedź też jest poprawna');
  assert.ok(toggle, 'samoocena dla wpisanej, błędnej odpowiedzi');
  assert.ok(root.textContent.includes('Klucz: has'));
  toggle.click();
  assert.equal(root.querySelector('.score').textContent, '3 / 9');
  assert.equal(store.get().draft.overrides['q-en-103'], true);
  btn(root, 'Cofnij uznanie').click();
  assert.equal(root.querySelector('.score').textContent, '2 / 9');
  btn(root, 'Moja odpowiedź też jest poprawna').click();
  assert.deepEqual(store.get().cards, {}, 'jeszcze nic w powtórkach');
});

test('przeładowanie po zakończeniu ląduje w przeglądzie z zablokowanymi odpowiedziami i zapisaną samooceną', async () => {
  const { root, ctl } = open();
  btn(root, 'Następne zadanie').click();
  typeInto(root.querySelector('.text-input'), 'owns');
  ctl.finish();
  btn(root, 'Moja odpowiedź też jest poprawna').click();
  const reloaded = await import('../js/store.js?po-przeladowaniu');
  assert.equal(reloaded.get().draft.finishedAt !== null, true);
  assert.equal(reloaded.get().draft.overrides['q-en-103'], true);
  const again = open({ fresh: false });
  assert.equal(again.root.querySelectorAll('.text-input').length, 0);
  assert.equal(again.root.querySelector('.score').textContent, '1 / 9');
});

test('zatwierdzenie: powtórki zapisane raz, wynik w historii, szkic zniknął', () => {
  const { root, ctl } = open();
  btn(root, 'Następne zadanie').click();
  typeInto(root.querySelector('.text-input'), 'has');
  ctl.finish();
  const commit = btn(root, 'Zatwierdź wynik');
  commit.click();
  assert.equal(store.get().draft, null);
  const cards = store.get().cards;
  assert.equal(Object.keys(cards).length, 8, 'każde pytanie arkusza trafia do Leitnera');
  assert.equal(cards['q-en-103'].box, 2, 'poprawne');
  assert.equal(cards['q-en-104'].box, 1, 'brak odpowiedzi = błąd');
  const res = store.get().exams.at(-1);
  assert.equal(res.scope, 'sheet:s-en-01');
  assert.equal(res.subject, 'en-test');
  assert.equal(res.points, 1);
  assert.equal(res.max, 9);
  assert.ok(root.textContent.includes('Wynik zapisany'));
  commit.click(); // ponowne kliknięcie nic nie robi
  assert.equal(store.get().exams.length, 1);
});

test('inny rozpoczęty arkusz nie jest nadpisywany po cichu', async () => {
  startDraft('s-en-02', 'en-test', Date.now());
  await app.goto('#/sheet/s-en-01/run');
  assert.ok(app.main.textContent.includes('Masz rozpoczęty inny arkusz'));
  assert.equal(store.get().draft.sheet, 's-en-02', 'szkic nietknięty');
  btn(app.main, 'Porzuć go i zacznij ten').click();
  assert.equal(store.get().draft.sheet, 's-en-01');
  assert.ok(app.main.textContent.includes('Zadanie I'));
});

test('brak błędów JS', () => assert.deepEqual(app.errors, []));

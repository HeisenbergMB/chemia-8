// Każdy typ pytania uruchamia się w quizie (zwykłym i w trybie sprawdzianu), a poprawna odpowiedź jest uznawana.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp } from './helpers/app-env.js';
import { loadData } from '../tools/load-data.js';
import { richText } from '../js/formula.js';

let app;
let runQuiz;
const { data } = loadData();
const TYPES = [...new Set(data.questions.map((q) => q.type))];

before(async () => {
  app = await bootApp();
  ({ runQuiz } = await import('../js/quiz.js'));
});

function mount(q, exam) {
  const root = app.document.createElement('div');
  app.document.body.append(root);
  runQuiz(root, [q], { exam, title: 'T', backHref: '#/', topicTitle: (id) => id });
  return root;
}

function type(root, value) {
  const input = root.querySelector('input.chem-input');
  input.value = value;
  input.dispatchEvent(new app.window.Event('input', { bubbles: true }));
}

/** Odpowiada poprawnie, jeśli test potrafi to zrobić bez przeciągania; zwraca false, gdy typ wymaga dotyku. */
function answerCorrectly(root, q, exam) {
  if (q.type === 'choice') {
    const right = [...root.querySelectorAll('.option')].find((b) => b.querySelector('.text').innerHTML === richText(q.options[q.answer]));
    assert.ok(right, `${q.id}: nie ma przycisku z poprawną odpowiedzią`);
    right.click();
    if (exam) root.querySelector('.btn.big').click();
    return true;
  }
  if (q.type === 'formula' || q.type === 'equation') {
    type(root, q.answer);
    (root.querySelector('.kb-submit') || root.querySelector('button.btn')).click();
    return true;
  }
  return false;
}

for (const t of TYPES) {
  for (const exam of [false, true]) {
    test(`typ „${t}” (${exam ? 'sprawdzian' : 'quiz'}): pokazuje pytanie i przyjmuje poprawną odpowiedź`, () => {
      for (const q of data.questions.filter((x) => x.type === t).slice(0, 3)) {
        const root = mount(q, exam);
        assert.ok(root.querySelector('.question'), `${q.id}: brak treści pytania`);
        if (!answerCorrectly(root, q, exam)) {
          assert.ok(root.querySelector('button.btn'), `${q.id}: brak przycisku zatwierdzenia`);
          continue;
        }
        const text = root.textContent;
        if (exam) assert.match(text, /100%/, `${q.id}: poprawna odpowiedź nie dała 100%`);
        else assert.match(text, /Dobrze/, `${q.id}: poprawna odpowiedź nie została uznana`);
        root.remove();
      }
      assert.deepEqual(app.errors, []);
    });
  }
}

test('typ „balance”: odpowiedź ze współczynnikami domyślnymi (same 1) jest uznana za błędną', () => {
  for (const q of data.questions.filter((x) => x.type === 'balance').slice(0, 3)) {
    const root = mount(q, false);
    root.querySelector('button.btn.big').click();
    assert.match(root.textContent, /Nie tym razem/, `${q.id}: same jedynki powinny być błędem`);
    root.remove();
  }
  assert.deepEqual(app.errors, []);
});

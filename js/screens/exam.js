// Sprawdzian próbny: z całości albo z jednego modułu.

import { h } from '../dom.js';
import * as store from '../store.js';
import { runQuiz } from '../quiz.js';
import { withIcon } from '../icons.js';
import { buildExam, EXAM_SIZE } from '../exam.js';
import { questionsInScope } from '../curriculum.js';
import { DATA, topicById, moduleById } from '../data.js';
import { notFound } from '../ui.js';

function examIntro(moduleId) {
  const mod = moduleId ? moduleById(moduleId) : null;
  if (moduleId && !mod) return notFound('Nie znaleziono modułu.');
  const scope = questionsInScope(DATA, moduleId);
  const runHref = moduleId ? `#/module/${moduleId}/exam/run` : '#/exam/run';
  const history = (store.get().exams || []).filter((e) => (e.scope || null) === (moduleId || null)).reverse();
  const best = history.length ? Math.max(...history.map((e) => e.pct)) : null;
  const topics = DATA.topics.filter((t) => scope.some((q) => q.topic === t.id));
  const fmt = (ts) => new Date(ts).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  return h(
    'div',
    null,
    h('a', { class: 'back', href: mod ? `#/module/${moduleId}` : '#/' }, mod ? `← ${mod.title}` : '← Ekran główny'),
    h('h1', null, mod ? `Sprawdzian: ${mod.title}` : 'Sprawdzian próbny'),
    h(
      'section',
      { class: 'card' },
      h('p', null, `${EXAM_SIZE} losowych pytań ${mod ? 'z tego modułu' : 'z całego zakresu'}, w różnych formach: wybór, wzory, równania, klocki i dopasowywanie.`),
      h('ul', { class: 'rules' }, h('li', null, 'Bez podpowiedzi.'), h('li', null, 'Bez informacji o poprawności w trakcie – wynik i błędy zobaczysz na końcu.'), h('li', null, 'Błędne pytania trafią do powtórek (Leitner).')),
      h('p', { class: 'muted' }, `Zakres: ${topics.map((t) => t.title).join(', ')}.`),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: runHref, html: withIcon('play', 'Zacznij sprawdzian') }))
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Twoje wyniki'),
      history.length
        ? [
            h('p', { class: 'muted' }, `Najlepszy wynik: ${best}%. Liczba prób: ${history.length}.`),
            h('ul', { class: 'history' }, history.slice(0, 8).map((e) => h('li', null, h('span', { class: 'muted' }, fmt(e.t)), h('strong', null, `${e.pct}%`), h('span', { class: 'muted' }, `${e.score} z ${e.total}`))))
          ]
        : h('p', { class: 'muted' }, 'Jeszcze nie rozwiązano żadnego sprawdzianu.')
    )
  );
}

function examRun(moduleId) {
  const mod = moduleId ? moduleById(moduleId) : null;
  if (moduleId && !mod) return notFound('Nie znaleziono modułu.');
  const examHref = moduleId ? `#/module/${moduleId}/exam` : '#/exam';
  const root = h('div');
  const topicTitle = (id) => (topicById(id) ? topicById(id).title : id);
  const start = () => {
    const qs = buildExam(questionsInScope(DATA, moduleId), EXAM_SIZE);
    runQuiz(root, qs, {
      exam: true,
      title: 'Wynik sprawdzianu',
      backHref: examHref,
      topicTitle,
      onRestart: start,
      onRetryMissed: retry,
      onFinish: (r) => store.update((s) => { s.exams = [...(s.exams || []), { t: Date.now(), scope: moduleId || null, ...r }].slice(-30); }),
    });
  };
  const retry = (list) => runQuiz(root, list, { title: 'Powtórka błędów', backHref: examHref, onRetryMissed: retry });
  start();
  return h('div', null, h('a', { class: 'back', href: examHref }, '← Sprawdzian próbny'), root);
}

export const routes = [
  [/^#\/exam$/, examIntro],
  [/^#\/exam\/run$/, examRun],
  [/^#\/module\/([\w-]+)\/exam$/, examIntro],
  [/^#\/module\/([\w-]+)\/exam\/run$/, examRun],
];

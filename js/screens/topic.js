// Ekrany działu: strona działu, teoria, fiszki, quiz działu.

import { h, shuffle } from '../dom.js';
import { richText } from '../formula.js';
import * as store from '../store.js';
import { buildExtra, topicStats } from '../leitner.js';
import { runQuiz } from '../quiz.js';
import { TYPED_TYPES } from '../qtypes.js';
import { withIcon } from '../icons.js';
import { DATA, topicById, questionsOf } from '../data.js';
import { progressBar, notFound } from '../ui.js';

function topicScreen(id) {
  const t = topicById(id);
  if (!t || t.status !== 'active') return notFound('Ten dział będzie dostępny wkrótce.');
  const qs = questionsOf(id);
  const typedCount = qs.filter((q) => TYPED_TYPES.includes(q.type)).length;
  const st = topicStats(DATA.questions, id);
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Wszystkie działy'),
    h('h1', null, t.title),
    h('p', { class: 'muted' }, t.desc),
    h('div', { class: 'card' }, progressBar(st.mastered, st.total, 'Postęp w dziale')),
    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Co robimy?'),
      h(
        'div',
        { class: 'btn-row' },
        h('a', { class: 'btn', href: `#/theory/${id}`, html: withIcon('book', 'Teoria') }),
        h('a', { class: 'btn', href: `#/flash/${id}`, html: withIcon('cards', 'Fiszki') }),
        h('a', { class: 'btn', href: `#/quiz/${id}`, html: withIcon('check', 'Quiz (10 pytań)') }),
        ...(t.labs || []).map((lid) => {
          const e = DATA.experiments.find((x) => x.id === lid);
          return e ? h('a', { class: 'btn', href: `#/lab/${lid}`, html: withIcon('flask', `Laboratorium: ${e.title}`) }) : null;
        }),
        ...(t.tools || []).map((tool) => h('a', { class: 'btn', href: tool.href, html: withIcon(tool.icon, tool.label) })),
        typedCount ? h('a', { class: 'btn', href: `#/quiz/${id}/zapis`, html: withIcon('pen', `Układanie zapisu (${typedCount})`) }) : null,
        h('a', { class: 'btn secondary', href: `#/quiz/${id}/all`, html: withIcon('list', `Wszystkie pytania (${qs.length})`) })
      )
    )
  );
}

// ---------- teoria ----------
function theoryScreen(id) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const cards = DATA.cards.filter((c) => c.topic === id);
  return h(
    'div',
    { class: 'theory' },
    h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`),
    h('h1', null, 'Teoria'),
    cards.map((c) =>
      h(
        'article',
        { class: 'card' },
        h('h2', null, c.title),
        h('p', { html: richText(c.body) }),
        c.examples && c.examples.length
          ? h(
              'ul',
              { class: 'eq-list' },
              c.examples.map((ex) => {
                const [eq, note] = ex.split(' – ');
                return h('li', null, h('span', { html: richText(`$${eq}$`) }), note ? h('span', { class: 'muted' }, ` – ${note}`) : null);
              })
            )
          : null,
        c.tip ? h('div', { class: 'tip' }, h('strong', null, 'Zapamiętaj: '), h('span', { html: richText(c.tip) })) : null
      )
    ),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `#/flash/${id}`, html: withIcon('cards', 'Fiszki') }), h('a', { class: 'btn secondary', href: `#/quiz/${id}`, html: withIcon('check', 'Quiz') }))
  );
}

// ---------- fiszki ----------
function flashScreen(id) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const root = h('div');
  let queue = shuffle(DATA.flash.filter((f) => f.topic === id));
  const total = queue.length;
  let known = 0;

  const showCard = (revealed) => {
    if (!queue.length) return done();
    const f = queue[0];
    const card = h(
      'button',
      { class: `flashcard${revealed ? ' answer' : ''}`, type: 'button', 'aria-label': revealed ? 'Odpowiedź' : 'Pokaż odpowiedź', onClick: () => !revealed && showCard(true) },
      h('span', { class: 'side-label' }, revealed ? 'Odpowiedź' : 'Pytanie'),
      h('span', { html: richText(revealed ? f.back : f.front) })
    );
    root.replaceChildren(
      h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`),
      h('h1', null, 'Fiszki'),
      h('p', { class: 'muted' }, `Umiem: ${known} z ${total}`),
      card,
      revealed
        ? h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn', type: 'button', onClick: () => { known++; queue.shift(); store.update((s) => (s.flash[f.id] = true)); showCard(false); } }, 'Umiem'),
            h('button', { class: 'btn secondary', type: 'button', onClick: () => { queue.push(queue.shift()); showCard(false); } }, 'Jeszcze nie')
          )
        : h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onClick: () => showCard(true) }, 'Pokaż odpowiedź'))
    );
  };
  const done = () =>
    root.replaceChildren(
      h('div', { class: 'card' }, h('h2', null, 'Wszystkie fiszki przerobione'), h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `#/quiz/${id}`, html: withIcon('check', 'Teraz quiz') }), h('a', { class: 'btn secondary', href: `#/topic/${id}` }, 'Wróć')))
    );
  showCard(false);
  return root;
}

// ---------- quiz działu ----------
function quizScreen(id, mode) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const pool = mode === 'zapis' ? questionsOf(id).filter((q) => TYPED_TYPES.includes(q.type)) : questionsOf(id);
  const picked = mode ? shuffle(pool) : buildExtra(pool, 10);
  const root = h('div');
  const start = (qs) => runQuiz(root, qs, { title: `Wynik: ${t.title}`, backHref: `#/topic/${id}`, onRetryMissed: start });
  if (!picked.length) return notFound('W tym dziale nie ma jeszcze pytań.');
  start(picked);
  return h('div', null, h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`), root);
}

export const routes = [
  [/^#\/topic\/([\w-]+)$/, topicScreen],
  [/^#\/theory\/([\w-]+)$/, theoryScreen],
  [/^#\/flash\/([\w-]+)$/, flashScreen],
  [/^#\/quiz\/([\w-]+)(?:\/(all|zapis))?$/, quizScreen],
];

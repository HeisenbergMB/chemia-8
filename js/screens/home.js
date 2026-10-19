// Ekran główny i ekran modułu.

import { h } from '../dom.js';
import { buildReview, topicStats } from '../leitner.js';
import { withIcon } from '../icons.js';
import { questionsInScope } from '../curriculum.js';
import { DATA, moduleById, topicNum } from '../data.js';
import { progressBar, notFound } from '../ui.js';
import { countInfo, plDays } from '../countdown.js';

function home() {
  const review = buildReview(DATA.questions);
  const overall = topicStats(DATA.questions);
  const c = countInfo();
  const dueText = review.queue.length
    ? `Na dziś: ${[review.dueTotal ? `${review.dueTotal} do powtórki` : '', review.fresh.length ? `${review.fresh.length} nowych` : ''].filter(Boolean).join(' i ')}.`
    : 'Na teraz wszystko powtórzone. Możesz poćwiczyć dodatkowo.';

  return h(
    'div',
    null,
    h(
      'section',
      { class: 'card hero' },
      c
        ? [
            h('div', { class: 'eyebrow' }, 'Do sprawdzianu'),
            h('div', { class: 'hero-days' }, c.days === 0 ? 'Dzisiaj' : [String(c.days), h('small', null, plDays(c.days))]),
            h('div', { class: 'when' }, c.full),
          ]
        : [h('h1', null, 'Powtórka')],
      h('p', { class: 'due' }, dueText),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: review.queue.length ? '#/review' : '#/review/extra', html: withIcon('play', review.queue.length ? 'Powtórka na dziś' : 'Ćwicz dodatkowo') }), h('a', { class: 'btn big secondary', href: '#/exam', html: withIcon('check', 'Sprawdzian próbny') })),
      h('div', { style: 'margin-top:1.25rem' }, progressBar(overall.mastered, overall.total, 'Postęp ogólny'))
    ),
    h(
      'section',
      { class: 'only-narrow' },
      DATA.modules.map((m) =>
        h(
          'div',
          null,
          h('div', { class: 'section-title' }, DATA.modules.length > 1 ? h('a', { href: `#/module/${m.id}`, style: 'color:inherit' }, m.title) : 'Działy'),
          topicGrid(DATA.topics.filter((t) => t.module === m.id))
        )
      )
    ),
    h('p', { class: 'muted', style: 'margin-top:1rem;font-size:.9rem' }, 'Pytania, na które odpowiesz źle, wracają po kilku minutach, a dobrze opanowane – coraz rzadziej.')
  );
}

export function topicGrid(topics) {
  return h(
    'div',
    { class: 'topic-grid' },
    topics.map((t) => {
      const active = t.status === 'active';
      const st = topicStats(DATA.questions, t.id);
      return h(
        active ? 'a' : 'div',
        { class: `topic c${(DATA.topics.indexOf(t) % 5) + 1}${active ? '' : ' soon'}`, href: active ? `#/topic/${t.id}` : null },
        h('span', { class: 'num', 'aria-hidden': 'true' }, topicNum(t)),
        h('h3', null, t.title),
        h('p', null, t.desc),
        active ? progressBar(st.mastered, st.total, `Postęp: ${t.title}`) : h('span', { class: 'chip' }, 'wkrótce')
      );
    })
  );
}

// ---------- moduł ----------
function moduleScreen(id) {
  const m = moduleById(id);
  if (!m) return notFound('Nie znaleziono modułu.');
  const qs = questionsInScope(DATA, id);
  const st = topicStats(qs);
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Ekran główny'),
    h('h1', null, m.title),
    h('p', { class: 'muted' }, m.desc),
    h('div', { class: 'card' }, progressBar(st.mastered, st.total, `Postęp: ${m.title}`), h('div', { class: 'btn-row', style: 'margin-top:1rem' }, h('a', { class: 'btn', href: `#/module/${id}/exam`, html: withIcon('check', 'Sprawdzian z modułu') }))),
    topicGrid(DATA.topics.filter((t) => t.module === id))
  );
}

export const routes = [
  [/^#\/?$/, home],
  [/^#\/module\/([\w-]+)$/, moduleScreen],
];

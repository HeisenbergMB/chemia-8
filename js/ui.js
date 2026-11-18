// Małe elementy interfejsu współdzielone przez ekrany.

import { h } from './dom.js';
import { withIcon } from './icons.js';

export function progressBar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h(
    'div',
    null,
    h('span', { class: 'progress', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: `width:${pct}%` })),
    h('div', { class: 'progress-label' }, `${done} z ${total} opanowanych (${pct}%)`)
  );
}

export function notFound(msg) {
  return h('div', { class: 'card' }, h('p', null, msg), h('a', { class: 'btn', href: '#/' }, 'Wróć na start'));
}

/** Przełącznik przedmiotu (linki `#/subject/<id>`); przy jednym przedmiocie nic nie rysuje. */
export function subjectSwitcher(subjects, current) {
  if (subjects.length < 2) return null;
  return h(
    'div',
    { class: 'subject-switch', role: 'group', 'aria-label': 'Przedmiot' },
    subjects.map((s) =>
      s.status === 'active'
        ? h('a', { href: `#/subject/${s.id}`, class: 'btn secondary', 'aria-current': s.id === current ? 'true' : null, html: withIcon(s.icon, s.title) })
        : h('span', { class: 'btn secondary disabled', 'aria-disabled': 'true' }, h('span', { html: withIcon(s.icon, s.title) }), h('span', { class: 'visually-hidden' }, ' (wkrótce)'))
    )
  );
}

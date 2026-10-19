// Małe elementy interfejsu współdzielone przez ekrany.

import { h } from './dom.js';

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

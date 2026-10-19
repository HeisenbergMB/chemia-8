// Powtórka na dziś (pudełka Leitnera) i ćwiczenie dodatkowe.

import { h } from '../dom.js';
import { buildReview, buildExtra } from '../leitner.js';
import { runQuiz } from '../quiz.js';
import { DATA } from '../data.js';
import { notFound } from '../ui.js';

function reviewScreen(extra) {
  const qs = extra ? buildExtra(DATA.questions, 10) : buildReview(DATA.questions).queue;
  const root = h('div');
  if (!qs.length) return notFound('Brak pytań do powtórki.');
  const start = (list) => runQuiz(root, list, { title: extra ? 'Ćwiczenie dodatkowe' : 'Powtórka na dziś', backHref: '#/', onRetryMissed: start });
  start(qs);
  return h('div', null, h('a', { class: 'back', href: '#/' }, '← Ekran główny'), root);
}

export const routes = [[/^#\/review(?:\/(extra))?$/, reviewScreen]];

// Powtórki rozłożone w czasie (pudełka Leitnera), skrócone pod krótką naukę:
// pudełko 1 = wraca po 3 min, 2 = 30 min, 3 = 3 h, 4 = 12 h, 5 = 24 h.

import * as store from './store.js';
import { shuffle } from './dom.js';

export const INTERVALS_MIN = [3, 30, 180, 720, 1440];
export const MASTERED_BOX = 4;

/** Zapisuje wynik odpowiedzi. Poprawna odpowiedź przesuwa kartę dalej tylko, gdy nadszedł jej termin. */
export function record(id, correct, now = Date.now()) {
  store.update((s) => {
    const c = s.cards[id];
    let box;
    if (!c) box = correct ? 2 : 1;
    else if (!correct) box = 1;
    else box = now >= c.due ? Math.min(5, c.box + 1) : c.box;
    s.cards[id] = {
      box,
      due: now + INTERVALS_MIN[box - 1] * 60000,
      seen: (c ? c.seen : 0) + 1,
      ok: (c ? c.ok : 0) + (correct ? 1 : 0),
      bad: (c ? c.bad : 0) + (correct ? 0 : 1),
      last: now,
    };
  });
}

export const isDue = (card, now = Date.now()) => !!card && now >= card.due;

/** Kolejka „Powtórka na dziś”: najpierw zaległe, potem nowe pytania. */
export function buildReview(questions, { maxNew = 10, max = 20, now = Date.now() } = {}) {
  const cards = store.get().cards;
  const due = questions
    .filter((q) => isDue(cards[q.id], now))
    .sort((a, b) => cards[a.id].due - cards[b.id].due);
  const fresh = questions.filter((q) => !cards[q.id]).sort((a, b) => a.level - b.level);
  const dueList = due.slice(0, max);
  const newList = fresh.slice(0, Math.min(maxNew, max - dueList.length));
  return { due: dueList, fresh: newList, queue: [...dueList, ...newList], dueTotal: due.length, newTotal: fresh.length };
}

/** Ćwiczenie dodatkowo: pytania o najniższym pudełku. */
export function buildExtra(questions, n = 10) {
  const cards = store.get().cards;
  const rank = (q) => (cards[q.id] ? cards[q.id].box : 0);
  return shuffle(questions)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, n);
}

export function topicStats(questions, topicId) {
  const cards = store.get().cards;
  const qs = topicId ? questions.filter((q) => q.topic === topicId) : questions;
  let seen = 0;
  let mastered = 0;
  for (const q of qs) {
    const c = cards[q.id];
    if (c) {
      seen++;
      if (c.box >= MASTERED_BOX) mastered++;
    }
  }
  return { total: qs.length, seen, mastered };
}

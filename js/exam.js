// Losowanie pytań na sprawdzian: n pytań z całego zakresu, po równo z każdego działu,
// z domieszką pytań innych typów niż wybór (wzory, równania, klocki, dopasowywanie).

import { shuffle } from './dom.js';

export const EXAM_SIZE = 20;
const TYPED_SHARE = 0.4;

export function buildExam(questions, n = EXAM_SIZE) {
  const byTopic = new Map();
  for (const q of questions) {
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
    byTopic.get(q.topic).push(q);
  }
  const topics = shuffle([...byTopic.keys()]);
  if (!topics.length) return [];
  const base = Math.floor(n / topics.length);
  const extra = n - base * topics.length;
  const picked = [];
  const used = new Set();
  const take = (q) => {
    if (!used.has(q.id)) {
      used.add(q.id);
      picked.push(q);
    }
  };

  topics.forEach((t, i) => {
    const quota = base + (i < extra ? 1 : 0);
    const pool = shuffle(byTopic.get(t));
    const choice = pool.filter((q) => q.type === 'choice');
    // pytania innych typów: na zmianę po jednym z każdego typu, żeby uzyskać różnorodność
    const byType = new Map();
    pool.filter((q) => q.type !== 'choice').forEach((q) => byType.set(q.type, [...(byType.get(q.type) || []), q]));
    const typed = [];
    const lists = shuffle([...byType.values()]);
    while (lists.some((l) => l.length)) for (const l of lists) if (l.length) typed.push(l.shift());
    const wantTyped = Math.min(typed.length, Math.round(quota * TYPED_SHARE));
    typed.slice(0, wantTyped).forEach(take);
    let need = quota - wantTyped;
    for (const q of choice) {
      if (need <= 0) break;
      take(q);
      need--;
    }
    for (const q of typed.slice(wantTyped)) {
      if (need <= 0) break;
      take(q);
      need--;
    }
  });
  // gdy jakiś dział miał za mało pytań, dobierz z pozostałych
  for (const q of shuffle(questions)) {
    if (picked.length >= n) break;
    take(q);
  }
  return shuffle(picked).slice(0, n);
}

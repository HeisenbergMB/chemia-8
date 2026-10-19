// Program nauczania: moduły → działy (tematy). Składa dane aplikacji z `data/curriculum.json`
// i paczek działów `data/topics/<id>/{theory,questions}.json`.
// Używane zarówno w przeglądarce (app.js), jak i w narzędziach Node (tools/, tests/).

export const CURRICULUM_PATH = 'data/curriculum.json';
export const topicPackPath = (topicId, file) => `data/topics/${topicId}/${file}.json`;

/** Działy z paczkami danych (status „soon” nie ma paczki). */
export const packTopics = (curriculum) => curriculum.modules.flatMap((m) => m.topics).filter((t) => t.status === 'active');

/**
 * @param curriculum  zawartość curriculum.json
 * @param packs       { [topicId]: { theory: {cards, flash}, questions: [...] } }
 * Zwraca: { modules, topics (płaska lista z polem `module`), cards, flash, questions } –
 * każda karta, fiszka i pytanie dostaje `topic` z nazwy paczki (jedno źródło prawdy).
 */
export function assemble(curriculum, packs) {
  const topics = [];
  const cards = [];
  const flash = [];
  const questions = [];
  for (const m of curriculum.modules) {
    for (const t of m.topics) {
      topics.push({ ...t, module: m.id });
      const pack = packs[t.id];
      if (!pack) continue;
      const tag = (x) => ({ ...x, topic: t.id });
      cards.push(...((pack.theory && pack.theory.cards) || []).map(tag));
      flash.push(...((pack.theory && pack.theory.flash) || []).map(tag));
      questions.push(...(pack.questions || []).map(tag));
    }
  }
  return { modules: curriculum.modules, topics, cards, flash, questions };
}

/** Pytania z podanego zakresu: moduł (`moduleId`) albo null = wszystko. */
export function questionsInScope(data, moduleId = null) {
  if (!moduleId) return data.questions;
  const ids = new Set(data.topics.filter((t) => t.module === moduleId).map((t) => t.id));
  return data.questions.filter((q) => ids.has(q.topic));
}

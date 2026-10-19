// Dane aplikacji: jeden obiekt DATA wypełniany raz przy starcie (loadAll) i czytany przez ekrany.

import { CURRICULUM_PATH, topicPackPath, packTopics, assemble } from './curriculum.js';

export const DATA = { modules: [], topics: [], cards: [], flash: [], questions: [], experiments: [], indicators: null, solubility: null };

export const topicById = (id) => DATA.topics.find((t) => t.id === id);
export const moduleById = (id) => DATA.modules.find((m) => m.id === id);
export const questionsOf = (topicId) => DATA.questions.filter((q) => q.topic === topicId);
/** Numer działu w menu (kolejność w curriculum.json, przez wszystkie moduły). */
export const topicNum = (t) => String(DATA.topics.indexOf(t) + 1).padStart(2, '0');

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/** Wczytuje program i paczki działów. Rzuca błąd, gdy któregoś pliku nie da się pobrać. */
export async function loadAll() {
  const curriculum = await loadJson(CURRICULUM_PATH);
  // Wszystkie paczki działów ładujemy naraz (są małe i i tak leżą w cache offline).
  // Gdyby danych przybyło, wystarczy zamienić to na ładowanie per moduł – reszta aplikacji czyta z DATA.
  const [packList, experiments, indicators, solubility] = await Promise.all([
    Promise.all(
      packTopics(curriculum).map(async (t) => {
        const [theory, questions] = await Promise.all([loadJson(topicPackPath(t.id, 'theory')), loadJson(topicPackPath(t.id, 'questions'))]);
        return [t.id, { theory, questions }];
      })
    ),
    loadJson('data/experiments.json'),
    loadJson('data/indicators.json'),
    loadJson('data/solubility.json'),
  ]);
  Object.assign(DATA, assemble(curriculum, Object.fromEntries(packList)));
  DATA.indicators = indicators;
  DATA.solubility = solubility;
  DATA.experiments = experiments.experiments;
}

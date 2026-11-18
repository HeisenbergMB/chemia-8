// Dane aplikacji: jeden obiekt DATA wypełniany przy starcie i przy zmianie przedmiotu (loadAll), czytany przez ekrany.

import { setFormulaMode } from './formula.js';
import { SUBJECTS_PATH, DEFAULT_SUBJECT, activeSubjects, curriculumPath, subjectPath, topicPackPath, hasFeature, packTopics, assemble } from './curriculum.js';

// DATA zawiera dane jednego (aktywnego) przedmiotu; `subjects` to lista wszystkich.
export const DATA = { subjects: [], subject: null, modules: [], topics: [], cards: [], flash: [], questions: [], groups: [], experiments: [], indicators: null, solubility: null };

export const topicById = (id) => DATA.topics.find((t) => t.id === id);
export const moduleById = (id) => DATA.modules.find((m) => m.id === id);
export const groupById = (id) => DATA.groups.find((g) => g.id === id);
export const questionsOf = (topicId) => DATA.questions.filter((q) => q.topic === topicId);
/** Numer działu w menu (kolejność w curriculum.json, przez wszystkie moduły). */
export const topicNum = (t) => String(DATA.topics.indexOf(t) + 1).padStart(2, '0');

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/** Wczytuje listę przedmiotów i dane przedmiotu `wanted` (gdy go nie ma lub jeszcze nie działa – pierwszy aktywny). */
export async function loadAll(wanted = DEFAULT_SUBJECT) {
  const { subjects } = await loadJson(SUBJECTS_PATH);
  const active = activeSubjects(subjects);
  const subject = active.find((s) => s.id === wanted) || active[0];
  if (!subject) throw new Error(`${SUBJECTS_PATH}: brak aktywnego przedmiotu`);
  const curriculum = await loadJson(curriculumPath(subject.id));
  // Wszystkie paczki działów ładujemy naraz (są małe i i tak leżą w cache offline).
  // Gdyby danych przybyło, wystarczy zamienić to na ładowanie per moduł – reszta aplikacji czyta z DATA.
  const chem = hasFeature(subject, 'chem');
  const [packList, experiments, indicators, solubility] = await Promise.all([
    Promise.all(
      packTopics(curriculum).map(async (t) => {
        const [theory, questions] = await Promise.all([loadJson(topicPackPath(subject.id, t.id, 'theory')), loadJson(topicPackPath(subject.id, t.id, 'questions'))]);
        return [t.id, { theory, questions }];
      })
    ),
    chem ? loadJson(subjectPath(subject.id, 'experiments.json')) : { experiments: [] },
    chem ? loadJson(subjectPath(subject.id, 'indicators.json')) : null,
    chem ? loadJson(subjectPath(subject.id, 'solubility.json')) : null,
  ]);
  Object.assign(DATA, assemble(curriculum, Object.fromEntries(packList)));
  DATA.subjects = subjects;
  setFormulaMode(chem); // znak $ to wzór tylko w przedmiotach z cechą „chem”
  DATA.subject = subject;
  DATA.indicators = indicators;
  DATA.solubility = solubility;
  DATA.experiments = experiments.experiments;
}

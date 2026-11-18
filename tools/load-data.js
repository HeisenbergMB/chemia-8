// Wczytuje i składa dane z dysku (dla narzędzi i testów) tą samą funkcją, której używa aplikacja.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SUBJECT, SUBJECTS_PATH, activeSubjects, curriculumPath, topicPackPath, packTopics, assemble } from '../js/curriculum.js';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Dane jednego przedmiotu. Zwraca { curriculum, packs, data, problems } – problems to błędy wczytywania (brak pliku, zły JSON). */
export function loadData(subjectId = DEFAULT_SUBJECT) {
  const problems = [];
  const readJson = (rel) => {
    const p = join(root, rel);
    if (!existsSync(p)) return void problems.push(`${rel}: brak pliku`);
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch (e) {
      problems.push(`${rel}: niepoprawny JSON (${e.message})`);
    }
  };
  const curriculum = readJson(curriculumPath(subjectId));
  const packs = {};
  if (curriculum && Array.isArray(curriculum.modules)) {
    for (const t of packTopics(curriculum)) {
      packs[t.id] = { theory: readJson(topicPackPath(subjectId, t.id, 'theory')), questions: readJson(topicPackPath(subjectId, t.id, 'questions')) };
    }
  } else if (curriculum) problems.push(`${curriculumPath(subjectId)}: brak tablicy modules`);
  const data = curriculum && Array.isArray(curriculum.modules) ? assemble(curriculum, packs) : null;
  return { curriculum, packs, data, problems };
}

/** Lista przedmiotów z data/subjects.json: { subjects, active, problems }. */
export function loadSubjects() {
  const p = join(root, SUBJECTS_PATH);
  if (!existsSync(p)) return { subjects: [], active: [], problems: [`${SUBJECTS_PATH}: brak pliku`] };
  try {
    const { subjects } = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(subjects)) return { subjects: [], active: [], problems: [`${SUBJECTS_PATH}: brak tablicy subjects`] };
    return { subjects, active: activeSubjects(subjects), problems: [] };
  } catch (e) {
    return { subjects: [], active: [], problems: [`${SUBJECTS_PATH}: niepoprawny JSON (${e.message})`] };
  }
}

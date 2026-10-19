// Wczytuje i składa dane z dysku (dla narzędzi i testów) tą samą funkcją, której używa aplikacja.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM_PATH, topicPackPath, packTopics, assemble } from '../js/curriculum.js';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Zwraca { curriculum, packs, data, problems } – problems to błędy wczytywania (brak pliku, zły JSON). */
export function loadData() {
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
  const curriculum = readJson(CURRICULUM_PATH);
  const packs = {};
  if (curriculum && Array.isArray(curriculum.modules)) {
    for (const t of packTopics(curriculum)) {
      packs[t.id] = { theory: readJson(topicPackPath(t.id, 'theory')), questions: readJson(topicPackPath(t.id, 'questions')) };
    }
  } else if (curriculum) problems.push(`${CURRICULUM_PATH}: brak tablicy modules`);
  const data = curriculum && Array.isArray(curriculum.modules) ? assemble(curriculum, packs) : null;
  return { curriculum, packs, data, problems };
}

// Podaje następne wolne id w istniejącym dziale (pytania, fiszki, karty, grupy), żeby nie zgadywać numeracji.
//   node tools/next-id.js angielski gramatyka     →  q-en-gram-109, f-en-gram-13, t-en-gram-10, g-en-gram-03
//   node tools/next-id.js chemia podstawy

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { subjectPath } from '../js/curriculum.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Z listy elementów z id w postaci `<litera>-<kod>-<numer>` zwraca { code, next, width } albo null (brak elementów). */
export function nextOf(items, letter) {
  const re = new RegExp(`^${letter}-(.+)-(\\d+)$`);
  let code = null;
  let max = 0;
  let width = 2;
  for (const it of items || []) {
    const m = re.exec(it.id || '');
    if (!m) continue;
    code = code || m[1];
    max = Math.max(max, Number(m[2]));
    width = Math.max(width, m[2].length);
  }
  return code ? { code, next: max + 1, width } : null;
}

export function nextIds(subjectId, topicId) {
  const read = (file) => {
    const p = join(root, subjectPath(subjectId, `topics/${topicId}/${file}.json`));
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  };
  const questions = read('questions') || [];
  const theory = read('theory') || {};
  const fmt = (n, letter) => (n ? `${letter}-${n.code}-${String(n.next).padStart(n.width, '0')}` : null);
  return {
    question: fmt(nextOf(questions, 'q'), 'q'),
    flash: fmt(nextOf(theory.flash, 'f'), 'f'),
    card: fmt(nextOf(theory.cards, 't'), 't'),
    group: fmt(nextOf(theory.groups, 'g'), 'g'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [subject, topic] = process.argv.slice(2);
  if (!subject || !topic) {
    console.error('Użycie: node tools/next-id.js <przedmiot> <dział>');
    process.exit(2);
  }
  const ids = nextIds(subject, topic);
  if (!existsSync(join(root, subjectPath(subject, `topics/${topic}`)))) console.error(`Uwaga: katalog działu ${topic} nie istnieje – to będzie nowy dział (skrót id wybierz sam, patrz CLAUDE.md).`);
  for (const [k, v] of Object.entries(ids)) console.log(`${k.padEnd(9)} ${v || '(brak – pierwszy element tego rodzaju)'}`);
}

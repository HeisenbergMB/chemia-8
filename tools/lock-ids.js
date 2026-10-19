// Blokada identyfikatorów: postęp ucznia jest zapisany pod id pytań i fiszek, więc id nie mogą znikać
// ani zmieniać działu. data/ids.lock.json zapisuje wszystkie dotąd użyte id.
//
//   node tools/lock-ids.js            – dopisuje nowe id do blokady
//   node tools/lock-ids.js --prune    – dodatkowo usuwa z blokady id, których świadomie się pozbywasz
//                                       (postęp ucznia pod takim id przestanie mieć znaczenie)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCK_PATH = join(root, 'data', 'ids.lock.json');

/** Id objęte blokadą: { 'q-wr-001': 'wodorotlenki-rozp', ... } z pytań i fiszek. */
export function currentIds() {
  const read = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
  const out = {};
  for (const q of read('questions.json')) out[q.id] = q.topic;
  for (const f of read('theory.json').flash) out[f.id] = f.topic;
  return out;
}

export function readLock() {
  return existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, 'utf8')) : {};
}

/** Porównuje dane z blokadą: { missing: [...], moved: [...], fresh: [...] }. */
export function diffLock(lock, cur) {
  const missing = Object.keys(lock).filter((id) => !(id in cur));
  const moved = Object.keys(lock).filter((id) => id in cur && cur[id] !== lock[id]);
  const fresh = Object.keys(cur).filter((id) => !(id in lock));
  return { missing, moved, fresh };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prune = process.argv.includes('--prune');
  const cur = currentIds();
  const lock = readLock();
  const { missing, moved, fresh } = diffLock(lock, cur);
  if ((missing.length && !prune) || moved.length) {
    console.error('Nie można zaktualizować blokady:');
    if (missing.length) console.error(` - zniknęły id: ${missing.join(', ')} (jeśli to zamierzone: --prune)`);
    if (moved.length) console.error(` - zmieniły dział: ${moved.join(', ')} (przywróć dział albo dodaj nowe id)`);
    process.exit(1);
  }
  const next = {};
  for (const id of Object.keys(cur).sort()) next[id] = cur[id];
  writeFileSync(LOCK_PATH, JSON.stringify(next, null, 1) + '\n');
  console.log(`Blokada: ${Object.keys(next).length} id (nowych: ${fresh.length}, usuniętych: ${prune ? missing.length : 0}).`);
}

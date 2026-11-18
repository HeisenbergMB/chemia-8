// Postęp w localStorage + eksport/import + prośba o trwały zapis

const KEY = 'chemia8.v1'; // klucz localStorage – NIE zmieniaj (stracisz postęp); wersję danych oznacza pole `version`
export const SCHEMA_VERSION = 3;
export const DEFAULT_SUBJECT = 'chemia';

// Migracje: MIGRATIONS[n] zamienia stan w wersji n na wersję n+1 (czysta funkcja, zwraca nowy obiekt).
// Zmieniasz kształt zapisanych danych? Podnieś SCHEMA_VERSION, dopisz migrację i test w tests/store.test.js.
export const MIGRATIONS = {
  // 1 -> 2: stara domyślna data sprawdzianu była zaszyta w kodzie; teraz domyślnie pusta
  1: (s) => ({ ...s, settings: { ...(s.settings || {}), examDate: (s.settings || {}).examDate === '2026-10-05' ? '' : (s.settings || {}).examDate } }),
  // 2 -> 3: kilka przedmiotów – data sprawdzianu jest per przedmiot, wyniki sprawdzianów mają `subject` (dotychczasowe są z chemii)
  2: (s) => {
    const { examDate, ...settings } = s.settings || {};
    return {
      ...s,
      settings: { ...settings, subject: DEFAULT_SUBJECT, examDates: examDate ? { [DEFAULT_SUBJECT]: examDate } : {} },
      exams: (s.exams || []).map((e) => ({ subject: DEFAULT_SUBJECT, ...e })),
    };
  },
};

const defaults = () => ({
  version: SCHEMA_VERSION,
  settings: { fontScale: 'm', subject: DEFAULT_SUBJECT, examDates: {} }, // examDates: id przedmiotu -> data RRRR-MM-DD
  cards: {}, // id pytania -> { box, due, seen, ok, bad, last }
  flash: {}, // id fiszki -> true (umiem)
  exams: [], // wyniki trybu sprawdzian: { t, subject, scope, … }
});

let memoryOnly = false;
let blocked = false; // zapis pochodzi z nowszej wersji aplikacji – nie wolno go nadpisać
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Number.isInteger(parsed.version) && parsed.version > SCHEMA_VERSION) {
        blocked = true;
        memoryOnly = true;
        return defaults();
      }
      return normalize(parsed);
    }
  } catch (e) {
    memoryOnly = true;
  }
  return defaults();
}

/** Doprowadza zapisany stan do bieżącej wersji. Rzuca błąd, gdy dane pochodzą z nowszej aplikacji. */
export function migrate(obj) {
  let v = Number.isInteger(obj.version) ? obj.version : 1;
  if (v > SCHEMA_VERSION) throw new Error('Dane pochodzą z nowszej wersji aplikacji.');
  let s = obj;
  while (v < SCHEMA_VERSION) {
    s = MIGRATIONS[v](s);
    v++;
  }
  return { ...s, version: SCHEMA_VERSION };
}

export function normalize(raw) {
  const d = defaults();
  const obj = migrate(raw);
  return {
    ...d,
    ...obj,
    settings: { ...d.settings, ...(obj.settings || {}), examDates: { ...((obj.settings || {}).examDates || {}) } },
    cards: obj.cards || {},
    flash: obj.flash || {},
    exams: obj.exams || [],
  };
}

export const get = () => state;

/** Data sprawdzianu (RRRR-MM-DD) wybranego przedmiotu; pusta, gdy nie ustawiono. */
export const examDate = (subjectId = state.settings.subject) => state.settings.examDates[subjectId] || '';
export const isMemoryOnly = () => memoryOnly;

export function save() {
  if (blocked) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    memoryOnly = true;
  }
}

export function update(fn) {
  fn(state);
  save();
}

// Identyfikator pliku z postępem. Starsze eksporty (z czasów samej chemii) mają 'chemia-8' – nadal je przyjmujemy.
const EXPORT_APP = 'powtorka-8';
const IMPORT_APPS = [EXPORT_APP, 'chemia-8'];

export function exportJson() {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Zwraca { ok, message }. */
export function importJson(text) {
  try {
    const parsed = JSON.parse(text);
    const data = parsed && IMPORT_APPS.includes(parsed.app) ? parsed.data : null;
    if (!data || typeof data !== 'object' || !data.cards) {
      return { ok: false, message: 'To nie wygląda na plik z postępem tej aplikacji.' };
    }
    state = normalize(data);
    save();
    return { ok: true, message: 'Postęp wczytany.' };
  } catch (e) {
    return { ok: false, message: e.message.startsWith('Dane pochodzą') ? e.message : 'Nie udało się odczytać pliku.' };
  }
}

export function reset() {
  const keepSettings = state.settings;
  state = defaults();
  state.settings = keepSettings;
  save();
}

/** Prosi przeglądarkę o niewyczyszczanie danych. Zwraca true/false/null (brak wsparcia). */
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) {
    /* ignoruj */
  }
  return null;
}

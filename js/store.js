// Postęp w localStorage + eksport/import + prośba o trwały zapis

const KEY = 'chemia8.v1';
const VERSION = 1;

const defaults = () => ({
  version: VERSION,
  settings: { fontScale: 'm', examDate: '2026-10-05' },
  cards: {}, // id pytania -> { box, due, seen, ok, bad, last }
  flash: {}, // id fiszki -> true (umiem)
  exams: [], // wyniki trybu sprawdzian
});

let memoryOnly = false;
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    memoryOnly = true;
  }
  return defaults();
}

function normalize(obj) {
  const d = defaults();
  return {
    ...d,
    ...obj,
    settings: { ...d.settings, ...(obj.settings || {}) },
    cards: obj.cards || {},
    flash: obj.flash || {},
    exams: obj.exams || [],
  };
}

export const get = () => state;
export const isMemoryOnly = () => memoryOnly;

export function save() {
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

export function exportJson() {
  return JSON.stringify({ app: 'chemia-8', exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Zwraca { ok, message }. */
export function importJson(text) {
  try {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.app === 'chemia-8' ? parsed.data : null;
    if (!data || typeof data !== 'object' || !data.cards) {
      return { ok: false, message: 'To nie wygląda na plik z postępem tej aplikacji.' };
    }
    state = normalize(data);
    save();
    return { ok: true, message: 'Postęp wczytany.' };
  } catch (e) {
    return { ok: false, message: 'Nie udało się odczytać pliku.' };
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

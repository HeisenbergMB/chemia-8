// Arkusze konkursowe: logika bez interfejsu (kształt danych, kontrola, ocena, czas). Używana przez ekrany i narzędzia.
//
// data/<przedmiot>/sheets.json: {
//   formats: [{ id, title, minutes, points }],                       – etap konkursu: czas i liczba punktów
//   sheets:  [{ id, format, title, tasks: [{ kind, group?, instruction?, title?, items: [id pytania, …] }] }]
// }
// Pytania i grupy leżą w paczkach działów (jak zawsze); arkusz tylko ustawia je w kolejności z arkusza papierowego.
// Punkty: 1 za pytanie, chyba że pytanie ma pole `points`.

import { QTYPES } from './qtypes.js';

/** Rodzaje zadań z arkuszy kuratoryjnych (opis: docs/angielski-wzorzec-konkursu.md) z polskimi nazwami do ekranów. */
export const KIND_LABELS = {
  tf: 'Prawda / fałsz do tekstu',
  'choice-text': 'Pytania do tekstu (A–D)',
  'gapped-text': 'Tekst z brakującymi fragmentami',
  'open-cloze': 'Luki: jedno słowo',
  'first-letter': 'Luki z podanymi literami',
  'word-formation': 'Słowotwórstwo',
  'brackets-form': 'Wyrazy w nawiasach: zmień formę',
  'key-word': 'Przekształcanie zdań ze słowem kluczowym',
  'mc-cloze': 'Zdania z luką: wybór A–D',
  'translation-choice': 'Wybór tłumaczenia',
  'translation-write': 'Tłumaczenie na angielski',
  'question-form': 'Tworzenie pytań',
  'synonym-replace': 'Zastąp zaznaczony zwrot',
  culture: 'Święta i kultura UK/USA',
  'matching-people': 'Dopasuj osoby do pytań',
  'paragraph-matching': 'Który akapit zawiera informację?',
  'triple-gap': 'Jedno słowo do trzech zdań',
  'word-box': 'Wyrazy z ramki',
  idiom: 'Idiomy',
  biography: 'Sławni ludzie i geografia: tak/nie',
};
export const TASK_KINDS = Object.keys(KIND_LABELS);

export const itemPoints = (q) => (Number.isInteger(q.points) && q.points > 0 ? q.points : 1);
export const sheetMax = (sheet, byId) => sheet.tasks.reduce((n, t) => n + t.items.reduce((m, id) => m + (byId.has(id) ? itemPoints(byId.get(id)) : 0), 0), 0);
const GAP_MARK = /\((\d+)\)/g;

/**
 * Kontrola arkuszy. `err(gdzie, komunikat)`; `ctx`: { byId: Map id → pytanie, groups: Map id → grupa, uniqueId(id, gdzie) }.
 */
export function validateSheets(data, ctx, err) {
  if (!data || !Array.isArray(data.formats) || !Array.isArray(data.sheets)) return err('sheets.json', 'potrzebne tablice formats[] i sheets[]');
  const formats = new Map();
  for (const f of data.formats) {
    const w = `format ${f.id}`;
    ctx.uniqueId(`format:${f.id}`, w);
    formats.set(f.id, f);
    if (!f.title) err(w, 'brak title');
    for (const k of ['minutes', 'points']) if (!Number.isInteger(f[k]) || f[k] <= 0) err(w, `${k} musi być liczbą całkowitą > 0`);
  }
  for (const sh of data.sheets) {
    const w = `sheet ${sh.id}`;
    ctx.uniqueId(sh.id, w);
    const f = formats.get(sh.format);
    if (!f) err(w, `nieznany format "${sh.format}"`);
    if (!sh.title) err(w, 'brak title');
    if (!Array.isArray(sh.tasks) || !sh.tasks.length) {
      err(w, 'brak zadań (tasks[])');
      continue;
    }
    const used = new Set();
    let total = 0;
    sh.tasks.forEach((t, i) => {
      const tw = `${w} zadanie ${i + 1}`;
      if (!TASK_KINDS.includes(t.kind)) err(tw, `nieznany rodzaj zadania "${t.kind}" (TASK_KINDS w js/sheets.js)`);
      const g = t.group ? ctx.groups.get(t.group) : null;
      if (t.group && !g) err(tw, `nieznana grupa "${t.group}"`);
      if (!g && !(typeof t.instruction === 'string' && t.instruction.trim())) err(tw, 'zadanie bez grupy musi mieć własne instruction (polecenie)');
      if (!Array.isArray(t.items) || !t.items.length) return err(tw, 'brak items[]');
      const gaps = [];
      for (const id of t.items) {
        const q = ctx.byId.get(id);
        if (!q) {
          err(tw, `nieznane pytanie "${id}"`);
          continue;
        }
        if (used.has(id)) err(tw, `pytanie ${id} występuje w arkuszu więcej niż raz`);
        used.add(id);
        total += itemPoints(q);
        if (!QTYPES[q.type] || !QTYPES[q.type].sheet) err(tw, `pytanie ${id}: typ "${q.type}" nie jest dostępny w arkuszu (dozwolone: ${Object.keys(QTYPES).filter((k) => QTYPES[k].sheet).join(', ')})`);
        if (t.group ? q.group !== t.group : q.group) err(tw, `pytanie ${id}: grupa "${q.group || '—'}" nie zgadza się z grupą zadania "${t.group || '—'}"`);
        if (q.gap != null) gaps.push(q.gap);
      }
      // zadanie z luką w tekście: numery luk w pytaniach muszą pokrywać się z numerami w tekście (jak na papierze); (0) to przykład
      const marks = g && g.text ? [...g.text.matchAll(GAP_MARK)].map((m) => Number(m[1])).filter((n) => n > 0) : [];
      if (marks.length) {
        const want = [...new Set(marks)].sort((a, b) => a - b).join(',');
        const have = [...gaps].sort((a, b) => a - b).join(',');
        if (want !== have) err(tw, `luki w tekście (${want}) nie pasują do pól gap pytań (${have || 'brak'})`);
      }
    });
    if (f && total !== f.points) err(w, `suma punktów ${total} ≠ ${f.points} (format ${f.id})`);
  }
}

/** Wynik arkusza: { tasks: [{ points, max, items: [{ q, raw, ok, auto, overridden }] }], points, max, pct }. `overrides`: { id: true } – uznane przez ucznia. */
export function gradeSheet(sheet, byId, answers = {}, overrides = {}) {
  let points = 0;
  let max = 0;
  const tasks = sheet.tasks.map((t) => {
    const items = t.items.map((id) => {
      const q = byId.get(id);
      const raw = answers[id];
      const auto = raw !== undefined && raw !== null && raw !== '' && QTYPES[q.type].sheet.grade(q, raw);
      const overridden = !auto && !!overrides[id] && !!QTYPES[q.type].selfGrade;
      return { q, raw, ok: auto || overridden, auto, overridden };
    });
    const tp = items.reduce((n, i) => n + (i.ok ? itemPoints(i.q) : 0), 0);
    const tm = items.reduce((n, i) => n + itemPoints(i.q), 0);
    points += tp;
    max += tm;
    return { points: tp, max: tm, items };
  });
  return { tasks, points, max, pct: max ? Math.round((points / max) * 100) : 0 };
}

/** Zostawia tylko odpowiedzi do pytań z arkusza i o poprawnym kształcie (po zmianie danych, np. usuniętym pytaniu). */
export function cleanAnswers(sheet, byId, answers = {}) {
  const out = {};
  for (const t of sheet.tasks) {
    for (const id of t.items) {
      const q = byId.get(id);
      const raw = answers[id];
      if (!q || raw === undefined) continue;
      if (q.type === 'write' && typeof raw === 'string') out[id] = raw;
      else if (q.type === 'choice' && Number.isInteger(raw) && raw >= 0 && raw < q.options.length) out[id] = raw;
      else if (q.type === 'bank' && Number.isInteger(raw) && raw >= 0) out[id] = raw;
    }
  }
  return out;
}

export const deadlineOf = (draft, format) => draft.startedAt + format.minutes * 60000;
/** Pozostały czas w ms liczony z zegara (nie z odliczania – karty w tle spowalniają timery). */
export const remainingMs = (draft, format, now) => Math.max(0, deadlineOf(draft, format) - now);

/** „1:29:05” albo „04:30”. */
export function clock(ms) {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

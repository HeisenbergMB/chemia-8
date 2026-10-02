// Sprawdza całą bazę: bilans atomów i ładunków równań, format pytań, unikalność id.
// Uruchom: node tools/check-data.js   (albo: npm run check)

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExam, EXAM_SIZE } from '../js/exam.js';
import { parseEquation, parseSpecies, parseFormula, checkBalance, extractFormulaSegments } from '../js/chem.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

function readJson(rel, required = true) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    if (required) err(rel, 'brak pliku');
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    err(rel, `niepoprawny JSON (${e.message})`);
    return null;
  }
}

const ids = new Map();
function uniqueId(id, where) {
  if (typeof id !== 'string' || !id) return err(where, 'brak id');
  if (ids.has(id)) err(where, `id "${id}" już użyte w ${ids.get(id)}`);
  else ids.set(id, where);
}

/** Sprawdza wzory zapisane w $...$ w tekście. balance=false: tylko składnia (np. błędne odpowiedzi). */
function checkText(text, where, { balance = true } = {}) {
  if (typeof text !== 'string') return err(where, 'to nie jest tekst');
  if ((text.match(/\$/g) || []).length % 2 !== 0) return err(where, `nieparzysta liczba znaków $ w "${text}"`);
  for (let seg of extractFormulaSegments(text)) {
    let skip = false;
    if (seg.startsWith('!')) {
      skip = true;
      seg = seg.slice(1);
    }
    try {
      checkSegment(seg, balance && !skip);
    } catch (e) {
      err(where, `${e.message} (we fragmencie "${seg}")`);
    }
  }
}

function checkSegment(seg, balance) {
  seg = seg.replace(/-H2O(?:->|→)/g, '->'); // H₂O nad strzałką
  if (/\bMe/.test(seg)) return; // wzory ogólne (Me(OH)n, Me^n+) nie są konkretnymi związkami
  // szablony do uzupełnienia ("2Na + 2H2O -> ?", "Na2O + H2O ->") – nie są pełnymi równaniami
  if (/\?/.test(seg) || /(?:->|→)\s*$/.test(seg)) return;
  if (/->|→/.test(seg)) {
    const eq = parseEquation(seg);
    if (balance) {
      const r = checkBalance(eq);
      if (!r.ok) throw new Error(`równanie niezbilansowane: ${r.diffs.join('; ')}`);
    } else {
      [...eq.left, ...eq.right].forEach((sp) => parseFormula(sp.formula));
    }
    return;
  }
  // pojedynczy wzór lub lista składników z "+" – wzory z "?" i tekst opisowy pomijamy
  if (/[?]/.test(seg)) return;
  if (!/^[A-Z(]/.test(seg.trim()) && !/^\d+\s*[A-Z(]/.test(seg.trim())) return; // np. rzymskie cyfry, słowa
  for (const part of seg.split(/\s\+\s/)) {
    const sp = parseSpecies(part);
    // „Me(OH)n” i podobne wzory ogólne zawierają małą literę n – pomijamy
    if (/n$|\bMe\b/.test(sp.formula)) continue;
    parseFormula(sp.formula);
  }
}

// ---------- teoria ----------
const theory = readJson('data/theory.json');
const topicIds = new Set();
if (theory) {
  for (const t of theory.topics || []) {
    uniqueId(`topic:${t.id}`, `theory.topics`);
    topicIds.add(t.id);
    for (const k of ['id', 'title', 'status', 'desc']) if (!t[k]) err(`topic ${t.id}`, `brak pola ${k}`);
    if (!['active', 'soon'].includes(t.status)) err(`topic ${t.id}`, `zły status "${t.status}"`);
  }
  for (const c of theory.cards || []) {
    const w = `card ${c.id}`;
    uniqueId(c.id, w);
    if (!topicIds.has(c.topic)) err(w, `nieznany dział "${c.topic}"`);
    if (!c.title || !c.body) err(w, 'brak title/body');
    checkText(c.body, w);
    for (const ex of c.examples || []) checkText(`$${ex}$`.replace(/ – .*\$$/, '$'), `${w} example`);
    if (c.tip) checkText(c.tip, w);
  }
  for (const f of theory.flash || []) {
    const w = `flash ${f.id}`;
    uniqueId(f.id, w);
    if (!topicIds.has(f.topic)) err(w, `nieznany dział "${f.topic}"`);
    if (!f.front || !f.back) err(w, 'brak front/back');
    checkText(f.front, w);
    checkText(f.back, w);
  }
}

// ---------- równania ----------
const equations = readJson('data/equations.json') || [];
for (const e of equations) {
  const w = `equation ${e.id}`;
  uniqueId(e.id, w);
  if (!topicIds.has(e.topic)) err(w, `nieznany dział "${e.topic}"`);
  try {
    const r = checkBalance(parseEquation(e.eq));
    if (!r.ok) err(w, `niezbilansowane: ${r.diffs.join('; ')}  [${e.eq}]`);
  } catch (ex) {
    err(w, ex.message);
  }
}

// ---------- pytania ----------
const questions = readJson('data/questions.json') || [];
const TYPES = new Set(['choice', 'formula', 'equation', 'blocks', 'match']);
const stats = { byTopic: {}, byLevel: {}, byType: {} };
for (const q of questions) {
  const w = `question ${q.id}`;
  uniqueId(q.id, w);
  if (!topicIds.has(q.topic)) err(w, `nieznany dział "${q.topic}"`);
  if (!TYPES.has(q.type)) err(w, `nieznany typ "${q.type}"`);
  if (![1, 2, 3].includes(q.level)) err(w, `level musi być 1, 2 lub 3 (jest ${q.level})`);
  if (!q.q || typeof q.q !== 'string') err(w, 'brak treści pytania (q)');
  if (!q.explain || typeof q.explain !== 'string' || q.explain.length < 15) err(w, 'brak wyjaśnienia (explain)');
  if (q.type === 'choice') {
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5) err(w, 'options: 2–5 odpowiedzi');
    else {
      if (new Set(q.options).size !== q.options.length) err(w, 'options: powtarzające się odpowiedzi');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(w, `answer poza zakresem (${q.answer})`);
      q.options.forEach((o, i) => checkText(o, `${w} option ${i}`, { balance: i === q.answer }));
    }
  }
  if (q.type === 'formula') {
    if (typeof q.answer !== 'string') err(w, 'formula: brak answer');
    else {
      try { parseFormula(q.answer); } catch (e) { err(w, `answer: ${e.message}`); }
    }
  }
  if (q.type === 'equation') {
    try {
      const r = checkBalance(parseEquation(q.answer));
      if (!r.ok) err(w, `answer niezbilansowane: ${r.diffs.join('; ')}`);
    } catch (e) { err(w, `answer: ${e.message}`); }
  }
  if (q.type === 'blocks') {
    if (!Array.isArray(q.tokens) || q.tokens.length < 3) err(w, 'blocks: tokens (min. 3)');
    else {
      try {
        const r = checkBalance(parseEquation(q.tokens.join(' ')));
        if (!r.ok) err(w, `tokens niezbilansowane: ${r.diffs.join('; ')}`);
      } catch (e) { err(w, `tokens: ${e.message}`); }
      for (const t of [...q.tokens.filter((x) => !['->', '+'].includes(x)), ...(q.extra || [])]) {
        try { parseSpecies(t); parseFormula(parseSpecies(t).formula); } catch (e) { err(w, `klocek "${t}": ${e.message}`); }
      }
      const pool = [...q.tokens, ...(q.extra || [])];
      if ((q.extra || []).some((x) => q.tokens.includes(x))) err(w, 'extra: klocek-pułapka powtarza poprawny klocek');
      if (pool.length > 10) err(w, 'blocks: za dużo klocków (max 10)');
    }
  }
  if (q.type === 'match') {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.length > 6) err(w, 'match: pairs (2–6 par)');
    else {
      const rights = [...q.pairs.map((p) => p[1]), ...(q.extra || [])];
      if (new Set(rights).size !== rights.length) err(w, 'match: odpowiedzi (prawa strona + extra) muszą być unikalne');
      if (new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length) err(w, 'match: powtarzające się wiersze po lewej');
      q.pairs.forEach(([l, r], i) => { checkText(l, `${w} pair ${i} lewa`, { balance: false }); checkText(r, `${w} pair ${i} prawa`, { balance: false }); });
      (q.extra || []).forEach((x, i) => checkText(x, `${w} extra ${i}`, { balance: false }));
      if (rights.length > 8) err(w, 'match: za dużo odpowiedzi (max 8)');
    }
  }
  checkText(q.q, `${w} q`);
  if (q.hint) checkText(q.hint, `${w} hint`);
  checkText(q.explain, `${w} explain`);
  stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
  stats.byLevel[q.level] = (stats.byLevel[q.level] || 0) + 1;
  stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
}

// ---------- doświadczenia (laboratorium) ----------
const exps = readJson('data/experiments.json');
if (exps) {
  for (const e of exps.experiments || []) {
    const w = `experiment ${e.id}`;
    uniqueId(`exp:${e.id}`, w);
    if (!['precipitate', 'gas'].includes(e.kind)) err(w, `nieznany kind "${e.kind}"`);
    const eqs2 = e.kind === 'precipitate' ? (e.tubes || []).map((t) => t.eq) : [e.eq];
    if (e.kind === 'precipitate' && !(e.tubes || []).length) err(w, 'brak tubes');
    for (const q of eqs2) {
      try {
        const r = checkBalance(parseEquation(q));
        if (!r.ok) err(w, `niezbilansowane: ${r.diffs.join('; ')} [${q}]`);
      } catch (ex) { err(w, ex.message); }
    }
    (e.tubes || []).forEach((t) => ['salt', 'liquid', 'precip', 'observation', 'conclusion', 'eq'].forEach((k) => { if (!t[k]) err(w, `probówka ${t.id}: brak ${k}`); }));
  }
}
// laboratoria wskazywane w działach muszą istnieć
if (theory && exps) {
  const known = new Set((exps.experiments || []).map((e) => e.id));
  for (const t of theory.topics) for (const l of t.labs || []) if (!known.has(l)) err(`topic ${t.id}`, `nieznane laboratorium "${l}"`);
}

// ---------- unikalność treści pytań ----------
{
  const seen = new Map();
  for (const q of questions) {
    const key = String(q.q).replace(/\s+/g, ' ').trim().toLowerCase();
    if (seen.has(key)) err(`question ${q.id}`, `ta sama treść pytania co ${seen.get(key)}: "${q.q}"`);
    else seen.set(key, q.id);
  }
}

// ---------- wskaźniki ----------
const indData = readJson('data/indicators.json');
if (indData) {
  const envIds = (indData.environments || []).map((e) => e.id);
  for (const e of indData.environments || []) if (!e.loc || !e.label || !e.ph) err('indicators.json', `odczyn ${e.id}: potrzebne label, loc i ph`);
  if (envIds.length !== 3) err('indicators.json', 'oczekuję 3 odczynów (kwasowy, obojętny, zasadowy)');
  for (const x of indData.indicators || []) {
    const w = `indicator ${x.id}`;
    uniqueId(`ind:${x.id}`, w);
    if (!x.name) err(w, 'brak name');
    for (const e of envIds) {
      const c = (x.colors || {})[e];
      if (!c || !c.name || !/^#[0-9a-fA-F]{6}$/.test(c.hex || '')) err(w, `zła barwa dla odczynu "${e}" (potrzebne name i hex #rrggbb)`);
    }
  }
}
for (const t of theory ? theory.topics : []) for (const tool of t.tools || []) if (!/^#\//.test(tool.href || '') || !tool.label) err(`topic ${t.id}`, 'tools: potrzebne href (#/…) i label');

// ---------- losowanie sprawdzianu ----------
{
  const activeTopics = new Set(questions.map((q) => q.topic));
  let minTyped = Infinity;
  for (let i = 0; i < 300; i++) {
    const ex = buildExam(questions, EXAM_SIZE);
    const w = `sprawdzian (próba ${i + 1})`;
    if (ex.length !== Math.min(EXAM_SIZE, questions.length)) { err(w, `liczba pytań ${ex.length}`); break; }
    if (new Set(ex.map((q) => q.id)).size !== ex.length) { err(w, 'powtarzające się pytania'); break; }
    const topics = new Set(ex.map((q) => q.topic));
    if (topics.size < Math.min(activeTopics.size, EXAM_SIZE)) { err(w, `za mało działów (${topics.size} z ${activeTopics.size})`); break; }
    minTyped = Math.min(minTyped, ex.filter((q) => q.type !== 'choice').length);
  }
  if (Number.isFinite(minTyped) && minTyped < 4) err('sprawdzian', `za mało pytań innych typów niż wybór (min. ${minTyped} w próbie)`);
  else console.log(`Losowanie sprawdzianu OK (300 prób, min. ${minTyped} pytań innych typów niż wybór).`);
}

// ---------- service worker ----------
const swPath = join(root, 'sw.js');
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  if (!block) err('sw.js', 'nie znaleziono listy ASSETS');
  else {
    for (const m of block[1].matchAll(/'([^']+)'/g)) {
      const f = m[1];
      if (f === './') continue;
      if (!existsSync(join(root, f))) err('sw.js', `ASSETS wskazuje na nieistniejący plik "${f}"`);
    }
  }
} else err('sw.js', 'brak pliku');

// ---------- wynik ----------
console.log(`Pytań: ${questions.length}, równań: ${equations.length}, kart teorii: ${(theory?.cards || []).length}, fiszek: ${(theory?.flash || []).length}`);
console.log('Pytania wg działu:', stats.byTopic, ' wg poziomu:', stats.byLevel, ' wg typu:', stats.byType);
if (errors.length) {
  console.error(`\nBŁĘDY (${errors.length}):`);
  errors.forEach((e) => console.error(' ✗ ' + e));
  process.exit(1);
}
console.log('OK – baza spójna.');

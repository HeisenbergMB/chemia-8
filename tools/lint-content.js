// Mechaniczna kontrola jakości treści (uzupełnia check-data i fact-check): wyłapuje typowe błędy autora, których walidator formatu nie widzi.
// Poziomy: error – prawie na pewno błąd; warn – do obejrzenia (heurystyka, bywają fałszywe alarmy).
//   node tools/lint-content.js [przedmiot]      – domyślnie wszystkie aktywne; --strict kończy kodem 1 także przy warn

import { fileURLToPath } from 'node:url';
import { loadData, loadSubjects } from './load-data.js';

const VOCAB_TOPIC = /(slow|kult)/; // działy słownictwa i wiedzy: klucz to konkretne słowo lub fakt
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would']);

/** Wszystkie ciągi pojedynczych znaków rozdzielonych spacjami zawierające `_` (wzór słowa: „n _ _ g _ _ s”). */
function letterRuns(q) {
  const runs = [];
  const re = /(?:^|\s)((?:[A-Za-z_] ){2,}[A-Za-z_])(?=[\s.,;!?)]|$)/g;
  let m;
  while ((m = re.exec(q))) if (m[1].includes('_')) runs.push(m[1].split(' '));
  return runs;
}

/** Czy któryś fragment ciągu (może być częścią szerszej serii pojedynczych liter, np. „a d _ c …”) pasuje do słowa. */
function patternFits(run, word) {
  for (let i = 0; i + word.length <= run.length; i++) {
    const w = run.slice(i, i + word.length);
    if (w.includes('_') && w.every((c, k) => c === '_' || c.toLowerCase() === word[k])) return true;
  }
  return false;
}

/**
 * @param data    wynik assemble(): { questions, cards, flash, topics, groups }
 * @param sheets  zawartość sheets.json albo null
 * Zwraca [{ level, where, msg }].
 */
export function lintData(data, sheets = null) {
  const out = [];
  const add = (level, where, msg) => out.push({ level, where, msg });
  const byId = new Map(data.questions.map((q) => [q.id, q]));

  for (const q of data.questions) {
    const w = `question ${q.id}`;
    if (q.type === 'write') {
      // zadanie ze słowem kluczowym: słowo w nawiasie w treści zgadza się z polem keyword
      if (q.keyword && !new RegExp(`\\(${q.keyword.toUpperCase()}\\)`).test(q.q)) add('error', w, `treść nie zawiera „(${q.keyword.toUpperCase()})” – słowo kluczowe wielkimi literami w nawiasie`);
      // wzór słowa z odsłoniętymi literami zgadza się z odpowiedzią
      const runs = letterRuns(q.q);
      if (runs.length && q.answers && q.answers.length) {
        const word = q.answers[0].toLowerCase();
        if (!runs.some((r) => patternFits(r, word))) add('error', w, `wzór „${runs.map((r) => r.join(' ')).join('” / „')}” nie pasuje do odpowiedzi „${q.answers[0]}”`);
      }
      // zadanie ze słowem kluczowym: skrócona forma przeczna jest dozwolona, więc klucz ma mieć oba warianty (should not / shouldn't)
      if (q.keyword) for (const a of q.answers) {
        const full = /\b(is|are|was|were|has|have|had|do|does|did|should|would|could|must|need|might|ought) not\b/i.exec(a);
        if (full && !q.answers.some((b) => b.toLowerCase() === a.toLowerCase().replace(full[0].toLowerCase(), `${full[1].toLowerCase()}n't`))) add('warn', w, `odpowiedź „${a}” nie ma wariantu ze skróconą formą przeczną`);
        const short = /\b(\w+)n't\b/i.exec(a);
        if (short && !/^(ca|wo|sha)$/i.test(short[1]) && !q.answers.some((b) => b.toLowerCase() === a.toLowerCase().replace(short[0].toLowerCase(), `${short[1].toLowerCase()} not`))) add('warn', w, `odpowiedź „${a}” nie ma wariantu z pełną formą „${short[1]} not”`);
      }
      // luka jednowyrazowa z grupy-tekstu: zakaz skróceń (w poleceniach konkursu)
      if (q.group && q.gap != null) for (const a of q.answers) if (/['’]/.test(a) && !/\s/.test(a)) add('warn', w, `odpowiedź „${a}” jest skróceniem – w lukach jednowyrazowych nie wolno (sprawdź polecenie zadania)`);
      // odpowiedzi pytań zaczynających zdanie: wielka litera i znak zapytania w kluczu wyświetlanym uczniowi
      if (/\+\+/.test(q.q) && q.answers.some((a) => !/^[A-Z]/.test(a) || !/\?$/.test(a))) add('warn', w, 'klucz pytania o podkreśloną część powinien być zapisany jak poprawne pytanie (wielka litera, „?”)');
    }
  }

  // pytania wyboru: w quizach opcje są mieszane, więc pozycja poprawnej odpowiedzi ma znaczenie tylko w arkuszach (kolejność z papieru);
  // długość poprawnej odpowiedzi ma znaczenie wszędzie
  const inSheets = new Set(sheets ? sheets.sheets.flatMap((sh) => sh.tasks.flatMap((t) => t.items)) : []);
  for (const t of data.topics.filter((x) => x.status === 'active')) {
    const choice = data.questions.filter((q) => q.topic === t.id && q.type === 'choice' && !q.fixed && q.options.length >= 3);
    const sheetMc = choice.filter((q) => inSheets.has(q.id));
    if (sheetMc.length >= 8) {
      const counts = new Array(Math.max(...sheetMc.map((q) => q.options.length))).fill(0);
      for (const q of sheetMc) counts[q.answer]++;
      const top = Math.max(...counts);
      if (top > sheetMc.length * 0.5) add('warn', `topic ${t.id}`, `w arkuszu poprawna odpowiedź stoi na jednej pozycji w ${top} z ${sheetMc.length} pytań wyboru (${counts.join('/')})`);
    }
    if (choice.length >= 8) {
      const clearlyLongest = choice.filter((q) => {
        const lens = q.options.map((o) => o.length);
        const others = lens.filter((_, i) => i !== q.answer);
        const mean = others.reduce((x, y) => x + y, 0) / others.length;
        return lens[q.answer] >= 15 && lens[q.answer] >= mean * 1.3 && lens[q.answer] === Math.max(...lens);
      }).length;
      if (clearlyLongest > choice.length * 0.4) add('warn', `topic ${t.id}`, `poprawna odpowiedź jest wyraźnie dłuższa od pozostałych w ${clearlyLongest} z ${choice.length} pytań – uczeń może zgadywać po długości`);
    }
  }

  // ujawnienie klucza arkusza w kartach teorii i fiszkach (dla słownictwa i faktów; struktury gramatyczne są tematem kart, więc pytania ze słowem kluczowym pomijamy)
  if (sheets) {
    const corpus = [...data.cards.map((c) => `${c.title} ${c.body} ${(c.examples || []).join(' ')} ${c.tip || ''}`), ...data.flash.map((f) => `${f.front} ${f.back}`)].join('\n').toLowerCase();
    const leaked = (key) => {
      const k = key.toLowerCase().replace(/[?.!]$/, '').trim();
      if (k.length < 6 || k.split(/\s+/).every((x) => STOP.has(x))) return false;
      return corpus.includes(k);
    };
    for (const sh of sheets.sheets) {
      for (const t of sh.tasks) {
        for (const id of t.items) {
          const q = byId.get(id);
          if (!q) continue;
          let keys = [];
          if (!VOCAB_TOPIC.test(q.topic)) continue; // w działach gramatycznych kluczem są struktury, które karty mają omawiać
          if (q.type === 'write' && !q.keyword) keys = q.answers;
          else if (q.type === 'choice' && !q.fixed) keys = [q.options[q.answer]];
          for (const key of keys) if (leaked(key)) add('warn', `sheet ${sh.id} ${id}`, `klucz „${key}” występuje w kartach teorii lub fiszkach – możliwe ujawnienie odpowiedzi`);
        }
      }
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes('--strict');
  const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
  let errors = 0;
  let warns = 0;
  for (const s of loadSubjects().active.filter((x) => !only || x.id === only)) {
    const { data, sheets } = loadData(s.id);
    const found = lintData(data, sheets);
    for (const f of found) {
      console.log(`${f.level === 'error' ? '✗' : '!'} [${s.id}] ${f.where}: ${f.msg}`);
      f.level === 'error' ? errors++ : warns++;
    }
  }
  console.log(`Kontrola treści: ${errors} błędów, ${warns} ostrzeżeń.`);
  if (errors || (strict && warns)) process.exit(1);
}

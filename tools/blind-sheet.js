// Wypisuje arkusz albo dział BEZ kluczy i wyjaśnień – do „ślepego” rozwiązania przez niezależnego recenzenta (osobę albo osobnego agenta).
// Porównanie jego odpowiedzi z kluczem wykrywa pytania z dwiema poprawnymi odpowiedziami, błędy klucza i pytania niejasne.
//   node tools/blind-sheet.js angielski s-en-sz-01          – cały arkusz
//   node tools/blind-sheet.js angielski --topic gramatyka    – wszystkie pytania działu
//   node tools/blind-sheet.js angielski --topic czytanie,gramatyka --practice   – kilka działów, tylko pytania spoza arkuszy (ćwiczeniowe)

import { fileURLToPath } from 'node:url';
import { loadData } from './load-data.js';
import { letterOf } from '../js/qtypes.js';

/** Zwraca tekst zadań bez odpowiedzi. */
export function blindText({ data, sheets }, { sheetId = null, topic = null, practice = false }) {
  const byId = new Map(data.questions.map((q) => [q.id, q]));
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  const out = [];
  const item = (q, no) => {
    const lines = [`${no}. [${q.id}] ${q.q}`];
    if (q.type === 'choice') q.options.forEach((o, i) => lines.push(`   ${letterOf(i)}) ${o}`));
    if (q.type === 'bank') lines.push('   (wybierz literę z listy fragmentów zadania)');
    if (q.type === 'write') lines.push('   Odpowiedź: ______');
    return lines.join('\n');
  };
  const group = (g, lettered = true) => [`— Polecenie: ${g.instruction}`, g.text ? `— Tekst:\n${g.text}` : null, g.bank ? (lettered ? `— Fragmenty:\n${g.bank.map((b, i) => `   ${letterOf(i)}) ${b}`).join('\n')}` : `— Wyrazy do wykorzystania (zmień ich formę): ${g.bank.join(', ')}`) : null].filter(Boolean).join('\n');
  if (sheetId) {
    const sh = sheets && sheets.sheets.find((x) => x.id === sheetId);
    if (!sh) throw new Error(`nie ma arkusza ${sheetId}`);
    out.push(`# ${sh.title}`);
    sh.tasks.forEach((t, ti) => {
      const g = t.group ? groups.get(t.group) : null;
      out.push(`\n## Zadanie ${ti + 1}`, g ? group(g, t.items.some((id) => byId.get(id).type === 'bank')) : `— Polecenie: ${t.instruction}`);
      t.items.forEach((id, i) => out.push(item(byId.get(id), i + 1)));
    });
  } else {
    const topics = String(topic).split(',');
    const inSheets = new Set(practice && sheets ? sheets.sheets.flatMap((sh) => sh.tasks.flatMap((t) => t.items)) : []);
    const qs = data.questions.filter((q) => topics.includes(q.topic) && !inSheets.has(q.id));
    if (!qs.length) throw new Error(`brak pytań w dziale ${topic}`);
    const shown = new Set();
    out.push(`# Dział ${topic}${practice ? ' (pytania ćwiczeniowe)' : ''}`);
    qs.forEach((q, i) => {
      if (q.group && !shown.has(q.group)) {
        shown.add(q.group);
        out.push(`\n${group(groups.get(q.group), qs.some((x) => x.group === q.group && x.type === 'bank'))}`);
      }
      out.push(item(q, i + 1));
    });
  }
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [subject, ...rest] = process.argv.slice(2);
  if (!subject || !rest.length) {
    console.error('Użycie: node tools/blind-sheet.js <przedmiot> <id arkusza> | --topic <dział>');
    process.exit(2);
  }
  const loaded = loadData(subject);
  const ti = rest.indexOf('--topic');
  console.log(blindText(loaded, ti >= 0 ? { topic: rest[ti + 1], practice: rest.includes('--practice') } : { sheetId: rest[0] }));
}

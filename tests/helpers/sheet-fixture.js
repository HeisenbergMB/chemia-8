// Sztuczny przedmiot z arkuszem konkursowym (do testów; nie ma go w data/).
import { readFileSync } from 'node:fs';

const real = JSON.parse(readFileSync(new URL('../../data/subjects.json', import.meta.url), 'utf8'));

export const subjects = {
  subjects: [real.subjects[0], { id: 'en-test', title: 'Angielski próbny', desc: 'test', icon: 'book', status: 'active', features: ['sheets'], types: ['choice', 'match', 'write', 'bank'], idTag: 'en' }],
};

export const groups = [
  { id: 'g-en-01', instruction: 'Czy zdania są prawdziwe? TRUE/FALSE.', text: 'Tom lives in Łódź. He likes cycling.' },
  { id: 'g-en-02', instruction: 'Wpisz **jedno** słowo w każdą lukę.', text: 'Example: Tom (0)___ tall. He (1)___ a bike and (2)___ to school.' },
  { id: 'g-en-03', instruction: 'Wybierz fragment pasujący do luki.', text: 'It was late. (1)___ Then (2)___', bank: ['He went home.', 'The shop closed.', 'Nobody called.'] },
];

const q = (id, extra) => ({ level: 1, explain: 'Wyjaśnienie pytania próbnego.', ...extra, id });
export const questions = [
  q('q-en-101', { type: 'choice', fixed: true, group: 'g-en-01', q: 'Tom lives in Poland.', options: ['TRUE', 'FALSE'], answer: 0 }),
  q('q-en-102', { type: 'choice', fixed: true, group: 'g-en-01', q: 'Tom hates cycling.', options: ['TRUE', 'FALSE'], answer: 1 }),
  q('q-en-103', { type: 'write', group: 'g-en-02', gap: 1, q: 'Luka (1)', answers: ['has'] }),
  q('q-en-104', { type: 'write', group: 'g-en-02', gap: 2, q: 'Luka (2)', answers: ['goes', 'walks'] }),
  q('q-en-105', { type: 'write', q: 'I didn’t go. (NOT) I ___ there.', keyword: 'not', answers: ['did not go'] }),
  q('q-en-106', { type: 'write', points: 2, q: 'He is taller than me. (AS) I am ___ him.', keyword: 'as', answers: ['not as tall as'] }),
  q('q-en-107', { type: 'bank', group: 'g-en-03', gap: 1, q: 'Fragment do luki 1', answer: 1 }),
  q('q-en-108', { type: 'bank', group: 'g-en-03', gap: 2, q: 'Fragment do luki 2', answer: 0 }),
  q('q-en-109', { type: 'write', q: 'Pytanie ćwiczeniowe spoza arkusza: I ___ (go) there.', answers: ['went'] }), // nie należy do żadnego arkusza
];

export const sheetsJson = {
  formats: [{ id: 'f-test', title: 'Etap próbny', minutes: 10, points: 9 }],
  sheets: [
    {
      id: 's-en-01',
      format: 'f-test',
      title: 'Arkusz próbny 1',
      tasks: [
        { kind: 'tf', group: 'g-en-01', items: ['q-en-101', 'q-en-102'] },
        { kind: 'open-cloze', group: 'g-en-02', items: ['q-en-103', 'q-en-104'] },
        { kind: 'key-word', instruction: 'Uzupełnij zdanie, używając podanego słowa.', items: ['q-en-105', 'q-en-106'] },
        { kind: 'gapped-text', group: 'g-en-03', items: ['q-en-107', 'q-en-108'] },
      ],
    },
  ],
};
sheetsJson.sheets.push({ ...sheetsJson.sheets[0], id: 's-en-02', title: 'Arkusz próbny 2' });

export const files = {
  'data/subjects.json': subjects,
  'data/en-test/curriculum.json': { modules: [{ id: 'm-en', title: 'Moduł', desc: 'opis', topics: [{ id: 'en-1', title: 'Czytanie', status: 'active', desc: 'opis' }] }] },
  'data/en-test/topics/en-1/theory.json': { cards: [{ id: 't-en-01', title: 'Karta', body: 'Treść.' }], flash: [{ id: 'f-en-01', front: 'a', back: 'b' }], groups },
  'data/en-test/topics/en-1/questions.json': questions,
  'data/en-test/sheets.json': sheetsJson,
};

export const ctx = () => ({ byId: new Map(questions.map((x) => [x.id, x])), groups: new Map(groups.map((g) => [g.id, g])), uniqueId: () => {} });

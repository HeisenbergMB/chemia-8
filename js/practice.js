// Pytania do ćwiczeń (quizy, powtórki, postęp). Pytania z arkuszy konkursowych są w ćwiczeniach ukryte,
// dopóki uczeń nie rozwiąże i nie zatwierdzi arkusza (pierwszy raz rozwiązuje go „na zimno”, jak na konkursie).
// Wynik zatwierdzonego arkusza jest w historii (`exams`, scope `sheet:<id>`); rozpoczęty arkusz (szkic) nie odblokowuje pytań.

import * as store from './store.js';
import { DATA } from './data.js';

const committedSheets = () => new Set(store.get().exams.filter((e) => e.subject === DATA.subject.id && typeof e.scope === 'string' && e.scope.startsWith('sheet:')).map((e) => e.scope.slice('sheet:'.length)));

/** Id pytań z arkuszy, których wynik nie został jeszcze zatwierdzony. */
export function sealedIds() {
  const out = new Set();
  const done = committedSheets();
  for (const sh of DATA.sheets.sheets) if (!done.has(sh.id)) for (const t of sh.tasks) for (const id of t.items) out.add(id);
  return out;
}

/** Pytania dostępne w ćwiczeniach (przy braku arkuszy – cała lista, ta sama tablica). */
export function practiceQuestions() {
  const sealed = sealedIds();
  return sealed.size ? DATA.questions.filter((q) => !sealed.has(q.id)) : DATA.questions;
}

export const practiceOf = (topicId) => practiceQuestions().filter((q) => q.topic === topicId);

/** Ile pytań działu (albo wszystkich) czeka w nierozwiązanych arkuszach. */
export const sealedCount = (topicId = null) => {
  const sealed = sealedIds();
  return DATA.questions.filter((q) => sealed.has(q.id) && (!topicId || q.topic === topicId)).length;
};

export const SEALED_NOTE = 'Pytania z arkusza są ukryte w ćwiczeniach, dopóki nie rozwiążesz arkusza i nie zatwierdzisz wyniku – tak pierwsze podejście jest „na zimno”, jak na konkursie.';

// Arkusze konkursowe: lista, opis przed startem i rozwiązywanie (js/sheet-run.js).

import { h } from '../dom.js';
import * as store from '../store.js';
import { withIcon } from '../icons.js';
import { DATA, sheetById, formatById, groupById } from '../data.js';
import { notFound } from '../ui.js';
import { runSheet, startDraft } from '../sheet-run.js';
import { KIND_LABELS, ROMAN, sheetMax, remainingMs, clock, cleanAnswers } from '../sheets.js';

const scopeOf = (id) => `sheet:${id}`;
const historyOf = (id) => store.get().exams.filter((e) => e.subject === DATA.subject.id && e.scope === scopeOf(id));
const byIdMap = () => new Map(DATA.questions.map((q) => [q.id, q]));
const draftOf = (id) => {
  const d = store.get().draft;
  return d && d.subject === DATA.subject.id && d.sheet === id ? d : null;
};
const fmtDate = (ts) => new Date(ts).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

function sheetsList() {
  const { formats, sheets } = DATA.sheets;
  const draft = store.get().draft;
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Ekran główny'),
    h('h1', null, 'Arkusze konkursowe'),
    h('p', { class: 'muted' }, 'Pełne arkusze w układzie z konkursu: te same rodzaje zadań, punktacja 100 i czas jak na prawdziwym etapie.'),
    draft && draft.subject === DATA.subject.id && sheetById(draft.sheet)
      ? h('div', { class: 'card' }, h('strong', null, 'Masz rozpoczęty arkusz: '), h('a', { href: `#/sheet/${draft.sheet}` }, sheetById(draft.sheet).title))
      : null,
    formats.map((f) => {
      const list = sheets.filter((s) => s.format === f.id);
      return h(
        'section',
        null,
        h('div', { class: 'section-title' }, f.title),
        h('p', { class: 'muted' }, `${f.minutes} minut · ${f.points} punktów`),
        list.length
          ? h(
              'div',
              { class: 'topic-grid' },
              list.map((s) => {
                const hist = historyOf(s.id);
                const best = hist.length ? Math.max(...hist.map((e) => e.pct)) : null;
                return h('a', { class: 'topic c1', href: `#/sheet/${s.id}` }, h('h3', null, s.title), h('p', null, `${s.tasks.length} zadań`), h('span', { class: 'chip' }, best == null ? 'jeszcze nie rozwiązany' : `najlepszy wynik: ${best}%`));
              })
            )
          : h('p', { class: 'muted' }, 'Arkusze tego etapu są w przygotowaniu.')
      );
    })
  );
}

function sheetIntro(id) {
  const sheet = sheetById(id);
  if (!sheet) return notFound('Nie znaleziono arkusza.');
  const format = formatById(sheet.format);
  const byId = byIdMap();
  const draft = draftOf(id);
  const hist = historyOf(id).slice().reverse();
  const running = draft && !draft.finishedAt;
  const left = running ? remainingMs(draft, format, Date.now()) : 0;
  const expired = running && left <= 0;
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/sheets' }, '← Arkusze'),
    h('h1', null, sheet.title),
    h(
      'section',
      { class: 'card' },
      h('p', null, h('strong', null, format.title), `: ${format.minutes} minut, ${sheetMax(sheet, byId)} punktów, ${sheet.tasks.length} zadań.`),
      h('ul', { class: 'rules' }, h('li', null, 'Jak na papierze: wszystkie pytania zadania są na jednej stronie, do zadań można wracać i poprawiać odpowiedzi.'), h('li', null, 'Bez podpowiedzi i bez informacji o poprawności – klucz zobaczysz po zakończeniu.'), h('li', null, 'Czas płynie od startu także wtedy, gdy zamkniesz aplikację lub tablet uśnie – jak na prawdziwym konkursie. Odpowiedzi zapisują się same.'), h('li', null, 'Po zakończeniu odpowiedzi są zablokowane. W przeglądzie możesz uznać własną poprawną odpowiedź, której nie ma w kluczu.')),
      h('ol', { class: 'task-list' }, sheet.tasks.map((t, i) => h('li', { value: i + 1 }, `${ROMAN[i] || i + 1}. ${KIND_LABELS[t.kind] || t.kind} (${t.items.length})`))),
      draft && draft.finishedAt
        ? h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: `#/sheet/${id}/run`, html: withIcon('check', 'Przejdź do wyniku') }))
        : running
          ? [h('p', { class: 'muted' }, expired ? 'Czas minął – wynik czeka w przeglądzie.' : `Rozpoczęty arkusz. Pozostało ${clock(left)}.`), h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: `#/sheet/${id}/run`, html: withIcon('play', expired ? 'Przejdź do wyniku' : 'Kontynuuj') }))]
          : h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: `#/sheet/${id}/run`, html: withIcon('play', 'Zacznij arkusz') }))
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Twoje wyniki'),
      hist.length ? h('ul', { class: 'history' }, hist.slice(0, 8).map((e) => h('li', null, h('span', { class: 'muted' }, fmtDate(e.t)), h('strong', null, `${e.points} / ${e.max}`), h('span', { class: 'muted' }, `${e.pct}%`)))) : h('p', { class: 'muted' }, 'Jeszcze nie rozwiązano tego arkusza.')
    )
  );
}

function sheetRun(id) {
  const sheet = sheetById(id);
  if (!sheet) return notFound('Nie znaleziono arkusza.');
  const format = formatById(sheet.format);
  const holder = h('div'); // tu wchodzi albo arkusz, albo pytanie o porzucenie innego
  const mount = () => {
    const byId = byIdMap();
    let draft = draftOf(id);
    if (!draft) startDraft(id, DATA.subject.id);
    draft = store.get().draft;
    draft.answers = cleanAnswers(sheet, byId, draft.answers); // po zmianie danych (usunięte pytanie) stare odpowiedzi nie psują arkusza
    draft.task = Math.max(0, Math.min(sheet.tasks.length - 1, draft.task || 0));
    const root = h('div');
    holder.replaceChildren(h('a', { class: 'back', href: `#/sheet/${id}` }, '← Opis arkusza'), root);
    runSheet(root, { sheet, format, byId, groupOf: groupById, backHref: '#/sheets' });
  };
  const other = store.get().draft && !draftOf(id) ? store.get().draft : null;
  if (!other) {
    mount();
    return holder;
  }
  // rozpoczęty jest inny arkusz: nie nadpisujemy go po cichu
  const otherSheet = other.subject === DATA.subject.id ? sheetById(other.sheet) : null;
  holder.replaceChildren(
    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Masz rozpoczęty inny arkusz'),
      h('p', null, otherSheet ? `„${otherSheet.title}” nie został jeszcze zatwierdzony. Czas liczy się od jego startu.` : 'Rozpoczęty arkusz jest z innego przedmiotu albo nie istnieje już w danych.'),
      h(
        'div',
        { class: 'btn-row' },
        otherSheet ? h('a', { class: 'btn big', href: `#/sheet/${otherSheet.id}/run` }, 'Wróć do niego') : null,
        h('button', { class: 'btn secondary', type: 'button', onClick: () => { store.update((s) => (s.draft = null)); mount(); } }, 'Porzuć go i zacznij ten')
      )
    )
  );
  return holder;
}

export const routes = [
  [/^#\/sheets$/, sheetsList],
  [/^#\/sheet\/([\w-]+)$/, sheetIntro],
  [/^#\/sheet\/([\w-]+)\/run$/, sheetRun],
];

// Arkusz konkursowy „jak na papierze”: zadania jedno po drugim, wszystkie pytania zadania na jednej stronie, odpowiedzi można poprawiać,
// czas liczony od startu arkusza. Stan (odpowiedzi, początek, koniec) leży w store (`draft`), więc przeżywa przeładowanie strony.
// Fazy: rozwiązywanie → przegląd (klucz, samoocena) → zatwierdzenie (zapis do powtórek i historii).

import { h } from './dom.js';
import * as store from './store.js';
import { richText } from './formula.js';
import { QTYPES, correctHtml, letterOf } from './qtypes.js';
import { record } from './leitner.js';
import { gradeSheet, remainingMs, deadlineOf, clock, itemPoints, ROMAN } from './sheets.js';

/** Zakłada rozpoczęty arkusz w store. */
export function startDraft(sheetId, subjectId, now = Date.now()) {
  store.update((s) => (s.draft = { subject: subjectId, sheet: sheetId, startedAt: now, finishedAt: null, task: 0, answers: {}, overrides: {} }));
}

const MILESTONES = [[600000, 'Zostało 10 minut.'], [60000, 'Została 1 minuta.']];
const answered = (draft, id) => draft.answers[id] !== undefined && draft.answers[id] !== '';

/**
 * ctx: { sheet, format, byId (Map id → pytanie), groupOf(id), backHref, now?, tickMs?, saveMs? }
 * Zwraca { tick(), finish(), destroy() } – dla testów i ekranu.
 */
export function runSheet(root, ctx) {
  const { sheet, format, byId, groupOf } = ctx;
  const now = ctx.now || Date.now;
  const draft = store.get().draft;
  let timer = null;
  let saveTimer = null;
  let confirming = false;
  const announced = new Set();
  let timerEl = null;
  let statusEl = null;
  let progressEl = null;
  let navEl = null;

  const total = sheet.tasks.reduce((n, t) => n + t.items.length, 0);
  const answeredCount = () => sheet.tasks.reduce((n, t) => n + t.items.filter((id) => answered(draft, id)).length, 0);

  // ---------- zapis robocza ----------
  const flush = () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    store.save();
  };
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, ctx.saveMs ?? 300);
  };
  function setAnswer(id, raw) {
    if (raw === undefined || raw === '' || (typeof raw === 'string' && !raw.trim())) delete draft.answers[id];
    else draft.answers[id] = raw;
    saveSoon();
    refreshProgress();
  }

  // ---------- czas ----------
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  function tick(first = false) {
    if (draft.finishedAt) return;
    if (!first && !root.isConnected) return stop(); // użytkownik opuścił ekran – nie kończymy arkusza w tle (stan czeka w store)
    const left = remainingMs(draft, format, now());
    if (timerEl) timerEl.textContent = clock(left);
    for (const [at, msg] of MILESTONES) if (left <= at && left > 0 && !announced.has(at)) {
      announced.add(at);
      if (statusEl) statusEl.textContent = msg;
    }
    if (left <= 0) finish(true);
  }
  function finish(timeout = false) {
    if (draft.finishedAt) return;
    stop();
    flush();
    draft.finishedAt = timeout ? deadlineOf(draft, format) : Math.min(now(), deadlineOf(draft, format));
    flush();
    renderReview(timeout);
  }

  // ---------- pomocnicze widoki ----------
  const taskMax = (t) => t.items.reduce((n, id) => n + itemPoints(byId.get(id)), 0);
  const taskTitle = (t, ti) => `Zadanie ${ROMAN[ti] || ti + 1}`;
  const itemNo = (q, i) => (q.gap != null ? q.gap : i + 1);

  function groupBlock(t, ti, withText = true) {
    const g = t.group ? groupOf(t.group) : null;
    const max = taskMax(t);
    return h(
      'section',
      { class: 'group', 'aria-label': `${taskTitle(t, ti)} – polecenie i tekst` },
      h('h2', { class: 'task-title' }, `${taskTitle(t, ti)} `, h('span', { class: 'muted' }, `(0–${max} pkt)`)),
      h('p', { class: 'muted group-instr', html: richText(g ? g.instruction : t.instruction) }),
      withText && g && g.text ? h('div', { class: 'group-text', html: richText(g.text) }) : null,
      g && g.bank ? h('ol', { class: 'bank', type: 'A' }, g.bank.map((b) => h('li', { html: richText(b) }))) : null
    );
  }

  function control(q, label) {
    if (q.type === 'write') {
      const input = h('input', { type: 'text', class: 'text-input', 'aria-label': label, autocapitalize: 'none', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'next', value: draft.answers[q.id] || '' });
      input.addEventListener('input', () => setAnswer(q.id, input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const all = [...root.querySelectorAll('.sheet-items .text-input')];
        const next = all[all.indexOf(input) + 1];
        if (next) next.focus();
        else input.blur();
      });
      return input;
    }
    const choices = q.type === 'bank' ? groupOf(q.group).bank.map((_, i) => ({ i, text: null })) : q.options.map((text, i) => ({ i, text }));
    const group = h('div', { class: q.type === 'bank' || q.options.length === 2 ? 'picks' : 'options', role: 'group', 'aria-label': label });
    const paint = () => [...group.children].forEach((b, j) => {
      b.classList.toggle('picked', draft.answers[q.id] === j);
      b.setAttribute('aria-pressed', String(draft.answers[q.id] === j));
    });
    choices.forEach(({ i, text }) =>
      group.append(
        h(
          'button',
          {
            type: 'button',
            class: text == null ? 'pick' : q.options.length === 2 ? 'pick wide' : 'option',
            'aria-pressed': 'false',
            'aria-label': text == null ? `${label}: ${letterOf(i)}` : null,
            onClick: () => {
              setAnswer(q.id, draft.answers[q.id] === i ? undefined : i); // drugie kliknięcie cofa wybór
              paint();
            },
          },
          text == null ? letterOf(i) : q.options.length === 2 ? text : [h('span', { class: 'letter', 'aria-hidden': 'true' }, letterOf(i)), h('span', { class: 'text', html: richText(text) })]
        )
      )
    );
    paint();
    return group;
  }

  // ---------- rozwiązywanie ----------
  function refreshProgress() {
    if (progressEl) progressEl.textContent = `Odpowiedzi: ${answeredCount()} z ${total}`;
    if (navEl) [...navEl.children].forEach((b, i) => b.classList.toggle('done', sheet.tasks[i].items.every((id) => answered(draft, id))));
  }

  function goTask(i) {
    flush();
    draft.task = Math.max(0, Math.min(sheet.tasks.length - 1, i));
    confirming = false;
    store.save();
    renderSolve();
    root.querySelector('.sheet-head').scrollIntoView({ block: 'start' });
  }

  function renderSolve() {
    const ti = draft.task;
    const t = sheet.tasks[ti];
    const g = t.group ? groupOf(t.group) : null;
    timerEl = h('span', { class: 'timer', role: 'timer' }, clock(remainingMs(draft, format, now())));
    statusEl = h('div', { class: 'visually-hidden', role: 'status' });
    progressEl = h('span', { class: 'muted' });
    navEl = h(
      'nav',
      { class: 'sheet-nav', 'aria-label': 'Zadania arkusza' },
      sheet.tasks.map((x, i) => h('button', { type: 'button', class: 'chip-btn', 'aria-current': i === ti ? 'step' : null, 'aria-label': taskTitle(x, i), onClick: () => goTask(i) }, ROMAN[i] || String(i + 1)))
    );
    const items = h(
      'ol',
      { class: 'sheet-items' },
      t.items.map((id, i) => {
        const q = byId.get(id);
        const label = `${taskTitle(t, ti)}, pytanie ${itemNo(q, i)}`;
        return h('li', { class: 'sheet-item', value: itemNo(q, i) }, h('div', { class: 'question' }, h('span', { class: 'no' }, `${itemNo(q, i)}.`), h('span', { html: richText(q.q) })), control(q, label));
      })
    );
    const footer = confirming
      ? h(
          'div',
          { class: 'card confirm', role: 'alertdialog', 'aria-label': 'Zakończyć arkusz?' },
          h('p', null, answeredCount() < total ? `Masz jeszcze ${total - answeredCount()} pytań bez odpowiedzi. Po zakończeniu nie da się już zmieniać odpowiedzi.` : 'Po zakończeniu nie da się już zmieniać odpowiedzi.'),
          h('div', { class: 'btn-row' }, h('button', { class: 'btn big', type: 'button', onClick: () => finish() }, 'Zakończ i sprawdź'), h('button', { class: 'btn secondary', type: 'button', onClick: () => { confirming = false; renderSolve(); } }, 'Wróć do arkusza'))
        )
      : h(
          'div',
          { class: 'btn-row sheet-foot' },
          ti > 0 ? h('button', { class: 'btn secondary', type: 'button', onClick: () => goTask(ti - 1) }, '← Poprzednie zadanie') : null,
          ti < sheet.tasks.length - 1 ? h('button', { class: 'btn big', type: 'button', onClick: () => goTask(ti + 1) }, 'Następne zadanie →') : null,
          h('button', { class: 'btn quiet', type: 'button', onClick: () => { confirming = true; renderSolve(); } }, 'Zakończ arkusz')
        );
    root.replaceChildren(
      h(
        'div',
        { class: 'card sheet' },
        h('div', { class: 'sheet-head' }, h('div', null, h('strong', null, sheet.title), ' ', h('span', { class: 'muted' }, `· ${format.title}`)), h('div', { class: 'sheet-meta' }, timerEl, progressEl)),
        statusEl,
        navEl,
        h('div', { class: 'qa-layout' }, groupBlock(t, ti), h('div', { class: 'qa-main' }, items)),
        footer
      )
    );
    refreshProgress();
  }

  // ---------- przegląd i zatwierdzenie ----------
  const grade = () => gradeSheet(sheet, byId, draft.answers, draft.overrides);

  function renderReview(timeout = false) {
    stop();
    const scoreEl = h('div', { class: 'score', 'aria-live': 'polite' });
    const detailEl = h('p', null);
    const paintScore = () => {
      const r = grade();
      scoreEl.textContent = `${r.points} / ${r.max}`;
      detailEl.textContent = `${r.pct}% punktów. Czas: ${Math.max(1, Math.round((draft.finishedAt - draft.startedAt) / 60000))} min z ${format.minutes}.`;
      return r;
    };
    const result = paintScore();
    const taskScores = [];
    const blocks = result.tasks.map((rt, ti) => {
      const t = sheet.tasks[ti];
      const scoreText = h('span', { class: 'muted' }, `${rt.points} / ${rt.max}`);
      taskScores.push(scoreText);
      return h(
        'section',
        { class: 'review-task' },
        h('h3', null, `${taskTitle(t, ti)} `, scoreText),
        h('ol', { class: 'review-items' }, rt.items.map((it, i) => reviewRow(it, itemNo(it.q, i), () => { const r = paintScore(); r.tasks.forEach((x, k) => (taskScores[k].textContent = `${x.points} / ${x.max}`)); })))
      );
    });
    root.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'eyebrow' }, `${sheet.title} · przegląd`),
        timeout ? h('p', { class: 'muted' }, 'Czas minął – arkusz został zakończony automatycznie.') : null,
        scoreEl,
        detailEl,
        h('p', { class: 'muted' }, 'Sprawdź odpowiedzi poniżej. Jeśli Twoja wpisana odpowiedź jest poprawna, choć nie ma jej w kluczu, uznaj ją. Wynik trafi do powtórek dopiero po zatwierdzeniu.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn big', type: 'button', onClick: (e) => commit(e.currentTarget) }, 'Zatwierdź wynik')),
        ...blocks
      )
    );
    window.scrollTo(0, 0);
  }

  function reviewRow(it, no, onChange) {
    const def = QTYPES[it.q.type];
    const row = h('li', { class: 'review-item', value: no });
    const paint = () => {
      const given = def.sheet.show(it.q, it.raw);
      const ok = it.ok;
      const canOverride = def.selfGrade && !it.auto && given !== '';
      row.replaceChildren(
        h('div', { class: 'question' }, h('span', { class: 'no' }, `${no}.`), h('span', { html: richText(it.q.q) })),
        h('div', { class: ok ? 'verdict-ok' : 'verdict-bad' }, ok ? (it.overridden ? '✓ uznane przez Ciebie' : '✓ dobrze') : '✗ źle'),
        h('div', { class: 'muted' }, 'Twoja odpowiedź: ', given ? h('span', { html: given }) : 'brak'),
        !it.auto ? h('div', { class: 'ans' }, h('span', null, 'Klucz: '), h('strong', { html: correctHtml(it.q) })) : null,
        !it.auto ? h('div', { class: 'muted small', html: richText(it.q.explain) }) : null,
        canOverride
          ? h('button', { class: 'btn quiet', type: 'button', 'aria-pressed': String(it.overridden), onClick: () => {
              if (it.overridden) delete draft.overrides[it.q.id];
              else draft.overrides[it.q.id] = true;
              it.overridden = !it.overridden;
              it.ok = it.auto || it.overridden;
              flush();
              paint();
              onChange();
            } }, it.overridden ? 'Cofnij uznanie' : 'Moja odpowiedź też jest poprawna')
          : null
      );
    };
    paint();
    return row;
  }

  function commit(btn) {
    btn.disabled = true;
    const r = grade();
    for (const t of r.tasks) for (const it of t.items) record(it.q.id, it.ok);
    store.addExamResult({ t: now(), subject: draft.subject, scope: `sheet:${sheet.id}`, sheet: sheet.id, pct: r.pct, score: r.points, total: r.max, points: r.points, max: r.max, seconds: Math.round((draft.finishedAt - draft.startedAt) / 1000) });
    store.update((s) => (s.draft = null));
    root.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Wynik zapisany'),
        h('div', { class: 'score' }, `${r.points} / ${r.max}`),
        h('p', null, `${r.pct}% punktów. Błędne pytania wrócą w powtórkach.`),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: ctx.backHref || '#/sheets' }, 'Wróć do arkuszy'))
      )
    );
    window.scrollTo(0, 0);
  }

  // ---------- start ----------
  draft.answers = draft.answers || {};
  draft.overrides = draft.overrides || {};
  if (draft.finishedAt) renderReview();
  else if (remainingMs(draft, format, now()) <= 0) finish(true); // czas minął, gdy aplikacji nie było na ekranie
  else {
    renderSolve();
    tick(true);
    timer = setInterval(() => tick(), ctx.tickMs ?? 1000);
    if (timer.unref) timer.unref(); // Node (testy): zegar nie blokuje zakończenia procesu
  }
  return { tick, finish, destroy: stop };
}

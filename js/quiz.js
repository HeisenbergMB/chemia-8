// Quiz jednokrotnego wyboru z natychmiastową informacją zwrotną

import { h, shuffle } from './dom.js';
import { richText } from './formula.js';
import { record } from './leitner.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Uruchamia quiz w kontenerze `root`.
 * opts: { title, backHref, onRetryMissed(questions) }
 */
export function runQuiz(root, questions, opts = {}) {
  const queue = questions.map(prepare);
  const firstSeen = new Set();
  const requeued = new Set(); // każde błędne pytanie wraca w sesji tylko raz
  const missed = [];
  let score = 0;
  let idx = 0;

  function prepare(q) {
    return { q, order: shuffle(q.options.map((_, i) => i)) };
  }

  function show() {
    if (idx >= queue.length) return summary();
    const { q, order } = queue[idx];
    const pct = Math.round((idx / queue.length) * 100);
    const feedback = h('div', { 'aria-live': 'polite' });
    const optionsEl = h('div', { class: 'options', role: 'group', 'aria-label': 'Odpowiedzi' });
    const buttons = order.map((origIdx, pos) =>
      h(
        'button',
        { class: 'option', type: 'button', onClick: () => choose(origIdx, buttons, feedback) },
        h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[pos]),
        h('span', { class: 'text', html: richText(q.options[origIdx]) })
      )
    );
    buttons.forEach((b) => optionsEl.append(b));

    root.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'quiz-head' },
          h('span', { class: 'quiz-count' }, `Pytanie ${idx + 1} z ${queue.length}`),
          h('span', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: `width:${pct}%` }))
        ),
        h('p', { class: 'question', html: richText(q.q) }),
        optionsEl,
        feedback
      )
    );
    window.scrollTo(0, 0);
  }

  function choose(pickedOrig, buttons, feedback) {
    const { q, order } = queue[idx];
    const ok = pickedOrig === q.answer;
    const isRetry = firstSeen.has(q.id);
    record(q.id, ok);
    if (!firstSeen.has(q.id)) {
      firstSeen.add(q.id);
      if (ok) score++;
      else missed.push(q);
    }
    if (!ok && !requeued.has(q.id)) {
      requeued.add(q.id);
      queue.push(prepare(q));
    }

    buttons.forEach((b, pos) => {
      b.disabled = true;
      const orig = order[pos];
      if (orig === q.answer) {
        b.classList.add('ok');
        b.append(h('span', { class: 'verdict' }, '✓ poprawna'));
      } else if (orig === pickedOrig) {
        b.classList.add('bad');
        b.append(h('span', { class: 'verdict' }, '✗ twoja'));
      }
    });

    const next = h('button', { class: 'btn big', type: 'button', onClick: () => { idx++; show(); } }, idx + 1 >= queue.length ? 'Zobacz wynik' : 'Dalej →');
    feedback.replaceChildren(
      h(
        'div',
        { class: `feedback ${ok ? 'ok' : 'bad'}` },
        h('h3', null, ok ? '✓ Dobrze!' : '✗ Nie tym razem'),
        h('p', { html: richText(q.explain) }),
        !ok && !isRetry ? h('p', { class: 'muted' }, 'To pytanie wróci jeszcze raz na końcu.') : null
      ),
      next
    );
    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function summary() {
    const total = firstSeen.size;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const msg = pct === 100 ? 'Rewelacja! Bez żadnego błędu.' : pct >= 70 ? 'Bardzo dobrze, tak trzymaj.' : 'Dobry początek. Błędne pytania wrócą w powtórkach.';
    root.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('h2', null, opts.title || 'Wynik'),
        h('div', { class: 'score' }, `${pct}%`),
        h('p', null, `${score} z ${total} poprawnych za pierwszym razem. ${msg}`),
        missed.length
          ? h(
              'div',
              null,
              h('h3', null, 'Do powtórki'),
              h(
                'ul',
                { class: 'missed' },
                missed.map((q) =>
                  h('li', null, h('div', { html: richText(q.q) }), h('div', { class: 'ans' }, h('span', null, 'Poprawnie: '), h('span', { html: richText(q.options[q.answer]) })))
                )
              )
            )
          : null,
        h(
          'div',
          { class: 'btn-row' },
          missed.length && opts.onRetryMissed ? h('button', { class: 'btn', type: 'button', onClick: () => opts.onRetryMissed(missed) }, 'Powtórz błędne') : null,
          h('a', { class: 'btn secondary', href: opts.backHref || '#/' }, 'Wróć')
        )
      )
    );
    window.scrollTo(0, 0);
  }

  show();
}

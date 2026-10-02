// Quiz: jednokrotny wybór, wpisywanie wzoru/równania z klawiatury chemicznej i układanie z klocków.
// Typy pytań: choice | formula | equation | blocks

import { h, shuffle } from './dom.js';
import { richText, formatFormula } from './formula.js';
import { record } from './leitner.js';
import { createChemKeyboard } from './chemkeyboard.js';
import { createBlocks } from './blocks.js';
import { equationsMatch, formulasMatch, userBalanceReport } from './chem.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
export const TYPED_TYPES = ['formula', 'equation', 'blocks'];

/** Poprawna odpowiedź jako HTML (do podsumowań). */
export function correctHtml(q) {
  if (q.type === 'choice') return richText(q.options[q.answer]);
  if (q.type === 'blocks') return formatFormula(q.tokens.join(' '));
  return formatFormula(q.answer);
}

/**
 * Uruchamia quiz w kontenerze `root`.
 * opts: { title, backHref, onRetryMissed(questions), noHints }
 */
export function runQuiz(root, questions, opts = {}) {
  const queue = questions.map(prepare);
  const firstSeen = new Set();
  const requeued = new Set(); // każde błędne pytanie wraca w sesji tylko raz
  const missed = [];
  let score = 0;
  let idx = 0;

  function prepare(q) {
    return { q, order: q.type === 'choice' ? shuffle(q.options.map((_, i) => i)) : null };
  }

  function show() {
    if (idx >= queue.length) return summary();
    const cur = queue[idx];
    const q = cur.q;
    const pct = Math.round((idx / queue.length) * 100);
    const feedback = h('div', { 'aria-live': 'polite' });
    const parts = { body: null, after: null };
    if (q.type === 'choice') parts.body = choiceBody(cur, feedback);
    else typedBody(cur, feedback, parts);

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
        parts.body,
        feedback,
        parts.after
      )
    );
    window.scrollTo(0, 0);
  }

  // ---------- jednokrotny wybór ----------
  function choiceBody(cur, feedback) {
    const { q, order } = cur;
    const optionsEl = h('div', { class: 'options', role: 'group', 'aria-label': 'Odpowiedzi' });
    const buttons = order.map((origIdx, pos) =>
      h(
        'button',
        { class: 'option', type: 'button', onClick: () => choose(origIdx) },
        h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[pos]),
        h('span', { class: 'text', html: richText(q.options[origIdx]) })
      )
    );
    buttons.forEach((b) => optionsEl.append(b));

    function choose(picked) {
      const ok = picked === q.answer;
      buttons.forEach((b, pos) => {
        b.disabled = true;
        const orig = order[pos];
        if (orig === q.answer) {
          b.classList.add('ok');
          b.append(h('span', { class: 'verdict' }, '✓ poprawna'));
        } else if (orig === picked) {
          b.classList.add('bad');
          b.append(h('span', { class: 'verdict' }, '✗ twoja'));
        }
      });
      resolve(cur, ok, feedback, null);
    }
    return optionsEl;
  }

  // ---------- wpisywanie (klawiatura chemiczna) i klocki ----------
  function typedBody(cur, feedback, parts) {
    const q = cur.q;
    let check;
    let ctl; // { value(), ready(), lock(), reveal?(ok) }
    let kb = null;

    const submit = () => {
      if (!ctl.ready()) return;
      const val = ctl.value();
      let ok;
      if (q.type === 'formula') ok = formulasMatch(val, q.answer, q.accept || []);
      else if (q.type === 'equation') ok = equationsMatch(val, q.answer);
      else ok = equationsMatch(val, q.tokens.join(' '));
      check.disabled = true;
      check.hidden = true;
      ctl.lock(ok);
      if (kb) kb.hideKeys();
      resolve(cur, ok, feedback, compare(q, val, ok));
    };
    check = h('button', { class: q.type === 'blocks' ? 'btn big' : 'btn kb-submit', type: 'button', disabled: true, onClick: submit }, 'Sprawdź');

    if (q.type === 'blocks') {
      const bl = createBlocks({ tokens: q.tokens, extra: q.extra || [], onChange: () => (check.disabled = !bl.full()) });
      ctl = { value: bl.value, ready: bl.full, lock: (ok) => bl.reveal(ok) };
      parts.body = h('div', null, bl.el, h('div', { class: 'btn-row' }, check));
    } else {
      kb = createChemKeyboard({ onChange: (v) => (check.disabled = !v.trim()), onEnter: submit, submitButton: check });
      ctl = { value: kb.getValue, ready: () => !!kb.getValue().trim(), lock: () => kb.lock() };
      parts.body = h('div', null, kb.inputEl);
      parts.after = kb.keysEl;
    }

    if (q.hint && !opts.noHints) {
      const tip = h('div', { class: 'tip', hidden: true }, h('strong', null, 'Podpowiedź: '), h('span', { html: richText(q.hint) }));
      const btn = h('button', { class: 'btn quiet', type: 'button', onClick: () => { tip.hidden = !tip.hidden; } }, 'Podpowiedź');
      parts.body.append(h('div', { class: 'btn-row' }, btn), tip);
    }
  }

  function compare(q, val, ok) {
    const box = h('div', { class: 'compare' });
    box.append(h('p', null, h('span', { class: 'muted' }, 'Twoja odpowiedź: '), h('span', { class: 'chem', html: formatFormula(val) })));
    if (!ok) {
      box.append(h('p', null, h('span', { class: 'muted' }, 'Poprawnie: '), h('strong', { class: 'chem', html: correctHtml(q) })));
      if (q.type !== 'formula') {
        const r = userBalanceReport(val);
        if (!r.parsed) box.append(h('p', { class: 'muted' }, 'Nie udało się odczytać Twojego zapisu jako równania (sprawdź strzałkę i plusy).'));
        else if (!r.ok) box.append(h('p', { class: 'muted' }, 'W Twoim zapisie nie zgadza się bilans: ' + r.diffs.join('; ') + '.'));
        else box.append(h('p', { class: 'muted' }, 'Twój zapis się bilansuje, ale to nie ta odpowiedź, o którą pytamy.'));
      }
    }
    return box;
  }

  // ---------- wspólne rozliczenie odpowiedzi ----------
  function resolve(cur, ok, feedback, detail) {
    const q = cur.q;
    const isRetry = firstSeen.has(q.id);
    record(q.id, ok);
    if (!isRetry) {
      firstSeen.add(q.id);
      if (ok) score++;
      else missed.push(q);
    }
    if (!ok && !requeued.has(q.id)) {
      requeued.add(q.id);
      queue.push(prepare(q));
    }
    const next = h('button', { class: 'btn big', type: 'button', onClick: () => { idx++; show(); } }, idx + 1 >= queue.length ? 'Zobacz wynik' : 'Dalej →');
    feedback.replaceChildren(
      h(
        'div',
        { class: `feedback ${ok ? 'ok' : 'bad'}` },
        h('h3', null, ok ? '✓ Dobrze!' : '✗ Nie tym razem'),
        detail,
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
                  h('li', null, h('div', { html: richText(q.q) }), h('div', { class: 'ans' }, h('span', null, 'Poprawnie: '), h('span', { class: 'chem', html: correctHtml(q) })))
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

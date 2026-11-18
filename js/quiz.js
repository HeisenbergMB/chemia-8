// Quiz: jednokrotny wybór, wpisywanie wzoru/równania z klawiatury chemicznej i układanie z klocków.
// Typy pytań i ich zachowanie: js/qtypes.js (rejestr).
// Tryb opts.exam: bez podpowiedzi i bez informacji o poprawności w trakcie, wynik dopiero na końcu.

import { h, shuffle } from './dom.js';
import { richText, formatFormula } from './formula.js';
import { record } from './leitner.js';
import { userBalanceReport } from './chem.js';
import { QTYPES, correctHtml, valueHtml } from './qtypes.js';
import { groupById } from './data.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Uruchamia quiz w kontenerze `root`.
 * opts: { title, backHref, onRetryMissed(questions), noHints, exam, topicTitle(id), onFinish(result), onRestart() }
 */
export function runQuiz(root, questions, opts = {}) {
  const queue = questions.map(prepare);
  const firstSeen = new Set();
  const requeued = new Set(); // każde błędne pytanie wraca w sesji tylko raz
  const exam = !!opts.exam;
  const answers = []; // tryb sprawdzian: { q, ok, given }
  const missed = [];
  let score = 0;
  let idx = 0;

  function prepare(q) {
    const idx = q.type === 'choice' ? q.options.map((_, i) => i) : null;
    return { q, order: idx && !q.fixed ? shuffle(idx) : idx }; // fixed: stała kolejność (TRUE/FALSE)
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
          h('span', { class: 'quiz-count' }, `${exam ? 'Sprawdzian: pytanie' : 'Pytanie'} ${idx + 1} z ${queue.length}`),
          h('span', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: `width:${pct}%` }))
        ),
        ...questionBlock(q, parts, feedback)
      )
    );
    if (q.group) root.querySelector('.qa-main').scrollIntoView({ block: 'start' }); // długi tekst nad pytaniem – nie wracamy na górę strony
    else window.scrollTo(0, 0);
  }

  /** Treść pytania z odpowiedzią. Pytanie z grupy (zadanie z tekstem/bankiem) dostaje obok instrukcję i tekst. */
  function questionBlock(q, parts, feedback) {
    const main = [h('p', { class: 'question', html: richText(q.q) }), parts.body, feedback, parts.after];
    const g = q.group ? groupById(q.group) : null;
    if (!g) return main;
    let text = g.text ? richText(g.text) : '';
    if (text && q.gap != null) text = text.replace(new RegExp(`\\(${q.gap}\\)_*`), (m) => `<mark>${m}</mark>`); // zaznacz bieżącą lukę
    return [
      h(
        'div',
        { class: 'qa-layout' },
        h('section', { class: 'group', 'aria-label': 'Polecenie i tekst' }, h('p', { class: 'muted group-instr', html: richText(g.instruction) }), g.text ? h('div', { class: 'group-text', html: text }) : null),
        h('div', { class: 'qa-main' }, ...main)
      ),
    ];
  }

  // ---------- jednokrotny wybór ----------
  function choiceBody(cur, feedback) {
    const { q, order } = cur;
    const optionsEl = h('div', { class: 'options', role: 'group', 'aria-label': 'Odpowiedzi' });
    let pickedExam = null;
    const confirm = exam
      ? h('button', { class: 'btn big', type: 'button', disabled: true, onClick: () => examResolve(cur, pickedExam === q.answer, richText(q.options[pickedExam])) }, idx + 1 >= queue.length ? 'Zakończ sprawdzian' : 'Dalej →')
      : null;
    const buttons = order.map((origIdx, pos) =>
      h(
        'button',
        { class: 'option', type: 'button', onClick: () => (exam ? select(origIdx, pos) : choose(origIdx)) },
        h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[pos]),
        h('span', { class: 'text', html: richText(q.options[origIdx]) })
      )
    );
    buttons.forEach((b) => optionsEl.append(b));

    // tryb sprawdzian: kliknięcie tylko zaznacza odpowiedź; zatwierdza ją przycisk
    function select(origIdx, pos) {
      pickedExam = origIdx;
      buttons.forEach((b, i) => {
        b.classList.toggle('picked', i === pos);
        b.setAttribute('aria-pressed', String(i === pos));
      });
      confirm.disabled = false;
    }

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
    return exam ? h('div', null, optionsEl, h('div', { class: 'btn-row' }, confirm)) : optionsEl;
  }

  // ---------- odpowiedzi budowane/wpisywane (typy z rejestru qtypes.js) ----------
  function typedBody(cur, feedback, parts) {
    const q = cur.q;
    const def = QTYPES[q.type];
    let check;
    let ctl;

    const submit = () => {
      if (!ctl.ready()) return;
      const val = ctl.value();
      const ok = ctl.isCorrect();
      if (exam) return examResolve(cur, ok, def.showsValue ? valueHtml(q, val) : '');
      check.disabled = true;
      check.hidden = true;
      ctl.lock(ok);
      if (ctl.done) ctl.done();
      if (!ok && def.selfGrade) return selfGrade(cur, val, feedback);
      resolve(cur, ok, feedback, compare(q, val, ok));
    };
    check = h('button', { class: def.bigSubmit ? 'btn big' : 'btn kb-submit', type: 'button', disabled: true, onClick: submit }, exam ? (idx + 1 >= queue.length ? 'Zakończ sprawdzian' : 'Zapisz i dalej →') : 'Sprawdź');

    ctl = def.mount(q, { check, submit, exam, hints: !exam && !opts.noHints });
    parts.body = ctl.body;
    parts.after = ctl.after || null;

    if (q.hint && !opts.noHints && !exam) {
      const tip = h('div', { class: 'tip', hidden: true }, h('strong', null, 'Podpowiedź: '), h('span', { html: richText(q.hint) }));
      const btn = h('button', { class: 'btn quiet', type: 'button', onClick: () => { tip.hidden = !tip.hidden; } }, 'Podpowiedź');
      parts.body.append(h('div', { class: 'btn-row' }, btn), tip);
    }
  }

  /** Typy z `selfGrade`: klucz mógł nie przewidzieć poprawnego wariantu – uczeń sam decyduje, zanim wynik trafi do powtórek. */
  function selfGrade(cur, val, feedback) {
    const q = cur.q;
    feedback.replaceChildren(
      h(
        'div',
        { class: 'feedback bad' },
        h('h3', null, 'Porównaj z kluczem'),
        compare(q, val, false),
        h('p', { class: 'muted' }, 'Klucz nie zawsze zawiera każdy poprawny wariant. Jeśli Twoja odpowiedź też spełnia polecenie, zalicz ją.'),
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onClick: () => resolve(cur, true, feedback, compare(q, val, true)) }, 'Moja odpowiedź też jest poprawna'),
          h('button', { class: 'btn secondary', type: 'button', onClick: () => resolve(cur, false, feedback, compare(q, val, false)) }, 'Nie, to błąd')
        )
      )
    );
  }

  function compare(q, val, ok) {
    const box = h('div', { class: 'compare' });
    if (!QTYPES[q.type].showsValue) {
      if (!ok) box.append(h('p', null, h('span', { class: 'muted' }, 'Poprawne dopasowanie:')), h('p', { html: correctHtml(q) }));
      return box;
    }
    const cls = QTYPES[q.type].plain ? '' : 'chem';
    box.append(h('p', null, h('span', { class: 'muted' }, 'Twoja odpowiedź: '), h('span', { class: cls, html: valueHtml(q, val) })));
    if (!ok) {
      box.append(h('p', null, h('span', { class: 'muted' }, 'Poprawnie: '), h('strong', { class: cls, html: correctHtml(q) })));
      if (QTYPES[q.type].balanceReport) {
        const r = userBalanceReport(val);
        if (!r.parsed) box.append(h('p', { class: 'muted' }, 'Nie udało się odczytać Twojego zapisu jako równania (sprawdź strzałkę i plusy).'));
        else if (!r.ok) box.append(h('p', { class: 'muted' }, 'W Twoim zapisie nie zgadza się bilans: ' + r.diffs.join('; ') + '.'));
        else box.append(h('p', { class: 'muted' }, q.type === 'balance' ? 'Atomy się zgadzają, ale współczynniki powinny być najmniejszymi liczbami całkowitymi.' : 'Twój zapis się bilansuje, ale to nie ta odpowiedź, o którą pytamy.'));
      }
    }
    return box;
  }

  // ---------- tryb sprawdzian ----------
  function examResolve(cur, ok, given) {
    const q = cur.q;
    record(q.id, ok);
    answers.push({ q, ok, given });
    idx++;
    show();
  }

  function examSummary() {
    const total = answers.length;
    const score = answers.filter((a) => a.ok).length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const per = {};
    for (const a of answers) {
      const t = (per[a.q.topic] = per[a.q.topic] || { ok: 0, total: 0 });
      t.total++;
      if (a.ok) t.ok++;
    }
    const wrong = answers.filter((a) => !a.ok);
    if (opts.onFinish) opts.onFinish({ pct, score, total, perTopic: per });
    const msg = pct >= 90 ? 'Świetnie! Jesteś bardzo dobrze przygotowana.' : pct >= 70 ? 'Dobry wynik. Jeszcze chwila powtórki błędów i będzie świetnie.' : pct >= 50 ? 'Jest baza do dalszej nauki. Przejrzyj błędy poniżej i zrób powtórkę.' : 'Spokojnie, to dopiero próba. Błędy poniżej pokażą, co powtórzyć w pierwszej kolejności.';
    root.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Wynik sprawdzianu'),
        h('div', { class: 'score' }, `${pct}%`),
        h('p', null, `${score} z ${total} poprawnych. ${msg}`),
        h('h3', null, 'Wyniki według działów'),
        h(
          'ul',
          { class: 'per-topic' },
          Object.entries(per).map(([id, t]) =>
            h('li', null, h('span', null, opts.topicTitle ? opts.topicTitle(id) : id), h('span', { class: 'muted' }, `${t.ok} z ${t.total}`), h('span', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round((t.ok / t.total) * 100) }, h('i', { style: `width:${Math.round((t.ok / t.total) * 100)}%` })))
          )
        ),
        wrong.length
          ? h(
              'div',
              null,
              h('h3', null, `Do powtórki (${wrong.length})`),
              h(
                'ul',
                { class: 'missed' },
                wrong.map((a) =>
                  h(
                    'li',
                    null,
                    h('div', { html: richText(a.q.q) }),
                    a.given ? h('div', { class: 'muted' }, 'Twoja odpowiedź: ', h('span', { class: QTYPES[a.q.type].plain ? '' : 'chem', html: a.given })) : null,
                    h('div', { class: 'ans' }, h('span', null, 'Poprawnie: '), h('span', { class: QTYPES[a.q.type].plain ? '' : 'chem', html: correctHtml(a.q) })),
                    h('div', { class: 'muted small', html: richText(a.q.explain) })
                  )
                )
              )
            )
          : h('p', null, 'Bez żadnego błędu!'),
        h(
          'div',
          { class: 'btn-row' },
          wrong.length && opts.onRetryMissed ? h('button', { class: 'btn', type: 'button', onClick: () => opts.onRetryMissed(wrong.map((a) => a.q)) }, 'Powtórz błędne') : null,
          opts.onRestart ? h('button', { class: 'btn secondary', type: 'button', onClick: opts.onRestart }, 'Nowy sprawdzian') : null,
          h('a', { class: 'btn quiet', href: opts.backHref || '#/' }, 'Wróć')
        )
      )
    );
    window.scrollTo(0, 0);
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
    if (exam) return examSummary();
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
                  h('li', null, h('div', { html: richText(q.q) }), h('div', { class: 'ans' }, h('span', null, 'Poprawnie: '), h('span', { class: QTYPES[q.type].plain ? '' : 'chem', html: correctHtml(q) })))
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

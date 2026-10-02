// Dopasowywanie: wiersze po lewej (np. odczynniki) i klocki-odpowiedzi (np. obserwacje).
// Przeciągnij odpowiedź na wiersz albo stuknij odpowiedź i stuknij wiersz (lub odwrotnie).

import { h, shuffle } from './dom.js';
import { richText } from './formula.js';
import { bindDrag } from './dnd.js';

/** opts: { pairs: [[lewa, prawa], ...], extra: [prawa-pułapki], onChange() } */
export function createMatch({ pairs, extra = [], onChange = () => {} }) {
  const items = shuffle([...pairs.map((p) => p[1]), ...extra]).map((t, i) => ({ id: i, t }));
  const slots = pairs.map(() => null);
  let selected = null; // wybrany klocek
  let activeSlot = null; // wybrany wiersz (gdy stuknięto go jako pierwszy)
  let locked = false;
  let verdict = null;

  const root = h('div', { class: 'match' });

  function place(it, i) {
    if (locked) return;
    const prev = slots.indexOf(it);
    if (prev >= 0) slots[prev] = null;
    slots[i] = it;
    selected = null;
    activeSlot = null;
    render();
    onChange();
  }

  function onSlot(i) {
    if (locked) return;
    if (selected) place(selected, i);
    else if (slots[i]) {
      slots[i] = null;
      activeSlot = null;
      render();
      onChange();
    } else {
      activeSlot = activeSlot === i ? null : i;
      render();
    }
  }

  function render() {
    const rows = pairs.map(([left], i) => {
      const it = slots[i];
      const ok = verdict === true || (verdict === false && it && it.t === pairs[i][1]);
      const bad = verdict === false && !ok;
      return h(
        'div',
        { class: 'match-row' },
        h('div', { class: 'match-left', html: richText(left) }),
        h('button', {
          type: 'button',
          class: `slot match-slot${it ? ' filled' : ''}${(selected || activeSlot === i) && !it ? ' ready' : ''}${ok ? ' ok' : ''}${bad ? ' bad' : ''}`,
          'data-i': i,
          'aria-label': it ? `Wiersz ${i + 1}: ${it.t}. Stuknij, aby zwrócić.` : `Wiersz ${i + 1}: puste miejsce`,
          disabled: locked,
          html: it ? richText(it.t) : '<span class="slot-n">stuknij lub upuść tutaj</span>',
          onClick: () => onSlot(i),
        })
      );
    });
    const bank = items
      .filter((it) => !slots.includes(it))
      .map((it) => {
        const b = h('button', {
          type: 'button',
          class: `token text${selected === it ? ' selected' : ''}`,
          'aria-pressed': String(selected === it),
          disabled: locked,
          html: richText(it.t),
        });
        bindDrag(b, {
          isLocked: () => locked,
          onTap: () => {
            if (activeSlot !== null) place(it, activeSlot);
            else { selected = selected === it ? null : it; render(); }
          },
          onDrop: (el) => place(it, Number(el.dataset.i)),
        });
        return b;
      });
    root.replaceChildren(
      h('div', { class: 'match-rows' }, rows),
      h('div', { class: 'blocks-label' }, selected ? 'Teraz stuknij wiersz' : activeSlot !== null ? 'Teraz stuknij odpowiedź' : 'Odpowiedzi (przeciągnij albo stuknij)'),
      h('div', { class: 'bank' }, bank.length ? bank : h('span', { class: 'muted' }, 'Wszystkie odpowiedzi użyte'))
    );
  }

  render();

  return {
    el: root,
    full: () => slots.every(Boolean),
    correct: () => slots.every((s, i) => s && s.t === pairs[i][1]),
    lock: () => { locked = true; render(); },
    reveal: (ok) => { locked = true; verdict = ok; render(); },
  };
}

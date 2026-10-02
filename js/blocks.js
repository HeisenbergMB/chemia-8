// Układanie zapisu z klocków. Dwa sposoby: (1) przeciągnij klocek na miejsce,
// (2) stuknij klocek, a potem stuknij miejsce docelowe. Stuknięcie wypełnionego miejsca zwraca klocek.

import { h, shuffle } from './dom.js';
import { formatFormula } from './formula.js';
import { bindDrag } from './dnd.js';

/** opts: { tokens (poprawna kolejność), extra (klocki-pułapki), onChange() } */
export function createBlocks({ tokens, extra = [], onChange = () => {} }) {
  const items = shuffle([...tokens, ...extra]).map((t, i) => ({ id: i, t }));
  const slots = tokens.map(() => null);
  let selected = null;
  let locked = false;
  let verdict = null; // null | true | false

  const root = h('div', { class: 'blocks' });

  function place(it, i) {
    if (locked) return;
    const prev = slots.indexOf(it);
    if (prev >= 0) slots[prev] = null;
    slots[i] = it;
    selected = null;
    render();
    onChange();
  }

  function onSlot(i) {
    if (locked) return;
    if (selected) place(selected, i);
    else if (slots[i]) {
      slots[i] = null;
      render();
      onChange();
    }
  }

  function render() {
    const slotEls = slots.map((it, i) => {
      const ok = verdict === true || (verdict === false && it && it.t === tokens[i]);
      const bad = verdict === false && !ok;
      return h('button', {
        type: 'button',
        class: `slot${it ? ' filled' : ''}${selected && !it ? ' ready' : ''}${ok ? ' ok' : ''}${bad ? ' bad' : ''}`,
        'data-i': i,
        'aria-label': it ? `Miejsce ${i + 1}: ${it.t}. Stuknij, aby zwrócić klocek.` : `Miejsce ${i + 1}: puste`,
        disabled: locked,
        html: it ? formatFormula(it.t) : `<span class="slot-n">${i + 1}</span>`,
        onClick: () => onSlot(i),
      });
    });
    const bank = items
      .filter((it) => !slots.includes(it))
      .map((it) => {
        const b = h('button', {
          type: 'button',
          class: `token${selected === it ? ' selected' : ''}`,
          'aria-pressed': String(selected === it),
          'aria-label': `Klocek ${it.t}`,
          disabled: locked,
          html: formatFormula(it.t),
        });
        bindDrag(b, {
          isLocked: () => locked,
          onTap: () => { selected = selected === it ? null : it; render(); },
          onDrop: (el) => place(it, Number(el.dataset.i)),
        });
        return b;
      });
    root.replaceChildren(
      h('div', { class: 'blocks-label' }, 'Twój zapis'),
      h('div', { class: 'slots' }, slotEls),
      h('div', { class: 'blocks-label' }, selected ? 'Teraz stuknij miejsce docelowe' : 'Klocki (przeciągnij albo stuknij, a potem stuknij miejsce)'),
      h('div', { class: 'bank' }, bank.length ? bank : h('span', { class: 'muted' }, 'Wszystkie klocki użyte'))
    );
  }

  render();

  return {
    el: root,
    value: () => slots.map((s) => (s ? s.t : '')).join(' '),
    full: () => slots.every(Boolean),
    lock: () => { locked = true; render(); },
    reveal: (ok) => { locked = true; verdict = ok; render(); },
  };
}

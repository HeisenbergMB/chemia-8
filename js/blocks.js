// Układanie zapisu z klocków. Dwa sposoby: (1) przeciągnij klocek na miejsce (Pointer Events),
// (2) stuknij klocek, a potem stuknij miejsce docelowe. Stuknięcie wypełnionego miejsca zwraca klocek.

import { h, shuffle } from './dom.js';
import { formatFormula } from './formula.js';

/** opts: { tokens (poprawna kolejność), extra (klocki-pułapki), onChange() } */
export function createBlocks({ tokens, extra = [], onChange = () => {} }) {
  const items = shuffle([...tokens, ...extra]).map((t, i) => ({ id: i, t }));
  const slots = tokens.map(() => null);
  let selected = null;
  let locked = false;
  let verdict = null; // null | true | false
  let suppressClick = false;

  const root = h('div', { class: 'blocks' });

  const slotAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const s = el && el.closest && el.closest('.slot');
    return s ? Number(s.dataset.i) : -1;
  };
  const highlight = (i) => root.querySelectorAll('.slot').forEach((s) => s.classList.toggle('hover', Number(s.dataset.i) === i));

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

  function bindToken(btn, it) {
    let pid = null, sx = 0, sy = 0, dragging = false, ghost = null;
    btn.addEventListener('pointerdown', (e) => {
      if (locked) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY; dragging = false;
      btn.setPointerCapture(pid);
    });
    btn.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
        dragging = true;
        ghost = btn.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.removeAttribute('aria-pressed');
        document.body.append(ghost);
        btn.classList.add('dragging');
      }
      if (dragging) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
        highlight(slotAt(e));
      }
    });
    const end = (e) => {
      if (pid !== e.pointerId) return;
      pid = null;
      const was = dragging;
      dragging = false;
      if (ghost) { ghost.remove(); ghost = null; }
      btn.classList.remove('dragging');
      highlight(-1);
      if (was) {
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 0);
        if (e.type === 'pointerup') {
          const i = slotAt(e);
          if (i >= 0) place(it, i);
        }
      }
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('click', () => {
      if (suppressClick || locked) return;
      selected = selected === it ? null : it;
      render();
    });
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
        bindToken(b, it);
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

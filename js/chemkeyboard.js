// Własna klawiatura chemiczna na ekranie. Systemowa klawiatura się nie wysuwa (inputmode="none").
// Pole przechowuje tekst z prawdziwymi indeksami dolnymi (₂) i górnymi (²⁺), więc wygląda poprawnie
// bez podglądu; chem.js (canon) potrafi to porównać z wzorcem.

import { h } from './dom.js';

const ELEMENTS = [
  ['H', 'O', 'C', 'N', 'S', 'P', 'Cl', 'Br', 'F', 'I'],
  ['Li', 'Na', 'K', 'Rb', 'Be', 'Mg', 'Ca', 'Sr', 'Ba'],
  ['Al', 'Fe', 'Cu', 'Zn', 'Cr', 'Ag'],
];
const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SUBS = ['₂', '₃', '₄', '₅', '₆', '₇'];
const SUB_NAME = { '₂': 'dwa', '₃': 'trzy', '₄': 'cztery', '₅': 'pięć', '₆': 'sześć', '₇': 'siedem' };
const CHARGES = [
  ['⁺', 'ładunek plus'],
  ['²⁺', 'ładunek dwa plus'],
  ['³⁺', 'ładunek trzy plus'],
  ['⁻', 'ładunek minus'],
  ['²⁻', 'ładunek dwa minus'],
];

// kolejność ma znaczenie: dłuższe wzorce najpierw (kasowanie „całego znaku” naraz)
const TOKEN_END = /( -H₂O→ | → | \+ |[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])$/;

/**
 * Tworzy pole + klawiaturę.
 * Zwraca: { inputEl, keysEl, getValue, setValue, lock, hideKeys, focus }
 * opts: { onChange(value), onEnter() }
 */
export function createChemKeyboard(opts = {}) {
  const input = h('input', {
    type: 'text',
    class: 'chem-input',
    inputmode: 'none',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'aria-label': 'Twoja odpowiedź',
    placeholder: 'Stuknij znaki poniżej…',
  });

  const fire = () => opts.onChange && opts.onChange(input.value);

  const insert = (text) => {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    input.setRangeText(text, s, e, 'end');
    input.focus({ preventScroll: true });
    fire();
  };

  const backspace = () => {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    if (s !== e) input.setRangeText('', s, e, 'end');
    else if (s > 0) {
      const m = input.value.slice(0, s).match(TOKEN_END);
      const n = m ? m[0].length : 1;
      input.setRangeText('', s - n, s, 'end');
    }
    input.focus({ preventScroll: true });
    fire();
  };

  const clear = () => {
    input.value = '';
    input.focus({ preventScroll: true });
    fire();
  };

  input.addEventListener('input', fire);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      opts.onEnter && opts.onEnter();
    }
  });

  // klawisz: nie zabiera fokusu z pola (mousedown/pointerdown), akcja na click
  const key = (label, action, { aria, cls = '' } = {}) =>
    h('button', {
      type: 'button',
      class: `key ${cls}`.trim(),
      'aria-label': aria || label,
      onMousedown: (e) => e.preventDefault(),
      onPointerdown: (e) => e.pointerType === 'mouse' && e.preventDefault(),
      onClick: () => action(),
    }, label);

  const ins = (text, label = text, o = {}) => key(label, () => insert(text), o);

  // --- lewa strona: pierwiastki albo litery ---
  let shift = true;
  const elementsPanel = h('div', { class: 'kb-panel' }, ELEMENTS.map((row) => h('div', { class: 'kb-row' }, row.map((el) => ins(el, el, { cls: 'el', aria: `pierwiastek ${el}` })))));
  const lettersPanel = h('div', { class: 'kb-panel', hidden: true });
  const paintLetters = () => {
    lettersPanel.replaceChildren(
      ...LETTER_ROWS.map((row) =>
        h('div', { class: 'kb-row' }, [...row].map((c) => {
          const ch = shift ? c : c.toLowerCase();
          // po wielkiej literze tryb sam wraca do małych (symbole: Ca, Na, Cl…)
          return key(ch, () => { insert(ch); if (shift) { shift = false; paintLetters(); } }, { cls: 'el', aria: `litera ${ch}` });
        }))
      ),
      h('div', { class: 'kb-row' }, key(shift ? 'abc' : 'ABC', () => { shift = !shift; paintLetters(); }, { cls: 'act', aria: shift ? 'przełącz na małe litery' : 'przełącz na wielkie litery' }))
    );
  };
  paintLetters();

  const tabEl = h('button', { type: 'button', class: 'kb-tab', 'aria-pressed': 'true', onMousedown: (e) => e.preventDefault() }, 'Pierwiastki');
  const tabLet = h('button', { type: 'button', class: 'kb-tab', 'aria-pressed': 'false', onMousedown: (e) => e.preventDefault() }, 'Litery');
  const showPanel = (letters) => {
    elementsPanel.hidden = letters;
    lettersPanel.hidden = !letters;
    tabEl.setAttribute('aria-pressed', String(!letters));
    tabLet.setAttribute('aria-pressed', String(letters));
  };
  tabEl.addEventListener('click', () => showPanel(false));
  tabLet.addEventListener('click', () => showPanel(true));

  const left = h('div', { class: 'kb-col' }, h('div', { class: 'kb-tabs', role: 'group', 'aria-label': 'Rodzaj znaków' }, tabEl, tabLet), elementsPanel, lettersPanel);

  // --- prawa strona: cyfry, indeksy, ładunki, znaki ---
  const right = h(
    'div',
    { class: 'kb-col' },
    h('div', { class: 'kb-label' }, 'Współczynniki'),
    h('div', { class: 'kb-row' }, DIGITS.map((d) => ins(d, d, { aria: `cyfra ${d}` }))),
    h('div', { class: 'kb-label' }, 'Indeks dolny'),
    h('div', { class: 'kb-row' }, SUBS.map((d) => ins(d, d, { cls: 'sub', aria: `indeks dolny ${SUB_NAME[d]}` }))),
    h('div', { class: 'kb-label' }, 'Ładunek'),
    h('div', { class: 'kb-row' }, CHARGES.map(([t, a]) => ins(t, t, { cls: 'sub', aria: a }))),
    h('div', { class: 'kb-label' }, 'Znaki'),
    h(
      'div',
      { class: 'kb-row' },
      ins('(', '(', { aria: 'nawias otwierający' }),
      ins(')', ')', { aria: 'nawias zamykający' }),
      ins(' + ', '+', { aria: 'plus' }),
      ins(' → ', '→', { cls: 'arrow', aria: 'strzałka reakcji' }),
      ins(' -H₂O→ ', 'H₂O→', { cls: 'arrow wide', aria: 'strzałka reakcji z wodą nad strzałką' }),
      ins('↓', '↓', { cls: 'arrow', aria: 'strzałka osadu, w dół' }),
      ins('↑', '↑', { cls: 'arrow', aria: 'strzałka gazu, w górę' })
    )
  );

  // --- dół: spacja, kasowanie, czyszczenie ---
  const actions = h(
    'div',
    { class: 'kb-row kb-actions' },
    key('Wyczyść', clear, { cls: 'act', aria: 'wyczyść całe pole' }),
    key('⌫', backspace, { cls: 'act', aria: 'usuń znak' }),
    ins(' ', 'spacja', { cls: 'space', aria: 'spacja' }),
    opts.submitButton || null
  );

  const keysEl = h('div', { class: 'kbd', role: 'group', 'aria-label': 'Klawiatura chemiczna' }, h('div', { class: 'kb-grid' }, left, right), actions);

  return {
    inputEl: input,
    keysEl,
    getValue: () => input.value,
    setValue: (v) => { input.value = v; fire(); },
    lock: () => { input.readOnly = true; keysEl.querySelectorAll('button').forEach((b) => { if (b !== opts.submitButton) b.disabled = true; }); },
    hideKeys: () => { keysEl.hidden = true; },
    focus: () => input.focus({ preventScroll: true }),
  };
}

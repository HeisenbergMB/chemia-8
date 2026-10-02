// Interaktywna tabela wskaźników i tryb „zgadnij odczyn po kolorze”.
// Barwy zawsze mają też podpis słowny (nie opieramy sensu wyłącznie na kolorze).

import { h, shuffle } from './dom.js';

let uid = 0;

function tubeHtml(color, label) {
  const id = `ind-clip-${++uid}`;
  const fill = color.clear ? '#e9eef3' : color.hex;
  const op = color.clear ? 0.14 : 0.92;
  return `<svg viewBox="0 0 120 190" class="ind-tube" role="img" aria-label="${label}">
    <defs><clipPath id="${id}"><path d="M30 14 H90 V140 A30 30 0 0 1 30 140 Z"/></clipPath></defs>
    <rect x="30" y="70" width="60" height="130" clip-path="url(#${id})" fill="${fill}" fill-opacity="${op}"/>
    <path d="M30 14 V140 A30 30 0 0 0 90 140 V14" fill="none" stroke="#dbe6f1" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 14 H98" fill="none" stroke="#dbe6f1" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

const swatch = (color) => h('span', { class: `swatch${color.clear ? ' clear' : ''}`, style: color.clear ? null : `background:${color.hex}`, 'aria-hidden': 'true' });

// ---------------------------------------------------------------- tabela / eksplorator
export function renderIndicators(data) {
  const { environments: envs, indicators } = data;
  let iIdx = 0;
  let eIdx = 0;
  const root = h('div');

  function render() {
    const ind = indicators[iIdx];
    const env = envs[eIdx];
    const color = ind.colors[env.id];

    const indBtns = h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': 'Wskaźnik' },
      indicators.map((x, i) => h('button', { type: 'button', 'aria-pressed': String(i === iIdx), onClick: () => { iIdx = i; render(); } }, x.name))
    );
    const envBtns = h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': 'Odczyn roztworu' },
      envs.map((x, i) => h('button', { type: 'button', 'aria-pressed': String(i === eIdx), onClick: () => { eIdx = i; render(); } }, `Odczyn ${x.label}`))
    );

    const table = h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'ind-table' },
        h('caption', { class: 'visually-hidden' }, 'Barwy wskaźników w różnych odczynach'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Wskaźnik'), envs.map((e) => h('th', { scope: 'col' }, h('div', null, e.label), h('div', { class: 'muted small' }, e.ph))))),
        h(
          'tbody',
          null,
          indicators.map((x, i) =>
            h(
              'tr',
              { class: i === iIdx ? 'sel' : '' },
              h('th', { scope: 'row' }, h('button', { type: 'button', class: 'linklike', onClick: () => { iIdx = i; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, x.name)),
              envs.map((e, j) => h('td', { class: i === iIdx && j === eIdx ? 'sel' : '' }, h('span', { class: 'cell' }, swatch(x.colors[e.id]), h('span', null, x.colors[e.id].name))))
            )
          )
        )
      )
    );

    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/wskazniki' }, '← Wskaźniki i odczyn'),
      h('h1', null, 'Tabela wskaźników'),
      h(
        'section',
        { class: 'card' },
        h('h2', null, 'Wybierz wskaźnik i odczyn'),
        indBtns,
        envBtns,
        h(
          'div',
          { class: 'ind-stage' },
          h('div', { html: tubeHtml(color, `Probówka: ${ind.name}, odczyn ${env.label}, barwa ${color.name}`) }),
          h(
            'div',
            { class: 'ind-text', 'aria-live': 'polite' },
            h('div', { class: 'eyebrow' }, ind.name),
            h('div', { class: 'ind-color' }, swatch(color), h('span', null, color.name)),
            h('p', { class: 'muted' }, `Odczyn ${env.label} (${env.ph}), ${env.example}.`)
          )
        ),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/indicators/guess' }, 'Zgadnij odczyn po kolorze'))
      ),
      h('section', { class: 'card' }, h('h2', null, 'Wszystkie barwy'), table)
    );
  }
  render();
  return root;
}

// ---------------------------------------------------------------- zgadnij odczyn po kolorze
export function renderGuess(data, rounds = 10) {
  const { environments: envs, indicators } = data;
  const root = h('div');
  let n = 0;
  let score = 0;
  const wrongList = [];

  function nextRound() {
    if (n >= rounds) return finish();
    const ind = indicators[Math.floor(Math.random() * indicators.length)];
    const env = envs[Math.floor(Math.random() * envs.length)];
    const color = ind.colors[env.id];
    // poprawne są wszystkie odczyny dające tę samą barwę (np. fenoloftaleina bezbarwna w kwasie i w wodzie)
    const okSet = envs.filter((e) => ind.colors[e.id].name === color.name).map((e) => e.id);
    const feedback = h('div', { 'aria-live': 'polite' });
    const btns = envs.map((e) =>
      h('button', { type: 'button', class: 'option', onClick: () => pick(e.id) }, h('span', { class: 'text' }, `Odczyn ${e.label}`), h('span', { class: 'muted small', style: 'margin-left:auto' }, e.ph))
    );

    function pick(id) {
      const ok = okSet.includes(id);
      n++;
      if (ok) score++;
      else wrongList.push(`${ind.name}, roztwór ${color.name} → odczyn ${okSet.map((x) => envs.find((e) => e.id === x).label).join(' lub ')}`);
      btns.forEach((b, i) => {
        b.disabled = true;
        const isOk = okSet.includes(envs[i].id);
        if (isOk) { b.classList.add('ok'); b.append(h('span', { class: 'verdict' }, '✓ poprawna')); }
        else if (envs[i].id === id) { b.classList.add('bad'); b.append(h('span', { class: 'verdict' }, '✗ twoja')); }
      });
      const names = okSet.map((x) => envs.find((e) => e.id === x).loc);
      const ambiguous = okSet.length > 1;
      feedback.replaceChildren(
        h(
          'div',
          { class: `feedback ${ok ? 'ok' : 'bad'}` },
          h('h3', null, ok ? '✓ Dobrze!' : '✗ Nie tym razem'),
          h('p', null, `${ind.name}: roztwór jest ${color.name} ${ambiguous ? 'zarówno w odczynie ' + names.join(', jak i w odczynie ') + ', więc ten wskaźnik ich nie odróżnia' : 'w odczynie ' + names[0]}.`),
          ambiguous && ok ? h('p', { class: 'muted' }, 'Obie odpowiedzi byłyby poprawne.') : null
        ),
        h('button', { class: 'btn big', type: 'button', onClick: nextRound }, n >= rounds ? 'Zobacz wynik' : 'Dalej →')
      );
    }

    const pct = Math.round((n / rounds) * 100);
    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/wskazniki' }, '← Wskaźniki i odczyn'),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'quiz-head' }, h('span', { class: 'quiz-count' }, `Runda ${n + 1} z ${rounds}`), h('span', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: `width:${pct}%` }))),
        h('p', { class: 'question' }, `Do roztworu dodano wskaźnik: ${ind.name.toLowerCase()}. Jaki jest odczyn roztworu?`),
        h('div', { class: 'ind-stage' }, h('div', { html: tubeHtml(color, `Probówka z roztworem, barwa ${color.name}`) }), h('div', { class: 'ind-text' }, h('div', { class: 'eyebrow' }, 'Barwa roztworu'), h('div', { class: 'ind-color' }, swatch(color), h('span', null, color.name)))),
        h('div', { class: 'options' }, btns),
        feedback
      )
    );
    window.scrollTo(0, 0);
  }

  function finish() {
    const pct = Math.round((score / rounds) * 100);
    root.replaceChildren(
      h('a', { class: 'back', href: '#/topic/wskazniki' }, '← Wskaźniki i odczyn'),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Wynik: zgadnij odczyn'),
        h('div', { class: 'score' }, `${pct}%`),
        h('p', null, `${score} z ${rounds} poprawnych.`),
        wrongList.length ? h('div', null, h('h3', null, 'Do powtórki'), h('ul', { class: 'missed' }, wrongList.map((t) => h('li', null, t)))) : null,
        h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onClick: () => { n = 0; score = 0; wrongList.length = 0; nextRound(); } }, 'Jeszcze raz'), h('a', { class: 'btn secondary', href: '#/indicators' }, 'Tabela wskaźników'))
      )
    );
  }

  nextRound();
  return root;
}

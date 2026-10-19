// Aplikacja: start, router (hash), menu boczne i ustawienia globalne. Ekrany są w js/screens/ i w modułach funkcji (lab, indicators…);
// każdy eksportuje `routes`. Zależności idą w jedną stronę: app.js → ekrany → data/ui (żaden ekran nie importuje app.js).

import { h } from './dom.js';
import * as store from './store.js';
import { icons } from './icons.js';
import { renderSettings } from './settings.js';
import { APP_VERSION } from './version.js';
import { DATA, loadAll, topicNum } from './data.js';
import { updateCountdown } from './countdown.js';
import { resolve } from './router.js';
import { routes as homeRoutes } from './screens/home.js';
import { routes as topicRoutes } from './screens/topic.js';
import { routes as reviewRoutes } from './screens/review.js';
import { routes as examRoutes } from './screens/exam.js';
import { routes as labRoutes } from './lab.js';
import { routes as indicatorRoutes } from './indicators.js';
import { routes as solubilityRoutes } from './solubility.js';
import { routes as valenceRoutes } from './valence.js';

const main = document.getElementById('main');
const side = document.getElementById('side');

function settingsScreen() {
  return renderSettings({ version: APP_VERSION, onChange: applySettings });
}

/** Wszystkie trasy aplikacji. Nowy ekran = nowy plik z `routes` + jedna linia tutaj. */
export const routes = [
  ...homeRoutes,
  ...topicRoutes,
  ...reviewRoutes,
  ...examRoutes,
  ...labRoutes,
  ...indicatorRoutes,
  ...solubilityRoutes,
  ...valenceRoutes,
  [/^#\/settings$/, settingsScreen],
];

// ---------- start ----------
async function init() {
  document.getElementById('brand-mark').innerHTML = icons.flask;
  document.getElementById('gear').innerHTML = icons.gear;
  applySettings();
  try {
    await loadAll();
  } catch (e) {
    main.replaceChildren(h('div', { class: 'card' }, h('h2', null, 'Nie udało się wczytać danych'), h('p', null, 'Sprawdź połączenie i odśwież stronę. Szczegóły: ' + e.message)));
    return;
  }
  store.requestPersist();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- ustawienia globalne ----------
function applySettings() {
  const scale = { s: 1, m: 1.12, l: 1.28 }[store.get().settings.fontScale] || 1.12;
  document.documentElement.style.setProperty('--fs', String(scale));
  updateCountdown();
}

// ---------- router ----------
function route() {
  const hash = location.hash || '#/';
  const found = resolve(routes, hash);
  if (!found) {
    location.hash = '#/';
    return;
  }
  main.replaceChildren(found.node);
  window.scrollTo(0, 0);
  renderSide(hash);
  main.focus({ preventScroll: true });
}

// ---------- menu boczne ----------
function renderSide(hash) {
  const current = (t) => new RegExp(`^#/(topic|theory|flash|quiz)/${t.id}(/|$)`).test(hash);
  const multi = DATA.modules.length > 1;
  side.replaceChildren(
    ...DATA.modules.flatMap((m) => [
      h('h2', { style: multi ? 'margin-top:1rem' : null }, multi ? h('a', { href: `#/module/${m.id}`, style: 'color:inherit' }, m.title) : 'Działy'),
      ...m.topics.map((raw) => {
        const t = DATA.topics.find((x) => x.id === raw.id);
        return h(
          'a',
          {
            href: t.status === 'active' ? `#/topic/${t.id}` : '#/',
            class: `c${(DATA.topics.indexOf(t) % 5) + 1}${t.status === 'active' ? '' : ' soon'}`,
            'aria-current': current(t) ? 'page' : null,
            'aria-disabled': t.status === 'active' ? null : 'true',
          },
          h('span', { class: 'num', 'aria-hidden': 'true' }, topicNum(t)),
          h('span', null, t.title),
          t.status === 'active' ? null : h('span', { class: 'visually-hidden' }, ' (wkrótce)')
        );
      }),
    ]),
    h('h2', { style: 'margin-top:1rem' }, 'Inne'),
    h('a', { href: '#/exam', 'aria-current': hash.startsWith('#/exam') ? 'page' : null }, h('span', { class: 'num', html: icons.check }), h('span', null, 'Sprawdzian próbny')),
    h('a', { href: '#/settings', 'aria-current': hash === '#/settings' ? 'page' : null }, h('span', { class: 'num', html: icons.gear }), h('span', null, 'Ustawienia'))
  );
}

init();

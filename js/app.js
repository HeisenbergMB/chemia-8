// Aplikacja: ładowanie danych, router (hash), ekrany: główny, dział, teoria, fiszki, quiz, powtórka, ustawienia

import { h, shuffle } from './dom.js';
import { richText } from './formula.js';
import * as store from './store.js';
import { buildReview, buildExtra, topicStats } from './leitner.js';
import { runQuiz, TYPED_TYPES } from './quiz.js';
import { renderSettings } from './settings.js';
import { icons, withIcon } from './icons.js';
import { renderLab } from './lab.js';
import { renderIndicators, renderGuess } from './indicators.js';
import { buildExam, EXAM_SIZE } from './exam.js';
import { renderSolubility, renderReact } from './solubility.js';
import { renderValence } from './valence.js';
import { APP_VERSION } from './version.js';
import { CURRICULUM_PATH, topicPackPath, packTopics, assemble, questionsInScope } from './curriculum.js';


const DATA = { modules: [], topics: [], cards: [], flash: [], questions: [], experiments: [], indicators: null, solubility: null };
const main = document.getElementById('main');
const side = document.getElementById('side');

// ---------- start ----------
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function init() {
  document.getElementById('brand-mark').innerHTML = icons.flask;
  document.getElementById('gear').innerHTML = icons.gear;
  applySettings();
  try {
    const curriculum = await loadJson(CURRICULUM_PATH);
    // Wszystkie paczki działów ładujemy naraz (są małe i i tak leżą w cache offline).
    // Gdyby danych przybyło, wystarczy zamienić to na ładowanie per moduł – reszta aplikacji czyta z DATA.
    const [packList, experiments, indicators, solubility] = await Promise.all([
      Promise.all(packTopics(curriculum).map(async (t) => {
        const [theory, questions] = await Promise.all([loadJson(topicPackPath(t.id, 'theory')), loadJson(topicPackPath(t.id, 'questions'))]);
        return [t.id, { theory, questions }];
      })),
      loadJson('data/experiments.json'),
      loadJson('data/indicators.json'),
      loadJson('data/solubility.json'),
    ]);
    Object.assign(DATA, assemble(curriculum, Object.fromEntries(packList)));
    DATA.indicators = indicators;
    DATA.solubility = solubility;
    DATA.experiments = experiments.experiments;
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

function countInfo() {
  const iso = store.get().settings.examDate;
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const exam = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((exam - today) / 86400000);
  if (days < 0) return null;
  return {
    days,
    weekday: exam.toLocaleDateString('pl-PL', { weekday: 'long' }),
    full: exam.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

const plDays = (n) => (n === 1 ? 'dzień' : 'dni');

function updateCountdown() {
  const el = document.getElementById('countdown');
  const c = countInfo();
  el.textContent = !c ? '' : c.days === 0 ? 'Sprawdzian dzisiaj' : c.days === 1 ? `Sprawdzian jutro · ${c.weekday}` : `Sprawdzian za ${c.days} ${plDays(c.days)} · ${c.weekday}`;
}

// ---------- router ----------
const routes = [
  [/^#\/?$/, home],
  [/^#\/module\/([\w-]+)$/, moduleScreen],
  [/^#\/module\/([\w-]+)\/exam$/, examIntro],
  [/^#\/module\/([\w-]+)\/exam\/run$/, examRun],
  [/^#\/topic\/([\w-]+)$/, topicScreen],
  [/^#\/theory\/([\w-]+)$/, theoryScreen],
  [/^#\/flash\/([\w-]+)$/, flashScreen],
  [/^#\/quiz\/([\w-]+)(?:\/(all|zapis))?$/, quizScreen],
  [/^#\/review(?:\/(extra))?$/, reviewScreen],
  [/^#\/lab\/([\w-]+)$/, labScreen],
  [/^#\/indicators$/, () => renderIndicators(DATA.indicators)],
  [/^#\/indicators\/guess$/, () => renderGuess(DATA.indicators)],
  [/^#\/solubility$/, () => renderSolubility(DATA.solubility)],
  [/^#\/solubility\/react(?:\/(\w+)\/(\w+))?$/, (cat, an) => renderReact(DATA.solubility, cat ? { cat, an } : null)],
  [/^#\/valence$/, () => renderValence(DATA.solubility)],
  [/^#\/exam$/, examIntro],
  [/^#\/exam\/run$/, examRun],
  [/^#\/settings$/, settingsScreen],
];

function route() {
  const hash = location.hash || '#/';
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      const node = fn(...m.slice(1));
      main.replaceChildren(node);
      window.scrollTo(0, 0);
      renderSide(hash);
      main.focus({ preventScroll: true });
      return;
    }
  }
  location.hash = '#/';
}

const topicNum = (t) => String(DATA.topics.indexOf(t) + 1).padStart(2, '0');

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

// ---------- pomocnicze ----------
const topicById = (id) => DATA.topics.find((t) => t.id === id);
const questionsOf = (topicId) => DATA.questions.filter((q) => q.topic === topicId);
const moduleById = (id) => DATA.modules.find((m) => m.id === id);

function progressBar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h(
    'div',
    null,
    h('span', { class: 'progress', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: `width:${pct}%` })),
    h('div', { class: 'progress-label' }, `${done} z ${total} opanowanych (${pct}%)`)
  );
}

function notFound(msg) {
  return h('div', { class: 'card' }, h('p', null, msg), h('a', { class: 'btn', href: '#/' }, 'Wróć na start'));
}

// ---------- ekran główny ----------
function home() {
  const review = buildReview(DATA.questions);
  const overall = topicStats(DATA.questions);
  const c = countInfo();
  const dueText = review.queue.length
    ? `Na dziś: ${[review.dueTotal ? `${review.dueTotal} do powtórki` : '', review.fresh.length ? `${review.fresh.length} nowych` : ''].filter(Boolean).join(' i ')}.`
    : 'Na teraz wszystko powtórzone. Możesz poćwiczyć dodatkowo.';

  return h(
    'div',
    null,
    h(
      'section',
      { class: 'card hero' },
      c
        ? [
            h('div', { class: 'eyebrow' }, 'Do sprawdzianu'),
            h('div', { class: 'hero-days' }, c.days === 0 ? 'Dzisiaj' : [String(c.days), h('small', null, plDays(c.days))]),
            h('div', { class: 'when' }, c.full),
          ]
        : [h('h1', null, 'Powtórka')],
      h('p', { class: 'due' }, dueText),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: review.queue.length ? '#/review' : '#/review/extra', html: withIcon('play', review.queue.length ? 'Powtórka na dziś' : 'Ćwicz dodatkowo') }), h('a', { class: 'btn big secondary', href: '#/exam', html: withIcon('check', 'Sprawdzian próbny') })),
      h('div', { style: 'margin-top:1.25rem' }, progressBar(overall.mastered, overall.total, 'Postęp ogólny'))
    ),
    h(
      'section',
      { class: 'only-narrow' },
      DATA.modules.map((m) =>
        h(
          'div',
          null,
          h('div', { class: 'section-title' }, DATA.modules.length > 1 ? h('a', { href: `#/module/${m.id}`, style: 'color:inherit' }, m.title) : 'Działy'),
          topicGrid(DATA.topics.filter((t) => t.module === m.id))
        )
      )
    ),
    h('p', { class: 'muted', style: 'margin-top:1rem;font-size:.9rem' }, 'Pytania, na które odpowiesz źle, wracają po kilku minutach, a dobrze opanowane – coraz rzadziej.')
  );
}

function topicGrid(topics) {
  return h(
    'div',
    { class: 'topic-grid' },
    topics.map((t) => {
      const active = t.status === 'active';
      const st = topicStats(DATA.questions, t.id);
      return h(
        active ? 'a' : 'div',
        { class: `topic c${(DATA.topics.indexOf(t) % 5) + 1}${active ? '' : ' soon'}`, href: active ? `#/topic/${t.id}` : null },
        h('span', { class: 'num', 'aria-hidden': 'true' }, topicNum(t)),
        h('h3', null, t.title),
        h('p', null, t.desc),
        active ? progressBar(st.mastered, st.total, `Postęp: ${t.title}`) : h('span', { class: 'chip' }, 'wkrótce')
      );
    })
  );
}

// ---------- moduł ----------
function moduleScreen(id) {
  const m = moduleById(id);
  if (!m) return notFound('Nie znaleziono modułu.');
  const qs = questionsInScope(DATA, id);
  const st = topicStats(qs);
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Ekran główny'),
    h('h1', null, m.title),
    h('p', { class: 'muted' }, m.desc),
    h('div', { class: 'card' }, progressBar(st.mastered, st.total, `Postęp: ${m.title}`), h('div', { class: 'btn-row', style: 'margin-top:1rem' }, h('a', { class: 'btn', href: `#/module/${id}/exam`, html: withIcon('check', 'Sprawdzian z modułu') }))),
    topicGrid(DATA.topics.filter((t) => t.module === id))
  );
}

// ---------- dział ----------
function topicScreen(id) {
  const t = topicById(id);
  if (!t || t.status !== 'active') return notFound('Ten dział będzie dostępny wkrótce.');
  const qs = questionsOf(id);
  const typedCount = qs.filter((q) => TYPED_TYPES.includes(q.type)).length;
  const st = topicStats(DATA.questions, id);
  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Wszystkie działy'),
    h('h1', null, t.title),
    h('p', { class: 'muted' }, t.desc),
    h('div', { class: 'card' }, progressBar(st.mastered, st.total, 'Postęp w dziale')),
    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Co robimy?'),
      h(
        'div',
        { class: 'btn-row' },
        h('a', { class: 'btn', href: `#/theory/${id}`, html: withIcon('book', 'Teoria') }),
        h('a', { class: 'btn', href: `#/flash/${id}`, html: withIcon('cards', 'Fiszki') }),
        h('a', { class: 'btn', href: `#/quiz/${id}`, html: withIcon('check', 'Quiz (10 pytań)') }),
        ...(t.labs || []).map((lid) => {
          const e = DATA.experiments.find((x) => x.id === lid);
          return e ? h('a', { class: 'btn', href: `#/lab/${lid}`, html: withIcon('flask', `Laboratorium: ${e.title}`) }) : null;
        }),
        ...(t.tools || []).map((tool) => h('a', { class: 'btn', href: tool.href, html: withIcon(tool.icon, tool.label) })),
        typedCount ? h('a', { class: 'btn', href: `#/quiz/${id}/zapis`, html: withIcon('pen', `Układanie zapisu (${typedCount})`) }) : null,
        h('a', { class: 'btn secondary', href: `#/quiz/${id}/all`, html: withIcon('list', `Wszystkie pytania (${qs.length})`) })
      )
    )
  );
}

// ---------- teoria ----------
function theoryScreen(id) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const cards = DATA.cards.filter((c) => c.topic === id);
  return h(
    'div',
    { class: 'theory' },
    h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`),
    h('h1', null, 'Teoria'),
    cards.map((c) =>
      h(
        'article',
        { class: 'card' },
        h('h2', null, c.title),
        h('p', { html: richText(c.body) }),
        c.examples && c.examples.length
          ? h(
              'ul',
              { class: 'eq-list' },
              c.examples.map((ex) => {
                const [eq, note] = ex.split(' – ');
                return h('li', null, h('span', { html: richText(`$${eq}$`) }), note ? h('span', { class: 'muted' }, ` – ${note}`) : null);
              })
            )
          : null,
        c.tip ? h('div', { class: 'tip' }, h('strong', null, 'Zapamiętaj: '), h('span', { html: richText(c.tip) })) : null
      )
    ),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `#/flash/${id}`, html: withIcon('cards', 'Fiszki') }), h('a', { class: 'btn secondary', href: `#/quiz/${id}`, html: withIcon('check', 'Quiz') }))
  );
}

// ---------- fiszki ----------
function flashScreen(id) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const root = h('div');
  let queue = shuffle(DATA.flash.filter((f) => f.topic === id));
  const total = queue.length;
  let known = 0;

  const showCard = (revealed) => {
    if (!queue.length) return done();
    const f = queue[0];
    const card = h(
      'button',
      { class: `flashcard${revealed ? ' answer' : ''}`, type: 'button', 'aria-label': revealed ? 'Odpowiedź' : 'Pokaż odpowiedź', onClick: () => !revealed && showCard(true) },
      h('span', { class: 'side-label' }, revealed ? 'Odpowiedź' : 'Pytanie'),
      h('span', { html: richText(revealed ? f.back : f.front) })
    );
    root.replaceChildren(
      h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`),
      h('h1', null, 'Fiszki'),
      h('p', { class: 'muted' }, `Umiem: ${known} z ${total}`),
      card,
      revealed
        ? h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn', type: 'button', onClick: () => { known++; queue.shift(); store.update((s) => (s.flash[f.id] = true)); showCard(false); } }, 'Umiem'),
            h('button', { class: 'btn secondary', type: 'button', onClick: () => { queue.push(queue.shift()); showCard(false); } }, 'Jeszcze nie')
          )
        : h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onClick: () => showCard(true) }, 'Pokaż odpowiedź'))
    );
  };
  const done = () =>
    root.replaceChildren(
      h('div', { class: 'card' }, h('h2', null, 'Wszystkie fiszki przerobione'), h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `#/quiz/${id}`, html: withIcon('check', 'Teraz quiz') }), h('a', { class: 'btn secondary', href: `#/topic/${id}` }, 'Wróć')))
    );
  showCard(false);
  return root;
}

// ---------- quiz działu ----------
function quizScreen(id, mode) {
  const t = topicById(id);
  if (!t) return notFound('Nie znaleziono działu.');
  const pool = mode === 'zapis' ? questionsOf(id).filter((q) => TYPED_TYPES.includes(q.type)) : questionsOf(id);
  const picked = mode ? shuffle(pool) : buildExtra(pool, 10);
  const root = h('div');
  const start = (qs) => runQuiz(root, qs, { title: `Wynik: ${t.title}`, backHref: `#/topic/${id}`, onRetryMissed: start });
  if (!picked.length) return notFound('W tym dziale nie ma jeszcze pytań.');
  start(picked);
  return h('div', null, h('a', { class: 'back', href: `#/topic/${id}` }, `← ${t.title}`), root);
}

// ---------- powtórka na dziś ----------
function reviewScreen(extra) {
  const qs = extra ? buildExtra(DATA.questions, 10) : buildReview(DATA.questions).queue;
  const root = h('div');
  if (!qs.length) return notFound('Brak pytań do powtórki.');
  const start = (list) => runQuiz(root, list, { title: extra ? 'Ćwiczenie dodatkowe' : 'Powtórka na dziś', backHref: '#/', onRetryMissed: start });
  start(qs);
  return h('div', null, h('a', { class: 'back', href: '#/' }, '← Ekran główny'), root);
}

// ---------- sprawdzian próbny ----------
function examIntro(moduleId) {
  const mod = moduleId ? moduleById(moduleId) : null;
  if (moduleId && !mod) return notFound('Nie znaleziono modułu.');
  const scope = questionsInScope(DATA, moduleId);
  const runHref = moduleId ? `#/module/${moduleId}/exam/run` : '#/exam/run';
  const history = (store.get().exams || []).filter((e) => (e.scope || null) === (moduleId || null)).reverse();
  const best = history.length ? Math.max(...history.map((e) => e.pct)) : null;
  const topics = DATA.topics.filter((t) => scope.some((q) => q.topic === t.id));
  const fmt = (ts) => new Date(ts).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  return h(
    'div',
    null,
    h('a', { class: 'back', href: mod ? `#/module/${moduleId}` : '#/' }, mod ? `← ${mod.title}` : '← Ekran główny'),
    h('h1', null, mod ? `Sprawdzian: ${mod.title}` : 'Sprawdzian próbny'),
    h(
      'section',
      { class: 'card' },
      h('p', null, `${EXAM_SIZE} losowych pytań ${mod ? 'z tego modułu' : 'z całego zakresu'}, w różnych formach: wybór, wzory, równania, klocki i dopasowywanie.`),
      h('ul', { class: 'rules' }, h('li', null, 'Bez podpowiedzi.'), h('li', null, 'Bez informacji o poprawności w trakcie – wynik i błędy zobaczysz na końcu.'), h('li', null, 'Błędne pytania trafią do powtórek (Leitner).')),
      h('p', { class: 'muted' }, `Zakres: ${topics.map((t) => t.title).join(', ')}.`),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn big', href: runHref, html: withIcon('play', 'Zacznij sprawdzian') }))
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Twoje wyniki'),
      history.length
        ? [
            h('p', { class: 'muted' }, `Najlepszy wynik: ${best}%. Liczba prób: ${history.length}.`),
            h('ul', { class: 'history' }, history.slice(0, 8).map((e) => h('li', null, h('span', { class: 'muted' }, fmt(e.t)), h('strong', null, `${e.pct}%`), h('span', { class: 'muted' }, `${e.score} z ${e.total}`))))
          ]
        : h('p', { class: 'muted' }, 'Jeszcze nie rozwiązano żadnego sprawdzianu.')
    )
  );
}

function examRun(moduleId) {
  const mod = moduleId ? moduleById(moduleId) : null;
  if (moduleId && !mod) return notFound('Nie znaleziono modułu.');
  const examHref = moduleId ? `#/module/${moduleId}/exam` : '#/exam';
  const root = h('div');
  const topicTitle = (id) => (topicById(id) ? topicById(id).title : id);
  const start = () => {
    const qs = buildExam(questionsInScope(DATA, moduleId), EXAM_SIZE);
    runQuiz(root, qs, {
      exam: true,
      title: 'Wynik sprawdzianu',
      backHref: examHref,
      topicTitle,
      onRestart: start,
      onRetryMissed: retry,
      onFinish: (r) => store.update((s) => { s.exams = [...(s.exams || []), { t: Date.now(), scope: moduleId || null, ...r }].slice(-30); }),
    });
  };
  const retry = (list) => runQuiz(root, list, { title: 'Powtórka błędów', backHref: examHref, onRetryMissed: retry });
  start();
  return h('div', null, h('a', { class: 'back', href: examHref }, '← Sprawdzian próbny'), root);
}

// ---------- laboratorium ----------
function labScreen(id) {
  const exp = DATA.experiments.find((e) => e.id === id);
  if (!exp) return notFound('Nie znaleziono doświadczenia.');
  const topic = DATA.topics.find((t) => (t.labs || []).includes(id));
  return h(
    'div',
    null,
    h('a', { class: 'back', href: topic ? `#/topic/${topic.id}` : '#/' }, topic ? `← ${topic.title}` : '← Wróć'),
    h('div', { class: 'card' }, renderLab(exp))
  );
}

// ---------- ustawienia ----------
function settingsScreen() {
  return renderSettings({
    version: APP_VERSION,
    onChange: () => {
      applySettings();
    },
  });
}

init();

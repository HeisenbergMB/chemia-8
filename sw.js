// Service worker: pełna praca offline. Przy zmianie plików podnieś VERSION –
// stary cache zostanie usunięty przy aktywacji.
const VERSION = '1.9.0';
const CACHE = `chemia8-${VERSION}`;

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/dom.js',
  'js/chem.js',
  'js/formula.js',
  'js/icons.js',
  'js/store.js',
  'js/leitner.js',
  'js/quiz.js',
  'js/chemkeyboard.js',
  'js/blocks.js',
  'js/dnd.js',
  'js/match.js',
  'js/balance.js',
  'js/lab.js',
  'js/indicators.js',
  'js/solubility.js',
  'js/exam.js',
  'js/settings.js',
  'data/theory.json',
  'data/questions.json',
  'data/equations.json',
  'data/experiments.json',
  'data/indicators.json',
  'data/solubility.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chemia8-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});

// Service worker: pełna praca offline. Przy zmianie plików podnieś VERSION –
// stary cache zostanie usunięty przy aktywacji.
// VERSION i ASSETS są GENEROWANE (npm run build) – wersję zmieniaj w package.json (npm run bump).
const VERSION = '1.10.4';
const CACHE = `chemia8-${VERSION}`;

const ASSETS = [
  // BEGIN GENERATED ASSETS (node tools/build.js)
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/balance.js',
  'js/blocks.js',
  'js/chem.js',
  'js/chemkeyboard.js',
  'js/countdown.js',
  'js/curriculum.js',
  'js/data.js',
  'js/dnd.js',
  'js/dom.js',
  'js/exam.js',
  'js/formula.js',
  'js/icons.js',
  'js/indicators.js',
  'js/lab.js',
  'js/leitner.js',
  'js/match.js',
  'js/qtypes.js',
  'js/quiz.js',
  'js/router.js',
  'js/screens/exam.js',
  'js/screens/home.js',
  'js/screens/review.js',
  'js/screens/topic.js',
  'js/settings.js',
  'js/solubility.js',
  'js/store.js',
  'js/ui.js',
  'js/valence.js',
  'js/version.js',
  'data/curriculum.json',
  'data/equations.json',
  'data/experiments.json',
  'data/indicators.json',
  'data/solubility.json',
  'data/topics/bilansowanie/questions.json',
  'data/topics/bilansowanie/theory.json',
  'data/topics/doswiadczenia/questions.json',
  'data/topics/doswiadczenia/theory.json',
  'data/topics/dysocjacja/questions.json',
  'data/topics/dysocjacja/theory.json',
  'data/topics/podstawy/questions.json',
  'data/topics/podstawy/theory.json',
  'data/topics/rozpuszczalnosc/questions.json',
  'data/topics/rozpuszczalnosc/theory.json',
  'data/topics/wlasciwosci/questions.json',
  'data/topics/wlasciwosci/theory.json',
  'data/topics/wodorotlenki-rozp/questions.json',
  'data/topics/wodorotlenki-rozp/theory.json',
  'data/topics/wodorotlenki-trudne/questions.json',
  'data/topics/wodorotlenki-trudne/theory.json',
  'data/topics/wskazniki/questions.json',
  'data/topics/wskazniki/theory.json',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  // END GENERATED ASSETS
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

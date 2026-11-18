// Service worker: pełna praca offline. Przy zmianie plików podnieś VERSION –
// stary cache zostanie usunięty przy aktywacji.
// VERSION i ASSETS są GENEROWANE (npm run build) – wersję zmieniaj w package.json (npm run bump).
const VERSION = '1.14.5';
const CACHE = `chemia8-${VERSION}`;

const ASSETS = [
  // BEGIN GENERATED ASSETS (node tools/build.js)
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/answer.js',
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
  'js/practice.js',
  'js/qtypes.js',
  'js/quiz.js',
  'js/router.js',
  'js/screens/exam.js',
  'js/screens/home.js',
  'js/screens/review.js',
  'js/screens/sheets.js',
  'js/screens/topic.js',
  'js/settings.js',
  'js/sheet-run.js',
  'js/sheets.js',
  'js/solubility.js',
  'js/store.js',
  'js/ui.js',
  'js/valence.js',
  'js/version.js',
  'data/angielski/curriculum.json',
  'data/angielski/sheets.json',
  'data/angielski/topics/czytanie/questions.json',
  'data/angielski/topics/czytanie/theory.json',
  'data/angielski/topics/gramatyka/questions.json',
  'data/angielski/topics/gramatyka/theory.json',
  'data/angielski/topics/kultura/questions.json',
  'data/angielski/topics/kultura/theory.json',
  'data/angielski/topics/rej-czytanie/questions.json',
  'data/angielski/topics/rej-czytanie/theory.json',
  'data/angielski/topics/rej-gramatyka/questions.json',
  'data/angielski/topics/rej-gramatyka/theory.json',
  'data/angielski/topics/rej-kultura/questions.json',
  'data/angielski/topics/rej-kultura/theory.json',
  'data/angielski/topics/rej-slownictwo/questions.json',
  'data/angielski/topics/rej-slownictwo/theory.json',
  'data/angielski/topics/slownictwo/questions.json',
  'data/angielski/topics/slownictwo/theory.json',
  'data/chemia/curriculum.json',
  'data/chemia/equations.json',
  'data/chemia/experiments.json',
  'data/chemia/indicators.json',
  'data/chemia/solubility.json',
  'data/chemia/topics/bilansowanie/questions.json',
  'data/chemia/topics/bilansowanie/theory.json',
  'data/chemia/topics/doswiadczenia/questions.json',
  'data/chemia/topics/doswiadczenia/theory.json',
  'data/chemia/topics/dysocjacja/questions.json',
  'data/chemia/topics/dysocjacja/theory.json',
  'data/chemia/topics/podstawy/questions.json',
  'data/chemia/topics/podstawy/theory.json',
  'data/chemia/topics/rozpuszczalnosc/questions.json',
  'data/chemia/topics/rozpuszczalnosc/theory.json',
  'data/chemia/topics/wlasciwosci/questions.json',
  'data/chemia/topics/wlasciwosci/theory.json',
  'data/chemia/topics/wodorotlenki-rozp/questions.json',
  'data/chemia/topics/wodorotlenki-rozp/theory.json',
  'data/chemia/topics/wodorotlenki-trudne/questions.json',
  'data/chemia/topics/wodorotlenki-trudne/theory.json',
  'data/chemia/topics/wskazniki/questions.json',
  'data/chemia/topics/wskazniki/theory.json',
  'data/subjects.json',
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

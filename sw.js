/* ═══════════════════════════════════════════════════════════════
   SYSTEM — sw.js  ·  офлайн-кэш статики
   Данные лежат в localStorage, поэтому кэшируем только файлы.
   ═══════════════════════════════════════════════════════════════ */
const CACHE = 'system-solo-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/img/icon.svg',
  './assets/img/icon-maskable.svg',
  './assets/css/main.css',
  './assets/css/views.css',
  './assets/js/data/food.js',
  './assets/js/data/exercises.js',
  './assets/js/data/quests.js',
  './assets/js/core/util.js',
  './assets/js/core/calc.js',
  './assets/js/core/store.js',
  './assets/js/core/audio.js',
  './assets/js/core/ui.js',
  './assets/js/core/chart.js',
  './assets/js/core/fx.js',
  './assets/js/views/dashboard.js',
  './assets/js/views/weight.js',
  './assets/js/views/nutrition.js',
  './assets/js/views/training.js',
  './assets/js/views/quests.js',
  './assets/js/views/progress.js',
  './assets/js/views/settings.js',
  './assets/js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* cache-first для своей статики, network-first для внешних шрифтов */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        /* фоновое обновление */
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

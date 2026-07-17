// 캐시 우선 서비스 워커 — 한 번 로드하면 오프라인에서도 동작

const CACHE = 'keycap-keyring-v3';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/keycap.css',
  './css/ui.css',
  './js/main.js',
  './js/scene3d.js',
  './js/settings.js',
  './js/designs.js',
  './js/storage.js',
  './js/haptics.js',
  './js/audio/engine.js',
  './js/audio/switches.js',
  './js/audio/fx.js',
  './js/games.js',
  './js/vendor/three.module.min.js',
  './js/vendor/three.core.min.js',
  './js/vendor/RoundedBoxGeometry.js',
  './js/vendor/RoomEnvironment.js',
  './manifest.webmanifest',
  './favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request)),
  );
});

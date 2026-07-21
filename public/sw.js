const CACHE_NAME = 'aegis-cache-v2';
// Same-origin only, and deliberately minimal: this file is served as-is on every
// host (local bridge, Vite dev, Vercel), so it can't assume a specific HTML entry
// point exists (dev_server.py serves aegis_standalone.html at '/', Vercel serves
// index.html at '/') — caching '/' covers whichever one actually answers there.
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/aegis-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort: cache what's reachable, don't fail install if one entry 404s.
      return Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {})));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

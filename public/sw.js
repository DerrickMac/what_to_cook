/* What To Cook — minimal offline shell.
   Cache-first for the app shell, stale-while-revalidate for GET data reads.
   Anything non-GET (mutations) always goes to the network. */
const SHELL = 'wtc-shell-v1';
const DATA = 'wtc-data-v1';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: serve the app shell so the app opens offline.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  // Data reads (recipes / fridge / plan): stale-while-revalidate.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(DATA).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  e.respondWith(caches.match(request).then((c) => c || fetch(request)));
});

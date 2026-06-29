const CACHE_NAME = 'tawla-cache-v2'; // Bumped cache name
const ASSETS_TO_CACHE = [
  '/staff',
  '/index.html',
  '/favicon-192.png',
  '/favicon-512.png',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Disable service worker caching on localhost/development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Skip API requests and hot-reload websockets
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  // Caching strategy: Stale-While-Revalidate for local assets/fonts, Network-First for others
  const isLocalAsset = ASSETS_TO_CACHE.includes(url.pathname) || 
                       url.pathname.includes('/assets/') || 
                       url.hostname.includes('fonts.googleapis.com') || 
                       url.hostname.includes('fonts.gstatic.com');

  if (isLocalAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // If request mode is navigate, try network first, fallback to cached index.html
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match('/index.html');
          })
      );
    }
  }
});

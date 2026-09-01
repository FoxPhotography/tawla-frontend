const CACHE_NAME = 'tawla-cache-v8';
const ASSETS_TO_CACHE = [
  '/staff',
  '/index.html',
  '/3.png',
  '/TAWLA_Logo.png',
  '/TAWLA_Logo_2.png',
  '/favicon.png',
  '/favicon-192.png',
  '/favicon-512.png',
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
            console.log('[SW]: Purging old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Disable service worker caching on localhost/development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Skip API requests, socket.io and external third-party gateways
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/socket.io') ||
    url.hostname.includes('fawaterk.com') ||
    url.hostname.includes('railway.app')
  ) {
    return;
  }

  const isCss = url.pathname.endsWith('.css');
  const isJs = url.pathname.endsWith('.js');
  const isAsset = url.pathname.includes('/assets/');
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  // Strategy for CSS and JS assets: Network-First with strict MIME type validation
  if (isCss || isJs || isAsset || isFont) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const contentType = networkResponse.headers.get('content-type') || '';
            
            // CRITICAL ANTI-FOUC GUARD:
            // Never cache or serve HTML document fallbacks for CSS or JS requests!
            if ((isCss || isJs || isAsset) && contentType.includes('text/html')) {
              return new Response('/* Asset not found - SPA fallback prevented */', {
                status: 404,
                statusText: 'Not Found',
                headers: { 'Content-Type': isCss ? 'text/css' : 'application/javascript' }
              });
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cache if network fails (offline mode)
          const cached = await caches.match(event.request);
          if (cached) {
            const cachedType = cached.headers.get('content-type') || '';
            // If cached response was accidentally an HTML document, reject it
            if ((isCss || isJs || isAsset) && cachedType.includes('text/html')) {
              caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
              return new Response('', { status: 404, headers: { 'Content-Type': isCss ? 'text/css' : 'application/javascript' } });
            }
            return cached;
          }
          return new Response('', { status: 404 });
        })
    );
    return;
  }

  // Strategy for HTML page navigation: Network-First, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/staff');
        })
    );
    return;
  }

  // Default fallback for other static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

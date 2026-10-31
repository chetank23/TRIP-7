// BVC Trip Lightweight PWA Service Worker for iOS (iPhone 14+) & Android
// Bump this when application bundles change so old offline HTML/assets are discarded.
const CACHE_NAME = 'bvc-trip-v3';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA static cache prefetch notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy with cache fallback for HTML, stale-while-revalidate for assets

// Display every received push immediately. This is required for reliable
// Web Push behaviour on iOS Home Screen web apps as well as Android browsers.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = { body: event.data ? event.data.text() : 'A new BVC update is waiting.' };
    }

    const title = typeof payload.title === 'string' ? payload.title : 'BVC Trip 🌴';
    const body = typeof payload.body === 'string'
      ? payload.body
      : 'Your BVC group has a new update.';

    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : 'bvc-trip-notification',
      renotify: false,
      data: { url: typeof payload.url === 'string' ? payload.url : '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    let targetUrl = '/';
    try {
      const requestedUrl = new URL(event.notification.data?.url || '/', self.location.origin);
      if (requestedUrl.origin === self.location.origin) {
        targetUrl = requestedUrl.href;
      }
    } catch {
      targetUrl = '/';
    }

    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) {
          await client.navigate(targetUrl);
        }
        await client.focus();
        return;
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API data calls to ensure fresh cloud sync
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If valid response, clone and cache static files
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/_next/static/') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.jpg'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and requesting a page, return cached root page
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

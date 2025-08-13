// Service Worker for Dinez Canteen PWA
const CACHE_NAME = 'dinez-canteen-v1';
const CACHE_VERSION = 'cache-v1755077641093-6090eab8f6f0e7de'; // Will be replaced during build
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
      .catch(err => {
        console.log('Service Worker: Cache failed', err);
      })
  );
});

// Activate event - clean up old caches with version checking
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            // Delete old caches or caches with different versions
            if (cache !== CACHE_NAME || !cache.includes(CACHE_VERSION)) {
              console.log('Service Worker: Deleting old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Handle skip waiting message from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip requests to external domains
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Don't cache API calls or non-successful responses
            if (!fetchResponse.ok || event.request.url.includes('/api/')) {
              return fetchResponse;
            }

            // Clone the response before caching
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          })
          .catch(() => {
            // If both cache and network fail, show offline page for navigations
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// Handle background sync (optional)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  // Add background sync logic here if needed
});

// Handle push notifications (optional)
self.addEventListener('push', event => {
  console.log('Service Worker: Push received', event);
  // Add push notification logic here if needed
});
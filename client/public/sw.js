// Service Worker for Dinez Canteen PWA
const CACHE_NAME = 'dinez-canteen-v1';
const CACHE_VERSION = 'cache-v' + Date.now(); // Dynamic cache version
const APP_VERSION = '1.0.0'; // App version for tracking
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
  
  // In development, always skip waiting for immediate updates
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.includes('replit.dev')) {
    console.log('🔧 Development mode: Skipping waiting immediately');
    self.skipWaiting();
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
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

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    // Send version info back to client
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheVersion: CACHE_VERSION
    });
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

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received', event);

  let notificationData = {
    title: 'Canteen App',
    body: 'You have a new notification!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {},
    actions: [],
    requireInteraction: false,
    silent: false,
    tag: 'default',
    timestamp: Date.now(),
    // Android-specific settings for heads-up notifications
    priority: 'high',
    urgency: 'high',
    vibrate: [200, 100, 200],
  };

  // Parse notification data from server
  if (event.data) {
    try {
      const serverData = event.data.json();
      notificationData = {
        ...notificationData,
        ...serverData,
      };
    } catch (error) {
      console.error('Failed to parse push notification data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Add default actions for order-related notifications
  if (notificationData.data?.type === 'order_update' || notificationData.data?.type === 'new_order') {
    notificationData.actions = [
      {
        action: 'view',
        title: 'View Order',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192.png'
      }
    ];
    notificationData.requireInteraction = true;
    // High priority for order updates to ensure heads-up display
    notificationData.priority = 'high';
    notificationData.urgency = 'high';
  }

  // Enhanced Android notification options for banner display
  const androidNotificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: notificationData.actions,
    requireInteraction: notificationData.requireInteraction,
    silent: notificationData.silent,
    tag: notificationData.tag,
    timestamp: notificationData.timestamp,
    vibrate: notificationData.vibrate || [200, 100, 200],
    // Critical Android settings for heads-up notifications
    urgency: 'high',
    priority: 'high',
    importance: 'high',
    // Additional Android-specific options
    renotify: true,
    sticky: notificationData.data?.type === 'order_update' && notificationData.data?.status === 'ready',
    // Enhanced visual settings
    image: notificationData.image,
    dir: 'ltr',
    lang: 'en',
  };

  // Show notification and send to in-app notification panel
  event.waitUntil(
    Promise.all([
      // Show browser notification with enhanced Android options
      self.registration.showNotification(notificationData.title, androidNotificationOptions),
      // Send to all clients for in-app notification panel
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'push_notification',
            notification: {
              title: notificationData.title,
              message: notificationData.body,
              type: notificationData.data?.notificationType || 'confirmed',
              orderNumber: notificationData.data?.orderNumber,
              timestamp: new Date(notificationData.timestamp)
            }
          });
        });
      })
    ])
  );
});

// Handle notification click events
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle different actions
  if (action === 'close') {
    return;
  }

  // Determine URL to open
  let urlToOpen = '/';

  if (data.url) {
    urlToOpen = data.url;
  } else if (data.type === 'order_update' && data.orderNumber) {
    urlToOpen = `/orders/${data.orderNumber}`;
  } else if (data.type === 'new_order' && data.orderNumber) {
    urlToOpen = `/admin/orders/${data.orderNumber}`;
  } else if (data.type === 'payment_confirmation' && data.orderNumber) {
    urlToOpen = `/orders/${data.orderNumber}`;
  }

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to find existing window and focus it
        for (const client of clientList) {
          if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no existing window found, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
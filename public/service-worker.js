// Coffee Ledger PWA Service Worker v6
// Optimized for offline-first experience

const CACHE_VERSION = 'v6';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/default-coffee-bean.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.error('[ServiceWorker] Install error:', err))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch strategies
const fetchStrategies = {
  // Network first, fallback to cache
  networkFirst: async (request, cacheName) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      // Offline fallback for navigation
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      throw error;
    }
  },

  // Cache first, fallback to network
  cacheFirst: async (request, cacheName) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Return placeholder for images
      if (request.destination === 'image') {
        return caches.match('/default-coffee-bean.svg');
      }
      throw error;
    }
  },

  // Network only (no caching)
  networkOnly: async (request) => {
    return fetch(request);
  }
};

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API routes - do not intercept (none exist today; keep bypass for safety)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Next.js routes - network only (to avoid caching issues)
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetchStrategies.networkOnly(request));
    return;
  }

  // Static assets - cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i)) {
    event.respondWith(fetchStrategies.cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Manifest and other static files - cache first
  if (url.pathname === '/manifest.json' ||
      url.pathname.endsWith('.json')) {
    event.respondWith(fetchStrategies.cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - network first for fresh content
  if (request.mode === 'navigate' ||
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetchStrategies.networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Default - network first
  event.respondWith(fetchStrategies.networkFirst(request, DYNAMIC_CACHE));
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-bags') {
    event.waitUntil(syncBags());
  }
});

async function syncBags() {
  // Placeholder for future offline sync functionality
  console.log('[ServiceWorker] Syncing bags data...');
}

// Push notifications (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Coffee Ledger notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Coffee Ledger', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
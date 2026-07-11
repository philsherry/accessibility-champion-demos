'use strict';

// Polyfills ExtendableEvent#waitUntil so it can be called asynchronously
// (from inside a .then(), as the fetch handler below does) rather than
// only during the event handler's initial synchronous execution. See
// assets/js/async-waituntil-polyfill.js for the full rationale.
importScripts('assets/js/async-waituntil-polyfill.js');

// __BUILD_ID__ is substituted with the deploying commit's short SHA by
// .github/workflows/deploy-pages.yml before the site is published, so
// every deploy automatically busts the previous cache — no human needs
// to remember to bump anything. Locally, and in the test.yml CI job
// (which runs against the raw, unsubstituted source), this stays
// literally "nip-claw-__BUILD_ID__", which is still a perfectly valid
// (if unchanging) cache name for dev/test purposes. See
// docs/superpowers/specs/2026-07-10-offline-caching-design.md.
const CACHE_VERSION = 'nip-claw-__BUILD_ID__';

// Every URL below is relative (no leading slash) so it resolves against
// this script's own location — the site root locally, but
// /accessibility-champion-demos/ on GitHub Pages. A leading slash would
// resolve to the domain root instead and 404 under the GitHub Pages
// project-site subpath (the same class of bug already fixed for the web
// manifest's icon paths).
const PRECACHE_URLS = [
  'index.html',
  'checkout.html',
  'orders.html',
  'subscriptions.html',
  'accessibility.html',
  'offline.html',
  'admin.html',
  'receipt.html',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/index.css',
  'assets/css/checkout.css',
  'assets/css/orders.css',
  'assets/css/subscriptions.css',
  'assets/css/accessibility.css',
  'assets/css/offline.css',
  'assets/css/admin.css',
  'assets/css/receipt.css',
  'assets/js/theme-init.js',
  'assets/js/theme.js',
  'assets/js/cart.js',
  'assets/js/index.js',
  'assets/js/checkout.js',
  'assets/js/orders.js',
  'assets/js/offline.js',
  'assets/js/admin.js',
  'assets/js/receipt.js',
  'assets/js/plans-data.js',
  'assets/js/connectivity-badge.js',
  'assets/js/service-worker-register.js',
  'assets/js/async-waituntil-polyfill.js',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'site.webmanifest',
];

function precache() {
  return caches
    .open(CACHE_VERSION)
    .then((cache) => cache.addAll(PRECACHE_URLS));
}

function clearOldCaches() {
  return caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    );
}

// Tells every open client (tab) that this service worker version has
// just taken over, so service-worker-register.js can record when this
// cached version was installed — displayed on offline.html. Fires once
// per version bump (on activate), not on every visit or every background
// stale-while-revalidate refetch, so the displayed timestamp tracks
// CACHE_VERSION's actual bump policy: automatic, via the __BUILD_ID__
// substitution described above, not a manually-maintained value.
function notifyClientsOfUpdate() {
  return self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'sw-updated', timestamp: Date.now() });
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clearOldCaches()
      .then(() => self.clients.claim())
      .then(() => notifyClientsOfUpdate()),
  );
});

// Cache-first, refresh-in-background (stale-while-revalidate): serves the
// cached response immediately if there is one, then fetches a fresh copy
// in the background to update the cache for next time. A page already on
// screen is never rewritten mid-read — only the next navigation sees the
// refreshed content.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // The Cache API only supports http(s) requests — Cache.put() throws
  // synchronously for anything else. A page can still trigger fetch
  // events for other schemes (e.g. chrome-extension:// from an
  // installed browser extension), so this needs an explicit guard
  // rather than assuming every fetch event is one of ours to handle.
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          event.waitUntil(
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, responseCopy)),
          );
          return networkResponse;
        })
        .catch(() => {
          const acceptHeader = request.headers.get('Accept') || '';
          if (acceptHeader.includes('text/html')) {
            return caches.match('offline.html');
          }
          return new Response('', {
            status: 504,
            statusText: 'Offline and not cached',
          });
        });

      if (cachedResponse) {
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      return networkFetch;
    }),
  );
});

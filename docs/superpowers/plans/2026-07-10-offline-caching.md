# Offline Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the demo site genuine offline availability — a hand-rolled service worker precaches the whole site, an `offline.html` page explains and controls it, and a header badge reports connectivity — as a trial run for the book repo's offline-caching backlog item.

**Architecture:** A single `public/service-worker.js` (no build tooling) precaches every page and asset on `install`, serves cache-first with a background refresh on every `fetch` (stale-while-revalidate), and falls back to `offline.html` for failed navigations. Two small classic scripts, loaded on every page, handle registration/update-messaging and the connectivity badge respectively. `offline.html` doubles as both a normal page (status + a "clear offline data" control) and the service worker's own offline fallback target.

**Tech Stack:** Vanilla JS (ES6+, classic `<script src>`, no modules/bundler), the Cache API, the Service Worker API, Playwright for tests.

**Spec:** `docs/superpowers/specs/2026-07-10-offline-caching-design.md` — read it for the full rationale (why this repo first, the async-waitUntil research, what's explicitly out of scope).

## Global Constraints

- No build step, no bundler, no framework — every new file is plain static HTML/CSS/JS, same as the rest of this repo.
- Every path referenced from `service-worker.js` or the registration script must be **relative, with no leading slash** — the site serves from `/accessibility-champion-demos/` on GitHub Pages (no custom domain) but from the root locally; a leading slash resolves to the wrong place under the subpath (the same class of bug already fixed for the web manifest's icon paths).
- Match existing JS style: `const`/arrow functions/template literals are fine (already used throughout this codebase), but avoid syntax not already in use elsewhere (e.g. no optional chaining `?.` — none of the existing files use it).
- Live-region announcements use the established pattern from `assets/js/cart.js`: clear `textContent`, force a reflow via `void el.offsetWidth`, then set the new text — so screen readers re-announce even repeated identical text.
- Test locators: Playwright role/label locators first (`getByRole`); `data-testid`/`data-component` only when no accessible name uniquely identifies the element (see `CONVENTIONS.md`).
- Every new/modified page must have zero axe-core violations against `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` (see `tests/axe-helpers.ts`), zero `html-validate:recommended` violations, and full keyboard traversal with nothing focusable-but-hidden.
- All work happens on the `feat/offline-caching` branch (already created off `main`).

---

## Task 1: Vendor the async-waitUntil polyfill + ESLint config for the service-worker context

**Files:**
- Create: `public/assets/js/async-waituntil-polyfill.js`
- Modify: `eslint.config.js`

**Interfaces:**
- Produces: monkeypatches `ExtendableEvent.prototype.waitUntil` and `FetchEvent.prototype.respondWith` globally within the service worker scope. Consumed by Task 3's `service-worker.js` via `importScripts('assets/js/async-waituntil-polyfill.js')`.

- [ ] **Step 1: Create the polyfill file**

```javascript
// public/assets/js/async-waituntil-polyfill.js
```

```js
/**
 * Allows ExtendableEvent#waitUntil (and, by extension,
 * FetchEvent#respondWith) to be called asynchronously — e.g. from inside
 * a .then() after the event handler's initial synchronous execution has
 * already returned — rather than only during that initial synchronous
 * dispatch. service-worker.js's fetch handler relies on this to kick off
 * a background cache refresh after already responding from cache.
 *
 * The corrected behaviour has been spec-mandated for years and every
 * evergreen browser supports it natively; this exists for the browsers
 * that don't. The restriction was a Chromium bug
 * (https://issues.chromium.org/issues/40519540), fixed in Chrome 60
 * (mid-2017) — so this protects older, non-upgradable Android/Chromium
 * devices still on Chrome 40–59. Safari didn't ship service workers
 * until Safari 11.1 (after the spec fix landed), so this specific bug
 * never applied there. See
 * docs/superpowers/specs/2026-07-10-offline-caching-design.md for the
 * full research behind keeping this.
 *
 * Vendored verbatim from
 * https://github.com/jakearchibald/async-waituntil-polyfill
 * (Jake Archibald, used by resilientwebdesign.com/serviceworker.js).
 */
{
  const waitUntil = ExtendableEvent.prototype.waitUntil;
  const respondWith = FetchEvent.prototype.respondWith;
  const promisesMap = new WeakMap();

  ExtendableEvent.prototype.waitUntil = function (promise) {
    const extendableEvent = this;
    let promises = promisesMap.get(extendableEvent);

    if (promises) {
      promises.push(Promise.resolve(promise));
      return;
    }

    promises = [Promise.resolve(promise)];
    promisesMap.set(extendableEvent, promises);

    // call original method
    return waitUntil.call(
      extendableEvent,
      Promise.resolve().then(function processPromises() {
        const len = promises.length;

        // wait for all to settle
        return Promise.all(promises.map((p) => p.catch(() => {}))).then(
          () => {
            // have new items been added? If so, wait again
            if (promises.length != len) return processPromises();
            // we're done!
            promisesMap.delete(extendableEvent);
            // reject if one of the promises rejected
            return Promise.all(promises);
          },
        );
      }),
    );
  };

  FetchEvent.prototype.respondWith = function (promise) {
    this.waitUntil(promise);
    return respondWith.call(this, promise);
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check public/assets/js/async-waituntil-polyfill.js`
Expected: no output (exit code 0). This only checks syntax — the file references service-worker-only globals (`ExtendableEvent`, `FetchEvent`) that don't exist in Node, but `--check` never executes the file, so that's fine.

- [ ] **Step 3: Add ESLint config for the service-worker context**

In `eslint.config.js`, add a new config block immediately after the existing "Shared browser JS" block (the one matching `public/assets/js/*.js` with `globals.browser`):

```js
  // The service worker and its vendored polyfill run in the
  // ServiceWorkerGlobalScope, not a normal browser window — a distinct
  // global set (self, caches, clients, importScripts, ExtendableEvent,
  // FetchEvent). Still a classic script (importScripts, not
  // import/export), like the block above.
  {
    files: [
      'public/service-worker.js',
      'public/assets/js/async-waituntil-polyfill.js',
    ],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },
```

(`public/service-worker.js` doesn't exist yet — that's fine, ESLint config blocks don't require the file to exist, and this saves a second edit in Task 3.)

- [ ] **Step 4: Run lint**

Run: `npm run lint:js`
Expected: passes with no errors (the polyfill file lints cleanly under the new `serviceworker` globals).

- [ ] **Step 5: Commit**

```bash
git add public/assets/js/async-waituntil-polyfill.js eslint.config.js
git commit -m "feat: vendor async-waitUntil service worker polyfill"
```

---

## Task 2: Build the offline.html page

**Files:**
- Create: `public/offline.html`
- Create: `public/assets/css/offline.css`
- Create: `public/assets/js/offline.js`
- Modify: `tests/utilities/pages.ts`
- Create: `tests/offline.spec.ts`

**Interfaces:**
- Consumes: `--color-*`/`--space-*`/`--text-*` tokens from `assets/css/tokens.css`, `.btn`/`.btn-secondary`/`.sr-only` from `assets/css/base.css`.
- Produces: `#offline-cache-status` (paragraph, text replaced by `offline.js`), `#offline-page-status` (live region for the clear-data confirmation), `[data-component="clear-offline-data"]` (button). The `localStorage` key `offline-cached-at` is read here and written by Task 5's `service-worker-register.js` — that's the contract between the two.

- [ ] **Step 1: Write the page spec (red)**

```typescript
// tests/offline.spec.ts
```

```ts
import { expect, test } from './fixtures';
import { expectNoAxeViolations } from './axe-helpers';
import { expectFullKeyboardTraversalStaysVisible } from './keyboard-helpers';

test.describe('offline.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/offline.html');
  });

  test('has no accessibility violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('full keyboard traversal never lands on a hidden element', async ({
    page,
  }) => {
    await expectFullKeyboardTraversalStaysVisible(page, 20);
  });

  test('shows a not-yet-cached message before any cache exists', async ({
    page,
  }) => {
    await expect(
      page.getByText(/hasn't been cached for offline use yet/),
    ).toBeVisible();
  });

  test('clicking "Clear offline data" announces confirmation even with nothing to clear', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Clear offline data' }).click();
    // Scoped by id, not getByRole('status') — from Task 4 onward this
    // page also carries the connectivity badge's #connectivity-status
    // live region, which shares the same role and would make a bare
    // role locator ambiguous.
    await expect(page.locator('#offline-page-status')).toHaveText(
      'Offline data cleared. This site will be re-cached automatically next time you visit while online.',
    );
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx playwright test tests/offline.spec.ts --project=Desktop`
Expected: FAIL — `/offline.html` doesn't exist yet (404 / page not found).

- [ ] **Step 3: Register the page in the shared PAGES list**

In `tests/utilities/pages.ts`, add a new entry to the `PAGES` array (after the `accessibility.html` entry):

```ts
  // Reachable via the header's connectivity badge (added in a later
  // task), not the main nav — no nav link should be current here.
  { path: '/offline.html', currentNavLabel: null, cartHasAriaCurrent: false },
```

This is the single source of truth `header-site.spec.ts`, `footer-site.spec.ts`, `html-validate.spec.ts`, and `dark-mode.spec.ts` all loop over — adding this one entry gives `offline.html` the same header/footer/structural-validity/dark-mode-axe coverage every other page already has, with no changes needed to those four files.

- [ ] **Step 4: Create the page**

```html
<!-- public/offline.html -->
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="assets/js/theme-init.js"></script>
  <title>Offline access — Nip &amp; Claw</title>
  <meta name="description" content="Manage offline access to Nip & Claw: check cache status, or clear offline data.">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="#1e3d2f">
  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/offline.css">
</head>
<body>
  <div class="page-wrapper">

    <a href="#main" class="skip-link">Skip to main content</a>

    <header class="site-header" role="banner">
      <div class="inner">
        <a href="index.html" class="site-logo">
          <span class="wordmark">Nip &amp; Claw</span>
          <span class="tagline">purrveyors of the finest artisanal catnip</span>
        </a>
        <div class="nav-cart">
          <a href="checkout.html" class="cart-link" aria-label="Cart, 2 items">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Cart
            <span class="cart-count" aria-hidden="true">2</span>
          </a>
        </div>
        <nav class="site-nav" aria-label="Main">
          <ul role="list">
            <li><a href="index.html">Products</a></li>
            <li><a href="plans.html">Subscriptions</a></li>
            <li><a href="orders.html">My Orders</a></li>
          </ul>
        </nav>
        <fieldset class="theme-toggle" data-component="theme-toggle">
          <legend class="sr-only">Colour scheme</legend>
          <label class="theme-option">
            <input type="radio" name="theme" value="auto" checked>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span class="sr-only">System default</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="light">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            <span class="sr-only">Light theme</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="dark">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            <span class="sr-only">Dark theme</span>
          </label>
        </fieldset>
      </div>
    </header>

    <main id="main" class="main-content" tabindex="-1">
      <div class="offline-body">

        <div class="page-heading">
          <h1>Offline access</h1>
          <p>Nip &amp; Claw keeps working after your connection drops.</p>
        </div>

        <h2>How this works</h2>

        <p>The pages, styles, and scripts that make up this site are saved on your device the first time you visit. If your connection drops later, you'll still be able to browse — the site is built to be resilient, not to demand a constant connection.</p>

        <p>Any page that hasn't been saved yet, or that fails to load while you're offline, shows this page instead.</p>

        <h2>Cache status</h2>

        <p id="offline-cache-status">Checking cache status…</p>

        <p>
          <button type="button" class="btn btn-secondary" data-component="clear-offline-data">Clear offline data</button>
        </p>

        <div id="offline-page-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

      </div>
    </main>

    <footer class="site-footer" role="contentinfo">
      <div class="inner">
        <p><strong class="footer-brand">Nip &amp; Claw</strong> — purrveyors of the finest artisanal catnip since your human got a smartphone.</p>
        <p>Managing offline access · <a href="index.html">Back to products</a></p>
        <p>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion</a> book. All accessibility patterns shown are discussed in the book. Nip &amp; Claw is a fictional store. Lucy Fur, however, is not. · <a href="accessibility.html">Accessibility statement</a></p>
      </div>
    </footer>

  </div>

  <script src="assets/js/theme.js"></script>
  <script src="assets/js/offline.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create the stylesheet**

```css
/* public/assets/css/offline.css */
```

```css
.offline-body {
  max-width: var(--content-width);
}

.offline-body h2 {
  color: var(--color-brand-text);
  margin-top: var(--space-10);
  margin-bottom: var(--space-4);
}

.offline-body p {
  color: var(--color-muted);
  font-size: var(--text-base);
  line-height: 1.7;
  margin-bottom: var(--space-4);
}

#offline-cache-status {
  font-weight: 600;
  color: var(--color-text);
}
```

- [ ] **Step 6: Create the page script**

```javascript
// public/assets/js/offline.js
```

```js
/**
 * offline.html-specific behaviour: shows when this cached version of the
 * site was installed (written to localStorage by
 * assets/js/service-worker-register.js when the service worker sends its
 * "sw-updated" message — see service-worker.js's notifyClientsOfUpdate),
 * and wires the "Clear offline data" button.
 */
document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('offline-cache-status');
  const confirmEl = document.getElementById('offline-page-status');
  const clearBtn = document.querySelector(
    '[data-component="clear-offline-data"]',
  );

  function renderCacheStatus() {
    if (!statusEl) return;
    let timestamp = null;
    try {
      timestamp = localStorage.getItem('offline-cached-at');
    } catch (error) {
      console.warn('offline: could not read cache timestamp', error);
    }
    if (timestamp) {
      const date = new Date(Number(timestamp));
      statusEl.textContent = `This version of the site was cached on ${date.toLocaleString()}.`;
    } else {
      statusEl.textContent =
        "This site hasn't been cached for offline use yet — this updates automatically, usually within a second of your first visit.";
    }
  }

  function announce(message) {
    if (!confirmEl) return;
    // Clearing then re-setting forces screen readers to re-announce even
    // if the new text happens to match the previous value.
    confirmEl.textContent = '';
    void confirmEl.offsetWidth; // force repaint
    confirmEl.textContent = message;
  }

  renderCacheStatus();

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const unregisterAll =
        'serviceWorker' in navigator
          ? navigator.serviceWorker
              .getRegistrations()
              .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
          : Promise.resolve();

      const clearCaches =
        'caches' in window
          ? caches
              .keys()
              .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          : Promise.resolve();

      Promise.all([unregisterAll, clearCaches])
        .then(() => {
          try {
            localStorage.removeItem('offline-cached-at');
          } catch (error) {
            console.warn('offline: could not clear cache timestamp', error);
          }
          renderCacheStatus();
          // Focus deliberately stays on the button — its action doesn't
          // remove it from the page, so moving focus elsewhere would be
          // disorienting rather than helpful. The live region carries
          // the confirmation instead.
          announce(
            'Offline data cleared. This site will be re-cached automatically next time you visit while online.',
          );
        })
        .catch((error) => {
          console.warn('offline: could not clear offline data', error);
          announce(
            'Something went wrong clearing offline data. Please try again.',
          );
        });
    });
  }
});
```

- [ ] **Step 7: Run the spec again, confirm it passes**

Run: `npx playwright test tests/offline.spec.ts --project=Desktop`
Expected: PASS (4 tests).

- [ ] **Step 8: Lint and format**

Run: `npm run lint`
Expected: passes (fix any stylelint/eslint/prettier findings before continuing).

- [ ] **Step 9: Commit**

```bash
git add public/offline.html public/assets/css/offline.css public/assets/js/offline.js tests/utilities/pages.ts tests/offline.spec.ts
git commit -m "feat: add offline.html status/control page"
```

---

## Task 3: Write the service worker

**Files:**
- Create: `public/service-worker.js`

**Interfaces:**
- Consumes: `importScripts('assets/js/async-waituntil-polyfill.js')` from Task 1.
- Produces: cache name `nip-claw-v1` (the `CACHE_VERSION` constant — bump this string on any future deploy that should force a refresh); `postMessage({ type: 'sw-updated', timestamp })` to every client on `activate`, consumed by Task 5's `service-worker-register.js`.

Not yet wired to any page — that happens in Task 5, once the two page-context scripts it works with (`connectivity-badge.js` from Task 4, `service-worker-register.js` from Task 5 itself) exist, so the precache list below can safely reference every real file in the site without a live browser test failing on a 404 mid-task.

- [ ] **Step 1: Create the service worker**

```javascript
// public/service-worker.js
```

```js
'use strict';

// Polyfills ExtendableEvent#waitUntil so it can be called asynchronously
// (from inside a .then(), as the fetch handler below does) rather than
// only during the event handler's initial synchronous execution. See
// assets/js/async-waituntil-polyfill.js for the full rationale.
importScripts('assets/js/async-waituntil-polyfill.js');

// Bump this string whenever a deploy should force a cache refresh for
// returning visitors. No build step generates this automatically — it's
// a deliberate manual step, same as the reference implementation this is
// adapted from (resilientwebdesign.com/serviceworker.js). See
// docs/superpowers/specs/2026-07-10-offline-caching-design.md.
const CACHE_VERSION = 'nip-claw-v1';

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
  'plans.html',
  'accessibility.html',
  'offline.html',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/index.css',
  'assets/css/checkout.css',
  'assets/css/orders.css',
  'assets/css/plans.css',
  'assets/css/accessibility.css',
  'assets/css/offline.css',
  'assets/js/theme-init.js',
  'assets/js/theme.js',
  'assets/js/cart.js',
  'assets/js/index.js',
  'assets/js/checkout.js',
  'assets/js/orders.js',
  'assets/js/offline.js',
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
  return caches.keys().then((keys) =>
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
// stale-while-revalidate refetch, so the displayed timestamp tracks the
// manual CACHE_VERSION bump policy above.
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
```

- [ ] **Step 2: Verify syntax**

Run: `node --check public/service-worker.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Lint**

Run: `npm run lint:js`
Expected: passes — this file matches the `serviceworker`-globals block added in Task 1.

- [ ] **Step 4: Commit**

```bash
git add public/service-worker.js
git commit -m "feat: add service worker with stale-while-revalidate caching"
```

---

## Task 4: Connectivity badge

**Files:**
- Create: `public/assets/js/connectivity-badge.js`
- Modify: `public/assets/css/base.css`
- Modify: `public/index.html`, `public/checkout.html`, `public/orders.html`, `public/plans.html`, `public/accessibility.html`, `public/offline.html`
- Create: `tests/components/connectivity-badge.spec.ts`

**Interfaces:**
- Consumes: `navigator.onLine`, `window` `online`/`offline` events — pure browser APIs, no dependency on the service worker.
- Produces: `[data-component="connectivity-badge"]` link + `#connectivity-status` live region, present on every page.

- [ ] **Step 1: Write the component spec (red)**

```typescript
// tests/components/connectivity-badge.spec.ts
```

```ts
import { test, expect } from '../fixtures';
import { PAGES } from '../utilities/pages';

// The connectivity badge — present on every page's header, after the
// theme-toggle. Pure navigator.onLine / online / offline browser events;
// no service worker dependency.

for (const { path } of PAGES) {
  test.describe(`connectivity badge — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('shows Online by default and links to offline.html', async ({
      page,
    }) => {
      const badge = page.getByRole('link', { name: 'Online' });
      await expect(badge).toBeVisible();
      await expect(badge).toHaveAttribute('href', 'offline.html');
    });

    test('announces and updates when connectivity changes', async ({
      page,
      context,
    }) => {
      await context.setOffline(true);
      await expect(page.getByRole('link', { name: 'Offline' })).toBeVisible();
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're now offline — showing saved content.",
      );

      await context.setOffline(false);
      await expect(page.getByRole('link', { name: 'Online' })).toBeVisible();
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're back online.",
      );
    });
  });
}
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx playwright test tests/components/connectivity-badge.spec.ts --project=Desktop`
Expected: FAIL — no element matches `[data-component="connectivity-badge"]` yet on any page.

- [ ] **Step 3: Create the badge script**

```javascript
// public/assets/js/connectivity-badge.js
```

```js
/**
 * Wires the header's online/offline status badge (present on every page,
 * after the theme-toggle). Announces only on change via the visually-
 * hidden #connectivity-status live region, so screen reader users aren't
 * told "you're online" on every single page load — only when the state
 * actually changes.
 */
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.querySelector(
    '[data-component="connectivity-badge"]',
  );
  const liveRegion = document.getElementById('connectivity-status');
  if (!badge || !liveRegion) return;

  function render(isOnline) {
    badge.textContent = isOnline ? 'Online' : 'Offline';
    badge.classList.toggle('connectivity-badge--offline', !isOnline);
  }

  function announce(isOnline) {
    const message = isOnline
      ? "You're back online."
      : "You're now offline — showing saved content.";
    liveRegion.textContent = '';
    void liveRegion.offsetWidth; // force repaint so screen readers notice the change
    liveRegion.textContent = message;
  }

  render(navigator.onLine);

  window.addEventListener('online', () => {
    render(true);
    announce(true);
  });

  window.addEventListener('offline', () => {
    render(false);
    announce(false);
  });
});
```

- [ ] **Step 4: Add the badge styles to base.css**

In `public/assets/css/base.css`, insert immediately after the `.cart-count { ... }` block:

```css
.connectivity-badge {
  display: inline-flex;
  align-items: center;
  color: var(--color-white);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border: 1.5px solid rgb(255 255 255 / 30%);
  border-radius: var(--radius-pill);
  min-height: var(--target-min);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    color var(--transition-fast);
}

.connectivity-badge:hover,
.connectivity-badge:focus-visible {
  border-color: var(--color-gold-light);
  background: rgb(255 255 255 / 10%);
  outline: none;
}

.connectivity-badge--offline {
  background: var(--color-gold-light);
  color: var(--color-brand);
  border-color: var(--color-gold-light);
}

.connectivity-badge--offline:hover,
.connectivity-badge--offline:focus-visible {
  background: var(--color-gold-hover);
  border-color: var(--color-gold-hover);
}
```

Then, in the same file's `@media (width <= 640px)` block, change the `grid-template-areas` from:

```css
    grid-template-areas:
      'logo  cart'
      'nav   nav'
      'theme theme';
```

to:

```css
    grid-template-areas:
      'logo  cart'
      'nav   nav'
      'theme theme'
      'badge badge';
```

and add, immediately after the `.theme-toggle { grid-area: theme; justify-content: center; }` rule inside that same media block:

```css
  .connectivity-badge {
    grid-area: badge;
    justify-self: center;
  }
```

- [ ] **Step 5: Add the badge markup to all six pages**

In each of `public/index.html`, `public/checkout.html`, `public/orders.html`, `public/plans.html`, `public/accessibility.html`, `public/offline.html`, find:

```html
        </fieldset>
      </div>
    </header>
```

and replace with:

```html
        </fieldset>
        <a href="offline.html" class="connectivity-badge" data-component="connectivity-badge">Online</a>
        <div id="connectivity-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
    </header>
```

(This block is byte-identical across all six files, so the same find/replace applies verbatim to each.)

- [ ] **Step 6: Add the script tag to all six pages**

In each of the six pages, find the line `<script src="assets/js/theme.js"></script>` and add immediately after it:

```html
  <script src="assets/js/connectivity-badge.js"></script>
```

- [ ] **Step 7: Run the spec again, confirm it passes**

Run: `npx playwright test tests/components/connectivity-badge.spec.ts --project=Desktop`
Expected: PASS (12 tests — 2 per page × 6 pages).

- [ ] **Step 8: Confirm the existing header/footer suites still pass**

Run: `npx playwright test tests/components/header-site.spec.ts tests/components/footer-site.spec.ts --project=Desktop`
Expected: PASS, unchanged — the badge is appended after everything those tests already check (the tab-order test only taps 5 elements past the skip link: logo, cart, and the 3 nav links).

- [ ] **Step 9: Lint and format**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 10: Commit**

```bash
git add public/assets/js/connectivity-badge.js public/assets/css/base.css public/index.html public/checkout.html public/orders.html public/plans.html public/accessibility.html public/offline.html tests/components/connectivity-badge.spec.ts
git commit -m "feat: add header connectivity badge"
```

---

## Task 5: Service worker registration + end-to-end caching tests

**Files:**
- Create: `public/assets/js/service-worker-register.js`
- Modify: `public/index.html`, `public/checkout.html`, `public/orders.html`, `public/plans.html`, `public/accessibility.html`, `public/offline.html`
- Create: `tests/service-worker.spec.ts`

**Interfaces:**
- Consumes: `service-worker.js` (Task 3), the `sw-updated` postMessage contract it defines.
- Produces: `localStorage` key `offline-cached-at`, consumed by `offline.js` (Task 2).

By the end of this task, every file `service-worker.js`'s `PRECACHE_URLS` (Task 3) references actually exists on disk, so the browser-level tests below exercise the real, complete caching pipeline.

- [ ] **Step 1: Create the registration script**

```javascript
// public/assets/js/service-worker-register.js
```

```js
/**
 * Registers the service worker (public/service-worker.js) and listens
 * for its "sw-updated" message, persisting when this cached version was
 * installed so offline.html can display it. Loaded on every page.
 *
 * The registration path is relative (no leading slash) so it resolves
 * against the current page's URL — correct both when serving from the
 * site root locally and from GitHub Pages' /accessibility-champion-demos/
 * project-site subpath. See
 * docs/superpowers/specs/2026-07-10-offline-caching-design.md.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js', { scope: './' })
      .catch((error) => {
        console.warn('service-worker-register: registration failed', error);
      });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'sw-updated') {
      try {
        localStorage.setItem(
          'offline-cached-at',
          String(event.data.timestamp),
        );
      } catch (error) {
        console.warn(
          'service-worker-register: could not persist cache timestamp',
          error,
        );
      }
    }
  });
}
```

- [ ] **Step 2: Write the integration spec (red)**

```typescript
// tests/service-worker.spec.ts
```

```ts
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Waits for the precache to actually finish (install's cache.addAll),
// rather than trusting navigator.serviceWorker.ready's timing, which can
// resolve slightly before or independent of our own install logic.
async function waitForPrecache(page: Page) {
  await page.waitForFunction(async () => {
    if (!('caches' in window)) return false;
    const cache = await caches.open('nip-claw-v1');
    const keys = await cache.keys();
    return keys.length > 0;
  });
}

test.describe('service worker', () => {
  test('registers and precaches every page on first visit', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);

    const cachedPaths = await page.evaluate(async () => {
      const cache = await caches.open('nip-claw-v1');
      const keys = await cache.keys();
      return keys.map((request) => new URL(request.url).pathname);
    });

    for (const path of [
      '/index.html',
      '/checkout.html',
      '/orders.html',
      '/plans.html',
      '/accessibility.html',
      '/offline.html',
    ]) {
      expect(cachedPaths.some((p) => p.endsWith(path))).toBe(true);
    }
  });

  test('serves a previously-cached page while offline', async ({
    page,
    context,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);

    await context.setOffline(true);
    // plans.html is precached on install, not visited yet in this test —
    // proves the whole-site precache, not a visited-pages-only cache.
    await page.goto('/plans.html');
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
  });

  test('falls back to offline.html for an uncached navigation while offline', async ({
    page,
    context,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);

    await context.setOffline(true);
    await page.goto('/does-not-exist.html');
    await expect(
      page.getByRole('heading', { name: 'Offline access' }),
    ).toBeVisible();
  });

  test('offline.html shows a real cache timestamp after a service worker update', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);
    // The "sw-updated" message (sent from activate) needs a moment to
    // reach the page and be written to localStorage.
    await page.waitForFunction(
      () => localStorage.getItem('offline-cached-at') !== null,
    );

    await page.goto('/offline.html');
    await expect(page.locator('#offline-cache-status')).toContainText(
      'This version of the site was cached on',
    );
  });

  test('"Clear offline data" unregisters the worker and empties the cache', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);

    await page.goto('/offline.html');
    await page.getByRole('button', { name: 'Clear offline data' }).click();
    await expect(page.locator('#offline-page-status')).toHaveText(
      'Offline data cleared. This site will be re-cached automatically next time you visit while online.',
    );

    const remaining = await page.evaluate(() => caches.keys());
    expect(remaining).toHaveLength(0);

    const registrations = await page.evaluate(() =>
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.length),
    );
    expect(registrations).toBe(0);
  });
});
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `npx playwright test tests/service-worker.spec.ts --project=Desktop`
Expected: FAIL — no page loads `service-worker-register.js` yet, so nothing ever registers.

- [ ] **Step 4: Wire the registration script into all six pages**

In each of `public/index.html`, `public/checkout.html`, `public/orders.html`, `public/plans.html`, `public/accessibility.html`, `public/offline.html`, find the line `<script src="assets/js/connectivity-badge.js"></script>` (added in Task 4) and add immediately after it:

```html
  <script src="assets/js/service-worker-register.js"></script>
```

- [ ] **Step 5: Run it again, confirm it passes**

Run: `npx playwright test tests/service-worker.spec.ts --project=Desktop`
Expected: PASS (5 tests).

- [ ] **Step 6: Lint and format**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add public/assets/js/service-worker-register.js public/index.html public/checkout.html public/orders.html public/plans.html public/accessibility.html public/offline.html tests/service-worker.spec.ts
git commit -m "feat: register service worker and wire update messaging"
```

---

## Task 6: Visual regression baselines, README, full suite verification

**Files:**
- Modify: `tests/visual-regression.spec.ts`
- Modify: `README.md`
- Create/Modify: `tests/visual-regression.spec.ts-snapshots/*` (regenerated)

**Interfaces:** none — this task verifies and documents the finished feature, no new code contracts.

- [ ] **Step 1: Add offline.html to the visual regression page list**

In `tests/visual-regression.spec.ts`, change:

```ts
const PAGES = [
  'index.html',
  'checkout.html',
  'orders.html',
  'plans.html',
  'accessibility.html',
];
```

to:

```ts
const PAGES = [
  'index.html',
  'checkout.html',
  'orders.html',
  'plans.html',
  'accessibility.html',
  'offline.html',
];
```

- [ ] **Step 2: Regenerate baselines**

The header now carries the connectivity badge on every page (Task 4), which changes every existing screenshot; `offline.html` has no baseline yet.

Run: `npx playwright test tests/visual-regression.spec.ts --update-snapshots`
Expected: completes, creating/updating PNGs under `tests/visual-regression.spec.ts-snapshots/`.

- [ ] **Step 3: Confirm the suite is now stable**

Run: `npm run test:visual`
Expected: PASS — re-running immediately after an update should produce zero diffs.

- [ ] **Step 4: Update the README catalogue**

In `README.md`, add a row to the "Catalogue" table (after the "Order history" row):

```markdown
| Offline access | `public/offline.html` | Service worker caching, connectivity status, live regions |
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, all projects (Mobile, Tablet, Desktop).

- [ ] **Step 6: Run the full lint suite**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/visual-regression.spec.ts tests/visual-regression.spec.ts-snapshots README.md
git commit -m "test: regenerate visual baselines and document offline.html"
```

---

## Task 7: Write findings back to the book repo

**Files:**
- Create: `/Users/philsherry/Projects/philsherry/accessibility-champion/.claude/research/offline-caching-demo-site-trial.md` (a **separate git repository** from this one — commit there independently, do not mix into this repo's history)

**Interfaces:** none.

- [ ] **Step 1: Write the findings note**

```markdown
<!-- accessibility-champion/.claude/research/offline-caching-demo-site-trial.md -->
```

```md
# Offline caching — findings from the demo-site trial

Trial run of `.planning/backlog/feat-offline-caching.md`, built first on `accessibility-champion-demos` (a static, no-build-step site) to de-risk the approach before attempting it on this SvelteKit site. Full design: `accessibility-champion-demos/docs/superpowers/specs/2026-07-10-offline-caching-design.md`. Implementation plan: `accessibility-champion-demos/docs/superpowers/plans/2026-07-10-offline-caching.md`.

## What worked

- **Hand-rolled service worker, no `vite-plugin-pwa`.** The demo site has no build step, so this doesn't directly resolve the book backlog item's flagged `vite-plugin-pwa`/SvelteKit-2/Svelte-5/adapter-node dependency conflicts — but it does prove the underlying caching *strategy* (versioned cache name, precache-on-install, stale-while-revalidate fetch handler, offline-page fallback) works well independent of any build tool. Worth trying the same hand-rolled approach directly in SvelteKit (a service worker is framework-agnostic — it's a plain script the browser fetches) before reaching for `vite-plugin-pwa` again.
- **Reference implementation**: `resilientwebdesign.com/serviceworker.js` (Jeremy Keith, same author as the backlog's cited resources) is a working, no-build-tool service worker doing exactly this. Read directly from the live site — a good model to re-check against for the book site.
- **Manual cache-version bump** as the invalidation strategy is simple and legible, but only stays correct if the version string is actually bumped on every content-affecting deploy — worth automating in CI for the book site (e.g. a deploy step that sed-replaces the version string with a build timestamp) rather than relying on a human remembering, given how much more frequently the book's content changes than this demo's.
- **Silent background refresh (stale-while-revalidate) with a status line**, rather than a manual "update available" prompt, avoided interrupting a reader mid-page and needed no extra UI state machine. Recommended default for the book site too, unless a stronger case emerges for the book's own eventual three-button (save/remove/update) design.

## Gotchas specific to this hosting setup

- **GitHub Pages project-site subpath.** This demo serves from `philsherry.github.io/accessibility-champion-demos/`, not a custom domain — every path in the service worker (`importScripts`, `cache.addAll` entries, the registration call itself) had to be relative with no leading slash, or it would resolve to the domain root and 404. The book site likely serves from a custom domain or a different path structure — check this assumption doesn't silently carry over.
- **`cache.addAll()` is all-or-nothing.** If any single precached URL 404s, the entire `install` step rejects and nothing gets cached — no partial credit. Worth an explicit smoke test in CI that hits every precached URL before deploy.

## Async-waitUntil polyfill research (may not apply to the book site)

Investigated whether to vendor `https://github.com/jakearchibald/async-waituntil-polyfill` (used by the reference implementation). Findings:

- The restriction it patches (`ExtendableEvent#waitUntil` had to be called synchronously) was a Chromium bug, fixed in **Chrome 60** (mid-2017).
- Safari didn't ship service workers until **Safari 11.1** (March 2018) — after the fix landed — so WebKit likely never had this bug.
- The population it protects: old Android devices/WebViews stuck on Chrome 40–59, unable to upgrade the browser without upgrading the OS/hardware.

Decided to include it on the demo site given this project's economic-accessibility ("poverty-driven design") thread — old, non-upgradable Android devices are a real population in that context. Whether this is worth the same inclusion on the book site depends on the book's actual traffic/audience data, if available; if not, the same reasoning (cheap, no downside on modern browsers, protects a real if narrow population) likely applies equally there.

## Explicitly did not need, at this site's scale

- Per-chapter/section selective save/remove UI — this site has no "chapters"; precaching the whole site was simple and safe given its size (a few hundred KB total). **Won't transfer directly** — the book's prerendered HTML export is ~4.6MB unminified per the backlog item, so "cache everything" may not be viable there. This is the item most worth re-examining early when starting the book-site implementation, since it changes the entire caching strategy (whole-book vs. selected-chapters) rather than being a minor detail.
- Syncing read/bookmark state to a server, and the `STAGING_GATE` prerendered-page-bypasses-auth concern — neither applies to this repo (no accounts, no staging/auth gate) but both are real constraints for the book site and remain open there.
```

- [ ] **Step 2: Commit in the book repo**

```bash
git -C /Users/philsherry/Projects/philsherry/accessibility-champion add .claude/research/offline-caching-demo-site-trial.md
git -C /Users/philsherry/Projects/philsherry/accessibility-champion commit -m "docs: capture offline-caching findings from the demo-site trial"
```

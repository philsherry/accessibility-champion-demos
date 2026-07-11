import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const CACHE_NAME = 'nip-claw-__BUILD_ID__';

const REQUIRED_PRECACHED_PATHS = [
  '/index.html',
  '/checkout.html',
  '/orders.html',
  '/subscriptions.html',
  '/accessibility.html',
  '/offline.html',
  '/admin.html',
  '/receipt.html',
];

// Waits for the precache to actually finish. Cache.addAll() is atomic
// only in its failure handling (all-or-nothing on error) — individual
// entries can land in the cache one at a time as each fetch resolves,
// well before the overall addAll() promise settles. Checking for "the
// cache has any entries at all" caught that half-populated state and
// made this flaky; waiting for every required page path specifically
// does not.
async function waitForPrecache(page: Page) {
  await page.waitForFunction(
    async ({ cacheName, requiredPaths }) => {
      if (!('caches' in window)) return false;
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const cachedPaths = keys.map((request) => new URL(request.url).pathname);
      return requiredPaths.every((path) =>
        cachedPaths.some((p) => p.endsWith(path)),
      );
    },
    { cacheName: CACHE_NAME, requiredPaths: REQUIRED_PRECACHED_PATHS },
    { timeout: 15_000 },
  );
}

// Serial, not parallel: service workers register per-origin, and every
// test in this file hits the same origin (see playwright.config.ts's
// webServer). Running them concurrently (this project's default) raced
// registration/precache/unregister state across workers — a different
// test failed on each of several otherwise-identical runs, all pointing
// at the same shared-origin SW state rather than a real bug in any
// individual test.
//
// retries: Mobile/Tablet/Desktop are separate Playwright *projects*, and
// projects run in parallel with each other by default regardless of this
// file's own serial mode — so the very first test in this file can still
// get run by all three projects at once, each doing a full ~30-file
// precache burst against the one lightweight dev http-server backing
// this suite. That occasionally exceeds what the server can service
// within this test's wait timeout — a test-infrastructure contention
// artifact under this project's parallel-projects model, not a product
// bug (verified extensively via direct browser testing). A couple of
// local retries absorb it; CI already retries once via the top-level
// config.
test.describe.configure({ mode: 'serial', retries: 2 });

test.describe('service worker', () => {
  test('registers and precaches every page on first visit', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await waitForPrecache(page);

    const cachedPaths = await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      return keys.map((request) => new URL(request.url).pathname);
    }, CACHE_NAME);

    for (const path of REQUIRED_PRECACHED_PATHS) {
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
    // subscriptions.html is precached on install, not visited yet in this
    // test — proves the whole-site precache, not a visited-pages-only
    // cache.
    await page.goto('/subscriptions.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
      { timeout: 15_000 },
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
      navigator.serviceWorker.getRegistrations().then((regs) => regs.length),
    );
    expect(registrations).toBe(0);
  });
});

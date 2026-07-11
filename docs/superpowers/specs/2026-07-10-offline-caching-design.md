# Offline caching — design spec

**Status:** approved, ready for planning
**Origin:** trial run of the book repo's backlog item `accessibility-champion/.planning/backlog/feat-offline-caching.md` — this demo site is the testbed before attempting the same on the book's SvelteKit site.

## Why here first

The book's offline-caching backlog item flags a known risk: previous attempts to use `vite-plugin-pwa` on the SvelteKit stack (SvelteKit 2, Svelte 5, `adapter-node`) caused dependency pain. This repo has no build step and no framework — a hand-rolled service worker sidesteps that risk entirely and lets us prove the caching strategy, the accessible offline UX, and the cache-invalidation approach in isolation, before carrying the lessons back to the harder SvelteKit case.

## Reference implementation

`resilientwebdesign.com` (Jeremy Keith — author of both *Going Offline* and *Resilient Web Design*, cited as resources in the book's backlog item) runs a hand-rolled, no-build-tool service worker at `resilientwebdesign.com/serviceworker.js`. It uses:

- A versioned cache name, bumped manually per deploy to bust stale caches.
- Precache-everything on `install`.
- Cache-first, refresh-in-background (stale-while-revalidate) on `fetch`.
- An offline fallback page for failed HTML navigations, and an inline SVG placeholder for failed image requests.
- `importScripts('/js/async-waituntil.js')` — Jake Archibald's polyfill allowing `event.waitUntil()` to be called asynchronously from within a `.then()`.

This is the pattern this trial adapts, adjusted for GitHub Pages subpath deployment (`philsherry.github.io/accessibility-champion-demos/`, no custom domain).

## 1. Service worker & cache strategy

- **File**: `public/service-worker.js`. No build tooling, no `vite-plugin-pwa`.
- **Versioned cache name** (e.g. `nip-claw-v1`). Bumping the version string is a manual step taken on deploy when a cache refresh should be forced — consistent with this repo's no-build-step philosophy and the reference implementation's approach.
- **`install`**: precache all pages (`index.html`, `checkout.html`, `orders.html`, `plans.html`, `accessibility.html`, `offline.html`), their CSS/JS under `assets/`, icons, and `site.webmanifest`. The whole site is small enough (a few hundred KB) to cache in full — no "cache only visited pages" fallback needed at this scale.
- **`activate`**: delete any cache not matching the current version string, then `clients.claim()`.
- **`fetch`**: cache-first, refresh-in-background (stale-while-revalidate). Serves instantly from cache; kicks off a background re-fetch to update the cache for next time. A page already rendered is never rewritten mid-read — only the *next* navigation sees updated content.
- **Registration**: a small script registers the worker with a relative scope (`./service-worker.js`, scope `./`) so it resolves correctly under the `/accessibility-champion-demos/` GitHub Pages subpath — the same class of path issue already fixed for the web manifest's icon paths.

### Async-waitUntil polyfill

Vendored locally (e.g. `public/assets/js/async-waituntil-polyfill.js`) and imported via `importScripts()` at the top of `service-worker.js`, matching the reference implementation.

**Why**: the underlying restriction (`waitUntil()` had to be called synchronously during event dispatch) was a Chromium bug ([issue 621440](https://issues.chromium.org/issues/40519540)), fixed in **Chrome 60** (mid-2017). Safari didn't ship service worker support until **Safari 11.1 / iOS 11.3** (March 2018) — after the spec fix landed — so WebKit likely never had this bug; old non-upgradable iPhones below that line don't run service workers at all regardless. The population this protects is old Android devices/WebViews stuck on **Chrome 40–59** (~2015–2017 vintage) that can't upgrade the browser without upgrading the OS or hardware — a real "still in circulation in poverty-affected contexts" scenario, and directly relevant given this project's economic-accessibility ("poverty-driven design") thread. The polyfill is ~30 lines, has no downside on modern browsers (the corrected behaviour is now spec-mandated everywhere), and gives the write-up a concrete, researched "who does this protect and why" story rather than a hand-wave.

## 2. Offline page & header status badge

### `public/offline.html`

New page, same header/nav/footer structure as the other five pages.

- Explains what's cached and why — framed around the resilience/progressive-enhancement ethos of the cited resources.
- Shows cache status: "Content last updated `<timestamp>`", where the timestamp is written to `localStorage` by the registration script whenever a background cache refresh completes.
- One control: **"Clear offline data"** — unregisters the service worker and clears the versioned cache via the Cache API, with a confirmation message and sensible focus handling after the action. Kept even under the silent-background-refresh model because a reader may want to reclaim storage or force a clean slate, and it's a good accessible-button pattern to demonstrate (clear label, confirmation, focus management).
- Doubles as the **offline fallback**: the service worker serves this page for any navigation request that fails entirely (matches the reference implementation's `/offline/` page).

### Header badge

Added to the shared header (duplicated across all six pages, same pattern as the existing theme-toggle fieldset), near the theme toggle:

- Visible text/icon indicator: "Online" / "Offline".
- Backed by a visually-hidden `aria-live="polite"` region that announces only on *change* ("You're back online" / "You're now offline — showing saved content"), not on every page load.
- Links to `offline.html`.

## 3. Accessibility & resilience considerations

- No mid-read content swap — stale-while-revalidate only affects the next navigation.
- Status changes are announced via `aria-live`, not signalled by colour/icon alone.
- The site must work identically with the service worker unregistered or unsupported — this is an enhancement layer, not a dependency.
- Cache payload stays small given the site's size, so storage-quota pressure on constrained devices isn't a real risk here — worth flagging in the write-up as a difference from the book's much larger HTML export, where the same assumption won't hold.
- `offline.html` gets the same test treatment as every other page: axe-core, HTML validation, keyboard traversal, at all three viewports — no exemption for being a utility page.

## 4. Testing

Extends the existing Playwright suite:

- New spec: service worker registers; all pages + `offline.html` are precached after first load.
- Simulated offline (`context.setOffline(true)`): previously-visited pages still render from cache; an unvisited-but-precached page also still renders (whole-site precache, not visited-only); header badge announces the state change via the live region.
- `offline.html` added to the existing per-page axe/html-validate/keyboard-traversal test loop.
- Manual check via DevTools network throttling: background refresh doesn't interrupt an in-progress read.

## 5. Explicitly out of scope

These are real parts of the book's backlog item but don't apply to this six-page static commerce demo:

- Per-chapter/section selective save/remove UI — no "chapters" here; whole-site precache answers the backlog's "whole-book vs selected-chapters" question for the small-site case.
- Syncing "mark as read"/bookmark state to a server — no accounts or server-side state in this repo.
- `STAGING_GATE` / prerendered-page-bypasses-auth concern — no staging environment or auth gate exists here.
- The `vite-plugin-pwa` dependency risk — moot; this trial hand-rolls with zero build tooling.

## 6. Write-up

Once built and verified, findings get written to `accessibility-champion/.claude/research/` in the book repo (not this repo), covering: version-bump cache-busting, the GitHub Pages subpath scoping gotcha, stale-while-revalidate as the chosen update model, the async-waitUntil research and decision, and the explicit non-applicability of the five out-of-scope items above — so the book repo's implementation can start from tested conclusions rather than open questions.

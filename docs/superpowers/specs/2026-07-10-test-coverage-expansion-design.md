# Test coverage expansion: component tests + e2e journeys

## Purpose

Educational, not just coverage-for-coverage's-sake: this repo is read by readers of *Accessibility Champion* as a worked example. The new tests should model two distinct testing concerns clearly enough that a reader can tell them apart at a glance — "one region in isolation" vs. "a full cross-page user journey" — and the directory structure itself should teach that distinction.

## Scope

Four component specs, four e2e specs, one small feature addition (reorder), two shared-code extractions (`public/_shared/js/` and `tests/utilities/`) that the new work would otherwise duplicate, and one markup/CSS fix (skip link visibility — see below).

## Skip link: always-visible, not hidden-until-focus

The book's chapter text (06030-document-structure.md) describes skip links as "usually hidden until it receives keyboard focus" — but the book's *own live site* doesn't follow that; its skip link sits permanently visible at the top of every page. This demo previously matched the chapter's general description (hidden-until-focus) rather than the book's own implementation. Changed `.skip-link` in `public/_shared/base.css` to always-visible (removed the `position: absolute; top: -100%` / `:focus` reveal), matching the book's site. Wording stays "Skip to main content" — plain and unambiguous, matching both the chapter text and the book's own site (no themed variant).

This also lines up with a point the book makes elsewhere: accessibility-first as a methodology means giving everyone the same experience, not hiding things of value from some users and revealing them only to others on request. A skip link that only sighted keyboard users ever see (because it's hidden until focus) is arguably the opposite of that — an always-visible skip link is available to everyone equally, not gated behind a specific interaction.

This is a header-site concern, done before `header-site.spec.ts` is written so the new component test encodes the current, correct behavior rather than needing rework immediately after.

## Directory structure

```
tests/
  components/
    header-site.spec.ts       # supersedes + deletes tests/header-nav.spec.ts
    filter-bar.spec.ts         # absorbs the filter test from index.spec.ts
    product-cards.spec.ts      # absorbs the card-count check from index.spec.ts
    footer-site.spec.ts        # new — no existing coverage
  e2e/
    purchase-flow.spec.ts      # filter → add to cart → checkout → confirm
    checkout-recovery.spec.ts  # invalid submit → error summary → fix → resubmit
    cross-page-nav.spec.ts     # keyboard-only journey across index/plans/orders/checkout
    reorder.spec.ts            # orders.html reorder → cart updates (new behavior, see below)
  utilities/
    pages.ts                   # canonical per-page metadata shared by component specs
  axe-helpers.ts, keyboard-helpers.ts   # unchanged, reused by all of the above
  *.spec.ts                    # existing page specs stay, minus what moved out
```

`tests/utilities/pages.ts` exports the metadata `header-site.spec.ts` and `footer-site.spec.ts` both need to loop over all 5 pages without duplicating a hardcoded list twice — path, and which (if any) main-nav link should carry `aria-current="page"` for that page. `accessibility.html` isn't reachable from the main header nav at all (only Products/Subscriptions/My Orders are) — its row records no expected `aria-current` target, and the header-site spec asserts none of the 3 nav links are current on that page.

## Component tests

Each spec tests one region "in isolation" — meaning: scoped to that region's own behavior and structure, but still exercised on every real page that mounts it, since drift between pages is exactly the bug class a component test should catch. (It already caught one — see Fixes below.)

- **header-site.spec.ts** — loops all 5 pages. Absorbs the existing tab-order/tagline-visibility assertions from `header-nav.spec.ts` (currently index.html-only) and extends them across all 5. Adds: correct `aria-current="page"` placement per page (including the checkout.html special case where the *cart link*, not a nav link, carries it). Also absorbs the skip-link-bypasses-header check — currently duplicated identically across **all 5** page specs (`index`, `checkout`, `orders`, `plans`, `accessibility-statement.spec.ts`, each calling the same `expectSkipLinkBypassesHeader` helper) — deleting it from each page spec once it's consolidated here.
- **filter-bar.spec.ts** — index.html only (the only page with this region). Absorbs the existing filter-click test from `index.spec.ts`. Adds: keyboard operability (Tab + Enter/Space activates a filter button), the "All strains" reset path, and the singular/plural grammar branch in the live-region announcement (1 result vs. N results).
- **product-cards.spec.ts** — index.html only. Absorbs the card-count-after-filter check from `index.spec.ts`. Adds: each card's heading level, each "Add to cart" button's accessible name is unique (via its `sr-only` product-name suffix), and decorative elements are correctly `aria-hidden`.
- **footer-site.spec.ts** — loops all 5 pages. New. Asserts `role="contentinfo"`, and that every page's footer contains a link to the accessibility statement page.

## Fix surfaced by footer-site.spec.ts

`index.html`'s footer is missing the "· Accessibility statement" link present on the other 4 pages — a real inconsistency, not just a coverage gap. Fixed as part of this work (red test on discovery → fix → green), rather than landing a spec that starts out failing.

## E2E journeys

Cross-page user flows, testing the seams between pages rather than any one region.

- **purchase-flow.spec.ts** — filter products on index.html, add one to cart, follow the cart link to checkout, submit a valid order, land on the confirmation state.
- **checkout-recovery.spec.ts** — submit checkout with invalid data, confirm focus moves to the error summary, fix the fields, resubmit, confirm success — a full recovery loop, vs. `checkout.spec.ts`'s existing single-shot "hits the error state" check.
- **cross-page-nav.spec.ts** — keyboard-only, moves between index → plans → orders → checkout via the header nav, confirming `aria-current` and focus land correctly at each stop (this is the "does it hold across a real journey" complement to header-site.spec.ts's per-page snapshot checks).
- **reorder.spec.ts** — from orders.html, click a reorder button, confirm the cart-count badge increments and the live region announces it. Requires the feature addition below, built test-first (write the failing test against current no-op buttons, then implement).

## Feature addition: reorder behavior

`orders.html`'s reorder buttons currently have no click handler at all — they exist solely to demonstrate the accessible-icon-button-naming pattern (Ch. 06021), not as a working feature. Making `reorder.spec.ts` meaningful requires wiring them up.

**Shared module: `public/_shared/js/cart.js`** — extracted from `index.html`'s inline `addToCart`, since orders.html now needs the same "increment count, update badge/aria-label, announce via live region" logic and duplicating it inline a second time is exactly the kind of drift this whole effort is trying to eliminate:

```js
let cartCount = 2;

function addProductToCart(btn) {
  const product = btn.dataset.product;
  cartCount++;
  document.querySelector('.cart-count').textContent = cartCount;
  document.querySelector('.cart-link').setAttribute('aria-label', `Cart, ${cartCount} items`);

  const liveRegion = document.getElementById('cart-status');
  liveRegion.textContent = '';
  void liveRegion.offsetWidth; // force re-announcement even if text is unchanged
  liveRegion.textContent = `${product} added to cart. Cart now contains ${cartCount} items.`;
}
```

- `index.html` keeps a small inline `addToCart(btn)` wrapper: calls `addProductToCart(btn)`, then shows the toast (toast stays index.html-only — its CSS is local to that page's `<style>` block, and it's sighted-user-only supplementary feedback per `TODO.md` item 6, not something orders.html's reorder needs to duplicate).
- `orders.html`'s reorder buttons call `addProductToCart(this)` directly (no wrapper needed) — each button needs a new `data-product="<name>"` attribute added (currently only `aria-label` carries the product name).
- `orders.html` gains a `#cart-status` live region: `<div id="cart-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`, reusing the shared `.sr-only` utility class — not a new bespoke CSS block.
- **Consolidation:** `index.html`'s existing `#cart-status` rule is a duplicate, unconditional reimplementation of `.sr-only` (unlike the `orders-table thead` rule, which legitimately can't use `.sr-only` because it's conditionally scoped to one breakpoint). Drop that duplicate CSS block and apply the `.sr-only` class to `index.html`'s `#cart-status` element too, matching orders.html.

## Out of scope

- `nav-site` as its own spec (folded into header-site — not independently reachable elsewhere on the page).
- Toast notification pattern review (`TODO.md` item 6 — separate, already-tracked work).
- Any change to `checkout.html`, `plans.html`, or `accessibility.html` markup beyond what the header/footer component specs read.

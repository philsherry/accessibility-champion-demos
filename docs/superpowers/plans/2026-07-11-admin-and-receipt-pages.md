# Admin and Receipt Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `admin.html` (a staff order-management view: filterable table, per-row status update with save confirmation) and `receipt.html` (a subscription order receipt reached from checkout, with a print stylesheet and a share button), per `docs/superpowers/specs/2026-07-11-admin-and-receipt-pages-design.md`.

**Architecture:** Both pages follow this repo's established per-page pattern — hand-duplicated header/footer markup, one CSS file and one JS file per page, no build step. Two small DRY prerequisites land first: `PLANS` (subscription data) moves out of `checkout.js` into a shared `plans-data.js` global script so `receipt.js` can reuse it without duplication, and `.filter-bar`/`.filter-btn` move from `index.css` into `base.css` so `admin.html` can reuse the exact same filter pattern `index.html` already has. `admin.html`'s table is `orders.html`'s accessible-table pattern made editable (native `<select>` + explicit Save button, not save-on-change, to avoid a WCAG 3.2.2 change-of-context), with `localStorage`-backed status persistence and Customizable-Select styling behind `@supports`.

**Tech Stack:** Plain HTML/CSS/JS (no framework, no build step), Playwright + `@axe-core/playwright` for tests, stylelint/eslint/prettier/djlint for linting.

## Global Constraints

- CSS class names: kebab-case, optional `--modifier` suffix (stylelint `selector-class-pattern`).
- Visually-hidden text uses the existing `.sr-only` utility class (`public/assets/css/base.css`), not a new class.
- Inline SVG icons use the existing `.icon` class — no inline `stroke`/`fill` attributes on the SVG itself, only `viewBox` and shape elements.
- Touch targets: `var(--target-min)` (44px) on every interactive element.
- `public/assets/js/*.js` files are plain classic scripts (`sourceType: 'script'`), not ES modules — no `import`/`export`.
- CSS colour functions use modern space-separated syntax; dark-mode values use `light-dark(<light>, <dark>)` inline in each token (this repo's *current* pattern — not the older `@media (prefers-color-scheme)`/`[data-user-color-scheme]` block style used before the `light-dark()` consolidation).
- Test locators follow `CONVENTIONS.md`: accessible role/label first, `data-testid`/`data-component` only when no accessible name distinguishes siblings.
- Every new/edited CSS file must stay `stylelint` and `prettier --check` clean; every new/edited JS file must stay `eslint` clean; every new/edited HTML file must stay `djlint` clean. Run `npm run lint` before each commit that touches CSS/JS/HTML.
- `npm test` (Playwright, non-visual) must stay green after every task from Task 8 onward.
- New pages get the same 4 shared scripts every existing page loads, in this order: `theme.js`, `connectivity-badge.js`, `service-worker-register.js`, `cart.js` — even where a page doesn't use all of it (e.g. neither new page calls `addProductToCart`), for consistency with every other page's chrome.

---

### Task 1: Extract `PLANS` into a shared `plans-data.js`

`checkout.js` currently declares `const PLANS = {...}` inline. `receipt.js` (Task 12) needs the exact same data. Rather than duplicate it, extract it to its own classic script, loaded before both `checkout.js` and the new `receipt.js` — same "shared global via script load order" pattern `eslint.config.js` already documents for `addProductToCart` (declared in `cart.js`, consumed from `index.js`/`orders.js`).

**Files:**
- Create: `public/assets/js/plans-data.js`
- Modify: `public/assets/js/checkout.js:9-33` (delete the `PLANS` declaration)
- Modify: `public/checkout.html` (add the new `<script>` tag)
- Modify: `eslint.config.js` (declare `PLANS` as a shared global)

**Interfaces:**
- Produces: `PLANS` — a page-global object, `{ catnap: PlanData, zoomies: PlanData, fullsend: PlanData }` where `PlanData = { name: string, price: number, taglineParts: [string, boolean][], promo: boolean }`.

- [ ] **Step 1: Create `plans-data.js`**

```javascript
/**
 * Subscription plan data — shared between checkout.html (checkout.js)
 * and receipt.html (receipt.js). A page-global classic script (no
 * bundler on this site, so every <script src> shares one global scope
 * in load order) — same pattern as cart.js's addProductToCart.
 */
const PLANS = {
  catnap: {
    name: 'The Catnap',
    price: 9,
    taglineParts: [
      ['For the cat who has ', false],
      ['a', true],
      [' Tuesday', false],
    ],
    promo: false,
  },
  zoomies: {
    name: 'The Zoomies',
    price: 19,
    taglineParts: [
      ['For the cat who has ', false],
      ['every', true],
      [' Tuesday', false],
    ],
    promo: true,
  },
  fullsend: {
    name: 'The Full Send',
    price: 29,
    taglineParts: [['For the cat who has already made their decision', false]],
    promo: false,
  },
};
```

- [ ] **Step 2: Remove the inline declaration from `checkout.js`**

In `public/assets/js/checkout.js`, delete lines 9-33 (the `const PLANS = { ... };` block) and the file's opening comment's reference to it, so the file now starts:

```javascript
/**
 * Checkout page (checkout.html) — populates the order summary from the
 * `?plan=` query param, and validates the checkout form on submit.
 *
 * PLANS is declared in plans-data.js, loaded before this file.
 */

const params = new URLSearchParams(location.search);
const planKey = params.get('plan') || 'zoomies';
const plan = PLANS[planKey] || PLANS.zoomies;
```

- [ ] **Step 3: Load `plans-data.js` before `checkout.js` in `checkout.html`**

In `public/checkout.html`, find the closing script tags:

```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/connectivity-badge.js"></script>
  <script src="assets/js/service-worker-register.js"></script>
  <script src="assets/js/checkout.js"></script>
```

Replace with:

```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/connectivity-badge.js"></script>
  <script src="assets/js/service-worker-register.js"></script>
  <script src="assets/js/plans-data.js"></script>
  <script src="assets/js/checkout.js"></script>
```

- [ ] **Step 4: Declare the shared global in `eslint.config.js`**

In `eslint.config.js`, find this block (currently scoped to `index.js`/`orders.js` for `addProductToCart`):

```javascript
  {
    files: ['public/assets/js/index.js', 'public/assets/js/orders.js'],
    languageOptions: {
      globals: { addProductToCart: 'readonly' },
    },
  },
```

Add a new block immediately after it:

```javascript
  // PLANS is declared in plans-data.js and consumed from checkout.js and
  // receipt.js — same shared-global-via-script-order reasoning as
  // addProductToCart above.
  {
    files: ['public/assets/js/checkout.js', 'public/assets/js/receipt.js'],
    languageOptions: {
      globals: { PLANS: 'readonly' },
    },
  },
```

- [ ] **Step 5: Verify**

Run: `npx eslint . && npx djlint public/checkout.html`
Expected: no errors.

Run: `npx playwright test tests/e2e/checkout-recovery.spec.ts tests/e2e/purchase-flow.spec.ts --project=Desktop --grep-invert @visual`
Expected: PASS — confirms checkout.html still works with `PLANS` loaded from the new file instead of declared inline.

- [ ] **Step 6: Commit**

```bash
git add public/assets/js/plans-data.js public/assets/js/checkout.js public/checkout.html eslint.config.js
git commit -m "refactor: extract PLANS into shared plans-data.js"
```

---

### Task 2: Add the `cancelled` order status (token + badge)

`admin.html`'s mock data (Task 9) needs a `Cancelled` status. Only `processing`, `shipped`, and `delivered` currently exist.

**Files:**
- Modify: `public/assets/css/tokens.css`
- Modify: `public/assets/css/base.css`

**Interfaces:**
- Produces: `--color-status-cancelled-bg`, `--color-status-cancelled-text` (tokens.css); `.status-cancelled` (base.css) — consumed by Task 9's admin.html markup and Task 8's Customizable Select CSS.

- [ ] **Step 1: Add the tokens**

In `public/assets/css/tokens.css`, find:

```css
  --color-status-shipped-bg: light-dark(#e0f2fe, #0c2d45);
  --color-status-shipped-text: light-dark(#075985, #7dd3fc);
```

Replace with:

```css
  --color-status-shipped-bg: light-dark(#e0f2fe, #0c2d45);
  --color-status-shipped-text: light-dark(#075985, #7dd3fc);
  --color-status-cancelled-bg: light-dark(#f3f4f6, #292524);
  --color-status-cancelled-text: light-dark(#57534e, #d6d3d1); /* 5.6:1 light, 8.9:1 dark */
```

- [ ] **Step 2: Add the badge rule**

In `public/assets/css/base.css`, find:

```css
.status-shipped {
  background: var(--color-status-shipped-bg);
  color: var(--color-status-shipped-text);
}
```

Replace with:

```css
.status-shipped {
  background: var(--color-status-shipped-bg);
  color: var(--color-status-shipped-text);
}

.status-cancelled {
  background: var(--color-status-cancelled-bg);
  color: var(--color-status-cancelled-text);
}
```

- [ ] **Step 3: Verify**

Run: `npx stylelint "public/*.html" "public/assets/css/*.css"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add public/assets/css/tokens.css public/assets/css/base.css
git commit -m "feat: add cancelled order-status token and badge"
```

---

### Task 3: Move `.filter-bar`/`.filter-btn` from `index.css` to `base.css`

`admin.html` (Task 9) reuses this exact filter pattern for its status filter. Relocating it to `base.css` (shared) rather than duplicating it in a new `admin.css` keeps one definition — `index.html`'s existing filter keeps working unchanged since it's the same selectors, just relocated.

**Files:**
- Modify: `public/assets/css/index.css`
- Modify: `public/assets/css/base.css`

- [ ] **Step 1: Remove the block from `index.css`**

In `public/assets/css/index.css`, delete this block entirely:

```css
/* Filter bar */
.filter-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-8);
}

.filter-btn {
  padding: var(--space-2) var(--space-5);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-muted);
  cursor: pointer;
  min-height: var(--target-min);
  transition: all var(--transition-fast);
}

.filter-btn:hover,
.filter-btn:focus-visible {
  border-color: var(--color-brand-text);
  color: var(--color-brand-text);
}

.filter-btn[aria-pressed='true'] {
  background: var(--color-brand);
  color: var(--color-white);
  border-color: var(--color-brand);
}
```

- [ ] **Step 2: Add it to `base.css`**

In `public/assets/css/base.css`, immediately before the `/* Badges / status chips */` section banner (before `.status-badge`), add:

```css
/* -------------------------------------------------- */

/* Filter bar — shared by index.html (strain type) and admin.html (order status) */

/* -------------------------------------------------- */

.filter-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-8);
}

.filter-btn {
  padding: var(--space-2) var(--space-5);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-muted);
  cursor: pointer;
  min-height: var(--target-min);
  transition: all var(--transition-fast);
}

.filter-btn:hover,
.filter-btn:focus-visible {
  border-color: var(--color-brand-text);
  color: var(--color-brand-text);
}

.filter-btn[aria-pressed='true'] {
  background: var(--color-brand);
  color: var(--color-white);
  border-color: var(--color-brand);
}
```

- [ ] **Step 3: Verify**

Run: `npx stylelint "public/*.html" "public/assets/css/*.css" && npx prettier --check public/assets/css/index.css public/assets/css/base.css`
Expected: no errors.

Run: `npx playwright test tests/components --project=Desktop --grep-invert @visual`
Expected: PASS — confirms `index.html`'s filter buttons still render/behave correctly from `base.css`.

- [ ] **Step 4: Commit**

```bash
git add public/assets/css/index.css public/assets/css/base.css
git commit -m "refactor: move filter-bar/filter-btn from index.css to base.css"
```

---

### Task 4: Add "Staff" footer link to every existing page

Adds the `admin.html` footer link (per the design's "Access" decision) to all 6 existing pages, appended to the same line as "Accessibility statement"/"Offline access". Omitted on `accessibility.html` and `offline.html`'s own pages? No — unlike those two, `admin.html` isn't itself one of these 6 pages, so every one of them gets the link with no self-omission case. (`admin.html`'s own footer, added in Task 9, omits linking to itself — matching the `accessibility.html`/`offline.html` self-omission convention.)

**Files:**
- Modify: `public/index.html`
- Modify: `public/orders.html`
- Modify: `public/checkout.html`
- Modify: `public/subscriptions.html`
- Modify: `public/accessibility.html`
- Modify: `public/offline.html`
- Modify: `tests/components/footer-site.spec.ts`

- [ ] **Step 1: `index.html`**

Find:

```html
          <div>
            This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a>
          </div>
```

Replace with:

```html
          <div>
            This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a> · <a href="admin.html">Staff</a>
          </div>
```

- [ ] **Step 2: `orders.html`, `checkout.html`, `subscriptions.html`**

In each of these three files, find:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a></div>
```

Replace with:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a> · <a href="admin.html">Staff</a></div>
```

- [ ] **Step 3: `accessibility.html`**

Find:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="offline.html">Offline access</a></div>
```

Replace with:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="offline.html">Offline access</a> · <a href="admin.html">Staff</a></div>
```

- [ ] **Step 4: `offline.html`**

Find:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a></div>
```

Replace with:

```html
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="admin.html">Staff</a></div>
```

- [ ] **Step 5: Write the footer-site.spec.ts test**

In `tests/components/footer-site.spec.ts`, find the closing brace of the last test block:

```typescript
    if (path === '/offline.html') {
      test('does not link to offline access, since this is that page', async ({
        page,
      }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Offline access' }),
        ).toHaveCount(0);
      });
    } else {
      test('links to offline access', async ({ page }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Offline access' }),
        ).toHaveAttribute('href', 'offline.html');
      });
    }
  });
}
```

Insert a new test immediately before the final `});` / `}`:

```typescript
    test('links to the staff admin view', async ({ page }) => {
      const footer = page.getByRole('contentinfo');
      await expect(
        footer.getByRole('link', { name: 'Staff' }),
      ).toHaveAttribute('href', 'admin.html');
    });
  });
}
```

- [ ] **Step 6: Run it — expected to fail**

Run: `npx playwright test tests/components/footer-site.spec.ts --project=Desktop`
Expected: FAIL for every page in `PAGES` — `admin.html` doesn't exist in the `PAGES` fixture yet, and the link only exists on the 6 pages just edited, not yet on `admin.html`/`receipt.html` (those are added in Tasks 9 and 12). This is expected at this point in the plan; it will pass fully once Task 5 adds both new pages to `PAGES` and Tasks 9/12 add their footers.

- [ ] **Step 7: Verify lint**

Run: `npx djlint public/index.html public/orders.html public/checkout.html public/subscriptions.html public/accessibility.html public/offline.html`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add public/index.html public/orders.html public/checkout.html public/subscriptions.html public/accessibility.html public/offline.html tests/components/footer-site.spec.ts
git commit -m "feat: add Staff footer link to every existing page"
```

---

### Task 5: Add `admin.html` and `receipt.html` to the `PAGES` test fixture

**Files:**
- Modify: `tests/utilities/pages.ts`

**Interfaces:**
- Produces: two new `PageMeta` entries in `PAGES`, consumed by every `tests/components/*.spec.ts` file that loops over `PAGES` (`footer-site.spec.ts`, `header-site.spec.ts`, `theme-toggle.spec.ts`).

- [ ] **Step 1: Add the entries**

In `tests/utilities/pages.ts`, find:

```typescript
  // Reachable via a footer link on every other page, not the main nav —
  // no nav link should be current here.
  { path: '/offline.html', currentNavLabel: null, cartHasAriaCurrent: false },
];
```

Replace with:

```typescript
  // Reachable via a footer link on every other page, not the main nav —
  // no nav link should be current here.
  { path: '/offline.html', currentNavLabel: null, cartHasAriaCurrent: false },
  // Staff-only, reachable via a footer link, not the main nav — no nav
  // link should be current here.
  { path: '/admin.html', currentNavLabel: null, cartHasAriaCurrent: false },
  // Reachable only from checkout's success state, not any nav — no nav
  // link should be current here.
  { path: '/receipt.html', currentNavLabel: null, cartHasAriaCurrent: false },
];
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json 2>/dev/null || npx eslint tests/utilities/pages.ts`
Expected: no type/lint errors (the two pages don't exist yet — that's fine, this fixture is just data, nothing resolves the path until a test actually calls `page.goto()`).

- [ ] **Step 3: Commit**

```bash
git add tests/utilities/pages.ts
git commit -m "test: add admin.html and receipt.html to the PAGES fixture"
```

---

### Task 6: `admin.css` — page styles including Customizable Select

**Files:**
- Create: `public/assets/css/admin.css`

**Interfaces:**
- Produces: `.admin-table` (responsive collapse pattern, same technique as `.orders-table`), `.status-select` (native + Customizable Select styling), `.staff-notice` (the no-gating joke banner).

- [ ] **Step 1: Write the file**

```css
.staff-notice {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  font-size: var(--text-sm);
}

.order-count {
  color: var(--color-muted);
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.status-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Native <select> baseline — every browser gets this regardless of
   Customizable Select support. */
.status-select {
  font-family: var(--font-family);
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  min-height: var(--target-min);
}

/* Customizable Select — colour-codes each option to match this site's
   existing status-badge palette. Every option keeps its real text label
   regardless of colour (the "golden rule" of this feature: colour is
   decoration, never the only signal — same principle already applied to
   .status-badge/.type-badge elsewhere on this site). Feature-detected:
   browsers without support fall through to the plain native <select>
   styled above, with full functionality either way. */
@supports (appearance: base-select) {
  .status-select {
    appearance: base-select;
  }

  .status-select::picker(select) {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-1);
    background: var(--color-surface);
  }

  .status-select option {
    display: flex;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 700;
  }

  .status-select option[value='processing'] {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }

  .status-select option[value='shipped'] {
    background: var(--color-status-shipped-bg);
    color: var(--color-status-shipped-text);
  }

  .status-select option[value='delivered'] {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .status-select option[value='cancelled'] {
    background: var(--color-status-cancelled-bg);
    color: var(--color-status-cancelled-text);
  }
}

/* Responsive: on narrow viewports, each row stacks — identical technique
   to .orders-table in orders.css, applied under a page-specific class
   name (this site's existing convention: each page's table gets its own
   class even though the underlying pattern repeats). */
@media (width <= 600px) {
  .admin-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .admin-table tr {
    display: block;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface);
  }

  .admin-table td,
  .admin-table th[scope='row'] {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-sm);
  }

  .admin-table td:last-child,
  .admin-table th[scope='row']:last-child {
    border-bottom: none;
  }

  .admin-table td::before {
    content: attr(data-label);
    font-weight: 700;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    margin-right: var(--space-4);
    flex-shrink: 0;
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx stylelint "public/assets/css/admin.css" && npx prettier --check public/assets/css/admin.css`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add public/assets/css/admin.css
git commit -m "feat: add admin.css"
```

---

### Task 7: `admin.js` — status update, persistence, filtering

**Files:**
- Create: `public/assets/js/admin.js`

**Interfaces:**
- Consumes: DOM structure from Task 9 — `[data-component="status-select"]` (with `data-order-id`), `[data-component="save-status-btn"]` (with `data-order-id`), `[data-component="admin-filter-btn"]` (with `data-filter`), `tr[data-order-id]` with a `<td data-label="Status">` containing a `.status-badge`, `#admin-status` live region.
- Produces: reads/writes `localStorage['admin-order-status']` as `Record<string, 'processing'|'shipped'|'delivered'|'cancelled'>`.

- [ ] **Step 1: Write the file**

```javascript
/**
 * Admin page (admin.html) — merges any saved status overrides from
 * localStorage over the static HTML defaults, wires each row's Save
 * button (native <select> + explicit Save, not save-on-change — a
 * <select> that saved immediately on `change` would trigger a change of
 * context purely from selecting a value, WCAG 3.2.2 territory), and
 * wires the status filter bar (identical interaction pattern to
 * index.html's strain filter, applied to order status instead).
 */

const STORAGE_KEY = 'admin-order-status';

const STATUS_LABELS = {
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * @returns {Record<string, string>} saved order-id -> status overrides.
 */
function readStoredStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Applies a status to one row: updates the visible badge's text/class,
 * and syncs the row's <select> to match.
 *
 * @param {HTMLTableRowElement} row
 * @param {string} status - one of STATUS_LABELS's keys.
 */
function applyStatusToRow(row, status) {
  const badge = row.querySelector('.status-badge');
  const select = row.querySelector('[data-component="status-select"]');
  if (!badge || !select) return;

  Object.keys(STATUS_LABELS).forEach((key) => {
    badge.classList.remove('status-' + key);
  });
  badge.classList.add('status-' + status);
  badge.textContent = STATUS_LABELS[status];
  select.value = status;
  row.dataset.status = status;
}

/* Merge stored overrides over the static HTML defaults before first
   render — same before-first-paint intent as theme-init.js, just for
   table state instead of the colour scheme. */
const stored = readStoredStatuses();
document.querySelectorAll('tr[data-order-id]').forEach((row) => {
  const orderId = row.dataset.orderId;
  if (orderId && stored[orderId]) {
    applyStatusToRow(row, stored[orderId]);
  }
});

/* Save buttons — commit the row's <select> value, persist it, announce it. */
document.querySelectorAll('[data-component="save-status-btn"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const orderId = btn.dataset.orderId;
    const row = btn.closest('tr');
    const select = row.querySelector('[data-component="status-select"]');
    if (!orderId || !row || !select) return;

    const status = select.value;
    applyStatusToRow(row, status);

    const all = readStoredStatuses();
    all[orderId] = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    const liveRegion = document.getElementById('admin-status');
    liveRegion.textContent = '';
    void liveRegion.offsetWidth; // force repaint so screen readers notice the change
    liveRegion.textContent =
      'Order #' + orderId + ' marked as ' + STATUS_LABELS[status] + '.';
  });
});

/* Filter bar — toggle aria-pressed, show/hide rows, announce result.
   Identical pattern to index.js's strain-type filter. */
document.querySelectorAll('[data-component="admin-filter-btn"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-component="admin-filter-btn"]').forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
    });
    btn.setAttribute('aria-pressed', 'true');

    const filter = btn.dataset.filter;
    const rows = document.querySelectorAll('tr[data-order-id]');
    let shown = 0;

    rows.forEach((row) => {
      if (filter === 'all' || row.dataset.status === filter) {
        row.hidden = false;
        shown++;
      } else {
        row.hidden = true;
      }
    });

    const liveRegion = document.getElementById('admin-status');
    liveRegion.textContent = '';
    void liveRegion.offsetWidth;
    liveRegion.textContent =
      filter === 'all'
        ? 'Showing all ' + shown + ' orders.'
        : 'Showing ' +
          shown +
          ' ' +
          STATUS_LABELS[filter] +
          ' order' +
          (shown !== 1 ? 's' : '') +
          '.';
  });
});
```

- [ ] **Step 2: Verify**

Run: `npx eslint public/assets/js/admin.js`
Expected: no errors. (This will fail until Task 8 adds `admin.js`'s file pattern to `eslint.config.js`'s classic-script block alongside `public/assets/js/*.js` — check `eslint.config.js`'s existing `files: ['public/assets/js/*.js']` block first; if `admin.js` matches that glob already, no config change is needed.)

- [ ] **Step 3: Commit**

```bash
git add public/assets/js/admin.js
git commit -m "feat: add admin.js"
```

---

### Task 8: `admin.html` — page markup

**Files:**
- Create: `public/admin.html`

- [ ] **Step 1: Write the file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="assets/js/theme-init.js"></script>
  <title>Staff — Order Management — Nip &amp; Claw</title>
  <meta name="description" content="Staff order-management view. No login required — see below for why.">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="#1e3d2f">
  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/admin.css">
</head>
<body>
  <div class="page-wrapper">

    <!-- Skip link — Section 6, Chapter 9 — Keyboard navigation and focus. -->
    <a href="#main" class="skip-link">Skip to main content</a>

    <header class="site-header" role="banner">
      <div class="inner">
        <a href="index.html" class="site-logo">
          <span class="wordmark">Nip &amp; Claw</span>
          <span class="tagline">purrveyors of the finest artisanal catnip</span>
        </a>
        <span class="connectivity-badge" data-component="connectivity-badge">
          <svg class="icon" data-component="connectivity-icon-online" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6 2 2 4-4"/><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"/></svg>
          <svg class="icon" data-component="connectivity-icon-offline" hidden viewBox="0 0 24 24" aria-hidden="true"><path d="M10.114 4.462A14.5 14.5 0 0 1 12 2a10 10 0 0 1 9.313 13.643"/><path d="M15.557 15.556A14.5 14.5 0 0 1 12 22 10 10 0 0 1 4.929 4.929"/><path d="M15.892 10.234A14.5 14.5 0 0 0 12 2a10 10 0 0 0-3.643.687"/><path d="M17.656 12H22"/><path d="M19.071 19.071A10 10 0 0 1 12 22 14.5 14.5 0 0 1 8.44 8.45"/><path d="M2 12h10"/><path d="m2 2 20 20"/></svg>
          <span data-component="connectivity-badge-label">Online</span>
        </span>
        <div id="connectivity-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
        <nav class="site-nav" aria-label="Main">
          <ul role="list">
            <li><a href="index.html">Products</a></li>
            <li><a href="subscriptions.html">Subscriptions</a></li>
            <li><a href="orders.html">My Orders</a></li>
          </ul>
        </nav>
        <div class="nav-cart">
          <a href="checkout.html" class="cart-link" aria-label="Cart, 2 items">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Cart
            <span class="cart-count" aria-hidden="true">2</span>
          </a>
        </div>
      </div>
    </header>

    <main id="main" class="main-content" tabindex="-1">

      <div class="page-heading">
        <h1>Staff — order management</h1>
        <p class="order-count">Showing 6 orders</p>
      </div>

      <!-- Live region for status-save and filter-result feedback. -->
      <div id="admin-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

      <p class="staff-notice">
        <strong>Authentication: none required.</strong> Cats assume everything already belongs to them, including the back office — so there's no login here.
      </p>

      <!-- Status filter bar — same interaction pattern as index.html's
           strain-type filter, applied to order status instead.
           Discussed in Section 6, Chapter 5 — Accessible HTML and
           Section 6, Chapter 12 — Live regions and error announcement. -->
      <div class="filter-bar" role="group" aria-label="Filter by status">
        <button type="button" class="filter-btn" aria-pressed="true" data-filter="all" data-component="admin-filter-btn">All orders</button>
        <button type="button" class="filter-btn" aria-pressed="false" data-filter="processing" data-component="admin-filter-btn">Processing</button>
        <button type="button" class="filter-btn" aria-pressed="false" data-filter="shipped" data-component="admin-filter-btn">Shipped</button>
        <button type="button" class="filter-btn" aria-pressed="false" data-filter="delivered" data-component="admin-filter-btn">Delivered</button>
        <button type="button" class="filter-btn" aria-pressed="false" data-filter="cancelled" data-component="admin-filter-btn">Cancelled</button>
      </div>

      <div class="table-wrapper">
        <table class="admin-table">
          <caption class="sr-only">All customer orders, most recent first</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Order date</th>
              <th scope="col">Strain</th>
              <th scope="col">Qty</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr data-order-id="1042" data-status="processing">
              <th scope="row" data-label="Order">#1042</th>
              <td data-label="Customer">Lucy Fur</td>
              <td data-label="Order date">26 May 2026</td>
              <td data-label="Strain">Girl Scout Mousies</td>
              <td data-label="Qty">2×10g</td>
              <td data-label="Total">£23.98</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-processing">Processing</span>
                  <label class="sr-only" for="status-1042">Status for order #1042</label>
                  <select id="status-1042" class="status-select" data-component="status-select" data-order-id="1042">
                    <option value="processing" selected>Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1042" aria-label="Save status for order #1042">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr data-order-id="1039" data-status="delivered">
              <th scope="row" data-label="Order">#1039</th>
              <td data-label="Customer">Lucy Fur</td>
              <td data-label="Order date">19 May 2026</td>
              <td data-label="Strain">Purple Whisker</td>
              <td data-label="Qty">1×10g</td>
              <td data-label="Total">£8.99</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-delivered">Delivered</span>
                  <label class="sr-only" for="status-1039">Status for order #1039</label>
                  <select id="status-1039" class="status-select" data-component="status-select" data-order-id="1039">
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered" selected>Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1039" aria-label="Save status for order #1039">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr data-order-id="1041" data-status="shipped">
              <th scope="row" data-label="Order">#1041</th>
              <td data-label="Customer">Princess Slayer</td>
              <td data-label="Order date">24 May 2026</td>
              <td data-label="Strain">Trainwreck (My Owner's Furniture)</td>
              <td data-label="Qty">1×10g</td>
              <td data-label="Total">£9.99</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-shipped">Shipped</span>
                  <label class="sr-only" for="status-1041">Status for order #1041</label>
                  <select id="status-1041" class="status-select" data-component="status-select" data-order-id="1041">
                    <option value="processing">Processing</option>
                    <option value="shipped" selected>Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1041" aria-label="Save status for order #1041">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr data-order-id="1037" data-status="cancelled">
              <th scope="row" data-label="Order">#1037</th>
              <td data-label="Customer">Princess Slayer</td>
              <td data-label="Order date">15 May 2026</td>
              <td data-label="Strain">Bruce Banner (Smash the Curtains)</td>
              <td data-label="Qty">2×10g</td>
              <td data-label="Total">£19.98</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-cancelled">Cancelled</span>
                  <label class="sr-only" for="status-1037">Status for order #1037</label>
                  <select id="status-1037" class="status-select" data-component="status-select" data-order-id="1037">
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled" selected>Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1037" aria-label="Save status for order #1037">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr data-order-id="1040" data-status="shipped">
              <th scope="row" data-label="Order">#1040</th>
              <td data-label="Customer">Baron Von Furrington</td>
              <td data-label="Order date">22 May 2026</td>
              <td data-label="Strain">Grand Daddy Pawple</td>
              <td data-label="Qty">1×10g</td>
              <td data-label="Total">£8.99</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-shipped">Shipped</span>
                  <label class="sr-only" for="status-1040">Status for order #1040</label>
                  <select id="status-1040" class="status-select" data-component="status-select" data-order-id="1040">
                    <option value="processing">Processing</option>
                    <option value="shipped" selected>Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1040" aria-label="Save status for order #1040">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr data-order-id="1038" data-status="processing">
              <th scope="row" data-label="Order">#1038</th>
              <td data-label="Customer">Baron Von Furrington</td>
              <td data-label="Order date">17 May 2026</td>
              <td data-label="Strain">Wedding Cake (I Knocked It Off the Counter)</td>
              <td data-label="Qty">3×10g</td>
              <td data-label="Total">£29.97</td>
              <td data-label="Status">
                <div class="status-cell">
                  <span class="status-badge status-processing">Processing</span>
                  <label class="sr-only" for="status-1038">Status for order #1038</label>
                  <select id="status-1038" class="status-select" data-component="status-select" data-order-id="1038">
                    <option value="processing" selected>Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="1038" aria-label="Save status for order #1038">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </main>

    <footer class="site-footer" role="contentinfo">
      <div class="inner">
        <div class="footer-top">
          <p><strong class="footer-brand">Nip &amp; Claw</strong> — purrveyors of the finest artisanal catnip since your human got a smartphone.</p>
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
        <div>Staff view — not part of the customer storefront. <a href="index.html">Back to products</a></div>
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a></div>
        <div>All accessibility patterns shown are discussed in the book. Nip &amp; Claw is a fictional store. Lucy Fur, however, is not.</div>
      </div>
    </footer>

  </div>

  <script src="assets/js/theme.js"></script>
  <script src="assets/js/connectivity-badge.js"></script>
  <script src="assets/js/service-worker-register.js"></script>
  <script src="assets/js/cart.js"></script>
  <script src="assets/js/admin.js"></script>

</body>
</html>
```

- [ ] **Step 2: Verify**

Run: `npx djlint public/admin.html`
Expected: no errors.

Run: `npx eslint public/admin.html`
Expected: no errors (inline `<script>` extraction via `eslint-plugin-html` — this page has none, so nothing to lint beyond the HTML itself passing through cleanly).

- [ ] **Step 3: Manual check**

Run: `npm start` (serves `public/` at :4310), open `http://127.0.0.1:4310/admin.html` in a browser.
Expected: page renders with the 6-row table, filter bar, and staff notice; each row's status `<select>` shows the correct current value; clicking a row's Save button (without changing the select) shows no visible change but announces via the live region (check with a screen reader or the accessibility tree in devtools).

- [ ] **Step 4: Commit**

```bash
git add public/admin.html
git commit -m "feat: add admin.html"
```

---

### Task 9: `tests/components/admin.spec.ts`

**Files:**
- Create: `tests/components/admin.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '../fixtures';
import { expectNoAxeViolations } from '../axe-helpers';

test.describe('admin — order management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin.html');
  });

  test('is reachable with no login prompt', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Staff — order management',
    );
  });

  test('shows the current status for each order', async ({ page }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await expect(row.getByRole('combobox')).toHaveValue('processing');
    await expect(row.locator('.status-badge')).toHaveText('Processing');
  });

  test('changing the select does not save until Save is pressed', async ({
    page,
  }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await row.getByRole('combobox').selectOption('shipped');

    // Badge unchanged — selecting a value alone must not commit it
    // (avoids a WCAG 3.2.2 change-of-context from the <select> itself).
    await expect(row.locator('.status-badge')).toHaveText('Processing');
  });

  test('pressing Save updates the badge and announces the change', async ({
    page,
  }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await row.getByRole('combobox').selectOption('shipped');
    await row.getByRole('button', { name: 'Save status for order #1042' }).click();

    await expect(row.locator('.status-badge')).toHaveText('Shipped');
    await expect(page.locator('#admin-status')).toHaveText(
      'Order #1042 marked as Shipped.',
    );
  });

  test('filtering to one status shows only matching rows and announces the count', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Shipped' }).click();

    await expect(page.locator('tr[data-order-id="1041"]')).toBeVisible();
    await expect(page.locator('tr[data-order-id="1040"]')).toBeVisible();
    await expect(page.locator('tr[data-order-id="1042"]')).toBeHidden();
    await expect(page.locator('#admin-status')).toHaveText(
      'Showing 2 Shipped orders.',
    );
  });

  test('returning to "All orders" shows every row again', async ({ page }) => {
    await page.getByRole('button', { name: 'Shipped' }).click();
    await page.getByRole('button', { name: 'All orders' }).click();

    await expect(page.locator('tr[data-order-id]')).toHaveCount(6);
    await expect(page.locator('#admin-status')).toHaveText(
      'Showing all 6 orders.',
    );
  });

  test('has no accessibility violations, filtered and with a status mid-edit', async ({
    page,
  }) => {
    await expectNoAxeViolations(page);

    await page.getByRole('button', { name: 'Processing' }).click();
    await expectNoAxeViolations(page);

    // Mid-edit: a value selected but not yet saved.
    await page
      .locator('tr[data-order-id="1038"]')
      .getByRole('combobox')
      .selectOption('delivered');
    await expectNoAxeViolations(page);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/components/admin.spec.ts --project=Desktop --grep-invert @visual`
Expected: PASS across all assertions. If a test fails, it's telling you something built in Tasks 6-8 doesn't match this spec — fix the implementation (not the test) unless the test itself has a mistake.

Run: `npx playwright test tests/components/admin.spec.ts --grep-invert @visual`
Expected: PASS across all 3 viewport projects (Mobile/Tablet/Desktop).

- [ ] **Step 3: Commit**

```bash
git add tests/components/admin.spec.ts
git commit -m "test: add tests/components/admin.spec.ts"
```

---

### Task 10: `tests/e2e/admin-status-persistence.spec.ts`

**Files:**
- Create: `tests/e2e/admin-status-persistence.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '../fixtures';

// Complements admin.spec.ts's per-page checks with "does a saved status
// actually survive a reload" — same escalation theme-persistence.spec.ts
// applies to the colour-scheme toggle.

test('a saved status change survives a page reload', async ({ page }) => {
  await page.goto('/admin.html');

  const row = page.locator('tr[data-order-id="1042"]');
  await row.getByRole('combobox').selectOption('delivered');
  await row.getByRole('button', { name: 'Save status for order #1042' }).click();
  await expect(row.locator('.status-badge')).toHaveText('Delivered');

  await page.reload();

  const reloadedRow = page.locator('tr[data-order-id="1042"]');
  await expect(reloadedRow.locator('.status-badge')).toHaveText('Delivered');
  await expect(reloadedRow.getByRole('combobox')).toHaveValue('delivered');
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/e2e/admin-status-persistence.spec.ts --grep-invert @visual`
Expected: PASS across all 3 viewport projects.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin-status-persistence.spec.ts
git commit -m "test: add tests/e2e/admin-status-persistence.spec.ts"
```

---

### Task 11: Add "View receipt" link to `checkout.html`'s success state

**Files:**
- Modify: `public/checkout.html`

- [ ] **Step 1: Add the link**

In `public/checkout.html`, find:

```html
      <div class="checkout-success" id="checkout-success" hidden>
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 tabindex="-1">Order placed!</h1>
        <p>Lucy Fur's first delivery is on its way. Your human will not understand the invoice.</p>
        <a href="orders.html" class="btn btn-primary">View my orders</a>
      </div>
```

Replace with:

```html
      <div class="checkout-success" id="checkout-success" hidden>
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 tabindex="-1">Order placed!</h1>
        <p>Lucy Fur's first delivery is on its way. Your human will not understand the invoice.</p>
        <div class="success-actions">
          <a href="orders.html" class="btn btn-primary">View my orders</a>
          <a href="receipt.html" id="view-receipt-link" class="btn btn-secondary">View receipt</a>
        </div>
      </div>
```

- [ ] **Step 2: Carry the plan through to the receipt link via JS**

`receipt.html` needs to know which plan to render — read from the same `?plan=` query param `checkout.html` itself was loaded with. In `public/assets/js/checkout.js`, find:

```javascript
  /* All valid — show success state */
  document.getElementById('checkout-form-wrapper').hidden = true;
  const success = document.getElementById('checkout-success');
  success.hidden = false;
  success.querySelector('h1').focus();
});
```

Replace with:

```javascript
  /* All valid — show success state */
  document.getElementById('checkout-form-wrapper').hidden = true;
  const success = document.getElementById('checkout-success');
  success.hidden = false;
  success.querySelector('h1').focus();
  document.getElementById('view-receipt-link').href = 'receipt.html?plan=' + planKey;
});
```

- [ ] **Step 3: Add a `.success-actions` layout rule**

In `public/assets/css/checkout.css`, add (append to the end of the file):

```css
.success-actions {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}
```

- [ ] **Step 4: Verify**

Run: `npx djlint public/checkout.html && npx eslint public/assets/js/checkout.js && npx stylelint "public/assets/css/checkout.css"`
Expected: no errors.

Run: `npx playwright test tests/e2e/checkout-recovery.spec.ts tests/e2e/purchase-flow.spec.ts --project=Desktop --grep-invert @visual`
Expected: PASS — confirms the existing checkout flow still completes correctly with the new button present.

- [ ] **Step 5: Commit**

```bash
git add public/checkout.html public/assets/js/checkout.js public/assets/css/checkout.css
git commit -m "feat: add View receipt link to checkout success state"
```

---

### Task 12: `receipt.css`

**Files:**
- Create: `public/assets/css/receipt.css`

- [ ] **Step 1: Write the file**

```css
.receipt-meta {
  color: var(--color-muted);
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.receipt-actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.delivery-details {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-6);
}

.delivery-details h2 {
  font-size: var(--text-lg);
  margin-top: 0;
}

/* Responsive: same collapse technique as .orders-table/.admin-table. */
@media (width <= 600px) {
  .receipt-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .receipt-table tr {
    display: block;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface);
  }

  .receipt-table td,
  .receipt-table th[scope='row'] {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-sm);
  }

  .receipt-table td:last-child,
  .receipt-table th[scope='row']:last-child {
    border-bottom: none;
  }

  .receipt-table td::before {
    content: attr(data-label);
    font-weight: 700;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    margin-right: var(--space-4);
    flex-shrink: 0;
  }
}

/* Print stylesheet — the "my human will not understand the invoice" joke
   seeded in checkout.html's success copy gets its payoff here: strip
   everything but the receipt itself. */
@media print {
  .site-header,
  .site-footer,
  .skip-link,
  .receipt-actions,
  #receipt-status {
    display: none;
  }

  .receipt-table {
    width: 100%;
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx stylelint "public/assets/css/receipt.css" && npx prettier --check public/assets/css/receipt.css`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add public/assets/css/receipt.css
git commit -m "feat: add receipt.css"
```

---

### Task 13: `receipt.js`

**Files:**
- Create: `public/assets/js/receipt.js`

**Interfaces:**
- Consumes: `PLANS` (global, from `plans-data.js`, Task 1).

- [ ] **Step 1: Write the file**

```javascript
/**
 * Receipt page (receipt.html) — populates the receipt table from the
 * `?plan=` query param (same param checkout.html uses; PLANS is shared
 * via plans-data.js, loaded before this file), renders today's date and
 * a mock order reference, and wires the share button.
 */

const params = new URLSearchParams(location.search);
const planKey = params.get('plan') || 'zoomies';
const plan = PLANS[planKey] || PLANS.zoomies;

document.getElementById('receipt-plan-name').textContent = plan.name;
document.getElementById('receipt-monthly-price').textContent =
  '£' + plan.price.toFixed(2) + '/mo';

const promoRow = document.getElementById('receipt-promo-row');
if (plan.promo) {
  document.getElementById('receipt-promo-value').textContent =
    '−£' + plan.price.toFixed(2);
  document.getElementById('receipt-due-today').textContent = '£0.00';
  promoRow.hidden = false;
} else {
  promoRow.hidden = true;
  document.getElementById('receipt-due-today').textContent =
    '£' + plan.price.toFixed(2);
}

const today = new Date();
document.getElementById('receipt-date').textContent = today.toLocaleDateString(
  'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric' },
);

document.getElementById('receipt-reference').textContent =
  'NC-' + today.getFullYear() + '-' + planKey.toUpperCase().slice(0, 3);

/* Share button — Web Share API where available (mobile mainly), with a
   copy-to-clipboard fallback plus a live-region confirmation elsewhere. */
document.getElementById('share-receipt-btn').addEventListener('click', () => {
  const liveRegion = document.getElementById('receipt-status');

  if (navigator.share) {
    navigator.share({ title: 'Nip & Claw receipt', url: location.href });
    return;
  }

  navigator.clipboard.writeText(location.href).then(() => {
    liveRegion.textContent = '';
    void liveRegion.offsetWidth;
    liveRegion.textContent = 'Receipt link copied.';
  });
});
```

- [ ] **Step 2: Verify**

Run: `npx eslint public/assets/js/receipt.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add public/assets/js/receipt.js
git commit -m "feat: add receipt.js"
```

---

### Task 14: `receipt.html` — page markup

**Files:**
- Create: `public/receipt.html`

- [ ] **Step 1: Write the file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="assets/js/theme-init.js"></script>
  <title>Receipt — Nip &amp; Claw</title>
  <meta name="description" content="Order receipt. Print it — your human still won't understand the invoice.">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="#1e3d2f">
  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/receipt.css">
</head>
<body>
  <div class="page-wrapper">

    <!-- Skip link — Section 6, Chapter 9 — Keyboard navigation and focus. -->
    <a href="#main" class="skip-link">Skip to main content</a>

    <header class="site-header" role="banner">
      <div class="inner">
        <a href="index.html" class="site-logo">
          <span class="wordmark">Nip &amp; Claw</span>
          <span class="tagline">purrveyors of the finest artisanal catnip</span>
        </a>
        <span class="connectivity-badge" data-component="connectivity-badge">
          <svg class="icon" data-component="connectivity-icon-online" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6 2 2 4-4"/><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"/></svg>
          <svg class="icon" data-component="connectivity-icon-offline" hidden viewBox="0 0 24 24" aria-hidden="true"><path d="M10.114 4.462A14.5 14.5 0 0 1 12 2a10 10 0 0 1 9.313 13.643"/><path d="M15.557 15.556A14.5 14.5 0 0 1 12 22 10 10 0 0 1 4.929 4.929"/><path d="M15.892 10.234A14.5 14.5 0 0 0 12 2a10 10 0 0 0-3.643.687"/><path d="M17.656 12H22"/><path d="M19.071 19.071A10 10 0 0 1 12 22 14.5 14.5 0 0 1 8.44 8.45"/><path d="M2 12h10"/><path d="m2 2 20 20"/></svg>
          <span data-component="connectivity-badge-label">Online</span>
        </span>
        <div id="connectivity-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
        <nav class="site-nav" aria-label="Main">
          <ul role="list">
            <li><a href="index.html">Products</a></li>
            <li><a href="subscriptions.html">Subscriptions</a></li>
            <li><a href="orders.html">My Orders</a></li>
          </ul>
        </nav>
        <div class="nav-cart">
          <a href="checkout.html" class="cart-link" aria-label="Cart, 2 items">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Cart
            <span class="cart-count" aria-hidden="true">2</span>
          </a>
        </div>
      </div>
    </header>

    <main id="main" class="main-content" tabindex="-1">

      <div class="page-heading">
        <h1>Receipt</h1>
        <p class="receipt-meta">Order date: <span id="receipt-date"></span> · Reference: <span id="receipt-reference"></span></p>
      </div>

      <!-- Live region for the share/copy-link confirmation. -->
      <div id="receipt-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

      <div class="receipt-actions">
        <button type="button" id="share-receipt-btn" class="btn-icon" aria-label="Share this receipt">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button type="button" onclick="window.print()" class="btn-icon" aria-label="Print this receipt">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </button>
      </div>

      <div class="table-wrapper">
        <table class="receipt-table">
          <caption class="sr-only">Subscription receipt</caption>
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" data-label="Plan" id="receipt-plan-name"></th>
              <td data-label="Price" id="receipt-monthly-price"></td>
            </tr>
            <tr id="receipt-promo-row" hidden>
              <th scope="row" data-label="Plan">First month promo</th>
              <td data-label="Price" id="receipt-promo-value"></td>
            </tr>
            <tr>
              <th scope="row" data-label="Plan">Due today</th>
              <td data-label="Price" id="receipt-due-today"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="delivery-details">
        <h2>Delivery details</h2>
        <p>
          Lucy Fur<br>
          Under the Third Cushion, The Sofa, Living Room<br>
          Leave quietly. Do NOT knock. Human is asleep.
        </p>
      </div>

    </main>

    <footer class="site-footer" role="contentinfo">
      <div class="inner">
        <div class="footer-top">
          <p><strong class="footer-brand">Nip &amp; Claw</strong> — purrveyors of the finest artisanal catnip since your human got a smartphone.</p>
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
        <div>Questions about this order? Lucy Fur is not available to answer them. She is asleep. <a href="orders.html">Back to my orders</a></div>
        <div>This is a demo site for the <a href="https://accessibilitychampion.com">Accessibility Champion book</a>. · <a href="accessibility.html">Accessibility statement</a> · <a href="offline.html">Offline access</a> · <a href="admin.html">Staff</a></div>
        <div>All accessibility patterns shown are discussed in the book. Nip &amp; Claw is a fictional store. Lucy Fur, however, is not.</div>
      </div>
    </footer>

  </div>

  <script src="assets/js/theme.js"></script>
  <script src="assets/js/connectivity-badge.js"></script>
  <script src="assets/js/service-worker-register.js"></script>
  <script src="assets/js/cart.js"></script>
  <script src="assets/js/plans-data.js"></script>
  <script src="assets/js/receipt.js"></script>

</body>
</html>
```

- [ ] **Step 2: Verify**

Run: `npx djlint public/receipt.html && npx eslint public/receipt.html`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run: `npm start`, open `http://127.0.0.1:4310/checkout.html?plan=catnap`, complete the form, click "View receipt".
Expected: lands on `receipt.html?plan=catnap` showing "The Catnap" at £9.00/mo, due today £9.00 (no promo row — only `zoomies` has `promo: true`), today's date, and a reference starting `NC-2026-CAT`.

- [ ] **Step 4: Commit**

```bash
git add public/receipt.html
git commit -m "feat: add receipt.html"
```

---

### Task 15: `tests/e2e/receipt.spec.ts`

**Files:**
- Create: `tests/e2e/receipt.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { expectNoAxeViolations } from '../axe-helpers';

// subscriptions.html's comparison table is the documented
// horizontally-scrollable pattern (min-width: 600px inside its own
// overflow-x: auto wrapper) — every real dimension (visualViewport,
// clientWidth, the page's own "cannot scroll horizontally" test) stays
// correctly 390px on Mobile. But under Chromium's isMobile CDP emulation
// specifically, window.innerWidth/documentElement.scrollWidth report that
// table's un-contained min-content width (956px) even though nothing
// between it and <body> actually overflows — Playwright uses that
// inflated value internally for its click-with-auto-scroll actionability
// check, scrolling to a position that doesn't match what a real
// 390px-wide screen shows. A manual scroll + coordinate click sidesteps
// Playwright's own (mis-measured) scroll logic without skipping the real
// actionability check .click({force:true}) would.
async function clickViaVerifiedCoordinates(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element has no bounding box');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('choosing a plan, completing checkout, and viewing the receipt shows the right plan', async ({
  page,
}) => {
  await page.goto('/subscriptions.html');
  await clickViaVerifiedCoordinates(
    page,
    page.getByRole('link', { name: 'Choose The Catnap' }),
  );
  await expect(page).toHaveURL(/checkout\.html\?plan=catnap/);

  // Every field ships with a realistic default value except the security
  // code — deliberately: a real checkout never persists or prefills a
  // CVC, so both existing checkout e2e tests fill #cvc by hand before
  // submitting. Matching that established pattern.
  await page.locator('#cvc').fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('heading', { name: 'Order placed!' })).toBeVisible();
  await page.getByRole('link', { name: 'View receipt' }).click();
  await expect(page).toHaveURL(/receipt\.html\?plan=catnap/);

  await expect(page.locator('#receipt-plan-name')).toHaveText('The Catnap');
  await expect(page.locator('#receipt-monthly-price')).toHaveText('£9.00/mo');
  await expect(page.locator('#receipt-due-today')).toHaveText('£9.00');
  await expect(page.locator('#receipt-promo-row')).toBeHidden();
});

test('receipt.html has no accessibility violations', async ({ page }) => {
  await page.goto('/receipt.html?plan=zoomies');
  await expectNoAxeViolations(page);
});

test('the copy-link fallback announces confirmation when Web Share is unavailable', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    // Force the fallback path — some Desktop browsers support
    // navigator.share, some don't; this test asserts the fallback
    // behaviour specifically, regardless of the host browser.
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  await page.goto('/receipt.html?plan=zoomies');

  await page.getByRole('button', { name: 'Share this receipt' }).click();
  await expect(page.locator('#receipt-status')).toHaveText('Receipt link copied.');
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/e2e/receipt.spec.ts --project=Desktop --grep-invert @visual`
Expected: PASS.

Run: `npx playwright test tests/e2e/receipt.spec.ts --grep-invert @visual`
Expected: PASS across all 3 viewport projects.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/receipt.spec.ts
git commit -m "test: add tests/e2e/receipt.spec.ts"
```

---

### Task 16: Full-suite checkpoint

**Files:** none (verification only).

- [ ] **Step 1: Run everything non-visual**

Run: `npm test`
Expected: every test passes, including `tests/components/footer-site.spec.ts`'s "links to the staff admin view" test (now passing fully — both `admin.html` and `receipt.html` exist and are in `PAGES`) and `tests/components/header-site.spec.ts`/`tests/components/theme-toggle.spec.ts` for the two new pages (covered automatically via the `PAGES` fixture from Task 5).

- [ ] **Step 2: Run the full lint suite**

Run: `npm run lint`
Expected: no errors across djlint/stylelint/eslint/prettier.

- [ ] **Step 3: Fix anything that surfaced**

If any test or lint check fails, fix the implementation task it belongs to (don't weaken a test or add a blanket lint suppression) and re-run Steps 1-2 until both are clean.

---

### Task 17: Visual regression baselines

**Files:**
- Modify: `tests/visual-regression.spec.ts`

- [ ] **Step 1: Add the two new pages**

Find the array this file iterates over (the same page list `PAGES` in `tests/utilities/pages.ts` supplies, or a locally-duplicated list — check the file's imports first) and confirm `admin.html`/`receipt.html` are included via the shared `PAGES` fixture from Task 5. If the file imports `PAGES` directly, no edit is needed here — skip to Step 2. If it maintains its own separate list, add both paths to it, matching the existing entries' format exactly.

- [ ] **Step 2: Add one print-emulation snapshot for `receipt.html`**

Add a new test alongside the existing per-page/per-viewport snapshot loop:

```typescript
test('receipt.html print layout', async ({ page }) => {
  await page.goto('/receipt.html?plan=zoomies');
  await page.emulateMedia({ media: 'print' });
  await expect(page).toHaveScreenshot('receipt-print.png', { fullPage: true });
});
```

- [ ] **Step 3: Generate the new baselines**

Run: `npx playwright test tests/visual-regression.spec.ts --grep @visual --update-snapshots`
Expected: new baseline PNGs created for `admin.html`/`receipt.html` at all 3 viewports, plus `receipt-print.png`. No existing baselines change (this task only adds new pages/snapshots, doesn't touch anything already covered).

- [ ] **Step 4: Verify the new baselines actually look right**

Open the generated PNGs (under the visual-regression snapshot directory referenced by `tests/visual-regression.spec.ts`) and check by eye: `admin.html`'s table renders correctly at all 3 viewports, the Customizable Select styling (if the local browser/Playwright's bundled Chromium supports `appearance: base-select` at plan-writing time — check, since support may not have landed in Playwright's bundled Chromium yet) shows colour-coded options or gracefully falls back to a plain select, and `receipt-print.png` shows the receipt table with no header/footer/nav chrome.

- [ ] **Step 5: Run visual regression to confirm it's green against the baselines just written**

Run: `npx playwright test tests/visual-regression.spec.ts --grep @visual`
Expected: PASS (comparing against the baselines just generated in Step 3).

- [ ] **Step 6: Commit**

```bash
git add tests/visual-regression.spec.ts
git add -A  # picks up the new baseline PNGs, wherever they're written
git commit -m "test: add visual regression baselines for admin.html and receipt.html"
```

---

### Task 18: Update `TODO.md`

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark the item done**

In `TODO.md`, find:

```markdown
- [ ] **Build the sketched extensions** — `admin.html` staff order-management view and/or retail framing, already sketched in the book repo's `09-workplace-office/_SCRATCH.md` and `10-workplace-retail/_SCRATCH.md`. Needs its own brainstorm (scope, what it demonstrates, which chapter anchors it). **Up next.**
```

Replace with:

```markdown
- [x] **Build the sketched extensions** — `admin.html` (staff order management) and `receipt.html` (order receipt, reached from checkout). Design: `docs/superpowers/specs/2026-07-11-admin-and-receipt-pages-design.md`. Plan: `docs/superpowers/plans/2026-07-11-admin-and-receipt-pages.md`. `store.html` (retail store locator) and per-order historical receipt links remain unbuilt — see the design doc's "Out of scope."
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: mark 'Build the sketched extensions' done in TODO.md"
```

---

## Self-Review Notes

- **Spec coverage:** every design-doc section has a task — access/no-gating (Task 8), mock data incl. Princess Slayer/Baron Von Furrington and the `cancelled` status gap (Tasks 2, 8), select+Save not save-on-change (Tasks 7-9), localStorage persistence (Tasks 7, 10), Customizable Select (Task 6), filtering (Tasks 7-9), receipt reachability/data/print/share (Tasks 11-15), `PAGES` fixture + footer link (Tasks 4-5), visual regression incl. print snapshot (Task 17).
- **Type/name consistency checked:** `STORAGE_KEY`/`admin-order-status`, `data-component` values (`status-select`, `save-status-btn`, `admin-filter-btn`), and element ids (`admin-status`, `receipt-status`, `receipt-plan-name`, etc.) are used identically across the JS, HTML, and spec-file tasks that reference them.
- **Explicitly out of scope, not attempted here** (matches the design doc): `orders.html` per-row receipt links, `store.html`, the "Pawtal" companion app, multi-item cart checkout.
- **Found and fixed during execution, not anticipated by the design doc:** `public/service-worker.js`'s `PRECACHE_URLS` (and `tests/service-worker.spec.ts`'s matching `REQUIRED_PRECACHED_PATHS`) didn't list `admin.html`/`receipt.html`/their CSS/JS/`plans-data.js` — neither new page would have worked offline. Also, `.admin-table tr`'s and `.receipt-table tr`'s responsive collapse rule needed `:not([hidden])` — an unconditional `display: block` at narrow viewports overrides the `hidden` attribute's default `display: none` (author CSS always wins over the UA stylesheet regardless of the attribute), which broke `admin.html`'s status filter and would have broken `receipt.html`'s promo-row toggle the same way; `orders.css`'s identical-looking block never hit this because that table never dynamically hides rows.

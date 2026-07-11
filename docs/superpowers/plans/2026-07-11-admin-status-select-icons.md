# Admin Status Select Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a status icon to every `<option>` in `admin.html`'s status `<select>`, alongside the existing colour-coding and real text label, per the design in `docs/superpowers/specs/2026-07-11-admin-status-select-icons-design.md`.

**Architecture:** A single hidden SVG `<symbol>` sprite (4 icons, one per status) added once near the top of `admin.html`; each of the 24 `<option>` elements (4 statuses × 6 rows) gets a `<svg class="icon" aria-hidden="true"><use></svg>` + `<span>` wrapping its existing text, instead of a bare text node. One new CSS `gap` declaration in `admin.css`. No JS changes — `admin.js` already reads `select.value`, never option text.

**Tech Stack:** Static HTML/CSS (no build step), Playwright component test (`tests/components/admin.spec.ts`).

## Global Constraints

- No build step — all markup is static HTML, edited directly in `public/admin.html`. (CLAUDE.md)
- Real, visible text label stays on every `<option>` regardless of colour/icon — icons are `aria-hidden="true"` decoration only, never a replacement for text. (design spec, WebKit golden-rule article)
- No new CSS colour rules — icons inherit `stroke: currentcolor` from the existing `.icon` base class and each option's existing status colour. (design spec)
- Icon sprite `<symbol>` ids are named `icon-{status}` (e.g. `icon-processing`), not by Lucide icon name — keeps the icon choice swappable without touching option markup. (design spec)
- `--space-2` (`0.5rem` = `8px` at the site's unmodified 16px root font-size, per `tokens.css:115`) is the gap token to use between icon and text, matching `.status-cell`'s existing gap usage in `admin.css`.

---

### Task 1: Icon sprite, option markup, and gap CSS

**Files:**
- Modify: `public/admin.html` (add sprite; update all 24 `<option>` elements across 6 rows)
- Modify: `public/assets/css/admin.css:55-61` (`.status-select option` rule — add `gap`)
- Test: `tests/components/admin.spec.ts` (new test in the existing `admin — order management` describe block)

**Interfaces:**
- Consumes: nothing from other tasks — this is the only task in the plan.
- Produces: nothing consumed elsewhere — this plan has no downstream tasks.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/components/admin.spec.ts`, inside the existing `test.describe('admin — order management', ...)` block (after the last test, before the closing `});`):

```ts
  test('status select options are colour-coded and icon-tagged for every status', async ({
    page,
  }) => {
    // This repo's Chromium (bundled with the pinned Playwright version)
    // supports `appearance: base-select` unconditionally — confirmed
    // directly via getComputedStyle() before writing this test, see
    // docs/superpowers/specs/2026-07-11-admin-status-select-icons-design.md's
    // "Verification" section. No feature-detection/skip needed here.
    //
    // Every <select> on this page carries all 4 <option>s regardless of
    // which one is selected for that row, so checking row #1042's select
    // alone (mixing its one selected option with three unselected ones)
    // covers all 4 statuses' styling without looping over every row.
    const expectations = [
      {
        value: 'processing',
        label: 'Processing',
        bg: 'rgb(254, 243, 199)',
        color: 'rgb(146, 64, 14)',
      },
      {
        value: 'shipped',
        label: 'Shipped',
        bg: 'rgb(224, 242, 254)',
        color: 'rgb(7, 89, 133)',
      },
      {
        value: 'delivered',
        label: 'Delivered',
        bg: 'rgb(220, 252, 231)',
        color: 'rgb(22, 101, 52)',
      },
      {
        value: 'cancelled',
        label: 'Cancelled',
        bg: 'rgb(243, 244, 246)',
        color: 'rgb(87, 83, 78)',
      },
    ];

    for (const { value, label, bg, color } of expectations) {
      const result = await page.evaluate((value) => {
        const option = document.querySelector(
          `#status-1042 option[value="${value}"]`,
        );
        if (!option) return null;
        const style = getComputedStyle(option);
        const use = option.querySelector('svg.icon use');
        const span = option.querySelector('span');
        const symbolId = use ? use.getAttribute('href')?.slice(1) : null;
        return {
          display: style.display,
          gap: style.gap,
          backgroundColor: style.backgroundColor,
          color: style.color,
          spanText: span ? span.textContent : null,
          symbolId,
          symbolExists: symbolId
            ? Boolean(document.getElementById(symbolId))
            : false,
        };
      }, value);

      expect(result?.display).toBe('flex');
      expect(result?.gap).toBe('8px');
      expect(result?.backgroundColor).toBe(bg);
      expect(result?.color).toBe(color);
      expect(result?.spanText).toBe(label);
      expect(result?.symbolId).toBe(`icon-${value}`);
      expect(result?.symbolExists).toBe(true);
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/components/admin.spec.ts --project=Desktop -g "colour-coded and icon-tagged"`

Expected: FAIL. At minimum `result?.gap` won't be `'8px'` (no gap declared yet) and `result?.symbolId`/`result?.symbolExists` will be `null`/`false` (no `<use>` or `<symbol>` exist yet), since none of the markup or CSS changes below have been made.

- [ ] **Step 3: Add the icon sprite to `admin.html`**

In `public/admin.html`, insert this block immediately after the skip link and before the `<header class="site-header" role="banner">` line:

```html
    <!-- Icon sprite — Section 6, Chapter 5 accessible-name pattern extended:
         icons are aria-hidden decoration alongside real text labels, never
         a replacement for them (WebKit's "golden rule of customizable
         select"). Defined once, referenced by every status <option> below
         via <use>. -->
    <svg hidden aria-hidden="true">
      <symbol id="icon-processing" viewBox="0 0 24 24">
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
        <path d="M12 22V12" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <path d="m7.5 4.27 9 5.15" />
      </symbol>
      <symbol id="icon-shipped" viewBox="0 0 24 24">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </symbol>
      <symbol id="icon-delivered" viewBox="0 0 24 24">
        <path d="M12 22V12" />
        <path d="m16 17 2 2 4-4" />
        <path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753" />
        <path d="M3.29 7 12 12l8.71-5" />
        <path d="m7.5 4.27 8.997 5.148" />
      </symbol>
      <symbol id="icon-cancelled" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M4.929 4.929 19.07 19.071" />
      </symbol>
    </svg>

```

- [ ] **Step 4: Update every `<option>` across all 6 rows**

Each `<option>` changes from `<option value="X" [selected]>Label</option>` to `<option value="X" [selected]><svg class="icon" aria-hidden="true"><use href="#icon-X"></use></svg><span>Label</span></option>`. Apply this to all 6 `<select>` blocks in `public/admin.html`:

Row `#1042` (`id="status-1042"`) — replace:
```html
                  <select id="status-1042" class="status-select" data-component="status-select" data-order-id="1042">
                    <option value="processing" selected>Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1042" class="status-select" data-component="status-select" data-order-id="1042">
                    <option value="processing" selected><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped"><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered"><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled"><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

Row `#1039` (`id="status-1039"`) — replace:
```html
                  <select id="status-1039" class="status-select" data-component="status-select" data-order-id="1039">
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered" selected>Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1039" class="status-select" data-component="status-select" data-order-id="1039">
                    <option value="processing"><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped"><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered" selected><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled"><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

Row `#1041` (`id="status-1041"`) — replace:
```html
                  <select id="status-1041" class="status-select" data-component="status-select" data-order-id="1041">
                    <option value="processing">Processing</option>
                    <option value="shipped" selected>Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1041" class="status-select" data-component="status-select" data-order-id="1041">
                    <option value="processing"><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped" selected><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered"><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled"><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

Row `#1037` (`id="status-1037"`) — replace:
```html
                  <select id="status-1037" class="status-select" data-component="status-select" data-order-id="1037">
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled" selected>Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1037" class="status-select" data-component="status-select" data-order-id="1037">
                    <option value="processing"><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped"><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered"><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled" selected><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

Row `#1040` (`id="status-1040"`) — replace:
```html
                  <select id="status-1040" class="status-select" data-component="status-select" data-order-id="1040">
                    <option value="processing">Processing</option>
                    <option value="shipped" selected>Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1040" class="status-select" data-component="status-select" data-order-id="1040">
                    <option value="processing"><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped" selected><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered"><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled"><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

Row `#1038` (`id="status-1038"`) — replace:
```html
                  <select id="status-1038" class="status-select" data-component="status-select" data-order-id="1038">
                    <option value="processing" selected>Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
```
with:
```html
                  <select id="status-1038" class="status-select" data-component="status-select" data-order-id="1038">
                    <option value="processing" selected><svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg><span>Processing</span></option>
                    <option value="shipped"><svg class="icon" aria-hidden="true"><use href="#icon-shipped"></use></svg><span>Shipped</span></option>
                    <option value="delivered"><svg class="icon" aria-hidden="true"><use href="#icon-delivered"></use></svg><span>Delivered</span></option>
                    <option value="cancelled"><svg class="icon" aria-hidden="true"><use href="#icon-cancelled"></use></svg><span>Cancelled</span></option>
                  </select>
```

- [ ] **Step 5: Add the gap to `admin.css`**

In `public/assets/css/admin.css`, the existing rule (lines 55-61):

```css
  .status-select option {
    display: flex;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 700;
  }
```

becomes:

```css
  .status-select option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 700;
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx playwright test tests/components/admin.spec.ts --project=Desktop -g "colour-coded and icon-tagged"`

Expected: PASS (1 passed).

- [ ] **Step 7: Regression-check the rest of the admin test coverage and lint**

Run: `npx playwright test tests/components/admin.spec.ts tests/e2e/admin-status-persistence.spec.ts --project=Desktop`

Expected: all tests in both files PASS — confirms `selectOption()` by value, the Save flow, filtering, and the axe-core scan (`has no accessibility violations, filtered and with a status mid-edit`) are unaffected by the markup change.

Run: `npm run lint`

Expected: no errors (prettier/eslint/stylelint all clean).

- [ ] **Step 8: Manual visual sanity check**

Automated screenshots of the *open* picker aren't reliable here — Playwright's `page.screenshot()` doesn't capture `::picker(select)`'s top-layer content (confirmed during design; this is a known CDP limitation, not a sign the feature doesn't render). Verify by eye instead, using the dev server already running on port 4310 (do not stop or restart it):

1. Open `http://127.0.0.1:4310/admin.html` in an actual browser window (not headless).
2. Click order `#1042`'s status `<select>`.
3. Confirm each option shows its status colour, its icon, and its text label together — not just text, not just colour.
4. If the icons don't render (the `<use>`-into-`::picker(select)` risk flagged in the design spec), note it here and fall back to `<img src="assets/icons/{status}.svg" alt="">` against small standalone SVG files instead, re-running Steps 1-7 with that markup shape.

- [ ] **Step 9: Commit**

```bash
git add public/admin.html public/assets/css/admin.css tests/components/admin.spec.ts
git commit -m "$(cat <<'EOF'
feat: add status icons to admin status select options

Resolves the icon-content gap in TODO.md's admin status select item.
Icons are aria-hidden decoration alongside the existing colour and
real text label, per the WebKit golden-rule article's own guidance —
never a replacement for either.
EOF
)"
```

---

## Self-Review

**Spec coverage:** Icon set/mapping (design's table) → Step 3's four `<symbol>`s. Sprite-not-`<img>`-not-inline-paths markup approach → Steps 3-4. `<span>`-wrapped text, `aria-hidden` icon → Step 4's option markup. No new colour CSS, `gap` only → Step 5. Verification via computed style rather than screenshot → Step 1's test. Manual check + documented `<img>` fallback for the one open risk → Step 8. "Out of scope" items (closed trigger styling, other pages' badges) → untouched, no task references them. All covered.

**Placeholder scan:** No TBD/TODO; every step has literal, complete code; every `<option>`/`<select>` block for all 6 rows is written out in full, not "same as row 1042."

**Type/name consistency:** Symbol ids (`icon-processing`, `icon-shipped`, `icon-delivered`, `icon-cancelled`) match between Step 3's `<symbol id>` and Step 4's `<use href>` and the test's `icon-${value}` expectation. Colour hex-to-rgb conversions in the test (`#fef3c7`→`rgb(254, 243, 199)` etc.) double-checked against `tokens.css` lines 75-98.

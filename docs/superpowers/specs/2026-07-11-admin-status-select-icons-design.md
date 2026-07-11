# Admin status select — icons — design

Resolves the "Style the admin status `<select>` properly" item in `TODO.md`.
The baseline Customizable Select work on `.status-select` in
`public/assets/css/admin.css` (colour-coded options via
`@supports (appearance: base-select)`, native fallback, real text label kept
on every option) already exists and is correct — confirmed against
[WebKit's "golden rule of customizable select"](https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/)
article, whose one rule is: text content is the baseline, icons/swatches are
enhancements, never replacements. What's missing is the icon called for in
the TODO's [Lucide search link](https://lucide.dev/icons/?search=delivery) —
"icon set for the option content, sitting alongside the existing colour and
text, not replacing either."

## Icon set

Exact SVGs pulled from `lucide-static@1.24.0` (ISC-licensed), one per status:

| Status | Icon | Reasoning |
|---|---|---|
| Processing | `package` | order placed, not yet moving |
| Shipped | `truck` | in transit |
| Delivered | `package-check` | completed, matches "processing"'s package motif |
| Cancelled | `ban` | matches the existing `.status-cancelled` neutral/negative tone |

## Markup: inline sprite, not `<img>` or per-option inline paths

The WebKit article's own accessible example uses `<img src="bird.svg" alt="">`
+ `<span>text</span>` — not this site's usual hand-inlined
`<svg aria-hidden="true">` (as used for the cart/connectivity/reorder/theme
icons elsewhere). Neither fits cleanly here: `admin.html` has no templating,
so all 6 order rows repeat their own full `<select>` with 4 `<option>`s in
static markup — 24 icon instances total. Repeating a multi-path inline SVG 24
times bloats the file; introducing a new `<img>`-referencing-external-file
convention solves the bloat but breaks with every other icon on the site.

Instead: one hidden SVG sprite, defined once near the top of `admin.html`
(after the skip link), holding all four icons as `<symbol>`s:

```html
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

Each of the 24 `<option>`s becomes, e.g.:

```html
<option value="processing" selected>
  <svg class="icon" aria-hidden="true"><use href="#icon-processing"></use></svg>
  <span>Processing</span>
</option>
```

This keeps every icon reference to a single `<use>` line instead of a
duplicated multi-path block, stays fully inline (no new asset files, no
build step, no extra requests — consistent with this repo's "no build step
for the site itself"), and is arguably *closer* to this site's existing
inline-SVG philosophy than the `<img>` route the article demonstrates. Text
moves from a bare text node to a `<span>` wrapping it — matching the
article's own accessible example — with no behaviour change: `admin.js`
already reads `select.value`, never option text content, so this is safe.

**Known risk, to confirm during implementation, not before:** `<use
href="#...">` referencing a symbol defined elsewhere in the light DOM is a
well-supported pattern in normal page content, but this project has not
previously exercised it inside content that a browser *relocates* into
`::picker(select)`'s rendered subtree. If it doesn't render there,
`<img src="assets/icons/{name}.svg" alt="">` against small standalone SVG
files is the documented fallback — same markup shape as the WebKit article's
example, just swapped in if the sprite approach doesn't hold up.

## CSS

No new colour rules. Lucide's SVGs default to `stroke="currentColor"`, and
this site's existing `.icon` base class (`base.css`) already sets `stroke:
currentcolor` — so each icon automatically inherits its option's existing
status colour (e.g. amber for Processing) with zero extra rules. The only
change needed is a `gap` on the existing option layout rule in
`admin.css`:

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

## Verification

Confirmed directly (not assumed) that this repo's actual test environment —
Chrome for Testing 149.0.7827.55, the exact browser bundled with the pinned
`@playwright/test@1.61.1` — already supports `appearance: base-select` with
no flag: `getComputedStyle()` on a live `option[value="processing"]` in
`admin.html` today returns `display: flex`, `background-color: rgb(254, 243,
199)`, `color: rgb(146, 64, 14)` — exact matches for the warning-token pair
already wired to that status. Playwright's own `page.screenshot()` cannot
capture the *open* picker's content (a known CDP top-layer capture gap, not
a sign the feature is inactive) — so visual confirmation of the open state
will be a manual check in a real windowed browser, while the automated test
added for this asserts computed style directly on the option elements
(background/color per status, plus that the `<use>` sprite reference
resolves to a non-empty rendered icon) rather than chasing a screenshot.

## Out of scope

- Any change to the *closed* select trigger's appearance (currently plain
  native styling, unchanged) — the TODO and this design are both scoped to
  option content only.
- Icons anywhere else on the site (e.g. `orders.html`'s plain-text status
  badges) — not requested, no existing icon+status pairing to extend.

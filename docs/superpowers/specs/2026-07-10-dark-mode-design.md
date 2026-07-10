# Dark mode — design

Resolves the "Dark mode" item in `TODO.md`. Adds a user-controllable colour
scheme (System default / Light / Dark) across all 5 demo pages, following the
pattern already shipped and battle-tested in the book repo
(`accessibility-champion`'s `theme-toggle` component and
`src/lib/assets/css/champ/themes/`), adapted for this repo's plain
HTML/CSS/JS, no-framework, duplicated-per-page markup.

## Why this pattern

The book repo already solved this problem: a 3-way radio group (not a binary
toggle) so "follow the OS" remains a first-class, explicitly-chosen state
rather than being lost the moment a user touches the control; an unlayered
`data-user-color-scheme` attribute that beats the `prefers-color-scheme`
media query on specificity so an explicit choice always wins; `localStorage`
persistence; and a blocking inline script that applies the stored preference
before first paint to avoid a flash of the wrong theme. This design reuses
that architecture wholesale — the goal is a demo of a proven accessible
pattern, not a new invention — and reimplements it in plain HTML/CSS/JS since
this repo has no component framework.

## Architecture

**Three states:**

- `auto` — no `data-user-color-scheme` attribute; `@media (prefers-color-scheme: dark)` in `tokens.css` decides.
- `light` / `dark` — `<html data-user-color-scheme="light|dark">`, set via the toggle, wins over the media query regardless of source order (unlayered rule, `:root[attr]` beats `:root` alone).

**Files:**

- `public/assets/js/theme-init.js` — tiny, synchronous, loaded in `<head>` *before* the stylesheet `<link>`s. Reads `localStorage.getItem('theme')`, and if it's `'light'` or `'dark'`, sets the attribute immediately. No flash: the attribute exists before CSS is even parsed.
- `public/assets/js/theme.js` — loaded with `defer` alongside `cart.js`. Wires the toggle's `change` event: updates the `data-user-color-scheme` attribute (removes it entirely for `'auto'`) and writes the choice to `localStorage`. Also syncs the toggle's checked radio to whatever `theme-init.js` already applied, so a reload reflects the right selection.
- `public/assets/css/tokens.css` — gains a `@media (prefers-color-scheme: dark)` block redefining the existing token set, plus `:root[data-user-color-scheme="dark"]` / `="light"` blocks for explicit overrides (same three-block shape as the book's `_light.css`/`_dark.css`/`_user-overrides.css`, collapsed into one file since this repo's token file is already small).
- The bg/text colour transition (already present for other things in `tokens.css`) respects `prefers-reduced-motion: reduce` — switching themes shouldn't animate for users who've asked for less motion.

## Token cleanup (prerequisite)

Dark mode only works if every colour on screen comes from a custom property.
Auditing the current CSS found hardcoded hex/rgb values outside
`tokens.css`:

- `base.css`: type badges (`.type-naptime`, `.type-zoomies`, `.type-existential`), status badges (`.status-shipped` and siblings), a couple of focus-ring `box-shadow`s, a muted panel background (`#f4f2ef`), a light border (`#b8b3ac`).
- `index.css`: a gold button variant (`#c09030`).
- `plans.css`: table row-stripe backgrounds (`#f7f6f4`, `#f9f8f6`).

Each becomes a named token in `tokens.css` (e.g. `--color-badge-naptime-bg`,
`--color-badge-naptime-text`, `--color-table-stripe`) with light and dark
values, and the page CSS files switch to `var(...)`. Self-contained
brand-dark elements that don't depend on page background — the header, hero,
and the plans-table's dark first column (`#162e23`) — are already
theme-agnostic and need no change.

Light-mode token *values* stay pixel-identical to today (this is a
refactor — hex literals become `var()` references to those same hex
values in the default block) — no light-mode visual regression baselines
should need updating.

## Component: theme toggle

Duplicated markup in each of the 5 HTML pages' `<header>`, matching the
existing convention (the header is already identical, hand-duplicated,
markup across all pages):

```html
<fieldset class="theme-toggle" data-component="theme-toggle">
  <legend class="visually-hidden">Colour scheme</legend>
  <label class="theme-option">
    <input type="radio" name="theme" value="auto" checked>
    <svg class="icon" aria-hidden="true"><!-- monitor --></svg>
    <span class="visually-hidden">System default</span>
  </label>
  <label class="theme-option">
    <input type="radio" name="theme" value="light">
    <svg class="icon" aria-hidden="true"><!-- sun --></svg>
    <span class="visually-hidden">Light theme</span>
  </label>
  <label class="theme-option">
    <input type="radio" name="theme" value="dark">
    <svg class="icon" aria-hidden="true"><!-- moon --></svg>
    <span class="visually-hidden">Dark theme</span>
  </label>
</fieldset>
```

- Real `<input type="radio">`s, clip-hidden (not `display:none`) — stay
  keyboard- and AT-operable; arrow keys move through the group natively.
- Icon-only pill buttons at `--target-min` (44px), inline SVGs matching the
  existing cart-icon convention — no new icon-library dependency.
- `:checked + label` styling for the active state; `:focus-visible` outline
  matching the site's existing focus ring.
- Legend and per-option labels are visually hidden but present for
  assistive tech, same trade-off the book's component makes when space is
  tight — icons carry the visible affordance.

**Placement:** new region in `.site-header .inner`, after `<nav>`.

- Desktop (flex row): no new rule needed — `.site-nav`'s existing
  `margin-left: auto` pushes the trailing block of the row flush right, so
  the toggle lands immediately after nav, still flush right.
- Mobile (`width <= 640px`, CSS Grid): new third row, `grid-template-areas:
'logo cart' 'nav nav' 'theme theme'` — header grows to three rows. DOM
  order stays logo → cart → nav → theme throughout, so tab order keeps
  matching visual order (the same principle the header's grid layout was
  already built around).

## Testing

Following existing conventions (`tests/components/*.spec.ts` looping over
`PAGES` from `tests/utilities/pages.ts`, `tests/e2e/*.spec.ts` for journeys,
`tests/visual-regression.spec.ts` for pixel baselines):

1. **`tests/components/theme-toggle.spec.ts`** — loops over `PAGES`:
   - all 3 options present with correct accessible names; `auto` checked by default
   - selecting each option sets `data-user-color-scheme` correctly and persists to `localStorage`
   - reload with a stored preference shows the right radio checked and the attribute is present before first paint (no flash)
   - keyboard-operable via native radio-group arrow-key behaviour
   - axe-core clean in all three states

2. **Dark-mode axe pass** — extend the existing per-page axe-core checks to
   run a second time with `data-user-color-scheme="dark"` forced, across all
   5 pages. This is what actually catches contrast regressions from the
   token cleanup above.

3. **Full dark-mode visual regression** — new baseline snapshots alongside
   the existing 15 (5 pages × 3 viewports) in `visual-regression.spec.ts`,
   giving it a `theme` dimension. 30 baseline images total.

4. **`tests/e2e/theme-persistence.spec.ts`** — set dark mode on one page,
   navigate to another (same pattern as `cross-page-nav.spec.ts`), confirm
   the theme and toggle state both carry over.

## Out of scope

- No system-level "auto-detect and never ask" simplification — the 3-state
  model is deliberate (see "Why this pattern").
- No changes to `accessibility.html`'s prose beyond, optionally, a one-line
  mention that the site supports dark mode — not required for this design
  to be complete.
- Per-component test coverage (splitting header markup out of whole-page
  specs) is a separate, already-tracked TODO item — not touched here beyond
  adding the one new component spec for the toggle itself.

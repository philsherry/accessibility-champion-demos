# Conventions

## Test locators: roles first, `data-testid`/`data-component` second

Tests never select elements by CSS class, and never add a new `id` purely for testing — classes exist for styling and can change for styling reasons alone; that shouldn't break a test, and `id`s that already do real accessibility work (`<label for>`, `aria-describedby`, the `#main` skip-link target) shouldn't be repurposed as test hooks either.

**First choice: Playwright's accessible role/label locators** — `getByRole('button', { name: 'Place order' })`, `getByRole('link', { name: 'Skip to main content' })`, `getByRole('alert')`. This works because the markup already has correct roles and accessible names — that correctness is the entire point of this site. It also means a test failure here is a real accessibility regression, not just a broken selector: if a button's accessible name changes in a way that breaks the test, it changed in a way a screen reader user would notice too.

**Fallback: `data-testid` / `data-component`** — only for elements with no accessible name that distinguishes them from their siblings. The clearest example on this site: 12 near-identical product cards, where a test needs to count how many are currently visible after a filter is applied. No role or accessible name identifies "the grid" or "a card" uniquely, so:

```html
<ul class="product-grid" role="list" data-testid="test_product-grid">
  <li data-component="product-card">...</li>
  ...
</ul>
```

```typescript
const grid = page.locator('[data-testid="test_product-grid"]');
await expect(grid.locator('[data-component="product-card"]:not([hidden])')).toHaveCount(5);
```

- `data-testid` — unique, on the outermost element of a section a test needs to find directly.
- `data-component` — semantic name, on that section's inner parts, used to scope queries once the section's been found. Not required to be unique on its own — scoping comes from the parent `data-testid`.

Why write this down at all, on a static HTML site with no component framework? The same reason this whole site exists: to model a good practice, not just describe one — including the practice of knowing when a hook is worth adding and when the semantics you already have are enough.

## Linting: one tool per concern, not one tool for everything

Four tools, each scoped to what it's actually good at, rather than one tool stretched to cover all of them:

- **djlint** — HTML structure, plus formatting the embedded `<style>`/`<script>` blocks inside each page (`format_css`/`format_js` in `.djlintrc`).
- **stylelint** (`stylelint.config.js`) — CSS correctness: deprecated properties, modern colour-function notation, duplicate declarations. Runs against both `assets/css/*.css` and the inline `<style>` blocks (`stylelint-config-html`).
- **ESLint** (`eslint.config.js`) — JS correctness, both the Playwright test suite and each page's inline `<script>` (`eslint-plugin-html` extracts and lints it as real JS).
- **Prettier** (`prettier.config.js`) — formatting for everything djlint doesn't already own: `.ts`/`.js`/`.css`/`.json`. Deliberately excludes `*.html` (`.prettierignore`) — running two formatters against the same file just means they fight each other on every save.

`npm run lint` runs all of them; `lint:js`/`lint:css`/`format:check` run independently for a faster loop while editing one layer.

Two fixes this setup caught worth calling out as examples of what a linter is actually for: `.site-nav a` had two conflicting `display` declarations in the same rule (dead code — the second silently won), and the `.sr-only` visually-hidden technique (Chapter 06025) used the deprecated `clip: rect(0,0,0,0)` instead of modern `clip-path: inset(50%)` — same visual result, but `clip` has been removed from the spec for years. Neither was a style nit; both were stylelint pointing at something actually wrong.

## Test-writing: two Playwright lint rules worth keeping on

Two `eslint-plugin-playwright` rules catch real bugs in the test suite itself, not just style, and are worth understanding rather than reflexively silencing.

**`no-conditional-in-test` / `no-conditional-expect`** flags `if`/`else`, ternaries, and `switch` statements inside a test body. The failure mode this guards against: a conditional whose untaken branch quietly never runs its assertion. A real regression — a missing link, a wrong attribute — and "this branch just didn't execute this run" produce the exact same test output: green. The whole value of an assertion is that it fails loudly when it should; a conditional wrapped around it can make that not true.

The fix is almost always to change *when* the branch is decided, not to hide the conditional behind a comment:

- If the condition is knowable before the test runs — which page a test is being generated for, say — decide the branch at test-registration time instead of inside the test body. Two small, single-purpose tests instead of one test with an `if`/`else` in it. See `footer-site.spec.ts` and `header-site.spec.ts`, which each generate a page's worth of tests from a loop, and pick the right assertion per page outside the test callback itself.
- If the condition can only be known once the test is actually running (a measured viewport width, a value read back from the DOM), it can't be hoisted — extract a small named function that computes the expected value, and assert against its result unconditionally. See `responsive-layout.spec.ts`'s `expectedHeaderDisplay`.
- For "only check X across the items where some condition holds," filter the list down to the matching items first, then assert on all of them unconditionally, rather than looping over everything with an `if` inside. See `header-site.spec.ts`'s `sameRowPairs`.

**`no-force-option`** flags `.check({ force: true })` / `.click({ force: true })`, which skip Playwright's built-in check that the element being interacted with is actually visible, unobscured, and reachable — the same properties that determine whether a real mouse user could click it. Most of the time a forced click is masking a genuine problem: a control nobody could actually reach.

Occasionally it's legitimate. This site's theme-toggle radio inputs are deliberately shrunk to a near-invisible hit area, by design, so a sighted user always clicks the surrounding label instead (see `theme-toggle.spec.ts`) — the input itself was never meant to be directly clickable. But before trusting an explanation like that and silencing the warning, verify it: temporarily remove `force: true` and run the test. If it now fails for the reason expected, that's real evidence worth recording next to the disable comment — a claim that force is "needed" isn't the same thing as having just confirmed it's needed, and the markup can drift out of sync with an old comment over time.

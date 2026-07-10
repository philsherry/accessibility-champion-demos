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

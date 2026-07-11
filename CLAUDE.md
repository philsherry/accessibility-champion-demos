# Nip & Claw — accessibility-champion-demos

Static HTML/CSS/vanilla-JS demo site for *Accessibility Champion*. No build step for the site itself — `public/` is served as-is. See `README.md` for the project's purpose and page catalogue; it's published as a standalone resource, so treat everything under `public/` and `CONVENTIONS.md` as public-facing.

## Commands

- `npm start` — serve `public/` at :4310
- `npm test` — full Playwright suite (axe-core, HTML structural validation, keyboard traversal, component/e2e), all three viewports, `@visual` excluded
- `npm run test:coverage` — same suite, Desktop only, with JS coverage
- `npm run test:visual` — visual regression snapshots only
- `npm run test:ui` — Playwright interactive UI mode
- `npm run lint` — prettier + eslint + stylelint (format → lint:js → lint:css → format:check)
- `npm run lint:js` / `npm run lint:css` — one layer at a time

## ESLint: `eslint-disable` is a last resort

1. Fix the code — the rule exists for a reason.
2. Reconfigure the rule in `eslint.config.js` if it's genuinely misconfigured for this codebase.
3. Only then, a targeted inline disable with a reason:
   ```javascript
   // eslint-disable-next-line rule-name -- explain why this is acceptable here
   ```

Never a file-level or block-level disable without checking the targeted alternative first and stating why it doesn't apply.

> **Read on demand:** `.claude/docs/playwright-lint-patterns.md` — when ESLint reports `playwright/no-conditional-in-test`, `playwright/no-conditional-expect`, or `playwright/no-force-option` in a test file. Has the AST mechanics and the specific restructuring pattern for each, not just the rule name.

## Test locators

> **Read on demand:** `CONVENTIONS.md` — before writing or reviewing any Playwright test. Covers the roles-first / `data-testid` fallback locator strategy and the two Playwright lint rules above, written for public readers as well as for this file's own reference.

## Planning artefacts

Design specs and implementation plans for features on this site live under `docs/superpowers/`, not `.claude/`:

| Type | Path |
|---|---|
| Design specs | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` |
| Implementation plans | `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` |

## Reports

Every test run writes to `reports/` (gitignored, regenerated locally): `reports/playwright/html/`, `reports/html-validate/`, `reports/coverage/`. `npm run reports` serves a browsable index of whatever's currently there.

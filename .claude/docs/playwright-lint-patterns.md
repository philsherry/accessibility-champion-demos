# Playwright ESLint rule patterns

Operational reference for satisfying `eslint-plugin-playwright` rules by restructuring, not suppressing. The reader-facing "why" for these two rules lives in `CONVENTIONS.md` — read that first if it's not already loaded. This doc is the mechanical "how."

## `no-conditional-in-test` / `no-conditional-expect`

Implementation (`no-conditional-in-test` rule): on every `IfStatement` / `ConditionalExpression` / `SwitchStatement` / `LogicalExpression` (except `??` and `||`), walk up the AST to the nearest enclosing `CallExpression`. Only report if that nearest call is a `test`/`step` call.

Consequences that aren't obvious from the rule name:

- A conditional inside a nested helper function *declared* (not called) in the test body is still reported — the walk-up passes straight through function boundaries when the function is merely defined, not invoked at that point. A `const capture = async (label) => { if (...) ... }` closure inside a test is just as much "inside the test" as top-level code.
- A conditional inside a callback passed to a **different** call (`page.evaluate(() => { if (...) ... })`, `.filter(({ a, b }) => ...)`, `.map(...)`) is exempt, because the nearest enclosing `CallExpression` is that call, not `test`/`step`.
- A conditional directly inside a `test.describe(...)` callback, or inside a `for (...)` loop at module scope, is exempt — the nearest enclosing call is `describe` (a different call type) or there is no enclosing call at all.

Fix by data-availability timing:

| Condition known | Fix | Example |
|---|---|---|
| Before the test runs (e.g. `path` from a `for (const { path } of PAGES)` loop generating one `test()` per page) | Branch outside the `test(...)` call — register a different single-assertion test per branch, or precompute the values/closures the test body will use unconditionally | `footer-site.spec.ts` per-page link tests; `header-site.spec.ts`'s `assertCartAriaCurrent`/`currentLabels`/`otherLabels` |
| Only at test runtime (measured viewport, DOM read-back) | Extract a plain top-level function (`function expectedX(input) { return cond ? a : b; }`), declared outside any `test()` call, called from the test body | `responsive-layout.spec.ts`'s `expectedHeaderDisplay` |
| Per-item across an array, condition varies per item | `.filter(...)` to the matching subset first, assert unconditionally in the loop over the filtered result | `header-site.spec.ts`'s `sameRowPairs` |

Do not reach for `eslint-disable` on this rule without checking one of the three patterns above first — every occurrence fixed in this codebase so far had a real restructure available.

## `no-force-option`

`{ force: true }` bypasses Playwright's actionability check (visible, non-zero size, unobscured, stable, receives pointer events).

Before disabling the rule: temporarily strip `force: true` and run the affected test(s). Do not accept an existing code comment's claim that force is required as sufficient evidence — the markup can drift after the comment was written. If the test fails once force is removed, that's the evidence; cite what specifically broke (not just "it's needed") in the disable comment.

Confirmed still required in this codebase: `theme-toggle.spec.ts` radio inputs — clipped to a 1x1px hit area by design (`.theme-toggle input` in `base.css`), so a sighted user always clicks the surrounding label, never the input directly. Removing `force: true` there fails 30 tests.

Disable placement:

- One file with multiple justified call sites → single `/* eslint-disable playwright/no-force-option */` near the file's existing rationale comment, not repeated per call site (`theme-toggle.spec.ts`).
- A one-off elsewhere → `// eslint-disable-next-line playwright/no-force-option` directly above that call, with a short comment or a pointer to the file that has the full rationale (`theme-persistence.spec.ts`).

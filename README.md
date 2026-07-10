# Nip & Claw: purrveyors of the finest artisanal catnip

> Demo project for *Accessibility Champion* by Phil Sherry.

A fictional online catnip dispensary, modelled on the aesthetic of a premium cannabis retailer, staffed entirely by cats who have borrowed their human's phone while they sleep.

The primary customer is **Lucy Fur** — she is on the cover of the book. She has an account. She has a delivery address. She has opinions about strain potency and strongly disputes the "estimated delivery 3–5 working days" claim on the confirmation email.

---

## What this is

A set of static HTML/CSS/vanilla JS demo pages used to illustrate accessibility patterns in *Accessibility Champion*. Each page is a screen from the Nip & Claw storefront, implemented correctly — the accessible version is the primary version.

Screenshots taken from these pages appear in the book pipeline (epub, PDF, print). The repo is also published as a standalone resource for readers who want to inspect the code.

---

## Catalogue

| Page | File | Demonstrates |
|---|---|---|
| Product listing | `public/index.html` | Landmark regions, heading hierarchy, DOM order |
| Strain detail | `public/product.html` | Focus management, accessible SVG (usage chart) |
| Subscription plans | `public/plans.html` | `<th scope>`, accessible tables, responsive table patterns |
| Checkout | `public/checkout.html` | Label association, form validation, error announcements |
| Order history | `public/orders.html` | Touch targets, target spacing, accessible table patterns |

Standalone diagrams that don't fit the store context live in `snippets/`.

---

## Strain catalogue

All strains are artisanal, small-batch, and responsibly sourced by cats who have no idea what "responsibly sourced" means.

| Name | Type | Notes |
|---|---|---|
| Purple Whisker | Naptime | Flagship. Classic. |
| OG Floof | Existential | Heritage strain, very chill |
| Trainwreck (My Owner's Furniture) | Zoomies | Strong. Unpredictable. |
| Grand Daddy Pawple | Naptime | For the senior cat |
| Girl Scout Mousies | Existential | Limited seasonal batch |
| Gorilla Glue (The Good Rug Variety) | Naptime | Sticky. You'll know why. |
| White Widow… It's a Spider, I Will Destroy It | Zoomies | High anxiety |
| Sour Diesel Paws | Zoomies | Fast onset, very zoomy |
| Bruce Banner (Smash the Curtains) | Zoomies | Very potent |
| Wedding Cake (I Knocked It Off the Counter) | Existential | Celebratory. Messy. |

**Types** (our proprietary classification system):
- **Naptime** — calming. Enhanced loaf formation. Prolonged staring at nothing.
- **Zoomies** — energetic. Sudden sprinting. Aggressive kneading. Curtain incidents.
- **Existential** — hybrid. Makes them stare at walls and reconsider all decisions.

---

## Subscription plans

| Plan | Price | Strains/month | Notes |
|---|---|---|---|
| **The Catnap** | £9/month | 1, curated | For the cat who has *a* Tuesday |
| **The Zoomies** | £19/month | 3, mixed potency | For the cat who has *every* Tuesday |
| **The Full Send** | £29/month | Unlimited + exclusives | For the cat who has already made their decision |

---

## Setup

No build step for the site itself. Open any file in `public/` directly in a browser, or serve the directory:

```bash
npm start
```

## Testing

`npm install && npx playwright install --with-deps chromium` once, then:

- `npm test` — the full suite (axe-core accessibility scans, HTML structural validation, keyboard navigation, and component/e2e behaviour) against every page, at three viewports — Mobile (390×844), Tablet (768×1024), and Desktop (1440×900) — run in that order, matching this project's accessibility-first, mobile-second design priority. See `CONVENTIONS.md` for how tests locate elements on the page.
- `npm run test:coverage` — the same suite, Desktop only (avoids tripling redundant capture across viewports), with JS code coverage collected via Playwright's native `page.coverage` API — read directly from Chromium's own inspector protocol, no build step or bundler required.
- `npm run test:visual` — visual regression snapshots (tagged `@visual`, excluded from `npm test`).
- `npm run test:ui` — Playwright's interactive UI mode.

Every page is checked for:
- **axe-core** accessibility violations (WCAG 2.x A/AA rule tags) — `tests/axe-helpers.ts`
- **HTML structural validity** against `html-validate:recommended` (`.htmlvalidate.json`) — validated against the browser-rendered DOM (post-JS), not the static source, so it also catches issues introduced at runtime that a static linter like djlint can't see (invalid nesting, empty headings, duplicate IDs)
- **Full keyboard traversal** — every focusable element stays visible

### Reports

Every run writes its results to `reports/`, one subdirectory per tool (gitignored — regenerated locally, not committed):

- `reports/playwright/html/` — the full Playwright HTML report (every test, every viewport, with traces/screenshots on failure)
- `reports/html-validate/` — one row per page/state/viewport checked; written on every `npm test` run (a `test:coverage` run only produces the Desktop-only subset, since it runs one project)
- `reports/coverage/` — JS coverage as an Istanbul HTML report; only written by `npm run test:coverage`

`npm run reports` serves and opens a browsable index of whatever's currently in `reports/`.

---

## Screenshots

Screenshots are taken at **1440 × 900** viewport for full-page captures, and **390 × 844** (iPhone 14 equivalent) for mobile views — because Lucy Fur is ordering on a phone.

---

## Lucy Fur — account details

For consistency across all demo pages:

| Field | Value |
|---|---|
| Name | Lucy Fur |
| Email | lucy@nipandclaw.com |
| Delivery address | Under the Third Cushion, The Sofa, Living Room |
| Delivery notes | Leave quietly. Do NOT knock. Human is asleep. |
| Member since | The moment she discovered the phone wasn't locked |
| Preferred type | Existential |
| Lifetime spend | More than Phil thinks |

# Admin and receipt pages — design

Resolves the "Build the sketched extensions" item in `TODO.md`. Adds two new
pages: `admin.html` (a staff order-management view) and `receipt.html` (an
order confirmation/receipt page reached from checkout). Sourced from two
scratch notes in the book repo — `09-workplace-office/_SCRATCH.md`'s "Nip &
Claw demo site — section 9 office admin hook" (which already resolved
"Option A: add an admin view to the existing demo repo" over a separate
companion app) and `10-workplace-retail/_SCRATCH.md`'s "Extension idea —
receipt.html". The retail note's other extension idea, `store.html`, and the
option to add "View receipt" links to historical orders on `orders.html`,
are both out of scope here — see "Out of scope."

## Why this pattern

Both pages extend patterns this repo has already built and tested, rather
than inventing new ones: `admin.html`'s table is `orders.html`'s accessible
table pattern made editable; its filter bar is `index.html`'s strain filter
applied to order status; `receipt.html`'s table is the same accessible-table
pattern again, plus a print stylesheet and a progressively-enhanced share
button. No new architectural concepts, just new applications of proven ones
— consistent with this repo's purpose (demonstrating accessible patterns,
not novel ones).

## `admin.html` — staff order management

**Access:** no login, no gating. A "Staff" link added to every page's
footer, alongside "Accessibility statement" and "Offline access" (same
tier — reachable, not part of the primary customer nav). The page states
outright why there's no access control: cats assume everything already
belongs to them, including the back office. This is a joke, stated once on
the page itself, not a design gap to fix later.

**Data:** a small set of invented customers, hardcoded in `admin.js` as
static HTML rows (not JS-rendered), matching `orders.html`'s convention of
real markup with `data-order-id` on each `<tr>` and JS handling only the
interactive layer. Customers: Lucy Fur (reusing her existing order history
from `orders.html`), Princess Slayer (an early name considered for Lucy
Fur before the account details settled), and Baron Von Furrington. Five to
six orders total across the three, spanning all four statuses (Processing,
Shipped, Delivered, Cancelled) so the filter bar has something to filter.

`Cancelled` isn't an existing status on this site — `base.css`/`tokens.css`
currently only define `status-processing`, `status-shipped`, and
`status-delivered` (`orders.html`'s "Cancel order" button lets a customer
*request* cancellation, but nothing currently represents the resulting
state). Adding it here means one new token pair,
`--color-status-cancelled-bg`/`--color-status-cancelled-text`, following
the exact pattern the other three already use in `tokens.css`, plus a
matching `.status-cancelled` rule in `base.css`.

**Status update — `<select>` + explicit Save, not save-on-change:**

```html
<td data-label="Status">
  <label class="sr-only" for="status-{orderId}">Status for order {orderId}</label>
  <select id="status-{orderId}" data-component="status-select" data-order-id="{orderId}">
    <option value="processing">Processing</option>
    <option value="shipped">Shipped</option>
    <option value="delivered">Delivered</option>
    <option value="cancelled">Cancelled</option>
  </select>
  <button type="button" class="btn-icon" data-component="save-status-btn" data-order-id="{orderId}" aria-label="Save status for order {orderId}">
    <svg class="icon" aria-hidden="true"><!-- check --></svg>
  </button>
</td>
```

A `<select>` that saves on `change` alone would trigger a change of context
purely from selecting a value — WCAG 3.2.2 territory, and confusing for
anyone who overshoots the option they meant while arrowing through the
list. The explicit Save button means selecting a value is inert until
deliberately committed.

Save writes `{ [orderId]: status }` to `localStorage` under
`admin-order-status`, then announces via the same `role="status"
aria-live="polite"` live-region pattern used everywhere else on this site
("Order #1042 marked as Shipped"). On page load, `admin.js` merges any
stored overrides over the static HTML defaults before first render, so a
reload doesn't lose a saved change — mirrors `theme-init.js`'s
before-first-paint approach, just for table state instead of the colour
scheme.

**Styling — Customizable Select:** each `<option>` gets a colour swatch
matching the existing `status-badge` palette (`--color-badge-processing`
etc., following the same token-driven approach the dark-mode work already
established), via `appearance: base-select` and `::picker(select)` /
`::picker-icon` / option-level styling. Every option keeps its real text
label regardless of colour — the "golden rule" this feature comes with:
colour is decoration, never the only signal, same principle already
applied to `type-badge`/`status-badge` elsewhere on this site. Browsers
without support see a plain native `<select>` — full functionality either
way, this is presentation-only progressive enhancement.

**Filtering:** a `role="group"` filter bar above the table, one button per
status plus "All", `aria-pressed` state, live-region count announcement on
change ("Showing 3 Processing orders") — identical interaction pattern to
`index.html`'s `.filter-bar`, applied to status instead of strain type.

## `receipt.html` — order confirmation

**Reached from:** `checkout.html`'s existing success state only. A new
"View receipt" link added next to the current "View my orders" button,
carrying the same `?plan=` query param `checkout.html` already reads —
no new persistence layer, `receipt.html` parses `?plan=` exactly the way
`checkout.js` does today.

**Content:** since `checkout.html` only models subscription checkout (no
generic multi-item cart, despite the header's "Cart" label), this is a
subscription receipt, not an itemised product list:

- Accessible table (same `<caption>` + `scope="col"`/`scope="row"`
  pattern as `orders.html`): plan name, monthly price, promo discount
  where applicable, due-today total.
- Delivery details: Lucy Fur's address and delivery notes, reused as-is
  from the existing account-details content (`README.md`'s Lucy Fur
  table is the source of truth for this copy).
- Order date via `toLocaleDateString()` at render time, plus a mock order
  reference number.
- Print stylesheet (`@media print` in a new `receipt.css`): hides header,
  footer, and the share button; keeps just the receipt table — the "my
  human will not understand the invoice" joke already seeded in
  `checkout.html`'s success copy gets its payoff here.

**Share button:** icon button, `navigator.share()` where available
(`'share' in navigator`, mobile mainly) sharing the receipt page URL;
falls back to `navigator.clipboard.writeText()` plus a live-region
confirmation ("Receipt link copied") where the Web Share API isn't
supported. Same progressive-enhancement shape as Customizable Select
above: full functionality on every browser, nicer UX on the ones that
support the newer API.

## Testing

Following existing conventions:

1. Both pages added to `tests/utilities/pages.ts`'s `PAGES` fixture
   (`currentNavLabel: null`, `cartHasAriaCurrent: false` — same as
   `offline.html`/`accessibility.html`), so the existing header/footer
   component specs cover them automatically, including a new footer-link
   assertion for "Staff" (present on every page, resolves to
   `admin.html`).
2. Standard per-page battery on both new pages: axe-core, HTML structural
   validation, full keyboard traversal, at all three viewports.
3. **`tests/components/admin.spec.ts`**: status select + Save + live-region
   confirmation; filter bar (`aria-pressed` state, count announcement,
   correct rows shown/hidden); axe-core clean with the filter applied and
   with a status mid-edit (unsaved selection, before Save is pressed).
4. **`tests/e2e/admin-status-persistence.spec.ts`**: change a status, Save,
   reload, confirm the change survived (same shape as
   `theme-persistence.spec.ts`).
5. **`tests/e2e/receipt.spec.ts`**: full path — choose a plan on
   `subscriptions.html`, complete checkout, follow "View receipt", confirm
   the correct plan/price/date render.
6. Visual regression: new baselines for both pages at all three viewports,
   plus one `emulateMedia('print')` snapshot of `receipt.html` to catch
   print-stylesheet regressions.

## Out of scope

- "View receipt" links on `orders.html`'s historical rows — only the
  just-completed checkout flow reaches `receipt.html` this round.
- `store.html` (retail store locator) — stays a scratch idea, untouched.
- The section 9 "Pawtal" companion-app option — the office scratch note
  already deferred this in favour of the admin.html extension; not
  revisited here.
- Multi-item product-cart checkout — `checkout.html` stays
  subscription-only; the pre-existing "Cart" label vs. plan-only reality
  mismatch isn't fixed as part of this work.
- Wider chapter usage and the "why we built this" appendix page (the two
  other items originally on this TODO) — book-repo work, tracked there,
  not here.

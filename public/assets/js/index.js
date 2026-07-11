/**
 * Products page (index.html) — "Add to cart" buttons, strain-type
 * derivation, and the filter buttons.
 *
 * Depends on assets/js/cart.js being loaded first: `addProductToCart` is
 * declared there (as a page-global classic-script function, not an ES
 * module export — this site has no build step or bundler, so every
 * `<script src>` shares one global scope, in load order) and reused
 * here rather than duplicated. It already updates the persistent
 * cart-count badge and announces the change via the #cart-status live
 * region — both sighted and screen reader users are covered by that
 * alone. No separate toast: see TODO.md's toast pattern review for why
 * one previously existed here and was removed (screen-magnifier and
 * missed-message risk, no user-adjustable timing per WCAG 2.2.1).
 */

// Each product card's "Add to cart" button (.product-cta) gets its click
// listener attached here rather than via an inline onclick= attribute —
// keeps every interactive element on this site consistent (listeners
// from JS, not HTML). Same pattern as orders.html's reorder buttons,
// which call addProductToCart directly too.
document.querySelectorAll('.product-cta').forEach((btn) => {
  btn.addEventListener('click', () => addProductToCart(btn));
});

// Auto-derive data-type on each <li> from its visible badge text.
// Avoids hard-coding it in 12 places in the HTML — the badge IS the
// single source of truth for type, so we read from it directly.
document.querySelectorAll('.product-grid li').forEach((item) => {
  const badge = item.querySelector('.type-badge');
  if (badge) item.dataset.type = badge.textContent.trim().toLowerCase();
});

// Filter buttons — toggle aria-pressed, show/hide cards, announce result.
// aria-pressed state changes are announced by screen readers immediately.
// The live region announcement tells users how many results are now showing.
// Discussed in Section 6, Chapter 5 — Accessible HTML and Section 6, Chapter 12 — Live regions and error announcement.
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
    });
    btn.setAttribute('aria-pressed', 'true');

    const filter = btn.dataset.filter;
    const items = document.querySelectorAll('.product-grid li');
    let shown = 0;

    items.forEach((item) => {
      if (filter === 'all' || item.dataset.type === filter) {
        item.hidden = false;
        shown++;
      } else {
        item.hidden = true;
      }
    });

    // Announce the result via the existing live region —
    // screen readers hear this without the user navigating anywhere.
    const liveRegion = document.getElementById('cart-status');
    liveRegion.textContent = '';
    void liveRegion.offsetWidth; // force repaint so the change is noticed
    liveRegion.textContent =
      filter === 'all'
        ? 'Showing all ' + shown + ' strains.'
        : 'Showing ' +
          shown +
          ' ' +
          filter +
          ' strain' +
          (shown !== 1 ? 's' : '') +
          '.';
  });
});

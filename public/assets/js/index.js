/**
 * Products page (index.html) — "Add to cart" buttons, the toast that
 * confirms an add for sighted users, strain-type derivation, and the
 * filter buttons.
 *
 * Depends on assets/js/cart.js being loaded first: `addProductToCart` is
 * declared there (as a page-global classic-script function, not an ES
 * module export — this site has no build step or bundler, so every
 * `<script src>` shares one global scope, in load order) and reused
 * here rather than duplicated.
 */

/**
 * Adds a product to the cart via addProductToCart (assets/js/cart.js),
 * then shows a toast for sighted users — supplementary to the
 * live-region announcement addProductToCart already sent (screen
 * reader users are covered by that alone). orders.html's reorder
 * doesn't need this, its buttons call addProductToCart directly.
 *
 * @param {HTMLButtonElement} btn - The clicked "Add to cart" button;
 *   its `data-product` attribute names the product being added.
 * @returns {void}
 */
function addToCart(btn) {
  addProductToCart(btn);

  const product = btn.dataset.product;
  const toast = document.getElementById('toast');
  toast.textContent = `${product} added to cart`;
  // aria-hidden stays true throughout — the toast is supplementary,
  // sighted-users-only feedback (see TODO.md); screen reader users are
  // already covered independently via addProductToCart's live-region
  // announcement above. Only the visual .visible class toggles.
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

// Each product card's "Add to cart" button (.product-cta) gets its click
// listener attached here rather than via an inline onclick= attribute —
// keeps every interactive element on this site consistent (listeners
// from JS, not HTML) and means addToCart doesn't need to be reachable
// from raw markup.
document.querySelectorAll('.product-cta').forEach((btn) => {
  btn.addEventListener('click', () => addToCart(btn));
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

/**
 * My Orders page (orders.html) — wires up the "Reorder" icon buttons in
 * the order history table.
 *
 * Depends on assets/js/cart.js being loaded first: `addProductToCart` is
 * declared there (as a page-global classic-script function, not an ES
 * module export — this site has no build step or bundler, so every
 * `<script src>` shares one global scope, in load order) and reused here
 * rather than duplicated, since "reorder" and "add to cart" are the same
 * underlying action of adding one product to the cart.
 *
 * Each reorder button carries `data-product` (which strain to add) and
 * `data-component="reorder-btn"` — a `data-component` hook rather than a
 * class selector because `.btn-icon` alone also matches the neighbouring
 * "Cancel"/"Delete" icon buttons in the same row (see CONVENTIONS.md:
 * `data-component` is for exactly this — scoping a query once a class
 * alone isn't a unique-enough selector).
 *
 * Previously these buttons called `addProductToCart(this)` directly via
 * an inline `onclick=` attribute. Wiring them here instead keeps every
 * interactive element on this site consistent — event listeners
 * attached from JS, no inline handlers — and means `addProductToCart`
 * no longer needs to be reachable from raw HTML markup.
 */
document.querySelectorAll('[data-component="reorder-btn"]').forEach((btn) => {
  btn.addEventListener('click', () => addProductToCart(btn));
});

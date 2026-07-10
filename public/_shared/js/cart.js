let cartCount = 2;

// Shared between index.html's "Add to cart" buttons and orders.html's
// "Reorder" buttons — both are the same action (add a product to the
// cart), just triggered from a different page. Extracted here so the
// increment/badge/aria-label/live-region-announce logic exists in exactly
// one place rather than being duplicated inline a second time.
// Discussed in Section 6, Chapter 12 — Live regions and error announcement.
// eslint-disable-next-line no-unused-vars -- called from inline onclick="addProductToCart(this)"/wrapped by addToCart() across the HTML pages, invisible to ESLint's static analysis
function addProductToCart(btn) {
  const product = btn.dataset.product;
  cartCount++;

  document.querySelector('.cart-count').textContent = cartCount;
  document
    .querySelector('.cart-link')
    .setAttribute('aria-label', `Cart, ${cartCount} items`);

  // Clearing then re-setting the text forces screen readers to re-announce
  // even if the new text is identical to the previous value.
  const liveRegion = document.getElementById('cart-status');
  liveRegion.textContent = '';
  void liveRegion.offsetWidth; // force repaint so screen readers notice the change
  liveRegion.textContent = `${product} added to cart. Cart now contains ${cartCount} items.`;
}

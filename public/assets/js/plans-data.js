/**
 * Subscription plan data — shared between checkout.html (checkout.js)
 * and receipt.html (receipt.js). A page-global classic script (no
 * bundler on this site, so every <script src> shares one global scope
 * in load order) — same pattern as cart.js's addProductToCart.
 */
/* exported PLANS */
const PLANS = {
  catnap: {
    name: 'The Catnap',
    price: 9,
    taglineParts: [
      ['For the cat who has ', false],
      ['a', true],
      [' Tuesday', false],
    ],
    promo: false,
  },
  zoomies: {
    name: 'The Zoomies',
    price: 19,
    taglineParts: [
      ['For the cat who has ', false],
      ['every', true],
      [' Tuesday', false],
    ],
    promo: true,
  },
  fullsend: {
    name: 'The Full Send',
    price: 29,
    taglineParts: [['For the cat who has already made their decision', false]],
    promo: false,
  },
};

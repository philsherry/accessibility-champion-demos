export interface PageMeta {
  path: string;
  /** Visible text of the main-nav link that should carry aria-current="page" on this page, or null if none should. */
  currentNavLabel: string | null;
  /** True only for checkout.html, where the cart link (not a nav link) carries aria-current="page". */
  cartHasAriaCurrent: boolean;
}

// Canonical per-page metadata shared by component specs that loop across
// every page (header-site.spec.ts, footer-site.spec.ts) — single source of
// truth so the list of pages, and which nav link is "current" on each,
// isn't duplicated and drifting between spec files.
export const PAGES: PageMeta[] = [
  {
    path: '/index.html',
    currentNavLabel: 'Products',
    cartHasAriaCurrent: false,
  },
  {
    path: '/subscriptions.html',
    currentNavLabel: 'Subscriptions',
    cartHasAriaCurrent: false,
  },
  {
    path: '/orders.html',
    currentNavLabel: 'My Orders',
    cartHasAriaCurrent: false,
  },
  { path: '/checkout.html', currentNavLabel: null, cartHasAriaCurrent: true },
  // Not reachable from the main header nav at all — no nav link should be current here.
  {
    path: '/accessibility.html',
    currentNavLabel: null,
    cartHasAriaCurrent: false,
  },
  // Reachable via a footer link on every other page, not the main nav —
  // no nav link should be current here.
  { path: '/offline.html', currentNavLabel: null, cartHasAriaCurrent: false },
];

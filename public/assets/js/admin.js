/**
 * Admin page (admin.html) — merges any saved status overrides from
 * localStorage over the static HTML defaults, wires each row's Save
 * button (native <select> + explicit Save, not save-on-change — a
 * <select> that saved immediately on `change` would trigger a change of
 * context purely from selecting a value, WCAG 3.2.2 territory), and
 * wires the status filter bar (identical interaction pattern to
 * index.html's strain filter, applied to order status instead).
 */

const STORAGE_KEY = 'admin-order-status';

const STATUS_LABELS = {
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * @returns {Record<string, string>} saved order-id -> status overrides.
 */
function readStoredStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Applies a status to one row: updates the visible badge's text/class,
 * and syncs the row's <select> to match.
 *
 * @param {HTMLTableRowElement} row
 * @param {string} status - one of STATUS_LABELS's keys.
 */
function applyStatusToRow(row, status) {
  const badge = row.querySelector('.status-badge');
  const select = row.querySelector('[data-component="status-select"]');
  if (!badge || !select) return;

  Object.keys(STATUS_LABELS).forEach((key) => {
    badge.classList.remove('status-' + key);
  });
  badge.classList.add('status-' + status);
  badge.textContent = STATUS_LABELS[status];
  select.value = status;
  row.dataset.status = status;
}

/* Merge stored overrides over the static HTML defaults before first
   render — same before-first-paint intent as theme-init.js, just for
   table state instead of the colour scheme. */
const stored = readStoredStatuses();
document.querySelectorAll('tr[data-order-id]').forEach((row) => {
  const orderId = row.dataset.orderId;
  if (orderId && stored[orderId]) {
    applyStatusToRow(row, stored[orderId]);
  }
});

/* Save buttons — commit the row's <select> value, persist it, announce it. */
document.querySelectorAll('[data-component="save-status-btn"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const orderId = btn.dataset.orderId;
    const row = btn.closest('tr');
    const select = row.querySelector('[data-component="status-select"]');
    if (!orderId || !row || !select) return;

    const status = select.value;
    applyStatusToRow(row, status);

    const all = readStoredStatuses();
    all[orderId] = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    const liveRegion = document.getElementById('admin-status');
    liveRegion.textContent = '';
    void liveRegion.offsetWidth; // force repaint so screen readers notice the change
    liveRegion.textContent =
      'Order #' + orderId + ' marked as ' + STATUS_LABELS[status] + '.';
  });
});

/* Filter bar — toggle aria-pressed, show/hide rows, announce result.
   Identical pattern to index.js's strain-type filter. */
document.querySelectorAll('[data-component="admin-filter-btn"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-component="admin-filter-btn"]').forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
    });
    btn.setAttribute('aria-pressed', 'true');

    const filter = btn.dataset.filter;
    const rows = document.querySelectorAll('tr[data-order-id]');
    let shown = 0;

    rows.forEach((row) => {
      if (filter === 'all' || row.dataset.status === filter) {
        row.hidden = false;
        shown++;
      } else {
        row.hidden = true;
      }
    });

    const liveRegion = document.getElementById('admin-status');
    liveRegion.textContent = '';
    void liveRegion.offsetWidth;
    liveRegion.textContent =
      filter === 'all'
        ? 'Showing all ' + shown + ' orders.'
        : 'Showing ' +
          shown +
          ' ' +
          STATUS_LABELS[filter] +
          ' order' +
          (shown !== 1 ? 's' : '') +
          '.';
  });
});

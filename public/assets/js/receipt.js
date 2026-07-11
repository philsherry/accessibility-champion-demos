/**
 * Receipt page (receipt.html) — populates the receipt table from the
 * `?plan=` query param (same param checkout.html uses; PLANS is shared
 * via plans-data.js, loaded before this file), renders today's date and
 * a mock order reference, and wires the share button.
 */

const params = new URLSearchParams(location.search);
const planKey = params.get('plan') || 'zoomies';
const plan = PLANS[planKey] || PLANS.zoomies;

document.getElementById('receipt-plan-name').textContent = plan.name;
document.getElementById('receipt-monthly-price').textContent =
  '£' + plan.price.toFixed(2) + '/mo';

const promoRow = document.getElementById('receipt-promo-row');
if (plan.promo) {
  document.getElementById('receipt-promo-value').textContent =
    '−£' + plan.price.toFixed(2);
  document.getElementById('receipt-due-today').textContent = '£0.00';
  promoRow.hidden = false;
} else {
  promoRow.hidden = true;
  document.getElementById('receipt-due-today').textContent =
    '£' + plan.price.toFixed(2);
}

const today = new Date();
document.getElementById('receipt-date').textContent = today.toLocaleDateString(
  'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric' },
);

document.getElementById('receipt-reference').textContent =
  'NC-' + today.getFullYear() + '-' + planKey.toUpperCase().slice(0, 3);

/* Share button — Web Share API where available (mobile mainly), with a
   copy-to-clipboard fallback plus a live-region confirmation elsewhere. */
document.getElementById('share-receipt-btn').addEventListener('click', () => {
  const liveRegion = document.getElementById('receipt-status');

  if ('share' in navigator) {
    navigator.share({ title: 'Nip & Claw receipt', url: location.href });
    return;
  }

  navigator.clipboard.writeText(location.href).then(() => {
    liveRegion.textContent = '';
    void liveRegion.offsetWidth;
    liveRegion.textContent = 'Receipt link copied.';
  });
});

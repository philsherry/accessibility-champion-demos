/**
 * Checkout page (checkout.html) — populates the order summary from the
 * `?plan=` query param, and validates the checkout form on submit.
 *
 * PLANS is declared in plans-data.js, loaded before this file.
 */

const params = new URLSearchParams(location.search);
const planKey = params.get('plan') || 'zoomies';
const plan = PLANS[planKey] || PLANS.zoomies;

/* Plan name */
document.getElementById('order-plan-name').textContent = plan.name;

/* Tagline with optional <em> — built with DOM nodes, not innerHTML */
const taglineEl = document.getElementById('order-plan-tagline');
plan.taglineParts.forEach((part) => {
  const text = part[0];
  const isEm = part[1];
  if (isEm) {
    const em = document.createElement('em');
    em.textContent = text;
    taglineEl.appendChild(em);
  } else {
    taglineEl.appendChild(document.createTextNode(text));
  }
});

/* Page subtitle */
document.getElementById('checkout-subtitle').textContent =
  plan.name + ' subscription';

/* Prices */
document.getElementById('order-monthly-price').textContent =
  '£' + plan.price + '/mo';

const promoLine = document.getElementById('order-promo-line');
if (plan.promo) {
  document.getElementById('order-promo-value').textContent =
    '−£' + plan.price.toFixed(2);
  document.getElementById('order-due-today').textContent = '£0.00';
  promoLine.hidden = false;
} else {
  promoLine.hidden = true;
  document.getElementById('order-due-today').textContent =
    '£' + plan.price.toFixed(2);
}

document.getElementById('order-terms').textContent =
  'Then £' +
  plan.price.toFixed(2) +
  '/month. Cancel anytime. Your human cannot cancel on your behalf.';

/* ── Form validation ─────────────────────────────────── */

/**
 * Validation rules for the checkout form, one entry per field.
 *
 * @typedef {object} ValidationRule
 * @property {string} id - The field's element id (and error-message /
 *   form-group element id prefix — see setFieldError).
 * @property {string} label - Human-readable field name, used in the
 *   error summary's link text (e.g. "Postcode — Enter a valid UK
 *   postcode").
 * @property {(value: string) => (string|null)} validate - Returns an
 *   error message string if `value` is invalid, or null if it's valid.
 *
 * @type {ValidationRule[]}
 */
const RULES = [
  {
    id: 'full-name',
    label: 'Full name',
    validate: (v) => (v.trim() ? null : 'Enter your full name'),
  },
  {
    id: 'address-line1',
    label: 'Address line 1',
    validate: (v) =>
      v.trim() ? null : 'Enter the first line of your delivery address',
  },
  {
    id: 'city',
    label: 'Town or city',
    validate: (v) => (v.trim() ? null : 'Enter your town or city'),
  },
  {
    id: 'postcode',
    label: 'Postcode',
    validate: (v) => {
      const pc = v.trim().toUpperCase().replace(/\s+/g, '');
      return /^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/.test(pc)
        ? null
        : 'Enter a valid UK postcode (for example, W11 4NR)';
    },
  },
  {
    id: 'card-number',
    label: 'Card number',
    validate: (v) => {
      const digits = v.replace(/\s/g, '');
      if (!digits) return 'Enter your card number';
      if (digits.length < 16) return 'Enter a complete 16-digit card number';
      return null;
    },
  },
  {
    id: 'card-expiry',
    label: 'Expiry date',
    validate: (v) =>
      v.trim() ? null : 'Enter the expiry date shown on your card',
  },
  {
    id: 'cvc',
    label: 'Security code',
    validate: (v) => {
      const digits = v.replace(/\s/g, '');
      if (!digits)
        return 'Enter the 3-digit security code from the back of your card';
      if (digits.length < 3) return 'Security code must be 3 digits';
      return null;
    },
  },
  {
    id: 'card-name',
    label: 'Name on card',
    validate: (v) =>
      v.trim() ? null : 'Enter the name as it appears on your card',
  },
];

/**
 * Sets or clears the error state for one field: aria-invalid, the
 * field's own error message text, and the has-error class on its
 * form-group wrapper (drives the red border/label via CSS).
 *
 * @param {ValidationRule} rule - The RULES entry for this field.
 * @param {string|null} message - Error message to show, or null to
 *   clear the error.
 * @returns {void}
 */
const setFieldError = (rule, message) => {
  const input = document.getElementById(rule.id);
  const errorEl = document.getElementById(rule.id + '-error');
  const groupEl = document.getElementById('group-' + rule.id);
  if (!input || !errorEl) return;

  const hasError = Boolean(message);
  input.setAttribute('aria-invalid', String(hasError));
  errorEl.textContent = message || '';
  groupEl?.classList.toggle('has-error', hasError);
};

/**
 * Clears every field's error state and hides the error summary —
 * called at the start of each submit attempt so a resubmission starts
 * from a clean slate rather than layering errors.
 *
 * @returns {void}
 */
const clearAllErrors = () => {
  RULES.forEach((rule) => setFieldError(rule, null));
  const summary = document.getElementById('error-summary');
  summary.hidden = true;
  const list = document.getElementById('error-summary-list');
  while (list.firstChild) list.removeChild(list.firstChild);
};

/**
 * Builds and reveals the GDS-style error summary: a heading with the
 * error count, and a list of links straight to each invalid field.
 * Moves focus to the summary so keyboard users land at the top of the
 * error list immediately after a failed submit.
 *
 * @param {{rule: ValidationRule, message: string}[]} errors
 * @returns {void}
 */
const showErrorSummary = (errors) => {
  const summary = document.getElementById('error-summary');
  const heading = document.getElementById('error-summary-heading');
  const list = document.getElementById('error-summary-list');

  const count = errors.length;
  heading.textContent =
    'There ' +
    (count === 1 ? 'is 1 error' : 'are ' + count + ' errors') +
    ' in your form';

  /*
   * Build error links with DOM methods — no innerHTML.
   * Each link goes directly to the invalid field; pressing Enter moves focus there.
   */
  const frag = document.createDocumentFragment();
  errors.forEach((item) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + item.rule.id;
    a.textContent = item.rule.label + ' — ' + item.message;
    li.appendChild(a);
    frag.appendChild(li);
  });
  while (list.firstChild) list.removeChild(list.firstChild);
  list.appendChild(frag);

  /*
   * Remove hidden — role="alert" fires immediately, announcing the error count
   * and list to screen readers without the user needing to navigate to it.
   * Discussed in Section 6, Chapter 12 — Live regions and error announcement.
   */
  summary.hidden = false;

  /*
   * Move keyboard focus to the summary so Tab starts from the first error link.
   * tabindex="-1" is already set in the HTML.
   * Discussed in Section 6, Chapter 9 — Keyboard navigation and focus.
   */
  summary.focus();
};

document.getElementById('checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();
  clearAllErrors();

  const errors = [];
  RULES.forEach((rule) => {
    const input = document.getElementById(rule.id);
    if (!input) return;
    const message = rule.validate(input.value);
    if (message) {
      setFieldError(rule, message);
      errors.push({ rule: rule, message: message });
    }
  });

  if (errors.length) {
    showErrorSummary(errors);
    return;
  }

  /* All valid — show success state */
  document.getElementById('checkout-form-wrapper').hidden = true;
  const success = document.getElementById('checkout-success');
  success.hidden = false;
  success.querySelector('h1').focus();
  document.getElementById('view-receipt-link').href = 'receipt.html?plan=' + planKey;
});

/* Inline re-validation on blur — clears error once the field is corrected */
RULES.forEach((rule) => {
  const input = document.getElementById(rule.id);
  if (!input) return;
  input.addEventListener('blur', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      const message = rule.validate(input.value);
      setFieldError(rule, message);
    }
  });
});

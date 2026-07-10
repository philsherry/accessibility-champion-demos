/**
 * Wires the header's online/offline status badge (present on every page,
 * next to the logo). A pure status indicator, not a link — see
 * footer-site.spec.ts for how offline.html is actually reached.
 * Announces only on change via the visually-hidden #connectivity-status
 * live region, so screen reader users aren't told "you're online" on
 * every single page load — only when the state actually changes.
 *
 * The icon swap is decorative (both icons are aria-hidden) — the label
 * span carries the actual accessible text, so only it is ever written
 * to; the badge's own textContent is never touched directly, which
 * would wipe out the icon markup alongside it.
 */
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.querySelector('[data-component="connectivity-badge"]');
  const onlineIcon = badge?.querySelector(
    '[data-component="connectivity-icon-online"]',
  );
  const offlineIcon = badge?.querySelector(
    '[data-component="connectivity-icon-offline"]',
  );
  const label = badge?.querySelector(
    '[data-component="connectivity-badge-label"]',
  );
  const liveRegion = document.getElementById('connectivity-status');
  if (!badge || !onlineIcon || !offlineIcon || !label || !liveRegion) return;

  // Setting the `hidden` IDL property (el.hidden = true) does not reflect
  // to the `hidden` content attribute on SVG elements in every engine —
  // the property reads back correctly but hasAttribute('hidden') stays
  // false, so the CSS [hidden] selector never sees the change. Setting
  // the attribute directly sidesteps that reflection gap.
  function setHidden(el, isHidden) {
    if (isHidden) {
      el.setAttribute('hidden', '');
    } else {
      el.removeAttribute('hidden');
    }
  }

  function render(isOnline) {
    label.textContent = isOnline ? 'Online' : 'Offline';
    setHidden(onlineIcon, !isOnline);
    setHidden(offlineIcon, isOnline);
    badge.classList.toggle('connectivity-badge--offline', !isOnline);
  }

  function announce(isOnline) {
    const message = isOnline
      ? "You're back online."
      : "You're now offline — showing saved content.";
    liveRegion.textContent = '';
    void liveRegion.offsetWidth; // force repaint so screen readers notice the change
    liveRegion.textContent = message;
  }

  render(navigator.onLine);

  window.addEventListener('online', () => {
    render(true);
    announce(true);
  });

  window.addEventListener('offline', () => {
    render(false);
    announce(false);
  });
});

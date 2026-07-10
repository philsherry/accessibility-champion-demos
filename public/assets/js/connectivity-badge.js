/**
 * Wires the header's online/offline status badge (present on every page,
 * after the theme-toggle). A pure status indicator, not a link — see
 * footer-site.spec.ts for how offline.html is actually reached.
 * Announces only on change via the visually-hidden #connectivity-status
 * live region, so screen reader users aren't told "you're online" on
 * every single page load — only when the state actually changes.
 */
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.querySelector('[data-component="connectivity-badge"]');
  const liveRegion = document.getElementById('connectivity-status');
  if (!badge || !liveRegion) return;

  function render(isOnline) {
    badge.textContent = isOnline ? 'Online' : 'Offline';
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

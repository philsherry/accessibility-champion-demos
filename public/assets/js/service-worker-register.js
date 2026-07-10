/**
 * Registers the service worker (public/service-worker.js) and listens
 * for its "sw-updated" message, persisting when this cached version was
 * installed so offline.html can display it. Loaded on every page.
 *
 * The registration path is relative (no leading slash) so it resolves
 * against the current page's URL — correct both when serving from the
 * site root locally and from GitHub Pages' /accessibility-champion-demos/
 * project-site subpath. See
 * docs/superpowers/specs/2026-07-10-offline-caching-design.md.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js', { scope: './' })
      .catch((error) => {
        console.warn('service-worker-register: registration failed', error);
      });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'sw-updated') {
      try {
        localStorage.setItem('offline-cached-at', String(event.data.timestamp));
      } catch (error) {
        console.warn(
          'service-worker-register: could not persist cache timestamp',
          error,
        );
      }
    }
  });
}

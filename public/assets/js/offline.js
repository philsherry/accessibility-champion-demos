/**
 * offline.html-specific behaviour: shows when this cached version of the
 * site was installed (written to localStorage by
 * assets/js/service-worker-register.js when the service worker sends its
 * "sw-updated" message — see service-worker.js's notifyClientsOfUpdate),
 * and wires the "Clear offline data" button.
 */
document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('offline-cache-status');
  const confirmEl = document.getElementById('offline-page-status');
  const clearBtn = document.querySelector(
    '[data-component="clear-offline-data"]',
  );

  function renderCacheStatus() {
    if (!statusEl) return;
    let timestamp = null;
    try {
      timestamp = localStorage.getItem('offline-cached-at');
    } catch (error) {
      console.warn('offline: could not read cache timestamp', error);
    }
    if (timestamp) {
      const date = new Date(Number(timestamp));
      statusEl.textContent = `This version of the site was cached on ${date.toLocaleString()}.`;
    } else {
      statusEl.textContent =
        "This site hasn't been cached for offline use yet — this updates automatically, usually within a second of your first visit.";
    }
  }

  function announce(message) {
    if (!confirmEl) return;
    // Clearing then re-setting forces screen readers to re-announce even
    // if the new text happens to match the previous value.
    confirmEl.textContent = '';
    void confirmEl.offsetWidth; // force repaint
    confirmEl.textContent = message;
  }

  renderCacheStatus();

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const unregisterAll =
        'serviceWorker' in navigator
          ? navigator.serviceWorker
              .getRegistrations()
              .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
          : Promise.resolve();

      const clearCaches =
        'caches' in window
          ? caches
              .keys()
              .then((keys) =>
                Promise.all(keys.map((key) => caches.delete(key))),
              )
          : Promise.resolve();

      Promise.all([unregisterAll, clearCaches])
        .then(() => {
          try {
            localStorage.removeItem('offline-cached-at');
          } catch (error) {
            console.warn('offline: could not clear cache timestamp', error);
          }
          renderCacheStatus();
          // Focus deliberately stays on the button — its action doesn't
          // remove it from the page, so moving focus elsewhere would be
          // disorienting rather than helpful. The live region carries
          // the confirmation instead.
          announce(
            'Offline data cleared. This site will be re-cached automatically next time you visit while online.',
          );
        })
        .catch((error) => {
          console.warn('offline: could not clear offline data', error);
          announce(
            'Something went wrong clearing offline data. Please try again.',
          );
        });
    });
  }
});

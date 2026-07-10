/**
 * Allows ExtendableEvent#waitUntil (and, by extension,
 * FetchEvent#respondWith) to be called asynchronously — e.g. from inside
 * a .then() after the event handler's initial synchronous execution has
 * already returned — rather than only during that initial synchronous
 * dispatch. service-worker.js's fetch handler relies on this to kick off
 * a background cache refresh after already responding from cache.
 *
 * The corrected behaviour has been spec-mandated for years and every
 * evergreen browser supports it natively; this exists for the browsers
 * that don't. The restriction was a Chromium bug
 * (https://issues.chromium.org/issues/40519540), fixed in Chrome 60
 * (mid-2017) — so this protects older, non-upgradable Android/Chromium
 * devices still on Chrome 40–59. Safari didn't ship service workers
 * until Safari 11.1 (after the spec fix landed), so this specific bug
 * never applied there. See
 * docs/superpowers/specs/2026-07-10-offline-caching-design.md for the
 * full research behind keeping this.
 *
 * Vendored verbatim from
 * https://github.com/jakearchibald/async-waituntil-polyfill
 * (Jake Archibald, used by resilientwebdesign.com/serviceworker.js).
 */
{
  const waitUntil = ExtendableEvent.prototype.waitUntil;
  const respondWith = FetchEvent.prototype.respondWith;
  const promisesMap = new WeakMap();

  ExtendableEvent.prototype.waitUntil = function (promise) {
    const extendableEvent = this;
    let promises = promisesMap.get(extendableEvent);

    if (promises) {
      promises.push(Promise.resolve(promise));
      return;
    }

    promises = [Promise.resolve(promise)];
    promisesMap.set(extendableEvent, promises);

    // call original method
    return waitUntil.call(
      extendableEvent,
      Promise.resolve().then(function processPromises() {
        const len = promises.length;

        // wait for all to settle
        return Promise.all(promises.map((p) => p.catch(() => {}))).then(
          () => {
            // have new items been added? If so, wait again
            if (promises.length != len) return processPromises();
            // we're done!
            promisesMap.delete(extendableEvent);
            // reject if one of the promises rejected
            return Promise.all(promises);
          },
        );
      }),
    );
  };

  FetchEvent.prototype.respondWith = function (promise) {
    this.waitUntil(promise);
    return respondWith.call(this, promise);
  };
}

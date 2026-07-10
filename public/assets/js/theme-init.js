// Applies a stored colour-scheme preference before first paint, so the
// page never flashes the wrong theme. Loaded as a blocking <script> in
// <head>, before the stylesheet <link>s — see theme.js for the toggle
// that writes localStorage in the first place.
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-user-color-scheme', stored);
    }
  } catch {
    // localStorage unavailable (private browsing, disabled storage) —
    // falls through to the @media (prefers-color-scheme) default.
  }
})();

// Wires every page's theme-toggle fieldset (see theme-init.js for the
// blocking script that applies a stored choice before first paint).
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('[data-component="theme-toggle"]');
  if (!toggle) return;

  var radios = toggle.querySelectorAll('input[name="theme"]');
  var current =
    document.documentElement.getAttribute('data-user-color-scheme') || 'auto';

  radios.forEach(function (radio) {
    radio.checked = radio.value === current;

    radio.addEventListener('change', function () {
      if (radio.value === 'auto') {
        document.documentElement.removeAttribute('data-user-color-scheme');
        try {
          localStorage.removeItem('theme');
        } catch {
          // localStorage unavailable — theme reverts to auto next load anyway.
        }
      } else {
        document.documentElement.setAttribute(
          'data-user-color-scheme',
          radio.value,
        );
        try {
          localStorage.setItem('theme', radio.value);
        } catch {
          // localStorage unavailable — choice won't persist across reloads,
          // but still applies for the rest of this page view.
        }
      }
    });
  });
});

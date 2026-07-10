/**
 * Wires every page's theme-toggle fieldset (see theme-init.js for the
 * blocking script that applies a stored choice before first paint).
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-component="theme-toggle"]');
  if (!toggle) return;

  const radios = toggle.querySelectorAll('input[name="theme"]');
  const current =
    document.documentElement.getAttribute('data-user-color-scheme') || 'auto';

  radios.forEach((radio) => {
    radio.checked = radio.value === current;

    radio.addEventListener('change', () => {
      if (radio.value === 'auto') {
        document.documentElement.removeAttribute('data-user-color-scheme');
        try {
          localStorage.removeItem('theme');
        } catch (error) {
          // localStorage unavailable — theme reverts to auto next load
          // anyway. Logged, not silently swallowed.
          console.warn('theme: could not clear stored theme preference', error);
        }
      } else {
        document.documentElement.setAttribute(
          'data-user-color-scheme',
          radio.value,
        );
        try {
          localStorage.setItem('theme', radio.value);
        } catch (error) {
          // localStorage unavailable — choice won't persist across
          // reloads, but still applies for the rest of this page view.
          console.warn('theme: could not persist theme preference', error);
        }
      }
    });
  });
});

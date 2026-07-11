/**
 * @see https://stylelint.io/user-guide/rules/
 */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/html'],
  plugins: ['stylelint-order'],
  overrides: [
    {
      files: ['**/*.html'],
      rules: {
        // djlint is the formatting authority for these files (including
        // embedded <style> blocks) and deliberately keeps small one-off
        // modifier rules on one line — not stylelint's job to re-litigate
        // that here.
        'declaration-block-single-line-max-declarations': null,
      },
    },
  ],
  rules: {
    // Cascade order here is deliberate (later, more specific rules refine
    // earlier ones) rather than accidental — same call the book repo's own
    // stylelint.config.js makes.
    'no-descending-specificity': null,
    // Base kebab-case, plus BEM-style `--modifier` suffixes already in use
    // (e.g. .btn-icon--danger).
    'selector-class-pattern':
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(--[a-z0-9]+(-[a-z0-9]+)*)?$',
    'order/properties-alphabetical-order': true,
  },
};

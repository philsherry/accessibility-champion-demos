import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import html from 'eslint-plugin-html';
import playwright from 'eslint-plugin-playwright';
import { includeIgnoreFile } from '@eslint/compat';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  // Generated report output (each tool's own gitignore lives inside its own
  // reports/<tool>/ subdirectory, not the root .gitignore — see there for why).
  { ignores: ['reports/**'] },
  js.configs.recommended,
  prettier,

  // Config files themselves run under Node.
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Shared browser JS, loaded via <script src> on multiple pages. Plain
  // classic scripts, not ES modules — sourceType: 'script' both reflects
  // that accurately and enables the /* exported */ pragma in cart.js (a
  // no-op under the default 'module' sourceType).
  {
    files: ['public/assets/js/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser },
    },
  },

  // addProductToCart is declared in cart.js and consumed from
  // index.js/orders.js — with no bundler, every <script src> shares one
  // global scope in load order, so ESLint needs to be told that global
  // exists to check these two consuming files without a no-undef false
  // positive. Scoped to just these two files (not the block above,
  // which also matches cart.js itself) — declaring it globally there
  // too would make cart.js's own `function addProductToCart` collide
  // with a same-named global (no-redeclare).
  {
    files: ['public/assets/js/index.js', 'public/assets/js/orders.js'],
    languageOptions: {
      globals: { addProductToCart: 'readonly' },
    },
  },

  // Inline <script> blocks in the 5 page files, extracted by
  // eslint-plugin-html and linted as real JS. None of the 5 pages
  // currently has any inline script left (all page behaviour now lives
  // in public/assets/js/*.js, loaded via <script src>) — this block is
  // kept so any inline script added in future is still linted, rather
  // than silently skipped.
  {
    files: ['public/*.html'],
    plugins: { html },
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser },
    },
  },

  // Playwright test suite + its own config file.
  {
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['tests/**/*.spec.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // These wrap real expect() calls in shared helpers (axe-helpers.ts,
      // keyboard-helpers.ts) — invisible to the rule without this list.
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expectNoAxeViolations',
            'expectSkipLinkBypassesHeader',
            'expectFullKeyboardTraversalStaysVisible',
          ],
        },
      ],
    },
  },
);

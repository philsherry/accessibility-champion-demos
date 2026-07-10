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
  js.configs.recommended,
  prettier,

  // Config files themselves run under Node.
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Shared browser JS, loaded via <script src> on multiple pages.
  {
    files: ['public/_shared/js/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Inline <script> blocks in the 5 page files. addProductToCart comes from
  // the externally-loaded _shared/js/cart.js — eslint-plugin-html only sees
  // inline script content, not <script src> references, so it has no way to
  // know that global exists without being told here.
  {
    files: ['public/*.html'],
    plugins: { html },
    languageOptions: {
      globals: { ...globals.browser, addProductToCart: 'readonly' },
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

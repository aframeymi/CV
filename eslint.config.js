// Static analysis: ESLint's recommended rules catch common bugs, and eslint-plugin-security flags
// patterns that often lead to vulnerabilities, such as dynamic file paths or unsafe regular expressions.
import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  {
    // The Playwright tests still use fields and routes that no longer exist, and will be rewritten
    ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'tests/E2E/'],
  },
  js.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      // Flags every obj[key], even with constant or numeric keys. All cases found were reviewed: user
      // input never chooses a property name, since the form rules drop fields they do not define.
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
  },
  {
    // Scripts for the browser, loaded with <script src>. Chart comes from /vendor/chart.umd.js.
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, Chart: 'readonly' } },
  },
  {
    files: ['tests/Jest/**/*.js', 'jest.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      // Tests build file paths and patterns from their own fixtures, never from outside input
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
];

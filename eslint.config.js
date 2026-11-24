'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  { files: ['**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, fetch: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], eqeqeq: 'error', 'prefer-const': 'error', 'no-var': 'error' } },
  { files: ['public/app.js'], languageOptions: { globals: { ...globals.browser } } },
];

// @ts-check
// ESLint flat config (ESLint 9) for Angular 21
// Covers TypeScript source files and Angular HTML templates.

const tseslint = require('typescript-eslint');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const templateParser = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**'],
  },

  // ── TypeScript source files ────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {
      // Angular class conventions
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/use-pipe-transform-interface': 'error',

      // TypeScript quality
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'no-type-imports' }],
      // Empty arrow functions are a deliberate swallow-error pattern (e.g. .catch(() => {}))
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
    },
  },

  // ── Test files (relax some rules) ─────────────────────────────────────────
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // ── Angular HTML templates ─────────────────────────────────────────────────
  {
    files: ['src/**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    languageOptions: {
      parser: templateParser,
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-negated-async': 'warn',
      '@angular-eslint/template/eqeqeq': 'error',
    },
  },
);

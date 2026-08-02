// Flat config. The repo had an `eslint src/ --ext .ts` script but no config file
// at all, so linting has silently done nothing since ESLint 9 removed .eslintrc
// support and dropped --ext. Without a TypeScript parser ESLint cannot read .ts
// at all, so typescript-eslint supplies parser and rules.
//
// .mjs because package.json has no "type": "module" — a plain eslint.config.js
// would be parsed as CommonJS and the ESM syntax below would fail.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/generated/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  },
);

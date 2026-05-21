import baseConfig from './eslint.base.mjs';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

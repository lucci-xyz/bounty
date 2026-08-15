import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * ESLint for a money-handling Next.js app that previously had none.
 *
 * The rules that are errors here are the ones that have actually cost this
 * codebase something:
 *
 * - `no-unused-vars` catches the dead helpers and orphaned imports that
 *   accumulated around removed endpoints.
 * - `no-floating-promises` is not available without type information, so
 *   `require-await` and `no-return-await` stand in for the shape of bug where
 *   an on-chain call is fired without being awaited.
 * - `eqeqeq` matters where an id from a webhook payload is compared against one
 *   from the database and the two are different types.
 *
 * Everything stylistic is left to Prettier.
 */
export default [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'artifacts/**',
      'public/**',
      'server/db/migrations/**'
    ]
  },
  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true
        }
      ],
      eqeqeq: ['error', 'smart'],
      'no-throw-literal': 'error',
      'require-await': 'warn',
      'no-return-await': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    // Scripts are operator tooling and print to stdout by design.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    rules: { 'no-console': 'off' }
  }
];

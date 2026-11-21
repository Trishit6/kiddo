import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Shared flat config for every JS/TS file in the workspace. */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/drizzle/*.sql',
      '**/.expo-shared/**',
      // Tooling definitions for the coding agent, not part of the app.
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/api/**/*.{ts,mts}', 'packages/**/*.{ts,mts}', 'scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.config.{js,mjs,cjs,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Expo Metro/Babel configs are CommonJS by convention.
    files: ['**/metro.config.js', '**/babel.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Jest's CommonJS setup file needs Node and Jest globals.
    files: ['apps/mobile/jest.setup.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // A few RN test mocks need require() inside jest.mock factories.
    files: [
      'apps/mobile/src/components/auth-gate.test.tsx',
      'apps/mobile/src/components/feed/comment-composer.test.tsx',
    ],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);

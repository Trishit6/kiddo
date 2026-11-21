/** Shared Prettier config for the workspace. */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      files: ['*.md', '*.yml', '*.yaml', '*.json'],
      options: { printWidth: 100 },
    },
  ],
};

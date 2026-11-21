/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    [String.raw`^(\.{1,2}/.*\.cjs)$`]: '$1',
    [String.raw`^(\.{1,2}/.*)\.js$`]: '$1',
    '^@reel/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@reel/queries$': '<rootDir>/../../packages/queries/src/index.ts',
    '^@reel/tokens$': '<rootDir>/../../packages/tokens/src/index.ts',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
};

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@reel/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    fileParallelism: false,
    // @reel/shared is TypeScript source, so it must be transformed by Vite
    // instead of being externalized as a native Node package.
    server: { deps: { inline: [/@reel\/shared/] } },
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://reel:reel@localhost:5432/reel_test',
      REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/1',
    },
  },
});

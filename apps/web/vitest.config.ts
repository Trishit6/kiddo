import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@reel/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      '@reel/queries': fileURLToPath(
        new URL('../../packages/queries/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    server: { deps: { inline: [/@reel\/(shared|queries)/] } },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    exclude: ['test/e2e/**', '**/node_modules/**'],
    globals: true, // Optional: if we want global test/expect, but explicit import is better
  },
});

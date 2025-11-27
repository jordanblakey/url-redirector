import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    exclude: ['test/e2e/**', '**/node_modules/**'],
    globals: true, // Optional: if we want global test/expect, but explicit import is better
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'text-summary'],
      reportsDirectory: 'test/artifacts/coverage-vitest',
      include: ['src/**/*.ts'],
      all: true,
      exclude: ['src/types.d.ts', '**/*.d.ts', '**/*.spec.ts', 'demos/**', 'scripts/**'],
    },
  },
});
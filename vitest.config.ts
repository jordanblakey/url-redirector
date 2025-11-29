import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    exclude: ['test/e2e/**', '**/node_modules/**'],
    reporters: createReporters(),
    globals: true, // Optional: if we want global test/expect, but explicit import is better
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'text-summary'],
      reportsDirectory: 'test/artifacts/coverage-vitest',
      include: ['src/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['src/types.d.ts', '**/*.d.ts', '**/*.spec.ts', 'demos/**'],
    },
  },
});

function createReporters(): string[] {
  const reporters = [];
  if (process.env.CI) {
    reporters.push('tree');
  } else {
    if (process.env.COVERAGE) {
      reporters.push('default');
    } else {
      reporters.push('dot');
    }
  }
  return reporters;
}

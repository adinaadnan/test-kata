import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['frontend/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['frontend/*.js'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});

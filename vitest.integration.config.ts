import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'apps/**/*.integration.test.ts',
      'packages/**/*.integration.test.ts',
    ],
    testTimeout: 15_000,
  },
});

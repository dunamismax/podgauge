import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      PODGAUGE_TEST_DATABASE_URL:
        'postgres://podgauge:podgauge_dev_only@127.0.0.1:54329/podgauge',
      PODGAUGE_TEST_SEED: 'podgauge-integration-seed-v1',
    },
    include: [
      'apps/**/*.integration.test.ts',
      'packages/**/*.integration.test.ts',
    ],
    testTimeout: 15_000,
  },
});

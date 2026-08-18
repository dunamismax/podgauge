import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        'postgres://podgauge_migration:podgauge_migration_dev_only@127.0.0.1:54329/podgauge',
      PODGAUGE_TEST_DATABASE_URL:
        'postgres://podgauge:podgauge_dev_only@127.0.0.1:54329/podgauge',
      PODGAUGE_TEST_SEED: 'podgauge-integration-seed-v1',
    },
    include: [
      'apps/**/*.integration.test.ts',
      'packages/**/*.integration.test.ts',
    ],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});

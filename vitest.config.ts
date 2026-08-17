import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({ configFile: 'apps/web/svelte.config.js' }),
    svelteTesting(),
  ],
  resolve: {
    alias: {
      '@podgauge/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url),
      ),
      '@podgauge/engine': fileURLToPath(
        new URL('./packages/engine/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      reporter: ['text', 'json-summary'],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
    ],
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    setupFiles: ['./apps/web/tests/setup.ts'],
  },
});

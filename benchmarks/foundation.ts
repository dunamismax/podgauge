import { performance } from 'node:perf_hooks';

import { createContextFingerprint } from '@podgauge/engine';

const iterations = 10_000;
const context = {
  seed: 'foundation-smoke',
  versions: {
    benchmark: {
      benchmarkVersionId: 'benchmark_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
    cardData: {
      snapshotId: 'card-data_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
    engine: {
      engineVersionId: 'engine_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
    policy: {
      policyVersionId: 'policy_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
    reportSchema: {
      reportSchemaVersionId:
        'report-schema_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
    simulation: {
      simulationVersionId: 'simulation_00000000-0000-4000-8000-000000000001',
      version: '0.1.0',
    },
  },
};

const startedAt = performance.now();
let lastFingerprint = '';
for (let index = 0; index < iterations; index += 1) {
  lastFingerprint = createContextFingerprint(context);
}
const durationMilliseconds = performance.now() - startedAt;

console.log(
  JSON.stringify({
    benchmark: 'foundation-context-fingerprint',
    durationMilliseconds: Number(durationMilliseconds.toFixed(3)),
    fingerprint: lastFingerprint,
    iterations,
    scope: 'smoke-only-not-a-performance-claim',
  }),
);

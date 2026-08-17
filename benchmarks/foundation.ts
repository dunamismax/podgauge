import { performance } from 'node:perf_hooks';

import { createContextFingerprint } from '@podgauge/engine';

const iterations = 10_000;
const context = {
  benchmarkVersion: '0.0.0',
  cardDataVersion: '0.0.0',
  engineVersion: '0.0.0',
  policyVersion: '0.0.0',
  reportSchemaVersion: '0.0.0',
  seed: 'foundation-smoke',
  simulationVersion: '0.0.0',
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

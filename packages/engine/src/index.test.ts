import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createContextFingerprint } from './index.js';

const semver = fc
  .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
  .map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

function context(version: string, seed: string) {
  return {
    seed,
    versions: {
      benchmark: {
        benchmarkVersionId: 'benchmark_00000000-0000-4000-8000-000000000001',
        version,
      },
      cardData: {
        snapshotId: 'card-data_00000000-0000-4000-8000-000000000001',
        version,
      },
      engine: {
        engineVersionId: 'engine_00000000-0000-4000-8000-000000000001',
        version,
      },
      policy: {
        policyVersionId: 'policy_00000000-0000-4000-8000-000000000001',
        version,
      },
      reportSchema: {
        reportSchemaVersionId:
          'report-schema_00000000-0000-4000-8000-000000000001',
        version,
      },
      simulation: {
        simulationVersionId: 'simulation_00000000-0000-4000-8000-000000000001',
        version,
      },
    },
  };
}

describe('deterministic engine foundation', () => {
  it('is independent of object insertion order', () => {
    fc.assert(
      fc.property(
        semver,
        fc.string({ minLength: 1, maxLength: 32 }),
        (version, seed) => {
          const forward = context(version, seed);
          const reverse = {
            versions: {
              simulation: forward.versions.simulation,
              reportSchema: forward.versions.reportSchema,
              policy: forward.versions.policy,
              engine: forward.versions.engine,
              cardData: forward.versions.cardData,
              benchmark: forward.versions.benchmark,
            },
            seed,
          };

          expect(createContextFingerprint(forward)).toBe(
            createContextFingerprint(reverse),
          );
        },
      ),
    );
  });

  it('includes every reproducibility input and immutable record identifier', () => {
    const fingerprint = createContextFingerprint(context('1.2.3', 'seven'));

    expect(fingerprint).toContain('"engineVersionId":"engine_');
    expect(fingerprint).toContain('"simulationVersionId":"simulation_');
    expect(fingerprint).toContain('"seed":"seven"');
    expect(fingerprint).toContain('"version":"1.2.3"');
  });
});

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createContextFingerprint } from './index.js';

const semver = fc
  .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
  .map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

describe('deterministic engine foundation', () => {
  it('is independent of object insertion order', () => {
    fc.assert(
      fc.property(
        semver,
        fc.string({ minLength: 1, maxLength: 32 }),
        (version, seed) => {
          const forward = {
            benchmarkVersion: version,
            cardDataVersion: version,
            engineVersion: version,
            policyVersion: version,
            reportSchemaVersion: version,
            seed,
            simulationVersion: version,
          };
          const reverse = {
            simulationVersion: version,
            seed,
            reportSchemaVersion: version,
            policyVersion: version,
            engineVersion: version,
            cardDataVersion: version,
            benchmarkVersion: version,
          };

          expect(createContextFingerprint(forward)).toBe(
            createContextFingerprint(reverse),
          );
        },
      ),
    );
  });

  it('includes every reproducibility input', () => {
    const fingerprint = createContextFingerprint({
      benchmarkVersion: '6.0.0',
      cardDataVersion: '3.0.0',
      engineVersion: '1.0.0',
      policyVersion: '2.0.0',
      reportSchemaVersion: '4.0.0',
      seed: 'seven',
      simulationVersion: '5.0.0',
    });

    expect(fingerprint).toContain('engineVersion=1.0.0');
    expect(fingerprint).toContain('simulationVersion=5.0.0');
    expect(fingerprint).toContain('seed=seven');
  });
});

import { describe, expect, it } from 'vitest';

import { AnalysisContextSchema, SemanticVersionSchema } from './index.js';

describe('foundation contracts', () => {
  it('accepts an explicit complete version tuple and seed', () => {
    const result = AnalysisContextSchema.safeParse({
      benchmarkVersion: '0.0.0',
      cardDataVersion: '2026.8.0',
      engineVersion: '0.1.0',
      policyVersion: '0.0.1',
      reportSchemaVersion: '0.1.0',
      seed: 'fixture-001',
      simulationVersion: '0.0.0',
    });

    expect(result.success).toBe(true);
  });

  it('rejects ambiguous or missing version values', () => {
    expect(SemanticVersionSchema.safeParse('current').success).toBe(false);
    expect(
      AnalysisContextSchema.safeParse({
        engineVersion: '0.1.0',
        seed: 'fixture-001',
      }).success,
    ).toBe(false);
  });
});

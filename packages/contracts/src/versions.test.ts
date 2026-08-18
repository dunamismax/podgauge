import { describe, expect, it } from 'vitest';

import {
  AnalysisContextSchema,
  BenchmarkVersionRecordSchema,
  CanonicalCardIdSchema,
  CardDataSnapshotSchema,
  DeckIdSchema,
  EngineVersionRecordSchema,
  PolicyVersionRecordSchema,
  ReportSchemaVersionRecordSchema,
  SemanticVersionSchema,
  SimulationVersionRecordSchema,
  VersionTupleSchema,
  type CanonicalCardId,
} from './index.js';

const zeroHash = '0'.repeat(64);
const provenanceId = 'provenance_00000000-0000-4000-8000-000000000001';

const versionTuple = {
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
    reportSchemaVersionId: 'report-schema_00000000-0000-4000-8000-000000000001',
    version: '0.1.0',
  },
  simulation: {
    simulationVersionId: 'simulation_00000000-0000-4000-8000-000000000001',
    version: '0.1.0',
  },
};

describe('canonical identifiers', () => {
  it('uses lowercase, typed prefixes instead of display names', () => {
    const cardId = CanonicalCardIdSchema.parse(
      'card_00000000-0000-4000-8000-000000000001',
    );
    const deckId = DeckIdSchema.parse(
      'deck_00000000-0000-4000-8000-000000000001',
    );

    expect(cardId).toMatch(/^card_/u);
    expect(deckId).toMatch(/^deck_/u);
    expect(CanonicalCardIdSchema.safeParse(deckId).success).toBe(false);
    expect(CanonicalCardIdSchema.safeParse('Synthetic Card Name').success).toBe(
      false,
    );

    const assignDeckIdToCardId = () => {
      // @ts-expect-error Branded identifiers are not interchangeable.
      const invalidCardId: CanonicalCardId = deckId;
      return invalidCardId;
    };
    expect(assignDeckIdToCardId).toBeTypeOf('function');
  });
});

describe('version records', () => {
  it('validates all six immutable version surfaces and the complete tuple', () => {
    expect(
      CardDataSnapshotSchema.parse({
        contentHash: zeroHash,
        retrievedAt: '2026-08-17T12:00:00Z',
        snapshotId: 'card-data_00000000-0000-4000-8000-000000000001',
        sourceProvenanceIds: [provenanceId],
        version: '0.1.0',
      }).snapshotId,
    ).toMatch(/^card-data_/u);
    expect(
      PolicyVersionRecordSchema.safeParse({
        contentHash: zeroHash,
        effectiveDate: '2026-08-17',
        policyVersionId: 'policy_00000000-0000-4000-8000-000000000001',
        publishedAt: '2026-08-17T12:00:00Z',
        sourceProvenanceIds: [provenanceId],
        version: '0.1.0',
      }).success,
    ).toBe(true);
    expect(
      EngineVersionRecordSchema.safeParse({
        artifactHash: zeroHash,
        engineVersionId: 'engine_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      }).success,
    ).toBe(true);
    expect(
      BenchmarkVersionRecordSchema.safeParse({
        benchmarkVersionId: 'benchmark_00000000-0000-4000-8000-000000000001',
        contentHash: zeroHash,
        version: '0.1.0',
      }).success,
    ).toBe(true);
    expect(
      SimulationVersionRecordSchema.safeParse({
        artifactHash: zeroHash,
        simulationVersionId: 'simulation_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      }).success,
    ).toBe(true);
    expect(
      ReportSchemaVersionRecordSchema.safeParse({
        artifactHash: zeroHash,
        reportSchemaVersionId:
          'report-schema_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      }).success,
    ).toBe(true);
    expect(VersionTupleSchema.safeParse(versionTuple).success).toBe(true);
  });

  it('rejects missing, vague, malformed, and extra version inputs', () => {
    expect(SemanticVersionSchema.safeParse('current').success).toBe(false);
    expect(SemanticVersionSchema.safeParse('1').success).toBe(false);
    expect(
      VersionTupleSchema.safeParse({
        ...versionTuple,
        engine: undefined,
      }).success,
    ).toBe(false);
    expect(
      VersionTupleSchema.safeParse({
        ...versionTuple,
        current: true,
      }).success,
    ).toBe(false);
    expect(
      AnalysisContextSchema.safeParse({
        engineVersion: '0.1.0',
        seed: 'ambiguous-flat-input',
      }).success,
    ).toBe(false);
  });
});

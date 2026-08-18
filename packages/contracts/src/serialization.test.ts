import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  hashAnalysisReport,
  serializeAnalysisReport,
  sha256Utf8,
  stableSerialize,
} from './index.js';

const HashVectorSchema = z
  .object({
    reportVectors: z.array(
      z
        .object({
          canonicalByteLength: z.number().int().positive(),
          expectedSha256: z.string().length(64),
          fixture: z.string().min(1),
        })
        .strict(),
    ),
    utf8Vectors: z.array(
      z
        .object({
          expectedSha256: z.string().length(64),
          value: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

const fixtureDirectory = new URL(
  '../../../data/fixtures/contracts/',
  import.meta.url,
);

async function readJson(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(name, fixtureDirectory), 'utf8'),
  ) as unknown;
}

describe('stable JSON serialization', () => {
  it('sorts object keys, preserves semantic arrays, and repeats byte-for-byte', () => {
    const value = { z: 1, a: { y: true, b: ['second', 'first'] } };
    const expected = '{"a":{"b":["second","first"],"y":true},"z":1}';
    expect(stableSerialize(value)).toBe(expected);
    expect(stableSerialize(value)).toBe(expected);
    expect(stableSerialize({ a: value.a, z: 1 })).toBe(expected);
  });

  it('rejects implicit omission, non-finite numbers, sparse arrays, and cycles', () => {
    expect(() => stableSerialize({ missing: undefined })).toThrow(
      /rejects undefined/u,
    );
    expect(() => stableSerialize(Number.NaN)).toThrow(/finite numbers/u);
    expect(() => stableSerialize(new Array(2))).toThrow(/sparse arrays/u);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => stableSerialize(cyclic)).toThrow(/cyclic/u);
  });

  it('canonicalizes report set ordering without depending on insertion order', async () => {
    const first = structuredClone(
      await readJson('report-v0.1.0.json'),
    ) as Record<string, unknown>;
    const firstEvidence = first.evidence as unknown[];
    const firstProvenance = first.provenance as unknown[];
    firstProvenance.push({
      authoredAt: '2026-08-17T12:00:00Z',
      contentHash: '1'.repeat(64),
      fixtureId: 'fixture.report.unreferenced',
      provenanceId: 'provenance_00000000-0000-4000-8000-000000000002',
      sourceKind: 'synthetic',
    });
    firstEvidence.push({
      evidenceId: 'evidence_00000000-0000-4000-8000-000000000002',
      kind: 'source',
      provenanceIds: ['provenance_00000000-0000-4000-8000-000000000002'],
      sourceProvenanceId: 'provenance_00000000-0000-4000-8000-000000000002',
    });
    const second = structuredClone(first) as Record<string, unknown>;
    const evidence = second.evidence as unknown[];
    const provenance = second.provenance as unknown[];
    evidence.reverse();
    provenance.reverse();

    expect(serializeAnalysisReport(first)).toBe(
      serializeAnalysisReport(second),
    );
    expect(hashAnalysisReport(first)).toBe(hashAnalysisReport(second));
  });
});

describe('committed SHA-256 golden vectors', () => {
  it('matches independent UTF-8 and full-report vectors', async () => {
    const vectors = HashVectorSchema.parse(await readJson('hash-vectors.json'));
    for (const vector of vectors.utf8Vectors) {
      expect(sha256Utf8(vector.value)).toBe(vector.expectedSha256);
    }
    for (const vector of vectors.reportVectors) {
      const report = await readJson(vector.fixture);
      const serialized = serializeAnalysisReport(report);
      expect(new TextEncoder().encode(serialized)).toHaveLength(
        vector.canonicalByteLength,
      );
      expect(hashAnalysisReport(report)).toBe(vector.expectedSha256);
    }
  });
});

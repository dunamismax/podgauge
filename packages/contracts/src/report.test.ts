import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { AnalysisReportSchema, SourceProvenanceSchema } from './index.js';

async function loadReport(): Promise<unknown> {
  const path = new URL(
    '../../../data/fixtures/contracts/report-v0.1.0.json',
    import.meta.url,
  );
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

describe('evidence-backed analysis report', () => {
  it('keeps all public outputs, six dimensions, versions, and unknowns explicit', async () => {
    const report = AnalysisReportSchema.parse(await loadReport());

    expect(Object.keys(report.results.deckprint).sort()).toEqual([
      'access',
      'cohesion',
      'control',
      'conversion',
      'mana',
      'recovery',
    ]);
    expect(report.results.capability.status).toBe('unknown');
    expect(report.unknownClassifications).toHaveLength(1);
    expect(report.context.versions.simulation.version).toBe('0.1.0');
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.results)).toBe(true);
  });

  it('rejects dangling evidence, unknown, dependency, and provenance references', async () => {
    const input = structuredClone(await loadReport()) as Record<
      string,
      unknown
    >;
    input.evidence = [];
    expect(AnalysisReportSchema.safeParse(input).success).toBe(false);
  });

  it('keeps presentation prose outside core findings and evidence', async () => {
    const input = structuredClone(await loadReport()) as {
      findings: Array<Record<string, unknown>>;
    };
    const finding = input.findings[0];
    expect(finding).toBeDefined();
    if (!finding) return;
    finding.message = 'This sentence belongs in the presentation layer.';
    expect(AnalysisReportSchema.safeParse(input).success).toBe(false);
  });

  it('requires reviewed HTTPS provenance for external records', () => {
    expect(
      SourceProvenanceSchema.safeParse({
        contentHash: '0'.repeat(64),
        provenanceId: 'provenance_00000000-0000-4000-8000-000000000002',
        provider: 'scryfall',
        retrievedAt: '2026-08-17T12:00:00Z',
        sourceKind: 'external',
        sourceRecordId: 'synthetic-record',
        sourceUrl: 'http://example.test/card',
        termsReviewId: 'review_00000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(false);
  });
});

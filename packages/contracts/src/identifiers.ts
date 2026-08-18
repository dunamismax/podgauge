import { z } from 'zod';

const canonicalUuid =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function prefixedIdentifier<Brand extends string>(
  prefix: string,
  brand: Brand,
) {
  void brand;
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}_${canonicalUuid}$`, 'u'),
      `Expected a canonical ${prefix} identifier`,
    )
    .brand<Brand>();
}

export const RawDeckInputIdSchema = prefixedIdentifier(
  'input',
  'RawDeckInputId',
);
export const ParsedDeckEntryIdSchema = prefixedIdentifier(
  'entry',
  'ParsedDeckEntryId',
);
export const CanonicalCardIdSchema = prefixedIdentifier(
  'card',
  'CanonicalCardId',
);
export const CanonicalCardFaceIdSchema = prefixedIdentifier(
  'face',
  'CanonicalCardFaceId',
);
export const DeckIdSchema = prefixedIdentifier('deck', 'DeckId');
export const DeckRevisionIdSchema = prefixedIdentifier(
  'revision',
  'DeckRevisionId',
);
export const AnalysisIdSchema = prefixedIdentifier('analysis', 'AnalysisId');
export const ReportIdSchema = prefixedIdentifier('report', 'ReportId');
export const EvidenceIdSchema = prefixedIdentifier('evidence', 'EvidenceId');
export const FindingIdSchema = prefixedIdentifier('finding', 'FindingId');
export const UnknownClassificationIdSchema = prefixedIdentifier(
  'unknown',
  'UnknownClassificationId',
);
export const DependencyEdgeIdSchema = prefixedIdentifier(
  'dependency',
  'DependencyEdgeId',
);
export const SharedFailurePointIdSchema = prefixedIdentifier(
  'failure',
  'SharedFailurePointId',
);
export const SourceProvenanceIdSchema = prefixedIdentifier(
  'provenance',
  'SourceProvenanceId',
);
export const PolicyRuleIdSchema = prefixedIdentifier(
  'policy-rule',
  'PolicyRuleId',
);
export const CardDataSnapshotIdSchema = prefixedIdentifier(
  'card-data',
  'CardDataSnapshotId',
);
export const PolicyVersionIdSchema = prefixedIdentifier(
  'policy',
  'PolicyVersionId',
);
export const EngineVersionIdSchema = prefixedIdentifier(
  'engine',
  'EngineVersionId',
);
export const BenchmarkVersionIdSchema = prefixedIdentifier(
  'benchmark',
  'BenchmarkVersionId',
);
export const SimulationVersionIdSchema = prefixedIdentifier(
  'simulation',
  'SimulationVersionId',
);
export const ReportSchemaVersionIdSchema = prefixedIdentifier(
  'report-schema',
  'ReportSchemaVersionId',
);
export const DataGovernanceReviewIdSchema = prefixedIdentifier(
  'review',
  'DataGovernanceReviewId',
);
export const JobIdSchema = prefixedIdentifier('job', 'JobId');
export const ProgressEventIdSchema = prefixedIdentifier(
  'event',
  'ProgressEventId',
);
export const PodIdSchema = prefixedIdentifier('pod', 'PodId');

export type RawDeckInputId = z.infer<typeof RawDeckInputIdSchema>;
export type ParsedDeckEntryId = z.infer<typeof ParsedDeckEntryIdSchema>;
export type CanonicalCardId = z.infer<typeof CanonicalCardIdSchema>;
export type CanonicalCardFaceId = z.infer<typeof CanonicalCardFaceIdSchema>;
export type DeckId = z.infer<typeof DeckIdSchema>;
export type DeckRevisionId = z.infer<typeof DeckRevisionIdSchema>;
export type AnalysisId = z.infer<typeof AnalysisIdSchema>;
export type ReportId = z.infer<typeof ReportIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type FindingId = z.infer<typeof FindingIdSchema>;
export type UnknownClassificationId = z.infer<
  typeof UnknownClassificationIdSchema
>;
export type DependencyEdgeId = z.infer<typeof DependencyEdgeIdSchema>;
export type SourceProvenanceId = z.infer<typeof SourceProvenanceIdSchema>;

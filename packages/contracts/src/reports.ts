import { z } from 'zod';

import { AnalysisOptionsSchema } from './analysis.js';
import {
  DependencyEdgeSchema,
  EvidenceSchema,
  FindingSchema,
  SharedFailurePointSchema,
  SourceProvenanceSchema,
  UnknownClassificationSchema,
} from './evidence.js';
import {
  AnalysisIdSchema,
  DeckRevisionIdSchema,
  EvidenceIdSchema,
  ReportIdSchema,
  UnknownClassificationIdSchema,
} from './identifiers.js';
import { addDuplicateIssue } from './primitives.js';
import { AnalysisContextSchema } from './versions.js';

const evidenceIds = (minimum = 1) =>
  z
    .array(EvidenceIdSchema)
    .min(minimum)
    .max(256)
    .superRefine((values, context) =>
      addDuplicateIssue(values, context, 'Output evidence identifiers'),
    )
    .readonly();

const unknownIds = (minimum = 1) =>
  z
    .array(UnknownClassificationIdSchema)
    .min(minimum)
    .max(256)
    .superRefine((values, context) =>
      addDuplicateIssue(values, context, 'Output unknown identifiers'),
    )
    .readonly();

const UnknownResultSchema = z
  .object({
    status: z.literal('unknown'),
    unknownClassificationIds: unknownIds(),
  })
  .strict()
  .readonly();

export const FixedPointBandSchema = z
  .object({
    lower: z.number().int().min(0).max(10_000),
    scale: z.literal(1_000),
    upper: z.number().int().min(0).max(10_000),
  })
  .strict()
  .superRefine((band, context) => {
    if (band.lower > band.upper) {
      context.addIssue({
        code: 'custom',
        message: 'Band lower bound cannot exceed upper bound',
        path: ['lower'],
      });
    }
  })
  .readonly();

export const OfficialBracketFloorSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      bracket: z.number().int().min(1).max(4),
      evidenceIds: evidenceIds(),
      status: z.literal('determined'),
    })
    .strict()
    .readonly(),
]);

const TableFitPositionSchema = z
  .object({
    bracket: z.number().int().min(1).max(4),
    position: z.enum(['low', 'middle', 'high']),
  })
  .strict()
  .readonly();

export const RecommendedTableFitSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      evidenceIds: evidenceIds(),
      lower: TableFitPositionSchema,
      status: z.literal('estimated'),
      upper: TableFitPositionSchema,
    })
    .strict()
    .superRefine((result, context) => {
      const positionRank = { high: 2, low: 0, middle: 1 } as const;
      const lowerRank =
        result.lower.bracket * 3 + positionRank[result.lower.position];
      const upperRank =
        result.upper.bracket * 3 + positionRank[result.upper.position];
      if (lowerRank > upperRank) {
        context.addIssue({
          code: 'custom',
          message: 'Table-fit lower bound cannot exceed upper bound',
          path: ['lower'],
        });
      }
    })
    .readonly(),
]);

export const CapabilityBandSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      band: FixedPointBandSchema,
      evidenceIds: evidenceIds(),
      status: z.literal('estimated'),
    })
    .strict()
    .readonly(),
]);

const TurnRangeSchema = z
  .object({
    earliest: z.number().int().min(1).max(100),
    latest: z.number().int().min(1).max(100),
  })
  .strict()
  .superRefine((range, context) => {
    if (range.earliest > range.latest) {
      context.addIssue({
        code: 'custom',
        message: 'Turn-range earliest value cannot exceed latest value',
        path: ['earliest'],
      });
    }
  })
  .readonly();

const TimingProfileSchema = z
  .object({
    highRoll: TurnRangeSchema,
    slow: TurnRangeSchema,
    typical: TurnRangeSchema,
  })
  .strict()
  .superRefine((profile, context) => {
    if (
      profile.highRoll.earliest > profile.typical.earliest ||
      profile.highRoll.latest > profile.typical.latest ||
      profile.typical.earliest > profile.slow.earliest ||
      profile.typical.latest > profile.slow.latest
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Closing-window ranges must progress from high-roll to slow',
      });
    }
  })
  .readonly();

export const ClosingWindowSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      elimination: TimingProfileSchema,
      evidenceIds: evidenceIds(),
      status: z.literal('estimated'),
      tableWin: TimingProfileSchema,
    })
    .strict()
    .readonly(),
]);

export const DimensionAssessmentSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      band: FixedPointBandSchema,
      evidenceIds: evidenceIds(),
      status: z.literal('assessed'),
    })
    .strict()
    .readonly(),
]);

export const DeckprintSchema = z
  .object({
    access: DimensionAssessmentSchema,
    cohesion: DimensionAssessmentSchema,
    control: DimensionAssessmentSchema,
    conversion: DimensionAssessmentSchema,
    mana: DimensionAssessmentSchema,
    recovery: DimensionAssessmentSchema,
  })
  .strict()
  .readonly();

export const VolatilitySchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      evidenceIds: evidenceIds(),
      level: z.enum(['low', 'moderate', 'high']),
      status: z.literal('assessed'),
    })
    .strict()
    .readonly(),
]);

const TableImpactPatternSchema = z
  .object({
    category: z.enum([
      'agency-denial',
      'deterministic-loop',
      'hard-lock',
      'repeated-extra-turns',
      'mass-land-denial',
      'repeated-reset',
      'theft',
      'long-nondeterministic-turn',
    ]),
    evidenceIds: evidenceIds(),
  })
  .strict()
  .readonly();

export const TableImpactSchema = z.discriminatedUnion('status', [
  UnknownResultSchema,
  z
    .object({
      evidenceIds: evidenceIds(),
      level: z.enum(['none', 'low', 'moderate', 'high']),
      patterns: z
        .array(TableImpactPatternSchema)
        .max(32)
        .superRefine((patterns, context) =>
          addDuplicateIssue(
            patterns.map((pattern) => pattern.category),
            context,
            'Table-impact categories',
          ),
        )
        .readonly(),
      status: z.literal('assessed'),
    })
    .strict()
    .readonly(),
]);

export const ConfidenceSchema = z
  .object({
    coverageBasisPoints: z.number().int().min(0).max(10_000),
    evidenceIds: evidenceIds(),
    level: z.enum(['low', 'medium', 'high']),
    unknownClassificationIds: unknownIds(0),
  })
  .strict()
  .readonly();

export const AnalysisResultsSchema = z
  .object({
    capability: CapabilityBandSchema,
    closingWindow: ClosingWindowSchema,
    confidence: ConfidenceSchema,
    deckprint: DeckprintSchema,
    officialBracketFloor: OfficialBracketFloorSchema,
    recommendedTableFit: RecommendedTableFitSchema,
    tableImpact: TableImpactSchema,
    volatility: VolatilitySchema,
  })
  .strict()
  .readonly();

const ExtensionKeySchema = z
  .string()
  .regex(/^x-[a-z0-9]+(?:[.-][a-z0-9]+)*$/u)
  .max(128);

export const ReportExtensionsSchema = z
  .record(ExtensionKeySchema, z.json())
  .superRefine((extensions, context) => {
    if (Object.keys(extensions).length > 32) {
      context.addIssue({
        code: 'custom',
        message: 'Reports cannot contain more than 32 extension fields',
      });
    }
  })
  .readonly();

function collectResultReferences(
  results: z.infer<typeof AnalysisResultsSchema>,
) {
  const referencedEvidenceIds: string[] = [...results.confidence.evidenceIds];
  const referencedUnknownIds: string[] = [
    ...results.confidence.unknownClassificationIds,
  ];
  const collect = (
    result:
      | z.infer<typeof OfficialBracketFloorSchema>
      | z.infer<typeof RecommendedTableFitSchema>
      | z.infer<typeof CapabilityBandSchema>
      | z.infer<typeof ClosingWindowSchema>
      | z.infer<typeof DimensionAssessmentSchema>
      | z.infer<typeof VolatilitySchema>
      | z.infer<typeof TableImpactSchema>,
  ) => {
    if (result.status === 'unknown') {
      referencedUnknownIds.push(...result.unknownClassificationIds);
    } else {
      referencedEvidenceIds.push(...result.evidenceIds);
      if ('patterns' in result) {
        for (const pattern of result.patterns) {
          referencedEvidenceIds.push(...pattern.evidenceIds);
        }
      }
    }
  };

  collect(results.officialBracketFloor);
  collect(results.recommendedTableFit);
  collect(results.capability);
  collect(results.closingWindow);
  collect(results.volatility);
  collect(results.tableImpact);
  for (const assessment of Object.values(results.deckprint)) {
    collect(assessment);
  }
  return { referencedEvidenceIds, referencedUnknownIds };
}

export const AnalysisReportSchema = z
  .object({
    analysisId: AnalysisIdSchema,
    context: AnalysisContextSchema,
    deckRevisionId: DeckRevisionIdSchema,
    dependencies: z.array(DependencyEdgeSchema).max(10_000).readonly(),
    evidence: z.array(EvidenceSchema).max(20_000).readonly(),
    extensions: ReportExtensionsSchema,
    findings: z.array(FindingSchema).max(10_000).readonly(),
    options: AnalysisOptionsSchema,
    provenance: z.array(SourceProvenanceSchema).max(10_000).readonly(),
    reportId: ReportIdSchema,
    results: AnalysisResultsSchema,
    sharedFailurePoints: z
      .array(SharedFailurePointSchema)
      .max(10_000)
      .readonly(),
    status: z.literal('complete'),
    unknownClassifications: z
      .array(UnknownClassificationSchema)
      .max(10_000)
      .readonly(),
  })
  .strict()
  .superRefine((report, context) => {
    addDuplicateIssue(
      report.evidence.map((item) => item.evidenceId),
      context,
      'Evidence identifiers',
    );
    addDuplicateIssue(
      report.findings.map((item) => item.findingId),
      context,
      'Finding identifiers',
    );
    addDuplicateIssue(
      report.unknownClassifications.map((item) => item.unknownClassificationId),
      context,
      'Unknown-classification identifiers',
    );
    addDuplicateIssue(
      report.dependencies.map((item) => item.dependencyEdgeId),
      context,
      'Dependency-edge identifiers',
    );
    addDuplicateIssue(
      report.sharedFailurePoints.map((item) => item.sharedFailurePointId),
      context,
      'Shared-failure-point identifiers',
    );
    addDuplicateIssue(
      report.provenance.map((item) => item.provenanceId),
      context,
      'Source-provenance identifiers',
    );

    const availableEvidenceIds = new Set(
      report.evidence.map((item) => item.evidenceId),
    );
    const availableUnknownIds = new Set(
      report.unknownClassifications.map((item) => item.unknownClassificationId),
    );
    const availableDependencyIds = new Set(
      report.dependencies.map((item) => item.dependencyEdgeId),
    );
    const availableProvenanceIds = new Set(
      report.provenance.map((item) => item.provenanceId),
    );
    const missingEvidenceIds: string[] = [];
    const missingUnknownIds: string[] = [];
    const checkEvidence = (ids: readonly string[]) => {
      missingEvidenceIds.push(
        ...ids.filter((id) => !availableEvidenceIds.has(id as never)),
      );
    };
    const checkUnknowns = (ids: readonly string[]) => {
      missingUnknownIds.push(
        ...ids.filter((id) => !availableUnknownIds.has(id as never)),
      );
    };

    for (const item of report.evidence) {
      if (
        item.provenanceIds.some((id) => !availableProvenanceIds.has(id)) ||
        (item.kind === 'source' &&
          !availableProvenanceIds.has(item.sourceProvenanceId))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Evidence references unavailable source provenance',
          path: ['evidence'],
        });
      }
      if (
        item.kind === 'relationship' &&
        !availableDependencyIds.has(item.edgeId)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Relationship evidence references an unavailable edge',
          path: ['evidence'],
        });
      }
    }
    for (const item of report.unknownClassifications) {
      checkEvidence(item.evidenceIds);
    }
    for (const item of report.findings) {
      checkEvidence(item.evidenceIds);
      if (item.unknownClassificationId !== null) {
        checkUnknowns([item.unknownClassificationId]);
      }
    }
    for (const item of report.dependencies) checkEvidence(item.evidenceIds);
    for (const item of report.sharedFailurePoints) {
      checkEvidence(item.evidenceIds);
      if (
        item.affectedDependencyEdgeIds.some(
          (id) => !availableDependencyIds.has(id),
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Shared failure point references an unavailable edge',
          path: ['sharedFailurePoints'],
        });
      }
    }
    const resultReferences = collectResultReferences(report.results);
    checkEvidence(resultReferences.referencedEvidenceIds);
    checkUnknowns(resultReferences.referencedUnknownIds);
    if (missingEvidenceIds.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Report references unavailable evidence',
        path: ['evidence'],
      });
    }
    if (missingUnknownIds.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Report references unavailable unknown classifications',
        path: ['unknownClassifications'],
      });
    }
  })
  .readonly();

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
export type AnalysisResults = z.infer<typeof AnalysisResultsSchema>;

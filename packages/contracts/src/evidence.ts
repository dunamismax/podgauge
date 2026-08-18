import { z } from 'zod';

import {
  BenchmarkVersionIdSchema,
  CanonicalCardFaceIdSchema,
  CanonicalCardIdSchema,
  DataGovernanceReviewIdSchema,
  DependencyEdgeIdSchema,
  EvidenceIdSchema,
  FindingIdSchema,
  ParsedDeckEntryIdSchema,
  PolicyRuleIdSchema,
  ReportIdSchema,
  SharedFailurePointIdSchema,
  SourceProvenanceIdSchema,
  UnknownClassificationIdSchema,
} from './identifiers.js';
import {
  BoundedSourceTextSchema,
  IsoDateTimeSchema,
  Sha256Schema,
  addDuplicateIssue,
} from './primitives.js';

export const ReasonCodeSchema = z.enum([
  'input.malformed',
  'card.unresolved',
  'card.ambiguous',
  'card.classification-unknown',
  'deck.incomplete',
  'deck.duplicate-card',
  'deck.illegal-card',
  'deck.invalid-commander',
  'deck.color-identity-mismatch',
  'policy.rule-triggered',
  'policy.classification-unknown',
  'dependency.unsatisfied',
  'dependency.shared-failure-point',
  'methodology.unsupported',
  'simulation.unavailable',
  'evidence.coverage-insufficient',
]);

export const DeckprintDimensionSchema = z.enum([
  'mana',
  'access',
  'cohesion',
  'control',
  'recovery',
  'conversion',
]);

export const EvidenceSubjectSchema = z.discriminatedUnion('kind', [
  z
    .object({ cardId: CanonicalCardIdSchema, kind: z.literal('card') })
    .strict()
    .readonly(),
  z
    .object({ faceId: CanonicalCardFaceIdSchema, kind: z.literal('card-face') })
    .strict()
    .readonly(),
  z
    .object({
      kind: z.literal('deck-entry'),
      parsedEntryId: ParsedDeckEntryIdSchema,
    })
    .strict()
    .readonly(),
  z
    .object({ kind: z.literal('policy-rule'), ruleId: PolicyRuleIdSchema })
    .strict()
    .readonly(),
  z
    .object({
      dimension: DeckprintDimensionSchema,
      kind: z.literal('deckprint-dimension'),
    })
    .strict()
    .readonly(),
  z
    .object({ kind: z.literal('report'), reportId: ReportIdSchema })
    .strict()
    .readonly(),
]);

const baseProvenance = {
  contentHash: Sha256Schema,
  provenanceId: SourceProvenanceIdSchema,
} as const;

const SyntheticSourceProvenanceSchema = z
  .object({
    ...baseProvenance,
    authoredAt: IsoDateTimeSchema,
    fixtureId: z
      .string()
      .regex(/^fixture\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/u)
      .max(128),
    sourceKind: z.literal('synthetic'),
  })
  .strict()
  .readonly();

const UserInputSourceProvenanceSchema = z
  .object({
    ...baseProvenance,
    privacy: z.literal('private'),
    receivedAt: IsoDateTimeSchema,
    sourceKind: z.literal('user-input'),
  })
  .strict()
  .readonly();

const ExternalSourceProvenanceSchema = z
  .object({
    ...baseProvenance,
    provider: z.enum([
      'commander-spellbook',
      'scryfall',
      'topdeck',
      'wizards-policy',
      'other-reviewed',
    ]),
    retrievedAt: IsoDateTimeSchema,
    sourceKind: z.literal('external'),
    sourceRecordId: BoundedSourceTextSchema,
    sourceUrl: z.url({ protocol: /^https$/u }),
    termsReviewId: DataGovernanceReviewIdSchema,
  })
  .strict()
  .readonly();

export const SourceProvenanceSchema = z.discriminatedUnion('sourceKind', [
  SyntheticSourceProvenanceSchema,
  UserInputSourceProvenanceSchema,
  ExternalSourceProvenanceSchema,
]);

const evidenceBase = {
  evidenceId: EvidenceIdSchema,
  provenanceIds: z
    .array(SourceProvenanceIdSchema)
    .max(32)
    .superRefine((values, context) =>
      addDuplicateIssue(values, context, 'Evidence provenance identifiers'),
    )
    .readonly(),
} as const;

export const EvidenceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...evidenceBase,
      cardId: CanonicalCardIdSchema,
      faceId: CanonicalCardFaceIdSchema.nullable(),
      kind: z.literal('card'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      edgeId: DependencyEdgeIdSchema,
      kind: z.literal('relationship'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal('policy'),
      ruleId: PolicyRuleIdSchema,
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      inputs: z
        .array(
          z
            .object({
              name: z
                .string()
                .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u)
                .max(64),
              value: z.number().int().safe(),
            })
            .strict()
            .readonly(),
        )
        .max(64)
        .readonly(),
      kind: z.literal('calculation'),
      metric: z
        .string()
        .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
        .max(128),
      output: z.number().int().safe(),
      scale: z.number().int().positive().max(1_000_000),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      iterations: z.number().int().positive().max(10_000_000),
      kind: z.literal('simulation'),
      observation: z
        .string()
        .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
        .max(128),
      seed: z.string().min(1).max(256),
      value: z.number().int().safe(),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      benchmarkVersionId: BenchmarkVersionIdSchema,
      fixtureId: z
        .string()
        .regex(/^fixture\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/u)
        .max(128),
      kind: z.literal('benchmark'),
      metric: z
        .string()
        .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
        .max(128),
      value: z.number().int().safe(),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal('source'),
      sourceProvenanceId: SourceProvenanceIdSchema,
    })
    .strict()
    .readonly(),
]);

export const UnknownClassificationSchema = z
  .object({
    candidateCardIds: z
      .array(CanonicalCardIdSchema)
      .max(32)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Candidate card identifiers'),
      )
      .readonly(),
    evidenceIds: z
      .array(EvidenceIdSchema)
      .max(64)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Unknown evidence identifiers'),
      )
      .readonly(),
    reasonCode: ReasonCodeSchema,
    state: z.literal('unknown'),
    subject: EvidenceSubjectSchema,
    unknownClassificationId: UnknownClassificationIdSchema,
  })
  .strict()
  .readonly();

export const FindingSchema = z
  .object({
    evidenceIds: z
      .array(EvidenceIdSchema)
      .min(1)
      .max(64)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Finding evidence identifiers'),
      )
      .readonly(),
    findingId: FindingIdSchema,
    outcome: z.enum(['pass', 'fail', 'unknown']),
    reasonCode: ReasonCodeSchema,
    severity: z.enum(['info', 'warning', 'error']),
    subject: EvidenceSubjectSchema,
    unknownClassificationId: UnknownClassificationIdSchema.nullable(),
  })
  .strict()
  .superRefine((finding, context) => {
    if (
      (finding.outcome === 'unknown') !==
      (finding.unknownClassificationId !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Unknown findings require an unknown classification and other findings cannot reference one',
        path: ['unknownClassificationId'],
      });
    }
  })
  .readonly();

export const DependencyEdgeSchema = z
  .object({
    dependencyEdgeId: DependencyEdgeIdSchema,
    evidenceIds: z
      .array(EvidenceIdSchema)
      .min(1)
      .max(64)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Dependency evidence identifiers'),
      )
      .readonly(),
    from: EvidenceSubjectSchema,
    necessity: z.enum(['required', 'optional', 'substitutable', 'unknown']),
    relation: z.enum([
      'requires',
      'enables',
      'pays-off',
      'protects',
      'recurs',
      'finds',
      'converts',
    ]),
    to: EvidenceSubjectSchema,
  })
  .strict()
  .readonly();

export const SharedFailurePointSchema = z
  .object({
    affectedDependencyEdgeIds: z
      .array(DependencyEdgeIdSchema)
      .min(2)
      .max(128)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Affected dependency identifiers'),
      )
      .readonly(),
    evidenceIds: z
      .array(EvidenceIdSchema)
      .min(1)
      .max(64)
      .superRefine((values, context) =>
        addDuplicateIssue(
          values,
          context,
          'Shared-failure evidence identifiers',
        ),
      )
      .readonly(),
    sharedFailurePointId: SharedFailurePointIdSchema,
    subject: EvidenceSubjectSchema,
  })
  .strict()
  .readonly();

export type ReasonCode = z.infer<typeof ReasonCodeSchema>;
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type UnknownClassification = z.infer<typeof UnknownClassificationSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>;
export type SharedFailurePoint = z.infer<typeof SharedFailurePointSchema>;

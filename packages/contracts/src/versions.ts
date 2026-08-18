import { z } from 'zod';

import {
  BenchmarkVersionIdSchema,
  CardDataSnapshotIdSchema,
  EngineVersionIdSchema,
  PolicyVersionIdSchema,
  ReportSchemaVersionIdSchema,
  SimulationVersionIdSchema,
  SourceProvenanceIdSchema,
} from './identifiers.js';
import {
  IsoDateSchema,
  IsoDateTimeSchema,
  SemanticVersionSchema,
  Sha256Schema,
  addDuplicateIssue,
} from './primitives.js';

export const CardDataVersionSchema =
  SemanticVersionSchema.brand<'CardDataVersion'>();
export const PolicySemanticVersionSchema =
  SemanticVersionSchema.brand<'PolicyVersion'>();
export const EngineSemanticVersionSchema =
  SemanticVersionSchema.brand<'EngineVersion'>();
export const BenchmarkSemanticVersionSchema =
  SemanticVersionSchema.brand<'BenchmarkVersion'>();
export const SimulationSemanticVersionSchema =
  SemanticVersionSchema.brand<'SimulationVersion'>();
export const ReportSchemaSemanticVersionSchema =
  SemanticVersionSchema.brand<'ReportSchemaVersion'>();

const provenanceIds = z
  .array(SourceProvenanceIdSchema)
  .min(1)
  .max(64)
  .superRefine((values, context) =>
    addDuplicateIssue(values, context, 'Source provenance identifiers'),
  )
  .readonly();

export const CardDataSnapshotSchema = z
  .object({
    contentHash: Sha256Schema,
    retrievedAt: IsoDateTimeSchema,
    snapshotId: CardDataSnapshotIdSchema,
    sourceProvenanceIds: provenanceIds,
    version: CardDataVersionSchema,
  })
  .strict()
  .readonly();

export const PolicyVersionRecordSchema = z
  .object({
    contentHash: Sha256Schema,
    effectiveDate: IsoDateSchema,
    policyVersionId: PolicyVersionIdSchema,
    publishedAt: IsoDateTimeSchema,
    sourceProvenanceIds: provenanceIds,
    version: PolicySemanticVersionSchema,
  })
  .strict()
  .readonly();

export const EngineVersionRecordSchema = z
  .object({
    artifactHash: Sha256Schema,
    engineVersionId: EngineVersionIdSchema,
    version: EngineSemanticVersionSchema,
  })
  .strict()
  .readonly();

export const BenchmarkVersionRecordSchema = z
  .object({
    benchmarkVersionId: BenchmarkVersionIdSchema,
    contentHash: Sha256Schema,
    version: BenchmarkSemanticVersionSchema,
  })
  .strict()
  .readonly();

export const SimulationVersionRecordSchema = z
  .object({
    artifactHash: Sha256Schema,
    simulationVersionId: SimulationVersionIdSchema,
    version: SimulationSemanticVersionSchema,
  })
  .strict()
  .readonly();

export const ReportSchemaVersionRecordSchema = z
  .object({
    artifactHash: Sha256Schema,
    reportSchemaVersionId: ReportSchemaVersionIdSchema,
    version: ReportSchemaSemanticVersionSchema,
  })
  .strict()
  .readonly();

const BenchmarkVersionReferenceSchema = z
  .object({
    benchmarkVersionId: BenchmarkVersionIdSchema,
    version: BenchmarkSemanticVersionSchema,
  })
  .strict()
  .readonly();
const CardDataVersionReferenceSchema = z
  .object({
    snapshotId: CardDataSnapshotIdSchema,
    version: CardDataVersionSchema,
  })
  .strict()
  .readonly();
const EngineVersionReferenceSchema = z
  .object({
    engineVersionId: EngineVersionIdSchema,
    version: EngineSemanticVersionSchema,
  })
  .strict()
  .readonly();
const PolicyVersionReferenceSchema = z
  .object({
    policyVersionId: PolicyVersionIdSchema,
    version: PolicySemanticVersionSchema,
  })
  .strict()
  .readonly();
const ReportSchemaVersionReferenceSchema = z
  .object({
    reportSchemaVersionId: ReportSchemaVersionIdSchema,
    version: ReportSchemaSemanticVersionSchema,
  })
  .strict()
  .readonly();
const SimulationVersionReferenceSchema = z
  .object({
    simulationVersionId: SimulationVersionIdSchema,
    version: SimulationSemanticVersionSchema,
  })
  .strict()
  .readonly();

export const VersionTupleSchema = z
  .object({
    benchmark: BenchmarkVersionReferenceSchema,
    cardData: CardDataVersionReferenceSchema,
    engine: EngineVersionReferenceSchema,
    policy: PolicyVersionReferenceSchema,
    reportSchema: ReportSchemaVersionReferenceSchema,
    simulation: SimulationVersionReferenceSchema,
  })
  .strict()
  .readonly();

export const AnalysisContextSchema = z
  .object({
    seed: z.string().min(1).max(256),
    versions: VersionTupleSchema,
  })
  .strict()
  .readonly();

export type CardDataSnapshot = z.infer<typeof CardDataSnapshotSchema>;
export type PolicyVersionRecord = z.infer<typeof PolicyVersionRecordSchema>;
export type EngineVersionRecord = z.infer<typeof EngineVersionRecordSchema>;
export type BenchmarkVersionRecord = z.infer<
  typeof BenchmarkVersionRecordSchema
>;
export type SimulationVersionRecord = z.infer<
  typeof SimulationVersionRecordSchema
>;
export type ReportSchemaVersionRecord = z.infer<
  typeof ReportSchemaVersionRecordSchema
>;
export type VersionTuple = z.infer<typeof VersionTupleSchema>;
export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;

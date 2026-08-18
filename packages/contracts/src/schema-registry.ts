import type { z } from 'zod';

import {
  AcceptedAnalysisSchema,
  AnalysisResourceSchema,
  CreateAnalysisRequestSchema,
  CreatePodRequestSchema,
  PodResourceSchema,
  ProblemDetailsSchema,
  VersionCatalogSchema,
} from './api.js';
import {
  CommanderSchema,
  DeckRevisionSchema,
  DeckSchema,
  NormalizedCardFaceSchema,
  NormalizedCardSchema,
  ParsedDeckEntrySchema,
  RawDeckInputSchema,
} from './decks.js';
import {
  DependencyEdgeSchema,
  EvidenceSchema,
  FindingSchema,
  SharedFailurePointSchema,
  SourceProvenanceSchema,
  UnknownClassificationSchema,
} from './evidence.js';
import {
  AnalysisProgressEventSchema,
  AnalyzeDeckJobPayloadSchema,
} from './jobs.js';
import { AnalysisReportSchema } from './reports.js';
import { VersionTupleSchema } from './versions.js';

export const contractSchemaRegistry = {
  AcceptedAnalysis: AcceptedAnalysisSchema,
  AnalysisProgressEvent: AnalysisProgressEventSchema,
  AnalysisReport: AnalysisReportSchema,
  AnalysisResource: AnalysisResourceSchema,
  AnalyzeDeckJobPayload: AnalyzeDeckJobPayloadSchema,
  Commander: CommanderSchema,
  CreateAnalysisRequest: CreateAnalysisRequestSchema,
  CreatePodRequest: CreatePodRequestSchema,
  Deck: DeckSchema,
  DeckRevision: DeckRevisionSchema,
  DependencyEdge: DependencyEdgeSchema,
  Evidence: EvidenceSchema,
  Finding: FindingSchema,
  NormalizedCard: NormalizedCardSchema,
  NormalizedCardFace: NormalizedCardFaceSchema,
  ParsedDeckEntry: ParsedDeckEntrySchema,
  PodResource: PodResourceSchema,
  ProblemDetails: ProblemDetailsSchema,
  RawDeckInput: RawDeckInputSchema,
  SharedFailurePoint: SharedFailurePointSchema,
  SourceProvenance: SourceProvenanceSchema,
  UnknownClassification: UnknownClassificationSchema,
  VersionCatalog: VersionCatalogSchema,
  VersionTuple: VersionTupleSchema,
} as const satisfies Readonly<Record<string, z.ZodType>>;

import { z } from 'zod';

import { AnalysisOptionsSchema } from './analysis.js';
import {
  AnalysisIdSchema,
  DeckRevisionIdSchema,
  JobIdSchema,
  ProgressEventIdSchema,
  ReportIdSchema,
} from './identifiers.js';
import {
  IsoDateTimeSchema,
  SemanticVersionSchema,
  Sha256Schema,
} from './primitives.js';
import { AnalysisContextSchema } from './versions.js';

export const IdempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u)
  .brand<'IdempotencyKey'>();

export const JobPayloadVersionSchema =
  SemanticVersionSchema.brand<'JobPayloadVersion'>();

export const RetryMetadataSchema = z
  .object({
    attempt: z.number().int().min(1).max(10),
    maxAttempts: z.number().int().min(1).max(10),
    nextAttemptAt: IsoDateTimeSchema.nullable(),
    previousFailureCode: z
      .string()
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
      .max(128)
      .nullable(),
  })
  .strict()
  .superRefine((retry, context) => {
    if (retry.attempt > retry.maxAttempts) {
      context.addIssue({
        code: 'custom',
        message: 'Retry attempt cannot exceed the maximum attempt count',
        path: ['attempt'],
      });
    }
    if ((retry.attempt === 1) !== (retry.previousFailureCode === null)) {
      context.addIssue({
        code: 'custom',
        message: 'Only a first attempt may omit a previous failure code',
        path: ['previousFailureCode'],
      });
    }
  })
  .readonly();

export const AnalyzeDeckJobPayloadSchema = z
  .object({
    analysisId: AnalysisIdSchema,
    context: AnalysisContextSchema,
    deckRevisionId: DeckRevisionIdSchema,
    idempotencyKey: IdempotencyKeySchema,
    jobId: JobIdSchema,
    jobKind: z.literal('analyze-deck'),
    options: AnalysisOptionsSchema,
    payloadVersion: JobPayloadVersionSchema,
    requestedAt: IsoDateTimeSchema,
    retry: RetryMetadataSchema,
  })
  .strict()
  .readonly();

const progressBase = {
  analysisId: AnalysisIdSchema,
  eventId: ProgressEventIdSchema,
  occurredAt: IsoDateTimeSchema,
  sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
} as const;

export const AnalysisProgressEventSchema = z.discriminatedUnion('state', [
  z
    .object({
      ...progressBase,
      state: z.literal('queued'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...progressBase,
      stage: z.enum([
        'normalizing',
        'validating',
        'applying-policy',
        'building-graph',
        'analyzing',
        'simulating',
        'serializing',
      ]),
      state: z.literal('running'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...progressBase,
      retry: RetryMetadataSchema,
      state: z.literal('retrying'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...progressBase,
      reportHash: Sha256Schema,
      reportId: ReportIdSchema,
      state: z.literal('completed'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...progressBase,
      failureCode: z
        .string()
        .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
        .max(128),
      retryable: z.boolean(),
      state: z.literal('failed'),
    })
    .strict()
    .readonly(),
  z
    .object({
      ...progressBase,
      reasonCode: z
        .string()
        .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
        .max(128),
      state: z.literal('cancelled'),
    })
    .strict()
    .readonly(),
]);

export const AnalysisTerminalStateSchema = z.enum([
  'completed',
  'failed',
  'cancelled',
]);

export function parseAnalysisJobForEnqueue(
  input: unknown,
): AnalyzeDeckJobPayload {
  return AnalyzeDeckJobPayloadSchema.parse(input);
}

export function parseAnalysisJobForExecution(
  input: unknown,
): AnalyzeDeckJobPayload {
  return AnalyzeDeckJobPayloadSchema.parse(input);
}

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
export type AnalyzeDeckJobPayload = z.infer<typeof AnalyzeDeckJobPayloadSchema>;
export type AnalysisProgressEvent = z.infer<typeof AnalysisProgressEventSchema>;

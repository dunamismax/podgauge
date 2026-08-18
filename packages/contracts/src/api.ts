import { z } from 'zod';

import { AnalysisOptionsSchema } from './analysis.js';
import { RawDeckInputSchema } from './decks.js';
import {
  AnalysisIdSchema,
  DeckRevisionIdSchema,
  PodIdSchema,
  ReportIdSchema,
} from './identifiers.js';
import { AnalysisReportSchema } from './reports.js';
import { VersionTupleSchema } from './versions.js';

export const ProblemCodeSchema = z.enum([
  'request.invalid',
  'request.too-large',
  'resource.not-found',
  'resource.conflict',
  'authorization.denied',
  'quota.exceeded',
  'analysis.failed',
  'service.unavailable',
]);

const InvalidParameterSchema = z
  .object({
    name: z.string().min(1).max(256),
    pointer: z
      .string()
      .regex(/^(?:\/(?:[^~/]|~0|~1)*)*$/u)
      .max(2_048),
    reasonCode: z
      .string()
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9-]+)+$/u)
      .max(128),
  })
  .strict()
  .readonly();

export const ProblemDetailsSchema = z
  .object({
    code: ProblemCodeSchema,
    detail: z.string().min(1).max(4_096).nullable(),
    instance: z.string().min(1).max(2_048).nullable(),
    invalidParameters: z.array(InvalidParameterSchema).max(128).readonly(),
    status: z.number().int().min(400).max(599),
    title: z.string().min(1).max(256),
    type: z.union([z.literal('about:blank'), z.url()]),
  })
  .strict()
  .readonly();

export const CreateAnalysisRequestSchema = z
  .object({
    deck: RawDeckInputSchema,
    options: AnalysisOptionsSchema,
  })
  .strict()
  .readonly();

const RelativeApiPathSchema = z
  .string()
  .regex(/^\/api\/v1\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/u)
  .max(2_048);

export const AcceptedAnalysisSchema = z
  .object({
    analysisId: AnalysisIdSchema,
    eventsUrl: RelativeApiPathSchema,
    reportUrl: RelativeApiPathSchema,
    state: z.literal('queued'),
  })
  .strict()
  .readonly();

export const AnalysisResourceSchema = z.discriminatedUnion('state', [
  z
    .object({
      analysisId: AnalysisIdSchema,
      state: z.enum(['queued', 'running', 'retrying']),
    })
    .strict()
    .readonly(),
  z
    .object({
      analysisId: AnalysisIdSchema,
      report: AnalysisReportSchema,
      state: z.literal('completed'),
    })
    .strict()
    .readonly(),
  z
    .object({
      analysisId: AnalysisIdSchema,
      failure: ProblemDetailsSchema,
      state: z.literal('failed'),
    })
    .strict()
    .readonly(),
]);

export const VersionCatalogSchema = z
  .object({
    active: VersionTupleSchema,
  })
  .strict()
  .readonly();

export const CreatePodRequestSchema = z
  .object({
    deckRevisionIds: z
      .array(DeckRevisionIdSchema)
      .length(4)
      .superRefine((values, context) => {
        if (new Set(values).size !== values.length) {
          context.addIssue({
            code: 'custom',
            message: 'Pod members must reference four distinct revisions',
          });
        }
      })
      .readonly(),
  })
  .strict()
  .readonly();

export const PodResourceSchema = z
  .object({
    deckRevisionIds: z.array(DeckRevisionIdSchema).length(4).readonly(),
    podId: PodIdSchema,
    reportIds: z.array(ReportIdSchema).max(4).readonly(),
    state: z.enum(['incomplete', 'ready', 'analyzing', 'complete', 'failed']),
  })
  .strict()
  .superRefine((pod, context) => {
    if (new Set(pod.deckRevisionIds).size !== pod.deckRevisionIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Pod members must reference four distinct revisions',
        path: ['deckRevisionIds'],
      });
    }
  })
  .readonly();

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type CreateAnalysisRequest = z.infer<typeof CreateAnalysisRequestSchema>;

import { z } from 'zod';

export const SemanticVersionSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u,
    'Expected a semantic version',
  );

export const AnalysisContextSchema = z
  .object({
    benchmarkVersion: SemanticVersionSchema,
    cardDataVersion: SemanticVersionSchema,
    engineVersion: SemanticVersionSchema,
    policyVersion: SemanticVersionSchema,
    reportSchemaVersion: SemanticVersionSchema,
    seed: z.string().min(1).max(256),
    simulationVersion: SemanticVersionSchema,
  })
  .strict();

export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;

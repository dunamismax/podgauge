import { z } from 'zod';

export const SimulationOptionsSchema = z.discriminatedUnion('mode', [
  z
    .object({ mode: z.literal('disabled') })
    .strict()
    .readonly(),
  z
    .object({
      iterations: z.number().int().min(100).max(1_000_000),
      mode: z.literal('seeded'),
    })
    .strict()
    .readonly(),
]);

export const AnalysisOptionsSchema = z
  .object({
    evidenceDetail: z.enum(['summary', 'full']),
    simulation: SimulationOptionsSchema,
  })
  .strict()
  .readonly();

export type AnalysisOptions = z.infer<typeof AnalysisOptionsSchema>;

import { SemanticVersionSchema } from '@podgauge/contracts';
import { z } from 'zod';

export const PolicyReadinessSchema = z
  .object({
    ruleCount: z.number().int().nonnegative(),
    state: z.enum(['unreviewed', 'reviewed']),
    version: SemanticVersionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === 'unreviewed' && value.ruleCount !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'Unreviewed policy data cannot contain active rules',
        path: ['ruleCount'],
      });
    }
  });

export type PolicyReadiness = z.infer<typeof PolicyReadinessSchema>;

export function readPolicyReadiness(input: unknown): PolicyReadiness {
  return PolicyReadinessSchema.parse(input);
}

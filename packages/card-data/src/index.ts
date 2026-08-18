import { NormalizedCardSchema, type NormalizedCard } from '@podgauge/contracts';
import { z } from 'zod';

export const SourceApprovalSchema = z
  .object({
    approved: z.literal(false),
    source: z.enum([
      'commander-spellbook',
      'scryfall',
      'topdeck',
      'wizards-policy',
    ]),
  })
  .strict();

export type BlockedSource = z.infer<typeof SourceApprovalSchema>;

export const blockedSources: readonly BlockedSource[] = Object.freeze([
  { approved: false, source: 'commander-spellbook' },
  { approved: false, source: 'scryfall' },
  { approved: false, source: 'topdeck' },
  { approved: false, source: 'wizards-policy' },
]);

export function assertSourceApproved(source: BlockedSource): never {
  const parsed = SourceApprovalSchema.parse(source);
  throw new Error(
    `Source ${parsed.source} is blocked pending a dated data-governance review`,
  );
}

export function readNormalizedCard(input: unknown): NormalizedCard {
  return NormalizedCardSchema.parse(input);
}

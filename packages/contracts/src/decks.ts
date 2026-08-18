import { z } from 'zod';

import {
  CanonicalCardFaceIdSchema,
  CanonicalCardIdSchema,
  DeckIdSchema,
  DeckRevisionIdSchema,
  ParsedDeckEntryIdSchema,
  RawDeckInputIdSchema,
} from './identifiers.js';
import {
  BoundedDisplayNameSchema,
  BoundedDeckTextSchema,
  ColorIdentitySchema,
  IsoDateTimeSchema,
  MAX_CARD_FACES,
  MAX_DECK_ENTRIES,
  Sha256Schema,
  addDuplicateIssue,
} from './primitives.js';

export const DeckSectionSchema = z.enum([
  'commander',
  'mainboard',
  'sideboard',
  'maybeboard',
  'background',
  'companion',
]);

export const RawDeckInputSchema = z
  .object({
    format: z.literal('commander'),
    inputId: RawDeckInputIdSchema,
    source: z.literal('paste'),
    text: BoundedDeckTextSchema,
  })
  .strict()
  .readonly();

export const ParsedDeckEntrySchema = z
  .object({
    collectorNumber: z.string().trim().min(1).max(32).nullable(),
    entryId: ParsedDeckEntryIdSchema,
    line: z
      .number()
      .int()
      .min(1)
      .max(MAX_DECK_ENTRIES * 4),
    name: BoundedDisplayNameSchema,
    quantity: z.number().int().min(1).max(1_000),
    section: DeckSectionSchema,
    setCode: z
      .string()
      .regex(/^[A-Z0-9]{2,8}$/u)
      .nullable(),
  })
  .strict()
  .readonly();

export const NormalizedCardFaceSchema = z
  .object({
    cardId: CanonicalCardIdSchema,
    colors: ColorIdentitySchema,
    faceId: CanonicalCardFaceIdSchema,
    faceIndex: z
      .number()
      .int()
      .min(0)
      .max(MAX_CARD_FACES - 1),
    manaCost: z.string().max(256).nullable(),
    name: BoundedDisplayNameSchema,
    oracleText: z.string().max(16_384).nullable(),
    typeLine: z.string().trim().min(1).max(512),
  })
  .strict()
  .readonly();

export const NormalizedCardSchema = z
  .object({
    cardId: CanonicalCardIdSchema,
    colorIdentity: ColorIdentitySchema,
    commanderEligibility: z.enum(['eligible', 'ineligible', 'unknown']),
    faces: z
      .array(NormalizedCardFaceSchema)
      .min(1)
      .max(MAX_CARD_FACES)
      .readonly(),
    layout: z.enum([
      'normal',
      'split',
      'transform',
      'modal-double-faced',
      'adventure',
      'meld',
      'other',
    ]),
  })
  .strict()
  .superRefine((card, context) => {
    addDuplicateIssue(
      card.faces.map((face) => face.faceId),
      context,
      'Face identifiers',
    );
    addDuplicateIssue(
      card.faces.map((face) => String(face.faceIndex)),
      context,
      'Face indexes',
    );
    if (card.faces.some((face) => face.cardId !== card.cardId)) {
      context.addIssue({
        code: 'custom',
        message: 'Every face must reference its containing card',
        path: ['faces'],
      });
    }
  })
  .readonly();

const ResolvedDeckEntrySchema = z
  .object({
    cardId: CanonicalCardIdSchema,
    parsedEntryId: ParsedDeckEntryIdSchema,
    quantity: z.number().int().min(1).max(1_000),
    section: DeckSectionSchema,
    status: z.literal('resolved'),
  })
  .strict()
  .readonly();

const UnresolvedDeckEntrySchema = z
  .object({
    parsedEntryId: ParsedDeckEntryIdSchema,
    quantity: z.number().int().min(1).max(1_000),
    reason: z.enum(['no-match', 'missing-card-data', 'unsupported-syntax']),
    section: DeckSectionSchema,
    status: z.literal('unresolved'),
  })
  .strict()
  .readonly();

const AmbiguousDeckEntrySchema = z
  .object({
    candidateCardIds: z
      .array(CanonicalCardIdSchema)
      .min(2)
      .max(32)
      .superRefine((values, context) =>
        addDuplicateIssue(values, context, 'Candidate card identifiers'),
      )
      .readonly(),
    parsedEntryId: ParsedDeckEntryIdSchema,
    quantity: z.number().int().min(1).max(1_000),
    section: DeckSectionSchema,
    status: z.literal('ambiguous'),
  })
  .strict()
  .readonly();

export const NormalizedDeckEntrySchema = z.discriminatedUnion('status', [
  ResolvedDeckEntrySchema,
  UnresolvedDeckEntrySchema,
  AmbiguousDeckEntrySchema,
]);

export const CommanderSchema = z
  .object({
    cardId: CanonicalCardIdSchema,
    designation: z.enum([
      'commander',
      'partner',
      'background',
      'doctors-companion',
    ]),
    faceId: CanonicalCardFaceIdSchema.nullable(),
    parsedEntryId: ParsedDeckEntryIdSchema,
  })
  .strict()
  .readonly();

export const NormalizedDeckSchema = z
  .object({
    cards: z.array(NormalizedCardSchema).max(MAX_DECK_ENTRIES).readonly(),
    commanders: z.array(CommanderSchema).min(1).max(2).readonly(),
    entries: z
      .array(NormalizedDeckEntrySchema)
      .min(1)
      .max(MAX_DECK_ENTRIES)
      .readonly(),
    format: z.literal('commander'),
  })
  .strict()
  .superRefine((deck, context) => {
    addDuplicateIssue(
      deck.cards.map((card) => card.cardId),
      context,
      'Normalized card identifiers',
    );
    addDuplicateIssue(
      deck.entries.map((entry) => entry.parsedEntryId),
      context,
      'Normalized entry identifiers',
    );
    addDuplicateIssue(
      deck.commanders.map((commander) => commander.parsedEntryId),
      context,
      'Commander entry identifiers',
    );

    const cards = new Map(deck.cards.map((card) => [card.cardId, card]));
    const resolvedEntries = new Map(
      deck.entries
        .filter((entry) => entry.status === 'resolved')
        .map((entry) => [entry.parsedEntryId, entry]),
    );
    for (const entry of deck.entries) {
      if (entry.status === 'resolved' && !cards.has(entry.cardId)) {
        context.addIssue({
          code: 'custom',
          message: 'Resolved entries must reference a normalized card',
          path: ['entries'],
        });
      }
    }
    for (const commander of deck.commanders) {
      const entry = resolvedEntries.get(commander.parsedEntryId);
      if (!entry || entry.cardId !== commander.cardId) {
        context.addIssue({
          code: 'custom',
          message: 'Commanders must reference a matching resolved entry',
          path: ['commanders'],
        });
        continue;
      }
      const card = cards.get(commander.cardId);
      if (
        commander.faceId !== null &&
        !card?.faces.some((face) => face.faceId === commander.faceId)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Commander face must belong to its card',
          path: ['commanders'],
        });
      }
    }
  })
  .readonly();

export const DeckSchema = z
  .object({
    createdAt: IsoDateTimeSchema,
    deckId: DeckIdSchema,
    format: z.literal('commander'),
    title: BoundedDisplayNameSchema,
    visibility: z.literal('private'),
  })
  .strict()
  .readonly();

export const DeckRevisionSchema = z
  .object({
    contentHash: Sha256Schema,
    createdAt: IsoDateTimeSchema,
    deckId: DeckIdSchema,
    normalizedDeck: NormalizedDeckSchema,
    ordinal: z.number().int().positive().max(1_000_000),
    parentRevisionId: DeckRevisionIdSchema.nullable(),
    parsedEntries: z
      .array(ParsedDeckEntrySchema)
      .min(1)
      .max(MAX_DECK_ENTRIES)
      .readonly(),
    rawInput: RawDeckInputSchema,
    revisionId: DeckRevisionIdSchema,
  })
  .strict()
  .superRefine((revision, context) => {
    addDuplicateIssue(
      revision.parsedEntries.map((entry) => entry.entryId),
      context,
      'Parsed entry identifiers',
    );
    const parsedEntryIds = new Set(
      revision.parsedEntries.map((entry) => entry.entryId),
    );
    if (
      revision.normalizedDeck.entries.some(
        (entry) => !parsedEntryIds.has(entry.parsedEntryId),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Normalized entries must reference parsed entries',
        path: ['normalizedDeck', 'entries'],
      });
    }
    if (revision.ordinal === 1 && revision.parentRevisionId !== null) {
      context.addIssue({
        code: 'custom',
        message: 'The first revision cannot have a parent',
        path: ['parentRevisionId'],
      });
    }
    if (revision.ordinal > 1 && revision.parentRevisionId === null) {
      context.addIssue({
        code: 'custom',
        message: 'Later revisions require a parent',
        path: ['parentRevisionId'],
      });
    }
  })
  .readonly();

export type RawDeckInput = z.infer<typeof RawDeckInputSchema>;
export type ParsedDeckEntry = z.infer<typeof ParsedDeckEntrySchema>;
export type NormalizedCardFace = z.infer<typeof NormalizedCardFaceSchema>;
export type NormalizedCard = z.infer<typeof NormalizedCardSchema>;
export type NormalizedDeckEntry = z.infer<typeof NormalizedDeckEntrySchema>;
export type Commander = z.infer<typeof CommanderSchema>;
export type NormalizedDeck = z.infer<typeof NormalizedDeckSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type DeckRevision = z.infer<typeof DeckRevisionSchema>;

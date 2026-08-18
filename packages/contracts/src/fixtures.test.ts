import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  DeckRevisionSchema,
  NormalizedDeckSchema,
  ParsedDeckEntrySchema,
  RawDeckInputSchema,
  ReasonCodeSchema,
} from './index.js';

const ExpectedSchema = z
  .object({
    normalizedDeckValid: z.boolean(),
    parsedEntriesValid: z.boolean(),
    rawInputValid: z.boolean(),
    reasonCodes: z.array(ReasonCodeSchema),
  })
  .strict();

const FixtureManifestSchema = z
  .object({
    cases: z.array(
      z
        .object({
          caseId: z.string().min(1),
          category: z.enum([
            'legal',
            'illegal',
            'incomplete',
            'duplicate-heavy',
            'partner-background',
            'multi-face',
            'commander-specific',
            'malformed',
          ]),
          expected: ExpectedSchema,
          normalizedDeck: z.unknown(),
          parsedEntries: z.array(z.unknown()),
          rawInput: z.unknown(),
        })
        .strict(),
    ),
  })
  .strict();

async function loadDeckFixtures() {
  const path = new URL(
    '../../../data/fixtures/contracts/deck-cases.json',
    import.meta.url,
  );
  return FixtureManifestSchema.parse(
    JSON.parse(await readFile(path, 'utf8')) as unknown,
  );
}

describe('synthetic deck contract fixtures', () => {
  it('covers every required boundary with declared parse outcomes', async () => {
    const manifest = await loadDeckFixtures();
    expect(manifest.cases.map((fixture) => fixture.category).sort()).toEqual([
      'commander-specific',
      'duplicate-heavy',
      'illegal',
      'incomplete',
      'legal',
      'malformed',
      'multi-face',
      'partner-background',
    ]);

    for (const fixture of manifest.cases) {
      expect(RawDeckInputSchema.safeParse(fixture.rawInput).success).toBe(
        fixture.expected.rawInputValid,
      );
      expect(
        fixture.parsedEntries.every(
          (entry) => ParsedDeckEntrySchema.safeParse(entry).success,
        ),
      ).toBe(fixture.expected.parsedEntriesValid);
      expect(
        NormalizedDeckSchema.safeParse(fixture.normalizedDeck).success,
      ).toBe(fixture.expected.normalizedDeckValid);
    }
  });

  it('parses an immutable revision and enforces parent and reference rules', async () => {
    const manifest = await loadDeckFixtures();
    const fixture = manifest.cases.find(
      (candidate) => candidate.category === 'legal',
    );
    expect(fixture).toBeDefined();
    if (!fixture) return;

    const revision = DeckRevisionSchema.parse({
      contentHash: '0'.repeat(64),
      createdAt: '2026-08-17T12:00:00Z',
      deckId: 'deck_10000000-0000-4000-8000-000000000001',
      normalizedDeck: fixture.normalizedDeck,
      ordinal: 1,
      parentRevisionId: null,
      parsedEntries: fixture.parsedEntries,
      rawInput: fixture.rawInput,
      revisionId: 'revision_10000000-0000-4000-8000-000000000001',
    });

    expect(Object.isFrozen(revision)).toBe(true);
    expect(Object.isFrozen(revision.normalizedDeck)).toBe(true);
    expect(Object.isFrozen(revision.parsedEntries)).toBe(true);
    expect(
      DeckRevisionSchema.safeParse({
        ...revision,
        ordinal: 2,
        parentRevisionId: null,
      }).success,
    ).toBe(false);
  });

  it('bounds raw input by UTF-8 bytes rather than JavaScript character count', () => {
    expect(
      RawDeckInputSchema.safeParse({
        format: 'commander',
        inputId: 'input_90000000-0000-4000-8000-000000000001',
        source: 'paste',
        text: '🃏'.repeat(70_000),
      }).success,
    ).toBe(false);
  });
});

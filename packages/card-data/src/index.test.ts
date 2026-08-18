import { describe, expect, it } from 'vitest';

import {
  assertSourceApproved,
  blockedSources,
  readNormalizedCard,
} from './index.js';

describe('source governance boundary', () => {
  it('fails closed for every named external source', () => {
    expect(blockedSources).toHaveLength(4);
    for (const source of blockedSources) {
      expect(() => assertSourceApproved(source)).toThrow(
        /blocked pending a dated data-governance review/u,
      );
    }
  });
});

describe('normalized card boundary', () => {
  it('consumes the shared canonical card contract', () => {
    expect(
      readNormalizedCard({
        cardId: 'card_00000000-0000-4000-8000-000000000001',
        colorIdentity: ['G'],
        commanderEligibility: 'eligible',
        faces: [
          {
            cardId: 'card_00000000-0000-4000-8000-000000000001',
            colors: ['G'],
            faceId: 'face_00000000-0000-4000-8000-000000000001',
            faceIndex: 0,
            manaCost: '{G}',
            name: 'Synthetic Card',
            oracleText: null,
            typeLine: 'Legendary Creature — Test',
          },
        ],
        layout: 'normal',
      }).cardId,
    ).toMatch(/^card_/u);
  });
});

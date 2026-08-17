import { describe, expect, it } from 'vitest';

import { assertSourceApproved, blockedSources } from './index.js';

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

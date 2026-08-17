import { describe, expect, it } from 'vitest';

import { redactRecord } from './index.js';

describe('observability redaction', () => {
  it('redacts common secrets without changing safe identifiers', () => {
    expect(
      redactRecord({
        analysisId: 'analysis-1',
        authorization: 'Bearer secret',
        deck: '1 Sol Ring',
        email: 'private@example.com',
      }),
    ).toEqual({
      analysisId: 'analysis-1',
      authorization: '[REDACTED]',
      deck: '[REDACTED]',
      email: '[REDACTED]',
    });
  });
});

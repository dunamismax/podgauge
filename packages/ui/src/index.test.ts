import { describe, expect, it } from 'vitest';

import { formatFoundationStatus } from './index.js';

describe('UI status language', () => {
  it('keeps unknown distinct from ready', () => {
    expect(formatFoundationStatus('unknown')).toBe('Unknown');
    expect(formatFoundationStatus('unknown')).not.toBe(
      formatFoundationStatus('ready'),
    );
  });
});

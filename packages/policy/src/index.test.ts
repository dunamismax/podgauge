import { describe, expect, it } from 'vitest';

import { readPolicyReadiness } from './index.js';

describe('policy review boundary', () => {
  it('keeps the foundation explicitly unreviewed and empty', () => {
    expect(
      readPolicyReadiness({
        ruleCount: 0,
        state: 'unreviewed',
        version: '0.0.0',
      }),
    ).toEqual({ ruleCount: 0, state: 'unreviewed', version: '0.0.0' });
  });

  it('rejects active rules that have not passed review', () => {
    expect(() =>
      readPolicyReadiness({
        ruleCount: 1,
        state: 'unreviewed',
        version: '0.0.0',
      }),
    ).toThrow(/cannot contain active rules/u);
  });
});

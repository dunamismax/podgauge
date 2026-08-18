import { describe, expect, it } from 'vitest';

import { readAnalysisJobAtWorkerBoundary } from './job-boundary.js';

describe('worker analysis-job boundary', () => {
  it('rejects a stale or partial serialized payload before execution', () => {
    expect(() =>
      readAnalysisJobAtWorkerBoundary({
        jobKind: 'analyze-deck',
        payloadVersion: '0.1.0',
      }),
    ).toThrow();
  });
});

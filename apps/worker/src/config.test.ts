import { describe, expect, it } from 'vitest';

import { readWorkerConfiguration } from './config.js';

describe('worker startup configuration', () => {
  it('defaults to one CPU-heavy job at a time', () => {
    expect(readWorkerConfiguration({})).toEqual({
      concurrency: 1,
      logLevel: 'info',
    });
  });

  it('rejects unsupported concurrency and log levels', () => {
    expect(() =>
      readWorkerConfiguration({ PODGAUGE_WORKER_CONCURRENCY: '2' }),
    ).toThrow();
    expect(() =>
      readWorkerConfiguration({ PODGAUGE_LOG_LEVEL: 'verbose' }),
    ).toThrow();
  });
});

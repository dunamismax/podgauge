import { describe, expect, it } from 'vitest';

import { localDevelopmentDatabaseUrl, readDatabaseUrl } from './config.js';

describe('database configuration boundary', () => {
  it('uses the documented loopback-only development database by default', () => {
    expect(readDatabaseUrl({})).toBe(localDevelopmentDatabaseUrl);
    expect(new URL(localDevelopmentDatabaseUrl).hostname).toBe('127.0.0.1');
    expect(new URL(localDevelopmentDatabaseUrl).port).toBe('54329');
  });

  it('rejects non-PostgreSQL database schemes', () => {
    expect(() =>
      readDatabaseUrl({ DATABASE_URL: 'https://example.com/db' }),
    ).toThrow(/postgres:\/\//u);
  });
});

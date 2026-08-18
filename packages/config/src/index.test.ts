import { inspect } from 'node:util';

import { describe, expect, it } from 'vitest';

import {
  ConfigurationError,
  localDevelopmentDatabaseUrl,
  readMigrationConfiguration,
  readTestConfiguration,
  readWebConfiguration,
  readWorkerConfiguration,
} from './index.js';

const productionDatabaseUrl =
  'postgres://podgauge_runtime:production-secret@postgres/podgauge';

describe('server-only configuration', () => {
  it('uses only documented safe development defaults', () => {
    const web = readWebConfiguration({});
    const worker = readWorkerConfiguration({});
    const migration = readMigrationConfiguration({});

    expect(web).toMatchObject({
      bodySizeLimitBytes: 256 * 1_024,
      environment: 'development',
      host: '127.0.0.1',
      port: 5_173,
      runtime: 'web',
      shutdownTimeoutSeconds: 30,
    });
    expect(worker).toMatchObject({
      concurrency: 1,
      environment: 'development',
      runtime: 'worker',
    });
    expect(migration).toMatchObject({
      environment: 'development',
      maxConnections: 1,
      runtime: 'migration',
    });
    expect(migration.databaseUrl.reveal()).toBe(localDevelopmentDatabaseUrl);
  });

  it('accepts complete production settings without making proxy decisions', () => {
    const configuration = readWebConfiguration({
      BODY_SIZE_LIMIT: '256K',
      DATABASE_URL: productionDatabaseUrl,
      HOST: '0.0.0.0',
      NODE_ENV: 'production',
      ORIGIN: 'https://podgauge.com',
      PODGAUGE_LOG_LEVEL: 'info',
      PORT: '3000',
      SHUTDOWN_TIMEOUT: '30',
    });

    expect(configuration.origin.href).toBe('https://podgauge.com/');
    expect(configuration.databaseUrl.reveal()).toBe(productionDatabaseUrl);
  });

  it('requires explicit deterministic test settings', () => {
    const configuration = readTestConfiguration({
      NODE_ENV: 'test',
      PODGAUGE_RUN_DB_INTEGRATION: '1',
      PODGAUGE_TEST_DATABASE_URL:
        'postgres://podgauge_test:test-only@127.0.0.1:54329/podgauge_test',
      PODGAUGE_TEST_SEED: 'podgauge-test-seed-v1',
    });

    expect(configuration).toMatchObject({
      environment: 'test',
      runDatabaseIntegration: true,
      runtime: 'test',
      seed: 'podgauge-test-seed-v1',
    });
  });

  it.each([
    [{ NODE_ENV: 'preview' }, 'NODE_ENV'],
    [{ PORT: '0' }, 'PORT'],
    [{ PORT: '3.5' }, 'PORT'],
    [{ BODY_SIZE_LIMIT: '257K' }, 'BODY_SIZE_LIMIT'],
    [{ DATABASE_URL: 'https://example.com/database' }, 'database URL'],
    [{ ORIGIN: 'http://user:secret@example.com' }, 'ORIGIN'],
  ])('rejects malformed or unsafe web settings %#', (environment, field) => {
    expect(() => readWebConfiguration(environment)).toThrow(field);
  });

  it('rejects missing and ambiguous production settings', () => {
    expect(() => readWebConfiguration({ NODE_ENV: 'production' })).toThrow(
      /required/u,
    );
    expect(() =>
      readMigrationConfiguration({
        DATABASE_URL: localDevelopmentDatabaseUrl,
        NODE_ENV: 'production',
      }),
    ).toThrow(/local credentials/u);
  });

  it('rejects unsupported worker concurrency and cross-mode settings', () => {
    expect(() =>
      readWorkerConfiguration({ PODGAUGE_WORKER_CONCURRENCY: '2' }),
    ).toThrow(/PODGAUGE_WORKER_CONCURRENCY/u);
    expect(() =>
      readWebConfiguration({ PODGAUGE_WORKER_CONCURRENCY: '1' }),
    ).toThrow(/belongs to worker configuration/u);
  });

  it('keeps credential-bearing values redacted by default', () => {
    const secret = readMigrationConfiguration({
      DATABASE_URL: productionDatabaseUrl,
    }).databaseUrl;

    expect(String(secret)).toBe('[REDACTED]');
    expect(inspect(secret)).toBe('[REDACTED]');
    expect(JSON.stringify({ databaseUrl: secret })).toBe(
      '{"databaseUrl":"[REDACTED]"}',
    );
    expect(() =>
      readMigrationConfiguration({ DATABASE_URL: 'not a url with secret=abc' }),
    ).toThrow(ConfigurationError);
    expect(() =>
      readMigrationConfiguration({ DATABASE_URL: 'not a url with secret=abc' }),
    ).toThrowError(/valid URL/u);
    try {
      readMigrationConfiguration({ DATABASE_URL: 'not a url with secret=abc' });
    } catch (error) {
      expect(String(error)).not.toContain('secret=abc');
    }
  });
});

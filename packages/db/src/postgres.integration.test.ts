import { readTestConfiguration } from '@podgauge/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMigrationClient } from './client.js';

const testConfiguration = readTestConfiguration(process.env);
const databaseDescribe = testConfiguration.runDatabaseIntegration
  ? describe
  : describe.skip;

databaseDescribe('PostgreSQL foundation', () => {
  const { sql } = createMigrationClient(process.env);

  beforeAll(async () => {
    await sql`select 1`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it('uses PostgreSQL 18 and reads the idempotent development seed', async () => {
    const [version] = await sql<{ server_version_num: string }[]>`
      show server_version_num
    `;
    const rows = await sql<{ key: string; value: string }[]>`
      select key, value
      from system_metadata
      where key = 'development_fixture'
    `;

    expect(Number(version?.server_version_num)).toBeGreaterThanOrEqual(180_000);
    expect(rows).toEqual([
      { key: 'development_fixture', value: 'foundation-v1' },
    ]);
  });
});

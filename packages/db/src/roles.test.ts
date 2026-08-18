import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const bootstrapUrl = new URL('../roles/bootstrap.sql', import.meta.url);
const grantsUrl = new URL('../roles/grants.sql', import.meta.url);
const graphileGrantsUrl = new URL(
  '../roles/graphile-grants.sql',
  import.meta.url,
);
const schemaUrl = new URL('./schema.ts', import.meta.url);

describe('reviewed PostgreSQL role artifacts', () => {
  it('keeps credentials outside SQL and strips elevated role attributes', async () => {
    const bootstrap = await readFile(bootstrapUrl, 'utf8');

    expect(bootstrap).not.toContain('postgres://');
    expect(bootstrap).not.toContain('_dev_only');
    expect(bootstrap).not.toMatch(/PASSWORD\s+'[^']+'/iu);
    for (const role of [
      'podgauge_migration',
      'podgauge_web',
      'podgauge_worker',
      'podgauge_backup',
    ]) {
      expect(bootstrap).toContain(`ALTER ROLE ${role} WITH LOGIN NOSUPERUSER`);
    }
    expect(bootstrap).toContain(
      'NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
    );
    expect(bootstrap).toContain(
      'ALTER DATABASE %I OWNER TO podgauge_migration',
    );
    expect(bootstrap).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration',
    );
  });

  it('accounts for every durable table in the explicit runtime grant manifest', async () => {
    const [grants, schema] = await Promise.all([
      readFile(grantsUrl, 'utf8'),
      readFile(schemaUrl, 'utf8'),
    ]);
    const tableNames = [...schema.matchAll(/pgTable\(\s*'([^']+)'/gu)].map(
      (match) => match[1],
    );

    expect(tableNames).toHaveLength(22);
    for (const tableName of tableNames) expect(grants).toContain(tableName);
    expect(grants).toContain(
      'GRANT SELECT ON ALL TABLES IN SCHEMA public TO podgauge_backup',
    );
    expect(grants).not.toMatch(/TO\s+PUBLIC/iu);
  });

  it('keeps Graphile DDL with migration while granting only queue operations', async () => {
    const grants = await readFile(graphileGrantsUrl, 'utf8');

    expect(grants).not.toContain('postgres://');
    expect(grants).not.toMatch(/GRANT\s+CREATE/iu);
    expect(grants).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO podgauge_worker',
    );
    expect(grants).toContain('CREATE POLICY podgauge_worker_runtime');
    expect(grants).toContain('CREATE POLICY podgauge_backup_read');
    expect(grants).not.toMatch(/TO\s+PUBLIC/iu);
  });
});

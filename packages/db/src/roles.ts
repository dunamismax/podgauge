import {
  databaseRoleNames,
  readMigrationConfiguration,
  readRoleBootstrapConfiguration,
  type DatabaseRole,
  type EnvironmentSource,
} from '@podgauge/config';
import { readFile } from 'node:fs/promises';
import postgres, { type Sql } from 'postgres';

const bootstrapSqlUrl = new URL('../roles/bootstrap.sql', import.meta.url);
const grantsSqlUrl = new URL('../roles/grants.sql', import.meta.url);
const graphileGrantsSqlUrl = new URL(
  '../roles/graphile-grants.sql',
  import.meta.url,
);

export function databaseUrlForRole(
  sourceUrl: string,
  role: DatabaseRole,
  password: string,
): string {
  const url = new URL(sourceUrl);
  url.username = databaseRoleNames[role];
  url.password = password;
  return url.href;
}

export async function installDatabaseRoles(
  environment: EnvironmentSource,
): Promise<void> {
  const configuration = readRoleBootstrapConfiguration(environment);
  const adminSql = postgres(configuration.adminDatabaseUrl.reveal(), {
    max: 1,
  });

  try {
    await adminSql.unsafe(await readFile(bootstrapSqlUrl, 'utf8'));
    for (const role of Object.keys(databaseRoleNames) as DatabaseRole[]) {
      await adminSql.begin(async (transaction) => {
        await transaction`
          select
            set_config('podgauge.bootstrap_role', ${databaseRoleNames[role]}, true),
            set_config('podgauge.bootstrap_password', ${configuration.passwords[role].reveal()}, true)
        `;
        await transaction.unsafe(`
          DO $podgauge_password$
          BEGIN
            EXECUTE format(
              'ALTER ROLE %I PASSWORD %L',
              current_setting('podgauge.bootstrap_role'),
              current_setting('podgauge.bootstrap_password')
            );
          END
          $podgauge_password$;
        `);
      });
    }
  } finally {
    await adminSql.end();
  }
}

export async function applyRuntimeGrants(sql: Sql): Promise<void> {
  await sql.unsafe(await readFile(grantsSqlUrl, 'utf8'));
}

export async function applyGraphileWorkerGrants(
  environment: EnvironmentSource,
): Promise<void> {
  const configuration = readMigrationConfiguration(environment);
  const sql = postgres(configuration.databaseUrl.reveal(), {
    max: configuration.maxConnections,
  });
  try {
    await sql.unsafe(await readFile(graphileGrantsSqlUrl, 'utf8'));
  } finally {
    await sql.end();
  }
}

import {
  readBackupConfiguration,
  readMigrationConfiguration,
  readWebConfiguration,
  readWorkerConfiguration,
  type EnvironmentSource,
} from '@podgauge/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

type DatabaseConfigurationReader = (
  environment: EnvironmentSource,
) => Readonly<{ databaseUrl: { reveal(): string } }>;

function createClient(
  environment: EnvironmentSource,
  readConfiguration: DatabaseConfigurationReader,
  max: number,
) {
  const configuration = readConfiguration(environment);
  const sql = postgres(configuration.databaseUrl.reveal(), {
    max,
  });
  return { db: drizzle(sql, { schema }), sql };
}

export function createMigrationClient(environment: EnvironmentSource) {
  const configuration = readMigrationConfiguration(environment);
  const sql = postgres(configuration.databaseUrl.reveal(), {
    max: configuration.maxConnections,
  });
  return { db: drizzle(sql, { schema }), sql };
}

export function createWebClient(environment: EnvironmentSource) {
  return createClient(environment, readWebConfiguration, 20);
}

export function createWorkerClient(environment: EnvironmentSource) {
  return createClient(environment, readWorkerConfiguration, 10);
}

export function createBackupClient(environment: EnvironmentSource) {
  return createClient(environment, readBackupConfiguration, 2);
}

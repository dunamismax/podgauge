import {
  readMigrationConfiguration,
  type EnvironmentSource,
} from '@podgauge/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

export function createMigrationClient(environment: EnvironmentSource) {
  const configuration = readMigrationConfiguration(environment);
  const sql = postgres(configuration.databaseUrl.reveal(), {
    max: configuration.maxConnections,
  });
  return { db: drizzle(sql, { schema }), sql };
}

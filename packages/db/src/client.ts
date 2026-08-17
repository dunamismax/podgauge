import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { readDatabaseUrl } from './config.js';

export function createMigrationClient(environment: NodeJS.ProcessEnv) {
  const sql = postgres(readDatabaseUrl(environment), { max: 1 });
  return { db: drizzle(sql), sql };
}

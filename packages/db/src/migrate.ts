import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';

import { createMigrationClient } from './client.js';

const { db, sql } = createMigrationClient(process.env);

try {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
  console.log(JSON.stringify({ command: 'db:migrate', status: 'complete' }));
} finally {
  await sql.end();
}

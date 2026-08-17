import { eq } from 'drizzle-orm';

import { createMigrationClient } from './client.js';
import { systemMetadata } from './schema.js';

const { db, sql } = createMigrationClient(process.env);

try {
  await db
    .insert(systemMetadata)
    .values({ key: 'development_fixture', value: 'foundation-v1' })
    .onConflictDoUpdate({
      set: { value: 'foundation-v1' },
      target: systemMetadata.key,
    });

  const seeded = await db
    .select({ value: systemMetadata.value })
    .from(systemMetadata)
    .where(eq(systemMetadata.key, 'development_fixture'));

  if (seeded[0]?.value !== 'foundation-v1') {
    throw new Error('Development fixture seed verification failed');
  }

  console.log(JSON.stringify({ command: 'db:seed', status: 'complete' }));
} finally {
  await sql.end();
}

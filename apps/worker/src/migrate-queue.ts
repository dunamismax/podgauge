import { readMigrationConfiguration } from '@podgauge/config';
import { applyGraphileWorkerGrants } from '@podgauge/db/roles';
import { runMigrations } from 'graphile-worker';

const configuration = readMigrationConfiguration(process.env);

await runMigrations({
  connectionString: configuration.databaseUrl.reveal(),
  maxPoolSize: configuration.maxConnections,
  noHandleSignals: true,
});
await applyGraphileWorkerGrants(process.env);

console.log(JSON.stringify({ command: 'queue:migrate', status: 'complete' }));

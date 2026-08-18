import { readMigrationConfiguration } from '@podgauge/config';
import { defineConfig } from 'drizzle-kit';

const configuration = readMigrationConfiguration(process.env);

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: { url: configuration.databaseUrl.reveal() },
  out: './migrations',
  schema: './src/schema.ts',
  strict: true,
  verbose: true,
});

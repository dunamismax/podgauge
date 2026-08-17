import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://podgauge:podgauge_dev_only@127.0.0.1:54329/podgauge';

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  out: './migrations',
  schema: './src/schema.ts',
  strict: true,
  verbose: true,
});

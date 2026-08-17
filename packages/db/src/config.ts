import { z } from 'zod';

const DevelopmentDatabaseUrlSchema = z
  .url()
  .refine((value) => value.startsWith('postgres://'), {
    message: 'DATABASE_URL must use postgres://',
  });

export const localDevelopmentDatabaseUrl =
  'postgres://podgauge:podgauge_dev_only@127.0.0.1:54329/podgauge';

export function readDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  return DevelopmentDatabaseUrlSchema.parse(
    environment.DATABASE_URL ?? localDevelopmentDatabaseUrl,
  );
}

import { z } from 'zod';

const WorkerConfigurationSchema = z.object({
  concurrency: z.literal(1),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});

export type WorkerConfiguration = z.infer<typeof WorkerConfigurationSchema>;

export function readWorkerConfiguration(
  environment: NodeJS.ProcessEnv,
): WorkerConfiguration {
  return WorkerConfigurationSchema.parse({
    concurrency: Number(environment.PODGAUGE_WORKER_CONCURRENCY ?? '1'),
    logLevel: environment.PODGAUGE_LOG_LEVEL ?? 'info',
  });
}

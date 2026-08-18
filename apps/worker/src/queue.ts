import type { WorkerConfiguration } from '@podgauge/config';
import { Logger, runTaskList } from 'graphile-worker';
import { Pool } from 'pg';

import {
  createAnalysisTaskList,
  type AnalysisTaskExecutor,
} from './analysis-task.js';

export type QueueRunner = Readonly<{
  promise: Promise<void>;
  stop: (reason?: string) => Promise<void>;
}>;

export type StartQueue = (
  configuration: WorkerConfiguration,
) => Promise<QueueRunner>;

type QueueLogEvent = Readonly<{
  component: 'graphile-worker';
  jobId?: string;
  level: string;
  service: 'podgauge-worker';
  taskIdentifier?: string;
  workerId?: string;
}>;

type WriteQueueLog = (event: QueueLogEvent) => void;

const writeQueueLog: WriteQueueLog = (event) => {
  process.stdout.write(`${JSON.stringify(event)}\n`);
};

const unavailableAnalysisExecutor: AnalysisTaskExecutor = async (
  _payload,
  signal,
) => {
  signal.throwIfAborted();
  throw new Error(
    'Analysis execution is unavailable until the deterministic scanner lands',
  );
};

export function createGraphileQueueStarter(
  executor: AnalysisTaskExecutor = unavailableAnalysisExecutor,
  writeLog: WriteQueueLog = writeQueueLog,
): StartQueue {
  return async (configuration) => {
    const pool = new Pool({
      connectionString: configuration.databaseUrl.reveal(),
      max: 3,
    });
    const logger = new Logger((scope) => (level) => {
      if (level === 'debug') return;
      writeLog({
        component: 'graphile-worker',
        ...(scope.jobId ? { jobId: scope.jobId } : {}),
        level,
        service: 'podgauge-worker',
        ...(scope.taskIdentifier
          ? { taskIdentifier: scope.taskIdentifier }
          : {}),
        ...(scope.workerId ? { workerId: scope.workerId } : {}),
      });
    });
    let rejectDatabaseError: (reason: unknown) => void = () => undefined;
    const databaseError = new Promise<never>((_resolve, reject) => {
      rejectDatabaseError = reject;
    });

    let workerPool: ReturnType<typeof runTaskList>;
    try {
      workerPool = runTaskList(
        {
          concurrency: configuration.concurrency,
          gracefulShutdownAbortTimeout:
            configuration.shutdownTimeoutSeconds * 1_000,
          logger,
          noHandleSignals: true,
        },
        createAnalysisTaskList(
          executor,
          configuration.jobTimeoutSeconds * 1_000,
        ),
        pool,
      );
    } catch (error) {
      await pool.end();
      throw error;
    }
    let stopCleanup: Promise<void> | undefined;
    const handleDatabaseError = () => {
      stopCleanup ??= Promise.resolve(
        workerPool.forcefulShutdown('PostgreSQL pool error'),
      ).then(() => undefined);
      rejectDatabaseError(new Error('Graphile Worker PostgreSQL pool failed'));
    };
    pool.on('error', handleDatabaseError);
    const promise = Promise.race([workerPool.promise, databaseError]).finally(
      async () => {
        await stopCleanup;
        pool.off('error', handleDatabaseError);
        await pool.end();
      },
    );

    return {
      promise,
      stop: async (reason = 'PodGauge worker is stopping') => {
        stopCleanup ??= (async () => {
          await workerPool.gracefulShutdown(reason);
          await pool.query(
            'select graphile_worker.force_unlock_workers($1::text[])',
            [[workerPool.id]],
          );
        })();
        await stopCleanup;
      },
    };
  };
}

export const startGraphileQueue = createGraphileQueueStarter();

export const startSmokeQueue: StartQueue = async () => {
  let stop: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    stop = resolve;
  });
  return {
    promise,
    stop: async () => stop(),
  };
};

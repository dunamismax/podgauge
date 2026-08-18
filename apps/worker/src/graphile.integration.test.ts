import {
  databaseRoleNames,
  readWorkerConfiguration,
  type DatabaseRole,
} from '@podgauge/config';
import {
  applyGraphileWorkerGrants,
  databaseUrlForRole,
  installDatabaseRoles,
} from '@podgauge/db';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { makeWorkerUtils, runMigrations } from 'graphile-worker';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createAnalysisJobPayloadFixture } from './analysis-task.fixture.js';
import {
  analysisQueueName,
  analyzeDeckTaskIdentifier,
  enqueueAnalysisJob,
} from './analysis-task.js';
import { createGraphileQueueStarter, type QueueRunner } from './queue.js';

const databaseDescribe =
  process.env.PODGAUGE_RUN_DB_INTEGRATION === '1' ? describe : describe.skip;
const postgresImage =
  'postgres:18.4@sha256:f7ce845ee6873dd84be93c9828fe0d1fab0f9707dc9ac569694657398b290bce';
const adminPassword = 'podgauge-queue-test-admin-only';
const rolePasswords = {
  backup: 'podgauge-queue-test-backup-only',
  migration: 'podgauge-queue-test-migration-only',
  web: 'podgauge-queue-test-web-only',
  worker: 'podgauge-queue-test-worker-only',
} as const satisfies Record<DatabaseRole, string>;

type QueueJob = Readonly<{
  attempts: number;
  key: string | null;
  last_error: string | null;
  locked_at: Date | null;
  max_attempts: number;
}>;

async function waitFor(
  assertion: () => void | Promise<void>,
  timeoutMilliseconds = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Timed out waiting for queue state');
}

databaseDescribe('Graphile Worker queue boundary', () => {
  let adminDatabaseUrl: string;
  let container: StartedPostgreSqlContainer;
  let migrationPool: Pool;

  const roleUrl = (role: DatabaseRole) =>
    databaseUrlForRole(adminDatabaseUrl, role, rolePasswords[role]);

  const workerConfiguration = (overrides: Record<string, string> = {}) =>
    readWorkerConfiguration({
      DATABASE_URL: roleUrl('worker'),
      NODE_ENV: 'test',
      PODGAUGE_WORKER_CONCURRENCY: '1',
      PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS: '5',
      PODGAUGE_WORKER_SHUTDOWN_TIMEOUT_SECONDS: '1',
      ...overrides,
    });

  const readJob = async (key: string) => {
    const result = await migrationPool.query<QueueJob>(
      `select attempts, key, last_error, locked_at, max_attempts
       from graphile_worker.jobs
       where key = $1`,
      [key],
    );
    return result.rows[0];
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer(postgresImage)
      .withDatabase('podgauge')
      .withUsername('podgauge_queue_admin')
      .withPassword(adminPassword)
      .start();
    adminDatabaseUrl = container.getConnectionUri();

    const bootstrapEnvironment = {
      NODE_ENV: 'test',
      PODGAUGE_BACKUP_DATABASE_PASSWORD: rolePasswords.backup,
      PODGAUGE_MIGRATION_DATABASE_PASSWORD: rolePasswords.migration,
      PODGAUGE_ROLE_BOOTSTRAP_DATABASE_URL: adminDatabaseUrl,
      PODGAUGE_WEB_DATABASE_PASSWORD: rolePasswords.web,
      PODGAUGE_WORKER_DATABASE_PASSWORD: rolePasswords.worker,
    } as const;
    await installDatabaseRoles(bootstrapEnvironment);
    await runMigrations({
      connectionString: roleUrl('migration'),
      maxPoolSize: 1,
      noHandleSignals: true,
    });
    await applyGraphileWorkerGrants({
      DATABASE_URL: roleUrl('migration'),
      NODE_ENV: 'test',
    });
    await installDatabaseRoles(bootstrapEnvironment);
    await runMigrations({
      connectionString: roleUrl('migration'),
      maxPoolSize: 1,
      noHandleSignals: true,
    });
    await applyGraphileWorkerGrants({
      DATABASE_URL: roleUrl('migration'),
      NODE_ENV: 'test',
    });
    migrationPool = new Pool({
      connectionString: roleUrl('migration'),
      max: 1,
    });
  }, 120_000);

  afterAll(async () => {
    await migrationPool?.end();
    await container?.stop();
  });

  it('migrates as the migration owner and gives runtime roles no queue DDL', async () => {
    const owner = await migrationPool.query<{ owner: string }>(
      `select pg_get_userbyid(nspowner) as owner
       from pg_namespace
       where nspname = 'graphile_worker'`,
    );
    expect(owner.rows[0]?.owner).toBe(databaseRoleNames.migration);

    const workerPool = new Pool({
      connectionString: roleUrl('worker'),
      max: 1,
    });
    const webPool = new Pool({ connectionString: roleUrl('web'), max: 1 });
    const backupPool = new Pool({
      connectionString: roleUrl('backup'),
      max: 1,
    });
    try {
      await expect(
        workerPool.query(
          'create table graphile_worker.forbidden_worker_ddl (id integer)',
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(
        webPool.query('select count(*) from graphile_worker.jobs'),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(
        backupPool.query('select count(*) from graphile_worker.jobs'),
      ).resolves.toMatchObject({ rows: [{ count: '0' }] });
      await expect(
        backupPool.query(
          `insert into graphile_worker._private_tasks (identifier) values ('forbidden_backup_write')`,
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await Promise.all([workerPool.end(), webPool.end(), backupPool.end()]);
    }
  });

  it('deduplicates named analysis jobs and executes the CPU queue serially', async () => {
    const first = createAnalysisJobPayloadFixture();
    const second = createAnalysisJobPayloadFixture();
    const firstKey = `${analyzeDeckTaskIdentifier}:${first.analysisId}`;
    const utils = await makeWorkerUtils({
      connectionString: roleUrl('worker'),
      maxPoolSize: 1,
    });
    try {
      await enqueueAnalysisJob(utils.addJob, first);
      await enqueueAnalysisJob(utils.addJob, first);
      await enqueueAnalysisJob(utils.addJob, second);
    } finally {
      await utils.release();
    }

    const queued = await migrationPool.query<{
      count: string;
      max_attempts: number;
      queue_name: string;
    }>(
      `select count(*)::text as count,
              max(j.max_attempts)::int as max_attempts,
              j.queue_name
       from graphile_worker.jobs j
       where j.key = $1
       group by j.queue_name`,
      [firstKey],
    );
    expect(queued.rows[0]).toEqual({
      count: '1',
      max_attempts: first.retry.maxAttempts,
      queue_name: analysisQueueName,
    });

    let active = 0;
    let completed = 0;
    let maximumActive = 0;
    const executor = vi.fn(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 50));
      active -= 1;
      completed += 1;
    });
    const runner = await createGraphileQueueStarter(executor)(
      workerConfiguration(),
    );
    try {
      await waitFor(() => expect(completed).toBe(2));
      expect(executor).toHaveBeenCalledTimes(2);
      expect(maximumActive).toBe(1);
    } finally {
      await runner.stop('serial queue test complete');
      await runner.promise;
    }
  });

  it('rejects malformed serialized payloads and honors the job retry bound', async () => {
    const key = `malformed-${crypto.randomUUID()}`;
    const utils = await makeWorkerUtils({
      connectionString: roleUrl('worker'),
      maxPoolSize: 1,
    });
    try {
      await utils.addJob(
        analyzeDeckTaskIdentifier,
        { jobKind: 'analyze-deck' },
        { jobKey: key, maxAttempts: 2, queueName: analysisQueueName },
      );
    } finally {
      await utils.release();
    }

    const executor = vi.fn();
    const queueLogs: Array<Record<string, unknown>> = [];
    const runner = await createGraphileQueueStarter(executor, (event) => {
      queueLogs.push(event);
    })(workerConfiguration());
    try {
      await waitFor(async () => {
        const job = await readJob(key);
        expect(job).toMatchObject({
          attempts: 2,
          key,
          locked_at: null,
          max_attempts: 2,
        });
        expect(job?.last_error).toBeTruthy();
      });
      const job = await readJob(key);
      expect(job?.last_error).toBeTruthy();
      expect(executor).not.toHaveBeenCalled();
      const serializedLogs = JSON.stringify(queueLogs);
      expect(serializedLogs).not.toContain('Invalid input');
      expect(serializedLogs).not.toContain(rolePasswords.worker);
      expect(serializedLogs).not.toContain('analysisId');
    } finally {
      await runner.stop('retry test complete');
      await runner.promise;
    }
  });

  it('times out stuck analysis work and leaves the failed job retry-safe', async () => {
    const payload = createAnalysisJobPayloadFixture(1);
    const key = `${analyzeDeckTaskIdentifier}:${payload.analysisId}`;
    const utils = await makeWorkerUtils({
      connectionString: roleUrl('worker'),
      maxPoolSize: 1,
    });
    try {
      await enqueueAnalysisJob(utils.addJob, payload);
    } finally {
      await utils.release();
    }

    let observedSignal: AbortSignal | undefined;
    const runner = await createGraphileQueueStarter(async (_job, signal) => {
      observedSignal = signal;
      await new Promise<void>(() => undefined);
    })(workerConfiguration({ PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS: '1' }));
    try {
      await waitFor(async () => {
        const job = await readJob(key);
        expect(job).toMatchObject({
          attempts: 1,
          key,
          locked_at: null,
          max_attempts: 1,
        });
        expect(job?.last_error).toBeTruthy();
      });
      const job = await readJob(key);
      expect(job?.last_error).toContain(
        'Analysis job exceeded 1000 milliseconds',
      );
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      await runner.stop('timeout test complete');
      await runner.promise;
    }
  });

  it('aborts cooperative work during bounded graceful shutdown', async () => {
    const payload = createAnalysisJobPayloadFixture(2);
    const key = `${analyzeDeckTaskIdentifier}:${payload.analysisId}`;
    const utils = await makeWorkerUtils({
      connectionString: roleUrl('worker'),
      maxPoolSize: 1,
    });
    try {
      await enqueueAnalysisJob(utils.addJob, payload);
    } finally {
      await utils.release();
    }

    let started = false;
    let observedSignal: AbortSignal | undefined;
    const runner: QueueRunner = await createGraphileQueueStarter(
      async (_job, signal) => {
        started = true;
        observedSignal = signal;
        await new Promise<void>(() => undefined);
      },
    )(workerConfiguration({ PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS: '30' }));
    await waitFor(() => expect(started).toBe(true));
    await runner.stop('integration shutdown test');
    await runner.promise;

    expect(observedSignal?.aborted).toBe(true);
    await waitFor(async () => {
      expect(await readJob(key)).toMatchObject({
        attempts: 1,
        key,
        locked_at: null,
        max_attempts: 2,
      });
    });
  });
});

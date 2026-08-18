import {
  AnalysisReportSchema,
  AnalyzeDeckJobPayloadSchema,
  CardDataSnapshotSchema,
  DeckRevisionSchema,
  FindingSchema,
  SourceProvenanceSchema,
  type AnalysisProgressEvent,
  type DeckRevision,
} from '@podgauge/contracts';
import { databaseRoleNames, type DatabaseRole } from '@podgauge/config';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PodGaugeRepository } from './repository.js';
import {
  applyRuntimeGrants,
  databaseUrlForRole,
  installDatabaseRoles,
} from './roles.js';
import {
  analyses,
  analysisEvents,
  analysisFindings,
  cardDataSnapshots,
  decks,
  pods,
  sessions,
  sourceProvenance,
  sourceSyncRuns,
  users,
} from './schema.js';
import * as schema from './schema.js';

const databaseDescribe =
  process.env.PODGAUGE_RUN_DB_INTEGRATION === '1' ? describe : describe.skip;
const postgresImage =
  'postgres:18.4@sha256:f7ce845ee6873dd84be93c9828fe0d1fab0f9707dc9ac569694657398b290bce';
const testAdminPassword = 'podgauge-test-admin-only';
const testRolePasswords = {
  backup: 'podgauge-test-backup-only',
  migration: 'podgauge-test-migration-only',
  web: 'podgauge-test-web-only-value',
  worker: 'podgauge-test-worker-only',
} as const satisfies Record<DatabaseRole, string>;
const timestamp = '2026-08-17T12:00:00.000Z';
const hash = (digit: string) => digit.repeat(64);
const canonicalId = (prefix: string) => `${prefix}_${randomUUID()}`;

function collectIndexNames(value: unknown, names = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectIndexNames(entry, names);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'Index Name' && typeof entry === 'string') names.add(entry);
      collectIndexNames(entry, names);
    }
  }
  return names;
}

const deckCases = JSON.parse(
  await readFile(
    new URL(
      '../../../data/fixtures/contracts/deck-cases.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  cases: Array<{
    caseId: string;
    normalizedDeck: DeckRevision['normalizedDeck'];
    parsedEntries: DeckRevision['parsedEntries'];
    rawInput: DeckRevision['rawInput'];
  }>;
};
const legalDeckCaseCandidate = deckCases.cases.find(
  (candidate) => candidate.caseId === 'legal-synthetic',
);
if (!legalDeckCaseCandidate) {
  throw new Error('Legal synthetic deck fixture is missing');
}
const legalDeckCase = legalDeckCaseCandidate;

const reportFixture = AnalysisReportSchema.parse(
  JSON.parse(
    await readFile(
      new URL(
        '../../../data/fixtures/contracts/report-v0.1.0.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);

type Scenario = ReturnType<typeof createScenario>;
type Repositories = Readonly<{
  web: PodGaugeRepository;
  worker: PodGaugeRepository;
}>;

function createScenario() {
  const scenarioNonce = randomUUID();
  const scenarioHash = (label: string) =>
    createHash('sha256').update(`${scenarioNonce}:${label}`).digest('hex');
  const provenanceId = canonicalId('provenance');
  const snapshotId = canonicalId('card-data');
  const policyVersionId = canonicalId('policy');
  const engineVersionId = canonicalId('engine');
  const benchmarkVersionId = canonicalId('benchmark');
  const simulationVersionId = canonicalId('simulation');
  const reportSchemaVersionId = canonicalId('report-schema');
  const deckId = canonicalId('deck');
  const revisionId = canonicalId('revision');
  const analysisId = canonicalId('analysis');
  const owner = { guestId: randomUUID(), kind: 'guest' as const };

  const versions = {
    benchmark: { benchmarkVersionId, version: '0.1.0' },
    cardData: { snapshotId, version: '0.1.0' },
    engine: { engineVersionId, version: '0.1.0' },
    policy: { policyVersionId, version: '0.1.0' },
    reportSchema: { reportSchemaVersionId, version: '0.1.0' },
    simulation: { simulationVersionId, version: '0.1.0' },
  } as const;
  const revision = DeckRevisionSchema.parse({
    contentHash: scenarioHash('deck-revision'),
    createdAt: timestamp,
    deckId,
    normalizedDeck: legalDeckCase.normalizedDeck,
    ordinal: 1,
    parentRevisionId: null,
    parsedEntries: legalDeckCase.parsedEntries,
    rawInput: legalDeckCase.rawInput,
    revisionId,
  });
  const payload = AnalyzeDeckJobPayloadSchema.parse({
    analysisId,
    context: { seed: 'phase3-integration-seed', versions },
    deckRevisionId: revisionId,
    idempotencyKey: `analysis-${randomUUID()}`,
    jobId: canonicalId('job'),
    jobKind: 'analyze-deck',
    options: {
      evidenceDetail: 'full',
      simulation: { mode: 'disabled' },
    },
    payloadVersion: '0.1.0',
    requestedAt: timestamp,
    retry: {
      attempt: 1,
      maxAttempts: 3,
      nextAttemptAt: null,
      previousFailureCode: null,
    },
  });

  return {
    deck: {
      createdAt: timestamp,
      deckId,
      format: 'commander',
      title: 'Phase 3 synthetic deck',
      visibility: 'private',
    },
    owner,
    payload,
    revision,
    versionSet: {
      benchmark: {
        benchmarkVersionId,
        contentHash: scenarioHash('benchmark'),
        version: '0.1.0',
      },
      cardData: {
        contentHash: scenarioHash('card-data'),
        retrievedAt: timestamp,
        snapshotId,
        sourceProvenanceIds: [provenanceId],
        version: '0.1.0',
      },
      engine: {
        artifactHash: scenarioHash('engine'),
        engineVersionId,
        version: '0.1.0',
      },
      policy: {
        contentHash: scenarioHash('policy'),
        effectiveDate: '2026-08-17',
        policyVersionId,
        publishedAt: timestamp,
        sourceProvenanceIds: [provenanceId],
        version: '0.1.0',
      },
      provenance: [
        {
          authoredAt: timestamp,
          contentHash: scenarioHash('provenance'),
          fixtureId: `fixture.database.${randomUUID()}`,
          provenanceId,
          sourceKind: 'synthetic',
        },
      ],
      reportSchema: {
        artifactHash: scenarioHash('report-schema'),
        reportSchemaVersionId,
        version: '0.1.0',
      },
      simulation: {
        artifactHash: scenarioHash('simulation'),
        simulationVersionId,
        version: '0.1.0',
      },
    },
  } as const;
}

function queuedEvent(scenario: Scenario, sequence = 0): AnalysisProgressEvent {
  return {
    analysisId: scenario.payload.analysisId,
    eventId: canonicalId('event') as AnalysisProgressEvent['eventId'],
    occurredAt: timestamp,
    sequence,
    state: 'queued',
  };
}

async function insertScenario(
  repositories: Repositories,
  scenario: Scenario,
  includeAnalysis = true,
) {
  await repositories.worker.insertVersionSet(scenario.versionSet);
  await repositories.web.insertOwnedDeckRevision({
    deck: scenario.deck,
    owner: scenario.owner,
    revision: scenario.revision,
  });
  if (includeAnalysis) {
    await repositories.web.createAnalysisFromJob({
      owner: scenario.owner,
      payload: scenario.payload,
    });
  }
}

databaseDescribe('Phase 3 PostgreSQL schema and constraints', () => {
  let adminSql: Sql;
  let databaseSql: Sql;
  let webDatabaseSql: Sql;
  let workerDatabaseSql: Sql;
  let database: PostgresJsDatabase<typeof schema>;
  let repositories: Repositories;
  let container: StartedPostgreSqlContainer;
  let adminDatabaseUrl: string;
  let firstMigrationTableNames: string[];

  const roleUrl = (role: DatabaseRole) =>
    databaseUrlForRole(adminDatabaseUrl, role, testRolePasswords[role]);

  const connectAs = (role: DatabaseRole) => postgres(roleUrl(role), { max: 1 });

  beforeAll(async () => {
    container = await new PostgreSqlContainer(postgresImage)
      .withDatabase('podgauge')
      .withUsername('podgauge_test_admin')
      .withPassword(testAdminPassword)
      .start();
    adminDatabaseUrl = container.getConnectionUri();

    const bootstrapEnvironment = {
      NODE_ENV: 'test',
      PODGAUGE_BACKUP_DATABASE_PASSWORD: testRolePasswords.backup,
      PODGAUGE_MIGRATION_DATABASE_PASSWORD: testRolePasswords.migration,
      PODGAUGE_ROLE_BOOTSTRAP_DATABASE_URL: adminDatabaseUrl,
      PODGAUGE_WEB_DATABASE_PASSWORD: testRolePasswords.web,
      PODGAUGE_WORKER_DATABASE_PASSWORD: testRolePasswords.worker,
    } as const;
    await installDatabaseRoles(bootstrapEnvironment);

    adminSql = postgres(adminDatabaseUrl, { max: 1 });
    databaseSql = postgres(roleUrl('migration'), { max: 1 });
    database = drizzle(databaseSql, { schema });
    const migrationsDirectory = fileURLToPath(
      new URL('../migrations', import.meta.url),
    );
    const temporaryMigrations = await mkdtemp(
      join(tmpdir(), 'podgauge-forward-migrations-'),
    );
    await mkdir(join(temporaryMigrations, 'meta'));
    const journal = JSON.parse(
      await readFile(join(migrationsDirectory, 'meta/_journal.json'), 'utf8'),
    ) as { entries: Array<Record<string, unknown>> };
    const firstEntry = journal.entries[0];
    if (!firstEntry || typeof firstEntry.tag !== 'string') {
      throw new Error('The first reviewed migration journal entry is missing');
    }
    await writeFile(
      join(temporaryMigrations, 'meta/_journal.json'),
      `${JSON.stringify({ ...journal, entries: [firstEntry] }, null, 2)}\n`,
    );
    await writeFile(
      join(temporaryMigrations, `${firstEntry.tag}.sql`),
      await readFile(join(migrationsDirectory, `${firstEntry.tag}.sql`)),
    );

    try {
      await migrate(database, { migrationsFolder: temporaryMigrations });
      firstMigrationTableNames = (
        await databaseSql<{ table_name: string }[]>`
          select table_name
          from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'
          order by table_name
        `
      ).map((row) => row.table_name);
      await migrate(database, { migrationsFolder: migrationsDirectory });
    } finally {
      await rm(temporaryMigrations, { force: true, recursive: true });
    }
    await applyRuntimeGrants(databaseSql);

    // Exercise the documented existing-volume repair path after objects exist.
    await installDatabaseRoles(bootstrapEnvironment);
    await applyRuntimeGrants(databaseSql);
    webDatabaseSql = postgres(roleUrl('web'), { max: 8 });
    workerDatabaseSql = postgres(roleUrl('worker'), { max: 8 });
    repositories = {
      web: new PodGaugeRepository(drizzle(webDatabaseSql, { schema })),
      worker: new PodGaugeRepository(drizzle(workerDatabaseSql, { schema })),
    };
  }, 120_000);

  afterAll(async () => {
    await databaseSql?.end();
    await webDatabaseSql?.end();
    await workerDatabaseSql?.end();
    await adminSql?.end();
    await container?.stop();
  });

  it('applies a clean migration with every durable core table', async () => {
    const tables = await databaseSql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;

    expect(tables.map((row) => row.table_name)).toEqual([
      'analyses',
      'analysis_artifacts',
      'analysis_events',
      'analysis_findings',
      'audit_events',
      'benchmark_versions',
      'card_data_snapshot_provenance',
      'card_data_snapshots',
      'deck_revisions',
      'decks',
      'engine_versions',
      'pod_members',
      'pods',
      'policy_version_provenance',
      'policy_versions',
      'report_schema_versions',
      'sessions',
      'simulation_versions',
      'source_provenance',
      'source_sync_runs',
      'system_metadata',
      'users',
    ]);
    expect(firstMigrationTableNames).toEqual(['system_metadata']);

    const migrations = await databaseSql<{ count: number }[]>`
      select count(*)::integer as count from drizzle.__drizzle_migrations
    `;
    expect(migrations[0]?.count).toBe(2);
  });

  it('keeps every application login non-elevated and membership-free', async () => {
    const roleNames = Object.values(databaseRoleNames);
    const roles = await adminSql<
      Array<{
        rolbypassrls: boolean;
        rolcanlogin: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolinherit: boolean;
        rolname: string;
        rolreplication: boolean;
        rolsuper: boolean;
      }>
    >`
      select
        rolname,
        rolcanlogin,
        rolsuper,
        rolcreatedb,
        rolcreaterole,
        rolinherit,
        rolreplication,
        rolbypassrls
      from pg_roles
      where rolname = any(${roleNames})
      order by rolname
    `;

    expect(roles.map((role) => role.rolname)).toEqual([...roleNames].sort());
    for (const role of roles) {
      expect(role).toMatchObject({
        rolbypassrls: false,
        rolcanlogin: true,
        rolcreatedb: false,
        rolcreaterole: false,
        rolinherit: false,
        rolreplication: false,
        rolsuper: false,
      });
    }

    const memberships = await adminSql<{ count: number }[]>`
      select count(*)::integer as count
      from pg_auth_members
      where member in (select oid from pg_roles where rolname = any(${roleNames}))
    `;
    expect(memberships[0]?.count).toBe(0);
  });

  it('allows representative web, worker, migration, and backup operations', async () => {
    const webSql = connectAs('web');
    const workerSql = connectAs('worker');
    const backupSql = connectAs('backup');
    try {
      const [webUser] = await webSql<{ user_id: string }[]>`
        insert into users (email)
        values (${`${randomUUID()}@example.invalid`})
        returning user_id
      `;
      const deckId = canonicalId('deck');
      await webSql`
        insert into decks (deck_id, owner_user_id, title)
        values (${deckId}, ${webUser!.user_id}, 'Role boundary deck')
      `;

      const sourceSyncKey = `source-sync-${randomUUID()}`;
      await workerSql`
        insert into source_sync_runs (source_name, idempotency_key, summary)
        values ('development-fixture', ${sourceSyncKey}, '{}'::jsonb)
      `;
      const workerRows = await workerSql<{ count: number }[]>`
        select count(*)::integer as count from source_sync_runs
        where idempotency_key = ${sourceSyncKey}
      `;
      expect(workerRows[0]?.count).toBe(1);

      const backupRows = await backupSql<{ count: number }[]>`
        select count(*)::integer as count from decks where deck_id = ${deckId}
      `;
      expect(backupRows[0]?.count).toBe(1);

      await databaseSql`create schema role_migration_probe`;
      await databaseSql`
        create table role_migration_probe.probe (id integer primary key)
      `;
      await databaseSql`
        create function role_migration_probe.answer() returns integer
        language sql immutable as 'select 42'
      `;
      const [answer] = await databaseSql<{ answer: number }[]>`
        select role_migration_probe.answer() as answer
      `;
      expect(answer?.answer).toBe(42);
    } finally {
      await databaseSql`drop schema if exists role_migration_probe cascade`;
      await webSql.end();
      await workerSql.end();
      await backupSql.end();
    }
  });

  it('denies runtime DDL and keeps the backup login read-only', async () => {
    for (const role of ['web', 'worker', 'backup'] as const) {
      const runtimeSql = connectAs(role);
      try {
        await expect(
          runtimeSql.unsafe(`create schema ${role}_forbidden_schema`),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe(
            `create table public.${role}_forbidden_table (id integer)`,
          ),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe(
            `create function public.${role}_forbidden_function() returns integer language sql as 'select 1'`,
          ),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe('create extension pg_trgm'),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe(`create role ${role}_forbidden_role`),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe(
            'alter table public.system_metadata add column forbidden integer',
          ),
        ).rejects.toMatchObject({ code: '42501' });
        await expect(
          runtimeSql.unsafe('drop table public.system_metadata'),
        ).rejects.toMatchObject({ code: '42501' });
      } finally {
        await runtimeSql.end();
      }
    }

    const backupSql = connectAs('backup');
    try {
      await expect(
        backupSql`
          insert into system_metadata (key, value)
          values ('forbidden-backup-write', 'no')
        `,
      ).rejects.toMatchObject({ code: '42501' });
      await expect(
        backupSql`
          update system_metadata set value = 'no'
          where key = 'forbidden-backup-write'
        `,
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await backupSql.end();
    }
  });

  it('validates serialized contracts before persisting representative records', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario);
    await repositories.worker.appendAnalysisEvent(queuedEvent(scenario));

    const [stored] = await databaseSql<
      { analysis_id: string; sequence: number; visibility: string }[]
    >`
      select a.analysis_id, e.sequence::integer as sequence, a.visibility
      from analyses a
      join analysis_events e using (analysis_id)
      where a.analysis_id = ${scenario.payload.analysisId}
    `;
    expect(stored).toEqual({
      analysis_id: scenario.payload.analysisId,
      sequence: 0,
      visibility: 'private',
    });

    await expect(
      repositories.web.createAnalysisFromJob({}),
    ).rejects.toMatchObject({ name: 'ZodError' });
  });

  it('enforces ownership, complete version references, and concurrent idempotency', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario, false);

    await expect(
      repositories.web.createAnalysisFromJob({
        owner: { guestId: randomUUID(), kind: 'guest' },
        payload: scenario.payload,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const missingVersionPayload = AnalyzeDeckJobPayloadSchema.parse({
      ...scenario.payload,
      analysisId: canonicalId('analysis'),
      context: {
        ...scenario.payload.context,
        versions: {
          ...scenario.payload.context.versions,
          engine: {
            ...scenario.payload.context.versions.engine,
            engineVersionId: canonicalId('engine'),
          },
        },
      },
      jobId: canonicalId('job'),
    });
    await expect(
      repositories.web.createAnalysisFromJob({
        owner: scenario.owner,
        payload: missingVersionPayload,
      }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });

    const first = scenario.payload;
    const second = AnalyzeDeckJobPayloadSchema.parse({
      ...scenario.payload,
      analysisId: canonicalId('analysis'),
      jobId: canonicalId('job'),
    });
    const attempts = await Promise.allSettled([
      repositories.web.createAnalysisFromJob({
        owner: scenario.owner,
        payload: first,
      }),
      repositories.web.createAnalysisFromJob({
        owner: scenario.owner,
        payload: second,
      }),
    ]);

    expect(attempts.map((attempt) => attempt.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    const rejectedAttempt = attempts.find(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );
    expect(rejectedAttempt?.reason).toMatchObject({
      cause: { code: '23505' },
    });
    const countRows = await databaseSql<{ count: number }[]>`
      select count(*)::integer as count
      from analyses
      where owner_guest_id = ${scenario.owner.guestId}
        and idempotency_key = ${scenario.payload.idempotencyKey}
    `;
    expect(countRows[0]?.count).toBe(1);
  });

  it('enforces monotonic events, valid transitions, and immutable completed reports', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario);
    const initialEvent = queuedEvent(scenario);
    await repositories.worker.appendAnalysisEvent(initialEvent);

    await expect(
      database.update(analyses).set({ state: 'retrying' }).where(
        // This intentionally bypasses the repository to prove the database guard.
        eq(analyses.analysisId, scenario.payload.analysisId),
      ),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const skippedEvent = queuedEvent(scenario, 2);
    await expect(
      repositories.worker.appendAnalysisEvent(skippedEvent),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await databaseSql`
      update analyses set state = 'running'
      where analysis_id = ${scenario.payload.analysisId}
    `;
    const runningEvent: AnalysisProgressEvent = {
      analysisId: scenario.payload.analysisId,
      eventId: canonicalId('event') as AnalysisProgressEvent['eventId'],
      occurredAt: timestamp,
      sequence: 1,
      stage: 'analyzing',
      state: 'running',
    };
    await repositories.worker.appendAnalysisEvent(runningEvent);
    await expect(
      databaseSql`
        update analysis_events set state = 'retrying'
        where event_id = ${runningEvent.eventId}
      `,
    ).rejects.toMatchObject({ code: '55000' });

    const report = AnalysisReportSchema.parse({
      ...reportFixture,
      analysisId: scenario.payload.analysisId,
      context: scenario.payload.context,
      deckRevisionId: scenario.payload.deckRevisionId,
      options: scenario.payload.options,
      reportId: canonicalId('report'),
    });
    const reportHash = hash('9');
    const completeEvent: AnalysisProgressEvent = {
      analysisId: scenario.payload.analysisId,
      eventId: canonicalId('event') as AnalysisProgressEvent['eventId'],
      occurredAt: timestamp,
      reportHash: reportHash as Extract<
        AnalysisProgressEvent,
        { state: 'completed' }
      >['reportHash'],
      reportId: report.reportId,
      sequence: 2,
      state: 'completed',
    };
    await repositories.worker.appendAnalysisEvent(completeEvent);
    const mismatchedReport = AnalysisReportSchema.parse({
      ...report,
      context: {
        ...report.context,
        versions: {
          ...report.context.versions,
          engine: {
            ...report.context.versions.engine,
            engineVersionId: canonicalId('engine'),
          },
        },
      },
    });
    await expect(
      repositories.worker.completeAnalysis(mismatchedReport, reportHash),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
    await repositories.worker.completeAnalysis(report, reportHash);

    await expect(
      databaseSql`
        update analyses set report_hash = ${hash('a')}
        where analysis_id = ${scenario.payload.analysisId}
      `,
    ).rejects.toMatchObject({ code: '55000' });
    await expect(
      database.insert(analysisFindings).values(
        (() => {
          const finding = FindingSchema.parse({
            ...report.findings[0]!,
            findingId: canonicalId('finding'),
          });
          return {
            analysisId: scenario.payload.analysisId,
            document: finding,
            findingId: finding.findingId,
            outcome: finding.outcome,
            reasonCode: finding.reasonCode,
            severity: finding.severity,
          };
        })(),
      ),
    ).rejects.toMatchObject({ cause: { code: '55000' } });

    await databaseSql`
      update analyses
      set visibility = 'unlisted', shared_at = now()
      where analysis_id = ${scenario.payload.analysisId}
    `;
    const [completed] = await databaseSql<
      { report_hash: string; state: string; visibility: string }[]
    >`
      select report_hash, state, visibility from analyses
      where analysis_id = ${scenario.payload.analysisId}
    `;
    expect(completed).toEqual({
      report_hash: reportHash,
      state: 'completed',
      visibility: 'unlisted',
    });
  });

  it('rejects mutable revisions, incomplete provenance, and invalid pod/source/session states', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario, false);

    await expect(
      databaseSql`
        update deck_revisions set content_hash = ${hash('a')}
        where revision_id = ${scenario.revision.revisionId}
      `,
    ).rejects.toMatchObject({ code: '55000' });

    const skippedRevision = DeckRevisionSchema.parse({
      ...scenario.revision,
      contentHash: hash('e'),
      ordinal: 3,
      parentRevisionId: scenario.revision.revisionId,
      revisionId: canonicalId('revision'),
    });
    await expect(
      database.insert(schema.deckRevisions).values({
        contentHash: skippedRevision.contentHash,
        createdAt: new Date(skippedRevision.createdAt),
        deckId: skippedRevision.deckId,
        document: skippedRevision,
        ordinal: skippedRevision.ordinal,
        parentRevisionId: skippedRevision.parentRevisionId,
        revisionId: skippedRevision.revisionId,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const orphanSnapshotId = canonicalId('card-data');
    const orphanProvenanceId = canonicalId('provenance');
    const orphanProvenance = SourceProvenanceSchema.parse({
      authoredAt: timestamp,
      contentHash: hash('b'),
      fixtureId: `fixture.database.${randomUUID()}`,
      provenanceId: orphanProvenanceId,
      sourceKind: 'synthetic',
    });
    await database.insert(sourceProvenance).values({
      contentHash: orphanProvenance.contentHash,
      document: orphanProvenance,
      provenanceId: orphanProvenanceId,
      sourceKind: orphanProvenance.sourceKind,
    });
    await expect(
      database.transaction(async (transaction) => {
        const snapshot = CardDataSnapshotSchema.parse({
          contentHash: hash('c'),
          retrievedAt: timestamp,
          snapshotId: orphanSnapshotId,
          sourceProvenanceIds: [orphanProvenanceId],
          version: '0.2.0',
        });
        await transaction.insert(cardDataSnapshots).values({
          contentHash: snapshot.contentHash,
          document: snapshot,
          retrievedAt: new Date(timestamp),
          semanticVersion: snapshot.version,
          snapshotId: snapshot.snapshotId,
        });
      }),
    ).rejects.toMatchObject({ code: '23514' });
    const orphanSnapshots = await databaseSql<{ count: number }[]>`
      select count(*)::integer as count from card_data_snapshots
      where snapshot_id = ${orphanSnapshotId}
    `;
    expect(orphanSnapshots[0]?.count).toBe(0);

    await database.insert(pods).values({
      idempotencyKey: `pod-${randomUUID()}`,
      ownerGuestId: scenario.owner.guestId,
      podId: canonicalId('pod'),
    });
    const [pod] = await databaseSql<{ pod_id: string }[]>`
      select pod_id from pods where owner_guest_id = ${scenario.owner.guestId}
    `;
    await expect(
      databaseSql`update pods set state = 'ready' where pod_id = ${pod!.pod_id}`,
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      database.insert(sourceSyncRuns).values({
        idempotencyKey: `source-sync-${randomUUID()}`,
        sourceName: 'development-fixture',
        startedAt: new Date(timestamp),
        state: 'running',
        summary: {},
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const [user] = await database
      .insert(users)
      .values({ email: `${randomUUID()}@example.invalid` })
      .returning({ userId: users.userId });
    const [session] = await database
      .insert(sessions)
      .values({
        expiresAt: new Date('2027-08-17T12:00:00.000Z'),
        tokenHash: hash('d'),
        userId: user!.userId,
      })
      .returning({ sessionId: sessions.sessionId });
    await databaseSql`
      update sessions set state = 'revoked', revoked_at = now()
      where session_id = ${session!.sessionId}
    `;
    await expect(
      databaseSql`
        update sessions set state = 'active', revoked_at = null
        where session_id = ${session!.sessionId}
      `,
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      database.insert(decks).values({
        deckId: canonicalId('deck'),
        title: 'Ownerless deck',
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });

  it('keeps event ordering bounded at the database boundary', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario);
    const event = queuedEvent(scenario);

    await expect(
      database.insert(analysisEvents).values({
        analysisId: scenario.payload.analysisId,
        document: { ...event, sequence: Number.MAX_SAFE_INTEGER + 1 },
        eventId: event.eventId,
        occurredAt: new Date(event.occurredAt),
        sequence: Number.MAX_SAFE_INTEGER + 1,
        state: event.state,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });

  it('serializes concurrent event writers without duplicate or skipped sequences', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario);
    await repositories.worker.appendAnalysisEvent(queuedEvent(scenario));

    const attempts = await Promise.allSettled([
      repositories.worker.appendAnalysisEvent(queuedEvent(scenario, 1)),
      repositories.worker.appendAnalysisEvent(queuedEvent(scenario, 1)),
    ]);
    expect(attempts.map((attempt) => attempt.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    const rejectedAttempt = attempts.find(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );
    expect(rejectedAttempt?.reason).toMatchObject({
      cause: { code: '23514' },
    });
    const sequences = await databaseSql<{ sequence: number }[]>`
      select sequence::integer as sequence from analysis_events
      where analysis_id = ${scenario.payload.analysisId}
      order by sequence
    `;
    expect(sequences).toEqual([{ sequence: 0 }, { sequence: 1 }]);
  });

  it('uses the intended indexes for idempotency and reconnect access paths', async () => {
    const scenario = createScenario();
    await insertScenario(repositories, scenario);
    await repositories.worker.appendAnalysisEvent(queuedEvent(scenario));
    await Promise.all(
      Array.from({ length: 24 }, async () => {
        const payload = AnalyzeDeckJobPayloadSchema.parse({
          ...scenario.payload,
          analysisId: canonicalId('analysis'),
          idempotencyKey: `analysis-${randomUUID()}`,
          jobId: canonicalId('job'),
        });
        await repositories.web.createAnalysisFromJob({
          owner: scenario.owner,
          payload,
        });
      }),
    );
    await databaseSql`analyze analyses`;
    await databaseSql`analyze analysis_events`;

    const plans = await databaseSql.begin(async (transaction) => {
      await transaction`set local enable_seqscan = off`;
      const idempotencyPlan = await transaction`
        explain (format json, costs off)
        select analysis_id from analyses
        where owner_guest_id = ${scenario.owner.guestId}
          and idempotency_key = ${scenario.payload.idempotencyKey}
      `;
      const reconnectPlan = await transaction`
        explain (format json, costs off)
        select event_id, sequence from analysis_events
        where analysis_id = ${scenario.payload.analysisId} and sequence >= 0
        order by sequence
        limit 100
      `;
      return { idempotencyPlan, reconnectPlan };
    });

    expect([...collectIndexNames(plans.idempotencyPlan)]).toContain(
      'analyses_guest_idempotency_unique',
    );
    expect([...collectIndexNames(plans.reconnectPlan)]).toContain(
      'analysis_events_reconnect_index',
    );
  });
});

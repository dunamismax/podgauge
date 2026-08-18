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
import { readTestConfiguration } from '@podgauge/config';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PodGaugeRepository } from './repository.js';
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

const testConfiguration = readTestConfiguration(process.env);
const databaseDescribe = testConfiguration.runDatabaseIntegration
  ? describe
  : describe.skip;
const timestamp = '2026-08-17T12:00:00.000Z';
const hash = (digit: string) => digit.repeat(64);
const canonicalId = (prefix: string) => `${prefix}_${randomUUID()}`;

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
  repository: PodGaugeRepository,
  scenario: Scenario,
  includeAnalysis = true,
) {
  await repository.insertVersionSet(scenario.versionSet);
  await repository.insertOwnedDeckRevision({
    deck: scenario.deck,
    owner: scenario.owner,
    revision: scenario.revision,
  });
  if (includeAnalysis) {
    await repository.createAnalysisFromJob({
      owner: scenario.owner,
      payload: scenario.payload,
    });
  }
}

databaseDescribe('Phase 3 PostgreSQL schema and constraints', () => {
  let adminSql: Sql;
  let databaseSql: Sql;
  let database: PostgresJsDatabase<typeof schema>;
  let repository: PodGaugeRepository;
  let databaseName: string;

  beforeAll(async () => {
    databaseName = `podgauge_test_${randomUUID().replaceAll('-', '')}`;
    const adminUrl = new URL(testConfiguration.databaseUrl.reveal());
    adminUrl.pathname = '/postgres';
    adminSql = postgres(adminUrl.href, { max: 1 });
    await adminSql`create database ${adminSql(databaseName)}`;

    const databaseUrl = new URL(testConfiguration.databaseUrl.reveal());
    databaseUrl.pathname = `/${databaseName}`;
    databaseSql = postgres(databaseUrl.href, { max: 8 });
    database = drizzle(databaseSql, { schema });
    await migrate(database, {
      migrationsFolder: fileURLToPath(
        new URL('../migrations', import.meta.url),
      ),
    });
    repository = new PodGaugeRepository(database);
  }, 30_000);

  afterAll(async () => {
    await databaseSql.end();
    await adminSql`drop database ${adminSql(databaseName)} with (force)`;
    await adminSql.end();
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
  });

  it('validates serialized contracts before persisting representative records', async () => {
    const scenario = createScenario();
    await insertScenario(repository, scenario);
    await repository.appendAnalysisEvent(queuedEvent(scenario));

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

    await expect(repository.createAnalysisFromJob({})).rejects.toMatchObject({
      name: 'ZodError',
    });
  });

  it('enforces ownership, complete version references, and concurrent idempotency', async () => {
    const scenario = createScenario();
    await insertScenario(repository, scenario, false);

    await expect(
      repository.createAnalysisFromJob({
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
      repository.createAnalysisFromJob({
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
      repository.createAnalysisFromJob({
        owner: scenario.owner,
        payload: first,
      }),
      repository.createAnalysisFromJob({
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
    await insertScenario(repository, scenario);
    const initialEvent = queuedEvent(scenario);
    await repository.appendAnalysisEvent(initialEvent);

    await expect(
      database.update(analyses).set({ state: 'retrying' }).where(
        // This intentionally bypasses the repository to prove the database guard.
        eq(analyses.analysisId, scenario.payload.analysisId),
      ),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const skippedEvent = queuedEvent(scenario, 2);
    await expect(
      repository.appendAnalysisEvent(skippedEvent),
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
    await repository.appendAnalysisEvent(runningEvent);
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
    await repository.appendAnalysisEvent(completeEvent);
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
      repository.completeAnalysis(mismatchedReport, reportHash),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
    await repository.completeAnalysis(report, reportHash);

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
    await insertScenario(repository, scenario, false);

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
    await insertScenario(repository, scenario);
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
    await insertScenario(repository, scenario);
    await repository.appendAnalysisEvent(queuedEvent(scenario));

    const attempts = await Promise.allSettled([
      repository.appendAnalysisEvent(queuedEvent(scenario, 1)),
      repository.appendAnalysisEvent(queuedEvent(scenario, 1)),
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
});

import type {
  AnalysisOptions,
  AnalysisProgressEvent,
  AnalysisReport,
  DeckRevision,
  Finding,
  SourceProvenance,
} from '@podgauge/contracts';
import {
  BenchmarkVersionRecordSchema,
  CardDataSnapshotSchema,
  EngineVersionRecordSchema,
  PolicyVersionRecordSchema,
  ReportSchemaVersionRecordSchema,
  SimulationVersionRecordSchema,
} from '@podgauge/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { z } from 'zod';

type CardDataSnapshot = z.infer<typeof CardDataSnapshotSchema>;
type PolicyVersionRecord = z.infer<typeof PolicyVersionRecordSchema>;
type EngineVersionRecord = z.infer<typeof EngineVersionRecordSchema>;
type BenchmarkVersionRecord = z.infer<typeof BenchmarkVersionRecordSchema>;
type SimulationVersionRecord = z.infer<typeof SimulationVersionRecordSchema>;
type ReportSchemaVersionRecord = z.infer<
  typeof ReportSchemaVersionRecordSchema
>;

const canonicalUuidPattern =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const sha256Pattern = '^[0-9a-f]{64}$';
const semanticVersionPattern =
  '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?(\\+[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?$';
const sha256SqlPattern = sql.raw(`'${sha256Pattern}'`);
const semanticVersionSqlPattern = sql.raw(`'${semanticVersionPattern}'`);
const canonicalIdSqlPattern = (prefix: string) =>
  sql.raw(`'^${prefix}_${canonicalUuidPattern}$'`);

const createdAt = () =>
  timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow();

export const systemMetadata = pgTable('system_metadata', {
  key: text().primaryKey(),
  updatedAt: updatedAt(),
  value: text().notNull(),
});

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    email: text().notNull(),
    status: text().notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
    check(
      'users_email_bounded_check',
      sql`length(${table.email}) between 3 and 320 and position('@' in ${table.email}) > 1`,
    ),
    check(
      'users_status_check',
      sql`${table.status} in ('active', 'disabled', 'deleted')`,
    ),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    sessionId: uuid('session_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    state: text().notNull().default('active'),
    expiresAt: timestamp('expires_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp('revoked_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_state_index').on(table.userId, table.state),
    check(
      'sessions_token_hash_check',
      sql`${table.tokenHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'sessions_state_check',
      sql`${table.state} in ('active', 'revoked', 'expired')`,
    ),
    check(
      'sessions_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      'sessions_revocation_check',
      sql`(${table.state} = 'revoked') = (${table.revokedAt} is not null)`,
    ),
  ],
);

export const sourceProvenance = pgTable(
  'source_provenance',
  {
    provenanceId: text('provenance_id').primaryKey(),
    sourceKind: text('source_kind').notNull(),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    document: jsonb().$type<SourceProvenance>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'source_provenance_id_check',
      sql`${table.provenanceId} ~ ${canonicalIdSqlPattern('provenance')}`,
    ),
    check(
      'source_provenance_kind_check',
      sql`${table.sourceKind} in ('synthetic', 'user-input', 'external')`,
    ),
    check(
      'source_provenance_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'source_provenance_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'provenanceId' = ${table.provenanceId}
          and ${table.document}->>'sourceKind' = ${table.sourceKind}
          and ${table.document}->>'contentHash' = ${table.contentHash}`,
    ),
  ],
);

export const sourceSyncRuns = pgTable(
  'source_sync_runs',
  {
    sourceSyncRunId: uuid('source_sync_run_id').primaryKey().defaultRandom(),
    sourceName: text('source_name').notNull(),
    state: text().notNull().default('queued'),
    idempotencyKey: text('idempotency_key').notNull(),
    provenanceId: text('provenance_id').references(
      () => sourceProvenance.provenanceId,
    ),
    failureCode: text('failure_code'),
    requestedAt: timestamp('requested_at', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('started_at', {
      mode: 'date',
      withTimezone: true,
    }),
    completedAt: timestamp('completed_at', {
      mode: 'date',
      withTimezone: true,
    }),
    summary: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
  },
  (table) => [
    unique('source_sync_runs_source_idempotency_unique').on(
      table.sourceName,
      table.idempotencyKey,
    ),
    check(
      'source_sync_runs_source_check',
      sql`${table.sourceName} in ('scryfall', 'wizards-policy', 'commander-spellbook', 'topdeck', 'development-fixture')`,
    ),
    check(
      'source_sync_runs_state_check',
      sql`${table.state} in ('queued', 'running', 'validating', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      'source_sync_runs_idempotency_check',
      sql`length(${table.idempotencyKey}) between 16 and 128
          and ${table.idempotencyKey} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'`,
    ),
    check(
      'source_sync_runs_timestamps_check',
      sql`(${table.state} = 'queued' and ${table.startedAt} is null and ${table.completedAt} is null)
          or (${table.state} in ('running', 'validating') and ${table.startedAt} is not null and ${table.completedAt} is null)
          or (${table.state} in ('completed', 'failed', 'cancelled') and ${table.startedAt} is not null and ${table.completedAt} is not null)`,
    ),
    check(
      'source_sync_runs_outcome_check',
      sql`(${table.state} = 'completed' and ${table.provenanceId} is not null and ${table.failureCode} is null)
          or (${table.state} = 'failed' and ${table.provenanceId} is null and ${table.failureCode} is not null)
          or (${table.state} not in ('completed', 'failed') and ${table.provenanceId} is null and ${table.failureCode} is null)`,
    ),
  ],
);

export const cardDataSnapshots = pgTable(
  'card_data_snapshots',
  {
    snapshotId: text('snapshot_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    retrievedAt: timestamp('retrieved_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    document: jsonb().$type<CardDataSnapshot>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('card_data_snapshots_version_hash_unique').on(
      table.semanticVersion,
      table.contentHash,
    ),
    check(
      'card_data_snapshots_id_check',
      sql`${table.snapshotId} ~ ${canonicalIdSqlPattern('card-data')}`,
    ),
    check(
      'card_data_snapshots_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'card_data_snapshots_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'card_data_snapshots_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'snapshotId' = ${table.snapshotId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'contentHash' = ${table.contentHash}`,
    ),
  ],
);

export const policyVersions = pgTable(
  'policy_versions',
  {
    policyVersionId: text('policy_version_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    effectiveDate: date('effective_date', { mode: 'string' }).notNull(),
    publishedAt: timestamp('published_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    document: jsonb().$type<PolicyVersionRecord>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('policy_versions_version_hash_unique').on(
      table.semanticVersion,
      table.contentHash,
    ),
    check(
      'policy_versions_id_check',
      sql`${table.policyVersionId} ~ ${canonicalIdSqlPattern('policy')}`,
    ),
    check(
      'policy_versions_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'policy_versions_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'policy_versions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'policyVersionId' = ${table.policyVersionId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'contentHash' = ${table.contentHash}`,
    ),
  ],
);

export const engineVersions = pgTable(
  'engine_versions',
  {
    engineVersionId: text('engine_version_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    artifactHash: char('artifact_hash', { length: 64 }).notNull(),
    document: jsonb().$type<EngineVersionRecord>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('engine_versions_version_hash_unique').on(
      table.semanticVersion,
      table.artifactHash,
    ),
    check(
      'engine_versions_id_check',
      sql`${table.engineVersionId} ~ ${canonicalIdSqlPattern('engine')}`,
    ),
    check(
      'engine_versions_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'engine_versions_hash_check',
      sql`${table.artifactHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'engine_versions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'engineVersionId' = ${table.engineVersionId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'artifactHash' = ${table.artifactHash}`,
    ),
  ],
);

export const benchmarkVersions = pgTable(
  'benchmark_versions',
  {
    benchmarkVersionId: text('benchmark_version_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    document: jsonb().$type<BenchmarkVersionRecord>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('benchmark_versions_version_hash_unique').on(
      table.semanticVersion,
      table.contentHash,
    ),
    check(
      'benchmark_versions_id_check',
      sql`${table.benchmarkVersionId} ~ ${canonicalIdSqlPattern('benchmark')}`,
    ),
    check(
      'benchmark_versions_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'benchmark_versions_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'benchmark_versions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'benchmarkVersionId' = ${table.benchmarkVersionId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'contentHash' = ${table.contentHash}`,
    ),
  ],
);

export const simulationVersions = pgTable(
  'simulation_versions',
  {
    simulationVersionId: text('simulation_version_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    artifactHash: char('artifact_hash', { length: 64 }).notNull(),
    document: jsonb().$type<SimulationVersionRecord>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('simulation_versions_version_hash_unique').on(
      table.semanticVersion,
      table.artifactHash,
    ),
    check(
      'simulation_versions_id_check',
      sql`${table.simulationVersionId} ~ ${canonicalIdSqlPattern('simulation')}`,
    ),
    check(
      'simulation_versions_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'simulation_versions_hash_check',
      sql`${table.artifactHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'simulation_versions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'simulationVersionId' = ${table.simulationVersionId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'artifactHash' = ${table.artifactHash}`,
    ),
  ],
);

export const reportSchemaVersions = pgTable(
  'report_schema_versions',
  {
    reportSchemaVersionId: text('report_schema_version_id').primaryKey(),
    semanticVersion: text('semantic_version').notNull(),
    artifactHash: char('artifact_hash', { length: 64 }).notNull(),
    document: jsonb().$type<ReportSchemaVersionRecord>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('report_schema_versions_version_hash_unique').on(
      table.semanticVersion,
      table.artifactHash,
    ),
    check(
      'report_schema_versions_id_check',
      sql`${table.reportSchemaVersionId} ~ ${canonicalIdSqlPattern('report-schema')}`,
    ),
    check(
      'report_schema_versions_version_check',
      sql`${table.semanticVersion} ~ ${semanticVersionSqlPattern}`,
    ),
    check(
      'report_schema_versions_hash_check',
      sql`${table.artifactHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'report_schema_versions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'reportSchemaVersionId' = ${table.reportSchemaVersionId}
          and ${table.document}->>'version' = ${table.semanticVersion}
          and ${table.document}->>'artifactHash' = ${table.artifactHash}`,
    ),
  ],
);

export const cardDataSnapshotProvenance = pgTable(
  'card_data_snapshot_provenance',
  {
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => cardDataSnapshots.snapshotId, { onDelete: 'cascade' }),
    provenanceId: text('provenance_id')
      .notNull()
      .references(() => sourceProvenance.provenanceId),
  },
  (table) => [primaryKey({ columns: [table.snapshotId, table.provenanceId] })],
);

export const policyVersionProvenance = pgTable(
  'policy_version_provenance',
  {
    policyVersionId: text('policy_version_id')
      .notNull()
      .references(() => policyVersions.policyVersionId, {
        onDelete: 'cascade',
      }),
    provenanceId: text('provenance_id')
      .notNull()
      .references(() => sourceProvenance.provenanceId),
  },
  (table) => [
    primaryKey({ columns: [table.policyVersionId, table.provenanceId] }),
  ],
);

export const decks = pgTable(
  'decks',
  {
    deckId: text('deck_id').primaryKey(),
    ownerUserId: uuid('owner_user_id').references(() => users.userId),
    ownerGuestId: uuid('owner_guest_id'),
    title: text().notNull(),
    format: text().notNull().default('commander'),
    visibility: text().notNull().default('private'),
    sharedAt: timestamp('shared_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('decks_owner_user_created_index').on(
      table.ownerUserId,
      table.createdAt,
    ),
    index('decks_owner_guest_created_index').on(
      table.ownerGuestId,
      table.createdAt,
    ),
    check(
      'decks_id_check',
      sql`${table.deckId} ~ ${canonicalIdSqlPattern('deck')}`,
    ),
    check(
      'decks_owner_check',
      sql`num_nonnulls(${table.ownerUserId}, ${table.ownerGuestId}) = 1`,
    ),
    check('decks_title_check', sql`length(${table.title}) between 1 and 256`),
    check('decks_format_check', sql`${table.format} = 'commander'`),
    check(
      'decks_visibility_check',
      sql`${table.visibility} in ('private', 'unlisted', 'public')`,
    ),
    check(
      'decks_sharing_check',
      sql`(${table.visibility} = 'private' and ${table.sharedAt} is null)
          or (${table.visibility} in ('unlisted', 'public') and ${table.sharedAt} is not null)`,
    ),
  ],
);

export const deckRevisions = pgTable(
  'deck_revisions',
  {
    revisionId: text('revision_id').primaryKey(),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.deckId, { onDelete: 'cascade' }),
    ordinal: integer().notNull(),
    parentRevisionId: text('parent_revision_id'),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    document: jsonb().$type<DeckRevision>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('deck_revisions_revision_deck_unique').on(
      table.revisionId,
      table.deckId,
    ),
    unique('deck_revisions_deck_ordinal_unique').on(
      table.deckId,
      table.ordinal,
    ),
    unique('deck_revisions_deck_hash_unique').on(
      table.deckId,
      table.contentHash,
    ),
    foreignKey({
      columns: [table.parentRevisionId, table.deckId],
      foreignColumns: [table.revisionId, table.deckId],
      name: 'deck_revisions_parent_same_deck_fk',
    }),
    check(
      'deck_revisions_id_check',
      sql`${table.revisionId} ~ ${canonicalIdSqlPattern('revision')}`,
    ),
    check(
      'deck_revisions_parent_id_check',
      sql`${table.parentRevisionId} is null or ${table.parentRevisionId} ~ ${canonicalIdSqlPattern('revision')}`,
    ),
    check(
      'deck_revisions_ordinal_check',
      sql`${table.ordinal} between 1 and 1000000
          and ((${table.ordinal} = 1 and ${table.parentRevisionId} is null)
            or (${table.ordinal} > 1 and ${table.parentRevisionId} is not null))`,
    ),
    check(
      'deck_revisions_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'deck_revisions_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'revisionId' = ${table.revisionId}
          and ${table.document}->>'deckId' = ${table.deckId}
          and (${table.document}->>'ordinal')::integer = ${table.ordinal}
          and ${table.document}->>'contentHash' = ${table.contentHash}`,
    ),
  ],
);

export const analyses = pgTable(
  'analyses',
  {
    analysisId: text('analysis_id').primaryKey(),
    deckRevisionId: text('deck_revision_id')
      .notNull()
      .references(() => deckRevisions.revisionId),
    ownerUserId: uuid('owner_user_id').references(() => users.userId),
    ownerGuestId: uuid('owner_guest_id'),
    state: text().notNull().default('queued'),
    visibility: text().notNull().default('private'),
    sharedAt: timestamp('shared_at', {
      mode: 'date',
      withTimezone: true,
    }),
    idempotencyKey: text('idempotency_key').notNull(),
    seed: text().notNull(),
    options: jsonb().$type<AnalysisOptions>().notNull(),
    cardDataSnapshotId: text('card_data_snapshot_id')
      .notNull()
      .references(() => cardDataSnapshots.snapshotId),
    policyVersionId: text('policy_version_id')
      .notNull()
      .references(() => policyVersions.policyVersionId),
    engineVersionId: text('engine_version_id')
      .notNull()
      .references(() => engineVersions.engineVersionId),
    benchmarkVersionId: text('benchmark_version_id')
      .notNull()
      .references(() => benchmarkVersions.benchmarkVersionId),
    simulationVersionId: text('simulation_version_id')
      .notNull()
      .references(() => simulationVersions.simulationVersionId),
    reportSchemaVersionId: text('report_schema_version_id')
      .notNull()
      .references(() => reportSchemaVersions.reportSchemaVersionId),
    reportId: text('report_id'),
    reportHash: char('report_hash', { length: 64 }),
    reportDocument: jsonb('report_document').$type<AnalysisReport>(),
    failureDocument:
      jsonb('failure_document').$type<Readonly<Record<string, unknown>>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp('completed_at', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => [
    unique('analyses_report_id_unique').on(table.reportId),
    uniqueIndex('analyses_user_idempotency_unique')
      .on(table.ownerUserId, table.idempotencyKey)
      .where(sql`${table.ownerUserId} is not null`),
    uniqueIndex('analyses_guest_idempotency_unique')
      .on(table.ownerGuestId, table.idempotencyKey)
      .where(sql`${table.ownerGuestId} is not null`),
    index('analyses_user_created_index').on(table.ownerUserId, table.createdAt),
    index('analyses_guest_created_index').on(
      table.ownerGuestId,
      table.createdAt,
    ),
    index('analyses_state_created_index').on(table.state, table.createdAt),
    check(
      'analyses_id_check',
      sql`${table.analysisId} ~ ${canonicalIdSqlPattern('analysis')}`,
    ),
    check(
      'analyses_owner_check',
      sql`num_nonnulls(${table.ownerUserId}, ${table.ownerGuestId}) = 1`,
    ),
    check(
      'analyses_state_check',
      sql`${table.state} in ('queued', 'running', 'retrying', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      'analyses_visibility_check',
      sql`${table.visibility} in ('private', 'unlisted', 'public')`,
    ),
    check(
      'analyses_sharing_check',
      sql`(${table.visibility} = 'private' and ${table.sharedAt} is null)
          or (${table.visibility} in ('unlisted', 'public') and ${table.sharedAt} is not null)`,
    ),
    check(
      'analyses_idempotency_check',
      sql`length(${table.idempotencyKey}) between 16 and 128
          and ${table.idempotencyKey} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'`,
    ),
    check('analyses_seed_check', sql`length(${table.seed}) between 1 and 256`),
    check(
      'analyses_terminal_data_check',
      sql`(${table.state} = 'completed'
            and num_nonnulls(${table.reportId}, ${table.reportHash}, ${table.reportDocument}, ${table.completedAt}) = 4
            and ${table.failureDocument} is null)
          or (${table.state} = 'failed'
            and ${table.failureDocument} is not null
            and ${table.completedAt} is not null
            and num_nonnulls(${table.reportId}, ${table.reportHash}, ${table.reportDocument}) = 0)
          or (${table.state} = 'cancelled'
            and ${table.completedAt} is not null
            and num_nonnulls(${table.reportId}, ${table.reportHash}, ${table.reportDocument}, ${table.failureDocument}) = 0)
          or (${table.state} in ('queued', 'running', 'retrying')
            and num_nonnulls(${table.reportId}, ${table.reportHash}, ${table.reportDocument}, ${table.failureDocument}, ${table.completedAt}) = 0)`,
    ),
    check(
      'analyses_report_hash_check',
      sql`${table.reportHash} is null or ${table.reportHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'analyses_report_id_check',
      sql`${table.reportId} is null or ${table.reportId} ~ ${canonicalIdSqlPattern('report')}`,
    ),
    check(
      'analyses_report_document_check',
      sql`${table.reportDocument} is null or (
          jsonb_typeof(${table.reportDocument}) = 'object'
          and ${table.reportDocument}->>'status' = 'complete'
          and ${table.reportDocument}->>'analysisId' = ${table.analysisId}
          and ${table.reportDocument}->>'deckRevisionId' = ${table.deckRevisionId}
          and ${table.reportDocument}->>'reportId' = ${table.reportId}
          and ${table.reportDocument}#>>'{context,versions,cardData,snapshotId}' = ${table.cardDataSnapshotId}
          and ${table.reportDocument}#>>'{context,versions,policy,policyVersionId}' = ${table.policyVersionId}
          and ${table.reportDocument}#>>'{context,versions,engine,engineVersionId}' = ${table.engineVersionId}
          and ${table.reportDocument}#>>'{context,versions,benchmark,benchmarkVersionId}' = ${table.benchmarkVersionId}
          and ${table.reportDocument}#>>'{context,versions,simulation,simulationVersionId}' = ${table.simulationVersionId}
          and ${table.reportDocument}#>>'{context,versions,reportSchema,reportSchemaVersionId}' = ${table.reportSchemaVersionId})`,
    ),
  ],
);

export const analysisEvents = pgTable(
  'analysis_events',
  {
    eventId: text('event_id').primaryKey(),
    analysisId: text('analysis_id')
      .notNull()
      .references(() => analyses.analysisId, { onDelete: 'cascade' }),
    sequence: bigint({ mode: 'number' }).notNull(),
    state: text().notNull(),
    occurredAt: timestamp('occurred_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    document: jsonb().$type<AnalysisProgressEvent>().notNull(),
  },
  (table) => [
    unique('analysis_events_analysis_sequence_unique').on(
      table.analysisId,
      table.sequence,
    ),
    uniqueIndex('analysis_events_one_terminal_unique')
      .on(table.analysisId)
      .where(sql`${table.state} in ('completed', 'failed', 'cancelled')`),
    index('analysis_events_reconnect_index').on(
      table.analysisId,
      table.sequence,
    ),
    check(
      'analysis_events_id_check',
      sql`${table.eventId} ~ ${canonicalIdSqlPattern('event')}`,
    ),
    check(
      'analysis_events_sequence_check',
      sql`${table.sequence} between 0 and 9007199254740991`,
    ),
    check(
      'analysis_events_state_check',
      sql`${table.state} in ('queued', 'running', 'retrying', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      'analysis_events_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'eventId' = ${table.eventId}
          and ${table.document}->>'analysisId' = ${table.analysisId}
          and (${table.document}->>'sequence')::bigint = ${table.sequence}
          and ${table.document}->>'state' = ${table.state}`,
    ),
  ],
);

export const analysisFindings = pgTable(
  'analysis_findings',
  {
    findingId: text('finding_id').primaryKey(),
    analysisId: text('analysis_id')
      .notNull()
      .references(() => analyses.analysisId, { onDelete: 'cascade' }),
    outcome: text().notNull(),
    severity: text().notNull(),
    reasonCode: text('reason_code').notNull(),
    document: jsonb().$type<Finding>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('analysis_findings_analysis_index').on(table.analysisId),
    check(
      'analysis_findings_id_check',
      sql`${table.findingId} ~ ${canonicalIdSqlPattern('finding')}`,
    ),
    check(
      'analysis_findings_outcome_check',
      sql`${table.outcome} in ('pass', 'fail', 'unknown')`,
    ),
    check(
      'analysis_findings_severity_check',
      sql`${table.severity} in ('info', 'warning', 'error')`,
    ),
    check(
      'analysis_findings_reason_check',
      sql`length(${table.reasonCode}) between 3 and 128
          and ${table.reasonCode} ~ '^[a-z][a-z0-9]*(\\.[a-z0-9-]+)+$'`,
    ),
    check(
      'analysis_findings_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'
          and ${table.document}->>'findingId' = ${table.findingId}
          and ${table.document}->>'outcome' = ${table.outcome}
          and ${table.document}->>'severity' = ${table.severity}
          and ${table.document}->>'reasonCode' = ${table.reasonCode}`,
    ),
  ],
);

export const analysisArtifacts = pgTable(
  'analysis_artifacts',
  {
    artifactId: uuid('artifact_id').primaryKey().defaultRandom(),
    analysisId: text('analysis_id')
      .notNull()
      .references(() => analyses.analysisId, { onDelete: 'cascade' }),
    kind: text().notNull(),
    mediaType: text('media_type').notNull(),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    byteLength: bigint('byte_length', { mode: 'number' }).notNull(),
    document: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('analysis_artifacts_analysis_kind_hash_unique').on(
      table.analysisId,
      table.kind,
      table.contentHash,
    ),
    index('analysis_artifacts_analysis_index').on(table.analysisId),
    check(
      'analysis_artifacts_kind_check',
      sql`${table.kind} in ('report-json', 'export-json', 'markdown', 'share-image-metadata')`,
    ),
    check(
      'analysis_artifacts_media_type_check',
      sql`length(${table.mediaType}) between 3 and 128
          and ${table.mediaType} ~ '^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$'`,
    ),
    check(
      'analysis_artifacts_hash_check',
      sql`${table.contentHash} ~ ${sha256SqlPattern}`,
    ),
    check(
      'analysis_artifacts_size_check',
      sql`${table.byteLength} between 1 and 16777216`,
    ),
    check(
      'analysis_artifacts_document_check',
      sql`jsonb_typeof(${table.document}) = 'object'`,
    ),
  ],
);

export const pods = pgTable(
  'pods',
  {
    podId: text('pod_id').primaryKey(),
    ownerUserId: uuid('owner_user_id').references(() => users.userId),
    ownerGuestId: uuid('owner_guest_id'),
    state: text().notNull().default('incomplete'),
    visibility: text().notNull().default('private'),
    sharedAt: timestamp('shared_at', {
      mode: 'date',
      withTimezone: true,
    }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp('completed_at', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex('pods_user_idempotency_unique')
      .on(table.ownerUserId, table.idempotencyKey)
      .where(sql`${table.ownerUserId} is not null`),
    uniqueIndex('pods_guest_idempotency_unique')
      .on(table.ownerGuestId, table.idempotencyKey)
      .where(sql`${table.ownerGuestId} is not null`),
    index('pods_user_created_index').on(table.ownerUserId, table.createdAt),
    index('pods_guest_created_index').on(table.ownerGuestId, table.createdAt),
    check(
      'pods_id_check',
      sql`${table.podId} ~ ${canonicalIdSqlPattern('pod')}`,
    ),
    check(
      'pods_owner_check',
      sql`num_nonnulls(${table.ownerUserId}, ${table.ownerGuestId}) = 1`,
    ),
    check(
      'pods_state_check',
      sql`${table.state} in ('incomplete', 'ready', 'analyzing', 'complete', 'failed')`,
    ),
    check(
      'pods_visibility_check',
      sql`${table.visibility} in ('private', 'unlisted', 'public')`,
    ),
    check(
      'pods_sharing_check',
      sql`(${table.visibility} = 'private' and ${table.sharedAt} is null)
          or (${table.visibility} in ('unlisted', 'public') and ${table.sharedAt} is not null)`,
    ),
    check(
      'pods_idempotency_check',
      sql`length(${table.idempotencyKey}) between 16 and 128
          and ${table.idempotencyKey} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'`,
    ),
    check(
      'pods_completion_check',
      sql`(${table.state} in ('complete', 'failed')) = (${table.completedAt} is not null)`,
    ),
  ],
);

export const podMembers = pgTable(
  'pod_members',
  {
    podId: text('pod_id')
      .notNull()
      .references(() => pods.podId, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    deckRevisionId: text('deck_revision_id')
      .notNull()
      .references(() => deckRevisions.revisionId),
    reportId: text('report_id').references(() => analyses.reportId),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.podId, table.position] }),
    unique('pod_members_pod_revision_unique').on(
      table.podId,
      table.deckRevisionId,
    ),
    check('pod_members_position_check', sql`${table.position} between 1 and 4`),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    auditEventId: uuid('audit_event_id').primaryKey().defaultRandom(),
    actorKind: text('actor_kind').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.userId),
    actorGuestId: uuid('actor_guest_id'),
    action: text().notNull(),
    objectType: text('object_type').notNull(),
    objectId: text('object_id').notNull(),
    outcome: text().notNull(),
    requestId: uuid('request_id').notNull(),
    metadata: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    occurredAt: timestamp('occurred_at', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_events_actor_user_time_index').on(
      table.actorUserId,
      table.occurredAt,
    ),
    index('audit_events_object_time_index').on(
      table.objectType,
      table.objectId,
      table.occurredAt,
    ),
    check(
      'audit_events_actor_kind_check',
      sql`${table.actorKind} in ('user', 'guest', 'service')`,
    ),
    check(
      'audit_events_actor_check',
      sql`(${table.actorKind} = 'user' and ${table.actorUserId} is not null and ${table.actorGuestId} is null)
          or (${table.actorKind} = 'guest' and ${table.actorUserId} is null and ${table.actorGuestId} is not null)
          or (${table.actorKind} = 'service' and ${table.actorUserId} is null and ${table.actorGuestId} is null)`,
    ),
    check(
      'audit_events_action_check',
      sql`length(${table.action}) between 3 and 128
          and ${table.action} ~ '^[a-z][a-z0-9]*(\\.[a-z0-9-]+)+$'`,
    ),
    check(
      'audit_events_object_check',
      sql`length(${table.objectType}) between 1 and 64
          and length(${table.objectId}) between 1 and 256`,
    ),
    check(
      'audit_events_outcome_check',
      sql`${table.outcome} in ('success', 'denied', 'failed')`,
    ),
    check(
      'audit_events_metadata_check',
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

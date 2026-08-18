import {
  AnalysisProgressEventSchema,
  AnalysisReportSchema,
  AnalyzeDeckJobPayloadSchema,
  BenchmarkVersionRecordSchema,
  CardDataSnapshotSchema,
  DeckRevisionSchema,
  DeckSchema,
  EngineVersionRecordSchema,
  PolicyVersionRecordSchema,
  ReportSchemaVersionRecordSchema,
  Sha256Schema,
  SimulationVersionRecordSchema,
  SourceProvenanceSchema,
} from '@podgauge/contracts';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z } from 'zod';

import {
  analyses,
  analysisEvents,
  analysisFindings,
  benchmarkVersions,
  cardDataSnapshotProvenance,
  cardDataSnapshots,
  deckRevisions,
  decks,
  engineVersions,
  policyVersionProvenance,
  policyVersions,
  reportSchemaVersions,
  simulationVersions,
  sourceProvenance,
} from './schema.js';
import type * as schema from './schema.js';

type RepositoryDatabase = Pick<
  PostgresJsDatabase<typeof schema>,
  'insert' | 'transaction' | 'update'
>;

const OwnerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.uuid() }).strict(),
  z.object({ guestId: z.uuid(), kind: z.literal('guest') }).strict(),
]);

const VersionSetSchema = z
  .object({
    benchmark: BenchmarkVersionRecordSchema,
    cardData: CardDataSnapshotSchema,
    engine: EngineVersionRecordSchema,
    policy: PolicyVersionRecordSchema,
    provenance: z.array(SourceProvenanceSchema).min(1).max(128),
    reportSchema: ReportSchemaVersionRecordSchema,
    simulation: SimulationVersionRecordSchema,
  })
  .strict();

const OwnedDeckRevisionSchema = z
  .object({
    deck: DeckSchema,
    owner: OwnerSchema,
    revision: DeckRevisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.deck.deckId !== value.revision.deckId) {
      context.addIssue({
        code: 'custom',
        message: 'Deck and revision identifiers must match',
        path: ['revision', 'deckId'],
      });
    }
  });

const OwnedAnalysisJobSchema = z
  .object({
    owner: OwnerSchema,
    payload: AnalyzeDeckJobPayloadSchema,
  })
  .strict();

function ownerColumns(owner: z.infer<typeof OwnerSchema>) {
  return owner.kind === 'user'
    ? { ownerGuestId: null, ownerUserId: owner.userId }
    : { ownerGuestId: owner.guestId, ownerUserId: null };
}

export class PodGaugeRepository {
  constructor(private readonly database: RepositoryDatabase) {}

  async insertVersionSet(input: unknown): Promise<void> {
    const versions = VersionSetSchema.parse(input);
    const availableProvenance = new Set(
      versions.provenance.map((record) => record.provenanceId),
    );
    for (const provenanceId of [
      ...versions.cardData.sourceProvenanceIds,
      ...versions.policy.sourceProvenanceIds,
    ]) {
      if (!availableProvenance.has(provenanceId)) {
        throw new Error(
          'Version set must include every referenced provenance document',
        );
      }
    }

    await this.database.transaction(async (transaction) => {
      await transaction.insert(sourceProvenance).values(
        versions.provenance.map((record) => ({
          contentHash: record.contentHash,
          document: record,
          provenanceId: record.provenanceId,
          sourceKind: record.sourceKind,
        })),
      );
      await transaction.insert(cardDataSnapshots).values({
        contentHash: versions.cardData.contentHash,
        document: versions.cardData,
        retrievedAt: new Date(versions.cardData.retrievedAt),
        semanticVersion: versions.cardData.version,
        snapshotId: versions.cardData.snapshotId,
      });
      await transaction.insert(policyVersions).values({
        contentHash: versions.policy.contentHash,
        document: versions.policy,
        effectiveDate: versions.policy.effectiveDate,
        policyVersionId: versions.policy.policyVersionId,
        publishedAt: new Date(versions.policy.publishedAt),
        semanticVersion: versions.policy.version,
      });
      await transaction.insert(engineVersions).values({
        artifactHash: versions.engine.artifactHash,
        document: versions.engine,
        engineVersionId: versions.engine.engineVersionId,
        semanticVersion: versions.engine.version,
      });
      await transaction.insert(benchmarkVersions).values({
        benchmarkVersionId: versions.benchmark.benchmarkVersionId,
        contentHash: versions.benchmark.contentHash,
        document: versions.benchmark,
        semanticVersion: versions.benchmark.version,
      });
      await transaction.insert(simulationVersions).values({
        artifactHash: versions.simulation.artifactHash,
        document: versions.simulation,
        semanticVersion: versions.simulation.version,
        simulationVersionId: versions.simulation.simulationVersionId,
      });
      await transaction.insert(reportSchemaVersions).values({
        artifactHash: versions.reportSchema.artifactHash,
        document: versions.reportSchema,
        reportSchemaVersionId: versions.reportSchema.reportSchemaVersionId,
        semanticVersion: versions.reportSchema.version,
      });
      await transaction.insert(cardDataSnapshotProvenance).values(
        versions.cardData.sourceProvenanceIds.map((provenanceId) => ({
          provenanceId,
          snapshotId: versions.cardData.snapshotId,
        })),
      );
      await transaction.insert(policyVersionProvenance).values(
        versions.policy.sourceProvenanceIds.map((provenanceId) => ({
          policyVersionId: versions.policy.policyVersionId,
          provenanceId,
        })),
      );
    });
  }

  async insertOwnedDeckRevision(input: unknown): Promise<void> {
    const value = OwnedDeckRevisionSchema.parse(input);
    const owner = ownerColumns(value.owner);

    await this.database.transaction(async (transaction) => {
      await transaction.insert(decks).values({
        ...owner,
        createdAt: new Date(value.deck.createdAt),
        deckId: value.deck.deckId,
        format: value.deck.format,
        title: value.deck.title,
        visibility: value.deck.visibility,
      });
      await transaction.insert(deckRevisions).values({
        contentHash: value.revision.contentHash,
        createdAt: new Date(value.revision.createdAt),
        deckId: value.revision.deckId,
        document: value.revision,
        ordinal: value.revision.ordinal,
        parentRevisionId: value.revision.parentRevisionId,
        revisionId: value.revision.revisionId,
      });
    });
  }

  async createAnalysisFromJob(input: unknown): Promise<void> {
    const value = OwnedAnalysisJobSchema.parse(input);
    const { context, ...payload } = value.payload;

    await this.database.insert(analyses).values({
      ...ownerColumns(value.owner),
      analysisId: payload.analysisId,
      benchmarkVersionId: context.versions.benchmark.benchmarkVersionId,
      cardDataSnapshotId: context.versions.cardData.snapshotId,
      createdAt: new Date(payload.requestedAt),
      deckRevisionId: payload.deckRevisionId,
      engineVersionId: context.versions.engine.engineVersionId,
      idempotencyKey: payload.idempotencyKey,
      options: payload.options,
      policyVersionId: context.versions.policy.policyVersionId,
      reportSchemaVersionId:
        context.versions.reportSchema.reportSchemaVersionId,
      seed: context.seed,
      simulationVersionId: context.versions.simulation.simulationVersionId,
    });
  }

  async appendAnalysisEvent(input: unknown): Promise<void> {
    const event = AnalysisProgressEventSchema.parse(input);
    await this.database.insert(analysisEvents).values({
      analysisId: event.analysisId,
      document: event,
      eventId: event.eventId,
      occurredAt: new Date(event.occurredAt),
      sequence: event.sequence,
      state: event.state,
    });
  }

  async completeAnalysis(
    input: unknown,
    reportHashInput: unknown,
  ): Promise<void> {
    const report = AnalysisReportSchema.parse(input);
    const reportHash = Sha256Schema.parse(reportHashInput);

    await this.database.transaction(async (transaction) => {
      if (report.findings.length > 0) {
        await transaction.insert(analysisFindings).values(
          report.findings.map((finding) => ({
            analysisId: report.analysisId,
            document: finding,
            findingId: finding.findingId,
            outcome: finding.outcome,
            reasonCode: finding.reasonCode,
            severity: finding.severity,
          })),
        );
      }

      const updated = await transaction
        .update(analyses)
        .set({
          completedAt: new Date(),
          reportDocument: report,
          reportHash,
          reportId: report.reportId,
          state: 'completed',
        })
        .where(
          and(
            eq(analyses.analysisId, report.analysisId),
            eq(analyses.state, 'running'),
          ),
        )
        .returning({ analysisId: analyses.analysisId });

      if (updated.length !== 1) {
        throw new Error('Analysis must be running before it can complete');
      }
    });
  }
}

import { AnalyzeDeckJobPayloadSchema } from '@podgauge/contracts';
import { randomUUID } from 'node:crypto';

export function createAnalysisJobPayloadFixture(maxAttempts = 3) {
  const id = randomUUID();
  return AnalyzeDeckJobPayloadSchema.parse({
    analysisId: `analysis_${id}`,
    context: {
      seed: 'worker-task-test-seed',
      versions: {
        benchmark: {
          benchmarkVersionId: `benchmark_${id}`,
          version: '0.1.0',
        },
        cardData: { snapshotId: `card-data_${id}`, version: '0.1.0' },
        engine: { engineVersionId: `engine_${id}`, version: '0.1.0' },
        policy: { policyVersionId: `policy_${id}`, version: '0.1.0' },
        reportSchema: {
          reportSchemaVersionId: `report-schema_${id}`,
          version: '0.1.0',
        },
        simulation: {
          simulationVersionId: `simulation_${id}`,
          version: '0.1.0',
        },
      },
    },
    deckRevisionId: `revision_${id}`,
    idempotencyKey: `worker-task-${id}`,
    jobId: `job_${id}`,
    jobKind: 'analyze-deck',
    options: {
      evidenceDetail: 'full',
      simulation: { mode: 'disabled' },
    },
    payloadVersion: '0.1.0',
    requestedAt: '2026-08-18T00:00:00.000Z',
    retry: {
      attempt: 1,
      maxAttempts,
      nextAttemptAt: null,
      previousFailureCode: null,
    },
  });
}

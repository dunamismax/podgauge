import { describe, expect, it } from 'vitest';

import {
  AnalysisProgressEventSchema,
  ProblemDetailsSchema,
  parseAnalysisJobForEnqueue,
  parseAnalysisJobForExecution,
} from './index.js';

const jobPayload = {
  analysisId: 'analysis_00000000-0000-4000-8000-000000000001',
  context: {
    seed: 'job-seed-001',
    versions: {
      benchmark: {
        benchmarkVersionId: 'benchmark_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
      cardData: {
        snapshotId: 'card-data_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
      engine: {
        engineVersionId: 'engine_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
      policy: {
        policyVersionId: 'policy_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
      reportSchema: {
        reportSchemaVersionId:
          'report-schema_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
      simulation: {
        simulationVersionId: 'simulation_00000000-0000-4000-8000-000000000001',
        version: '0.1.0',
      },
    },
  },
  deckRevisionId: 'revision_00000000-0000-4000-8000-000000000001',
  idempotencyKey: 'fixture.analysis.001',
  jobId: 'job_00000000-0000-4000-8000-000000000001',
  jobKind: 'analyze-deck',
  options: {
    evidenceDetail: 'full',
    simulation: { mode: 'disabled' },
  },
  payloadVersion: '0.1.0',
  requestedAt: '2026-08-17T12:00:00Z',
  retry: {
    attempt: 1,
    maxAttempts: 3,
    nextAttemptAt: null,
    previousFailureCode: null,
  },
};

describe('analysis job boundaries', () => {
  it('runtime-validates the same portable payload at enqueue and execution', () => {
    const enqueued = parseAnalysisJobForEnqueue(jobPayload);
    const executed = parseAnalysisJobForExecution(
      JSON.parse(JSON.stringify(enqueued)) as unknown,
    );

    expect(executed).toEqual(enqueued);
    expect(Object.isFrozen(enqueued)).toBe(true);
  });

  it('fails closed at both boundaries when a version or retry invariant is missing', () => {
    const missingVersion = structuredClone(jobPayload);
    Reflect.deleteProperty(missingVersion.context.versions, 'policy');
    expect(() => parseAnalysisJobForEnqueue(missingVersion)).toThrow();
    expect(() => parseAnalysisJobForExecution(missingVersion)).toThrow();

    expect(() =>
      parseAnalysisJobForExecution({
        ...jobPayload,
        retry: {
          ...jobPayload.retry,
          attempt: 2,
          previousFailureCode: null,
        },
      }),
    ).toThrow(/previous failure code/u);
  });

  it('distinguishes progress and terminal event states', () => {
    expect(
      AnalysisProgressEventSchema.safeParse({
        analysisId: jobPayload.analysisId,
        eventId: 'event_00000000-0000-4000-8000-000000000001',
        occurredAt: '2026-08-17T12:00:01Z',
        reportHash: '0'.repeat(64),
        reportId: 'report_00000000-0000-4000-8000-000000000001',
        sequence: 4,
        state: 'completed',
      }).success,
    ).toBe(true);
    expect(
      AnalysisProgressEventSchema.safeParse({
        analysisId: jobPayload.analysisId,
        eventId: 'event_00000000-0000-4000-8000-000000000001',
        occurredAt: '2026-08-17T12:00:01Z',
        sequence: 4,
        state: 'completed',
      }).success,
    ).toBe(false);
  });
});

describe('RFC 9457 problem details', () => {
  it('accepts an explicit typed problem and rejects ambiguous extra fields', () => {
    const problem = {
      code: 'request.invalid',
      detail: 'One or more request fields are invalid.',
      instance: '/api/v1/analyses/request-001',
      invalidParameters: [
        {
          name: 'deck.text',
          pointer: '/deck/text',
          reasonCode: 'request.invalid-field',
        },
      ],
      status: 400,
      title: 'Invalid request',
      type: 'https://podgauge.com/problems/request-invalid',
    };
    expect(ProblemDetailsSchema.safeParse(problem).success).toBe(true);
    expect(
      ProblemDetailsSchema.safeParse({ ...problem, error: 'legacy-shape' })
        .success,
    ).toBe(false);
  });
});

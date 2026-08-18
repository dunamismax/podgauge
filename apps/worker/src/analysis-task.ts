import {
  parseAnalysisJobForEnqueue,
  type AnalyzeDeckJobPayload,
} from '@podgauge/contracts';
import type { AddJobFunction, JobHelpers, TaskList } from 'graphile-worker';

import { readAnalysisJobAtWorkerBoundary } from './job-boundary.js';

export const analyzeDeckTaskIdentifier = 'analyze_deck';
export const analysisQueueName = 'analysis_cpu';

export type AnalysisTaskExecutor = (
  payload: AnalyzeDeckJobPayload,
  signal: AbortSignal,
) => Promise<void>;

export class AnalysisJobTimeoutError extends Error {
  override readonly name = 'AnalysisJobTimeoutError';
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Analysis job was cancelled');
}

async function executeWithCancellation(
  executor: AnalysisTaskExecutor,
  payload: AnalyzeDeckJobPayload,
  helpers: JobHelpers,
  timeoutMilliseconds: number,
): Promise<void> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => {
    timeoutController.abort(
      new AnalysisJobTimeoutError(
        `Analysis job exceeded ${timeoutMilliseconds} milliseconds`,
      ),
    );
  }, timeoutMilliseconds);
  const signal = AbortSignal.any([
    helpers.abortSignal,
    timeoutController.signal,
  ]);
  const cancellation = new Promise<never>((_resolve, reject) => {
    if (signal.aborted) reject(abortError(signal));
    else {
      signal.addEventListener('abort', () => reject(abortError(signal)), {
        once: true,
      });
    }
  });

  try {
    await Promise.race([executor(payload, signal), cancellation]);
  } finally {
    clearTimeout(timeout);
  }
}

export function createAnalysisTaskList(
  executor: AnalysisTaskExecutor,
  timeoutMilliseconds: number,
): TaskList {
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds < 1) {
    throw new Error('Analysis task timeout must be a positive integer');
  }

  return {
    [analyzeDeckTaskIdentifier]: async (input, helpers) => {
      const payload = readAnalysisJobAtWorkerBoundary(input);
      await executeWithCancellation(
        executor,
        payload,
        helpers,
        timeoutMilliseconds,
      );
    },
  };
}

export async function enqueueAnalysisJob(
  addJob: AddJobFunction,
  input: unknown,
) {
  const payload = parseAnalysisJobForEnqueue(input);
  const job = await addJob(analyzeDeckTaskIdentifier, payload, {
    jobKey: `${analyzeDeckTaskIdentifier}:${payload.analysisId}`,
    jobKeyMode: 'preserve_run_at',
    maxAttempts: payload.retry.maxAttempts,
    queueName: analysisQueueName,
  });
  if (!job) throw new Error('Graphile Worker did not return an enqueued job');
  return job;
}

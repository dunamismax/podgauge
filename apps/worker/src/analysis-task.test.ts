import type { AddJobFunction, JobHelpers, Task } from 'graphile-worker';
import { describe, expect, it, vi } from 'vitest';

import {
  AnalysisJobTimeoutError,
  analysisQueueName,
  analyzeDeckTaskIdentifier,
  createAnalysisTaskList,
  enqueueAnalysisJob,
} from './analysis-task.js';
import { createAnalysisJobPayloadFixture } from './analysis-task.fixture.js';

function helpers(controller = new AbortController()): JobHelpers {
  const abortPromise = new Promise<void>(() => undefined);
  return { abortPromise, abortSignal: controller.signal } as JobHelpers;
}

function analysisTask(taskList: ReturnType<typeof createAnalysisTaskList>) {
  const task = taskList[analyzeDeckTaskIdentifier] as Task | undefined;
  if (!task) throw new Error('Analyze-deck task is missing');
  return task;
}

describe('Graphile analysis task boundary', () => {
  it('validates payloads immediately before execution', async () => {
    const executor = vi.fn();
    const task = analysisTask(createAnalysisTaskList(executor, 1_000));

    await expect(
      task({ jobKind: 'analyze-deck' }, helpers()),
    ).rejects.toThrow();
    expect(executor).not.toHaveBeenCalled();
  });

  it('enforces a hard task timeout and aborts cooperative work', async () => {
    let observedSignal: AbortSignal | undefined;
    const task = analysisTask(
      createAnalysisTaskList(async (_payload, signal) => {
        observedSignal = signal;
        await new Promise<void>(() => undefined);
      }, 5),
    );

    await expect(
      task(createAnalysisJobPayloadFixture(), helpers()),
    ).rejects.toBeInstanceOf(AnalysisJobTimeoutError);
    expect(observedSignal?.aborted).toBe(true);
  });

  it('propagates worker cancellation to the task executor', async () => {
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    const task = analysisTask(
      createAnalysisTaskList(async (_payload, signal) => {
        observedSignal = signal;
        await new Promise<void>(() => undefined);
      }, 1_000),
    );
    const execution = task(
      createAnalysisJobPayloadFixture(),
      helpers(controller),
    );
    controller.abort(new Error('worker shutdown'));

    await expect(execution).rejects.toThrow('worker shutdown');
    expect(observedSignal?.aborted).toBe(true);
  });

  it('enqueues one named CPU task with bounded retries and a stable key', async () => {
    const addJob = vi.fn(async () => ({ id: 'graphile-job-1' }));
    const payload = createAnalysisJobPayloadFixture(4);

    await enqueueAnalysisJob(addJob as unknown as AddJobFunction, payload);

    expect(addJob).toHaveBeenCalledWith(analyzeDeckTaskIdentifier, payload, {
      jobKey: `${analyzeDeckTaskIdentifier}:${payload.analysisId}`,
      jobKeyMode: 'preserve_run_at',
      maxAttempts: 4,
      queueName: analysisQueueName,
    });
  });
});

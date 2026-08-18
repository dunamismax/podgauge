import type { WorkerConfiguration } from '@podgauge/config';

import { startGraphileQueue, type StartQueue } from './queue.js';

type WriteEvent = (event: Readonly<Record<string, unknown>>) => void;

export async function runWorker(
  configuration: WorkerConfiguration,
  signal: AbortSignal,
  writeEvent: WriteEvent,
  startQueue: StartQueue = startGraphileQueue,
): Promise<void> {
  const queue = await startQueue(configuration);
  writeEvent({
    concurrency: configuration.concurrency,
    queue: 'graphile-worker',
    service: 'podgauge-worker',
    status: 'ready',
  });

  const abort = new Promise<'abort'>((resolve) => {
    if (signal.aborted) resolve('abort');
    else
      signal.addEventListener('abort', () => resolve('abort'), { once: true });
  });
  const outcome = await Promise.race([
    abort,
    queue.promise.then(() => 'queue-stopped' as const),
  ]);
  if (outcome === 'abort') {
    await queue.stop(String(signal.reason ?? 'process signal'));
    await queue.promise;
  }

  writeEvent({ service: 'podgauge-worker', status: 'stopped' });
}

import type { WorkerConfiguration } from '@podgauge/config';

type WriteEvent = (event: Readonly<Record<string, unknown>>) => void;

export async function runWorker(
  configuration: WorkerConfiguration,
  signal: AbortSignal,
  writeEvent: WriteEvent,
): Promise<void> {
  writeEvent({
    concurrency: configuration.concurrency,
    service: 'podgauge-worker',
    status: 'ready',
  });

  const keepAlive = setInterval(() => undefined, 2_147_483_647);

  if (!signal.aborted) {
    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true });
    });
  }

  clearInterval(keepAlive);
  writeEvent({ service: 'podgauge-worker', status: 'stopped' });
}

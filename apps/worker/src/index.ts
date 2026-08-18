import { readWorkerConfiguration } from '@podgauge/config';
import { redactRecord } from '@podgauge/observability';

import { runWorker } from './worker.js';

const abortController = new AbortController();
const configuration = readWorkerConfiguration(process.env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => abortController.abort(signal));
}

if (process.argv.includes('--smoke')) {
  setImmediate(() => abortController.abort('smoke-complete'));
}

await runWorker(configuration, abortController.signal, (event) => {
  process.stdout.write(`${JSON.stringify(redactRecord(event))}\n`);
});

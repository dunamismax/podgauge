import { spawn } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('worker process', () => {
  it('starts, reports readiness, and drains through the smoke path', async () => {
    const entrypoint = new URL('./index.ts', import.meta.url).pathname;
    const result = await new Promise<{ code: number | null; output: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          ['--import', 'tsx', entrypoint, '--smoke'],
          {
            env: {
              ...process.env,
              PODGAUGE_WORKER_CONCURRENCY: '1',
              PODGAUGE_LOG_LEVEL: 'info',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        let output = '';
        child.stdout.on('data', (chunk: Buffer) => {
          output += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk: Buffer) => {
          output += chunk.toString('utf8');
        });
        child.once('error', reject);
        child.once('close', (code) => resolve({ code, output }));
      },
    );

    expect(result.code).toBe(0);
    expect(result.output).toContain('"status":"ready"');
    expect(result.output).toContain('"status":"stopped"');
  });
});

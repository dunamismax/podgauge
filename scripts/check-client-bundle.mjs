import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const clientDirectory = join(root, 'apps/web/build/client');
const forbiddenMarkers = [
  'DATABASE_URL',
  'PODGAUGE_TEST_DATABASE_URL',
  'POSTGRES_PASSWORD',
  'podgauge_dev_only',
  'production-secret',
];
const violations = [];

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

for await (const path of files(clientDirectory)) {
  const content = await readFile(path, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      violations.push(`${relative(root, path)} contains ${marker}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Client bundle contains server-only configuration markers:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Client bundle excludes server-only configuration markers.');
}

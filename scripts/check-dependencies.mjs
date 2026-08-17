import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const allowedWorkspaceDependencies = new Map([
  ['@podgauge/contracts', new Set()],
  ['@podgauge/engine', new Set(['@podgauge/contracts'])],
  ['@podgauge/policy', new Set(['@podgauge/contracts'])],
  ['@podgauge/card-data', new Set(['@podgauge/contracts'])],
  ['@podgauge/db', new Set(['@podgauge/contracts'])],
  ['@podgauge/ui', new Set()],
  ['@podgauge/observability', new Set()],
  ['@podgauge/web', new Set(['@podgauge/contracts', '@podgauge/ui'])],
  [
    '@podgauge/worker',
    new Set([
      '@podgauge/card-data',
      '@podgauge/contracts',
      '@podgauge/db',
      '@podgauge/engine',
      '@podgauge/observability',
      '@podgauge/policy',
    ]),
  ],
]);

const packageRoots = ['apps', 'packages'];
const violations = [];

for (const packageRoot of packageRoots) {
  const directory = join(root, packageRoot);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifestPath = join(directory, entry.name, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const allowed = allowedWorkspaceDependencies.get(manifest.name);

    if (!allowed) {
      violations.push(
        `${relative(root, manifestPath)} has an unknown package name`,
      );
      continue;
    }

    const dependencyGroups = [
      manifest.dependencies ?? {},
      manifest.devDependencies ?? {},
      manifest.peerDependencies ?? {},
    ];

    for (const dependencies of dependencyGroups) {
      for (const dependency of Object.keys(dependencies)) {
        if (dependency.startsWith('@podgauge/') && !allowed.has(dependency)) {
          violations.push(`${manifest.name} may not depend on ${dependency}`);
        }
      }
    }
  }
}

const engineDirectory = join(root, 'packages/engine/src');
const forbiddenEnginePatterns = [
  [/from ['"]node:/u, 'Node built-in import'],
  [
    /from ['"](?:fs|path|http|https|net|dns|child_process)['"]/u,
    'infrastructure import',
  ],
  [/process\.env/u, 'environment access'],
  [/Math\.random\s*\(/u, 'global randomness'],
  [/Date\.(?:now|parse)\s*\(/u, 'wall-clock access'],
  [/new Date\s*\(/u, 'wall-clock access'],
  [/\.toLocale[A-Z][A-Za-z]*\s*\(/u, 'locale-dependent formatting'],
];

for (const entry of await readdir(engineDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
  const path = join(engineDirectory, entry.name);
  const source = await readFile(path, 'utf8');
  for (const [pattern, description] of forbiddenEnginePatterns) {
    if (pattern.test(source)) {
      violations.push(
        `${relative(root, path)} contains forbidden ${description}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('Dependency boundary violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Package dependency direction and engine purity guard passed.');
}

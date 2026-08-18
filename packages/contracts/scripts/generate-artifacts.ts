import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { contractSchemaRegistry } from '../src/schema-registry.js';

type JsonObject = Record<string, unknown>;

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const generatedRoot = join(packageRoot, 'generated');
const jsonSchemaRoot = join(generatedRoot, 'json-schema');
const problemResponse = {
  content: {
    'application/problem+json': {
      schema: { $ref: '#/components/schemas/ProblemDetails' },
    },
  },
  description: 'RFC 9457 problem details',
};

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, sortObjectKeys(item)]),
    );
  }
  return value;
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(sortObjectKeys(value), null, 2)}\n`;
}

function jsonSchema(name: string, schema: z.ZodType): JsonObject {
  const converted = z.toJSONSchema(schema, {
    cycles: 'ref',
    io: 'input',
    reused: 'ref',
    target: 'draft-2020-12',
  }) as JsonObject;
  Reflect.deleteProperty(converted, '~standard');
  return {
    ...converted,
    $id: `https://podgauge.com/schemas/${name}.schema.json`,
    title: name,
  };
}

function componentSchema(schema: JsonObject): JsonObject {
  const component = structuredClone(schema);
  Reflect.deleteProperty(component, '$id');
  Reflect.deleteProperty(component, '$schema');
  return component;
}

function operationIdParameter(name: string, example: string): JsonObject {
  return {
    in: 'path',
    name,
    required: true,
    schema: {
      example,
      pattern:
        '^[a-z][a-z-]*_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      type: 'string',
    },
  };
}

function createOpenApi(components: Record<string, JsonObject>): JsonObject {
  const idempotencyHeader = {
    in: 'header',
    name: 'Idempotency-Key',
    required: true,
    schema: {
      maxLength: 128,
      minLength: 16,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
      type: 'string',
    },
  };
  return {
    components: { schemas: components },
    info: {
      description:
        'Portable pre-alpha contracts. Implementations remain unavailable until their BUILD.md phase is complete.',
      title: 'PodGauge API',
      version: '0.1.0',
    },
    openapi: '3.1.0',
    paths: {
      '/api/v1/analyses': {
        post: {
          operationId: 'createAnalysis',
          parameters: [idempotencyHeader],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAnalysisRequest' },
              },
            },
            required: true,
          },
          responses: {
            '202': {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AcceptedAnalysis' },
                },
              },
              description: 'Analysis accepted for bounded background work',
            },
            '400': problemResponse,
            '409': problemResponse,
            '413': problemResponse,
            '429': problemResponse,
            '503': problemResponse,
          },
        },
      },
      '/api/v1/analyses/{analysisId}': {
        get: {
          operationId: 'getAnalysis',
          parameters: [
            operationIdParameter(
              'analysisId',
              'analysis_00000000-0000-4000-8000-000000000001',
            ),
          ],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AnalysisResource' },
                },
              },
              description: 'Current immutable or in-progress analysis resource',
            },
            '403': problemResponse,
            '404': problemResponse,
          },
        },
      },
      '/api/v1/analyses/{analysisId}/events': {
        get: {
          operationId: 'streamAnalysisEvents',
          parameters: [
            operationIdParameter(
              'analysisId',
              'analysis_00000000-0000-4000-8000-000000000001',
            ),
            {
              in: 'header',
              name: 'Last-Event-ID',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              content: {
                'text/event-stream': {
                  schema: { type: 'string' },
                },
              },
              description:
                'Reconnectable stream whose data records validate as AnalysisProgressEvent',
            },
            '403': problemResponse,
            '404': problemResponse,
          },
        },
      },
      '/api/v1/pods': {
        post: {
          operationId: 'createPod',
          parameters: [idempotencyHeader],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePodRequest' },
              },
            },
            required: true,
          },
          responses: {
            '202': {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PodResource' },
                },
              },
              description: 'Pod accepted or awaiting complete member reports',
            },
            '400': problemResponse,
            '409': problemResponse,
          },
        },
      },
      '/api/v1/pods/{podId}': {
        get: {
          operationId: 'getPod',
          parameters: [
            operationIdParameter(
              'podId',
              'pod_00000000-0000-4000-8000-000000000001',
            ),
          ],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PodResource' },
                },
              },
              description:
                'Immutable pod membership and current analysis state',
            },
            '403': problemResponse,
            '404': problemResponse,
          },
        },
      },
      '/api/v1/versions': {
        get: {
          operationId: 'getVersions',
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VersionCatalog' },
                },
              },
              description: 'Explicit active immutable version tuple',
            },
            '503': problemResponse,
          },
        },
      },
    },
  };
}

function buildArtifacts(): Map<string, string> {
  const artifacts = new Map<string, string>();
  const components: Record<string, JsonObject> = {};
  for (const [name, schema] of Object.entries(contractSchemaRegistry)) {
    const generated = jsonSchema(name, schema);
    artifacts.set(
      join(jsonSchemaRoot, `${name}.schema.json`),
      prettyJson(generated),
    );
    components[name] = componentSchema(generated);
  }
  artifacts.set(
    join(generatedRoot, 'openapi.v1.json'),
    prettyJson(createOpenApi(components)),
  );
  return artifacts;
}

async function writeArtifacts(artifacts: Map<string, string>): Promise<void> {
  for (const [path, content] of artifacts) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }
}

async function checkArtifacts(artifacts: Map<string, string>): Promise<void> {
  const mismatches: string[] = [];
  for (const [path, expected] of artifacts) {
    let actual: string;
    try {
      actual = await readFile(path, 'utf8');
    } catch {
      mismatches.push(`${relative(packageRoot, path)} is missing`);
      continue;
    }
    if (actual !== expected) {
      mismatches.push(`${relative(packageRoot, path)} is stale`);
    }
  }
  const expectedNames = new Set(
    [...artifacts.keys()]
      .filter((path) => dirname(path) === jsonSchemaRoot)
      .map((path) => relative(jsonSchemaRoot, path)),
  );
  try {
    for (const name of await readdir(jsonSchemaRoot)) {
      if (name.endsWith('.json') && !expectedNames.has(name)) {
        mismatches.push(`generated/json-schema/${name} is unexpected`);
      }
    }
  } catch {
    // Individual missing-file messages above are more actionable.
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Generated contract drift detected:\n${mismatches.map((item) => `- ${item}`).join('\n')}\nRun pnpm contracts:generate.`,
    );
  }
}

const mode = process.argv.at(-1);
const artifacts = buildArtifacts();
if (mode === '--write') {
  await writeArtifacts(artifacts);
  process.stdout.write(`Wrote ${artifacts.size} contract artifacts.\n`);
} else if (mode === '--check') {
  await checkArtifacts(artifacts);
  process.stdout.write(
    `Verified ${artifacts.size} generated contract artifacts.\n`,
  );
} else {
  throw new Error('Expected --write or --check');
}

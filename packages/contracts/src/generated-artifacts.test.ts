import { readFile, readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { contractSchemaRegistry } from './schema-registry.js';

const OpenApiDocumentSchema = z
  .object({
    components: z
      .object({
        schemas: z.record(z.string(), z.unknown()),
      })
      .passthrough(),
    info: z.object({ title: z.string(), version: z.string() }).passthrough(),
    openapi: z.literal('3.1.0'),
    paths: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const generatedRoot = new URL('../generated/', import.meta.url);

function collectReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectReferences);
  if (value === null || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const ownReference = typeof record.$ref === 'string' ? [record.$ref] : [];
  return [...ownReference, ...Object.values(record).flatMap(collectReferences)];
}

describe('generated contract artifacts', () => {
  it('contains the declared OpenAPI 3.1 surface with resolvable components', async () => {
    const document = OpenApiDocumentSchema.parse(
      JSON.parse(
        await readFile(new URL('openapi.v1.json', generatedRoot), 'utf8'),
      ) as unknown,
    );
    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/v1/analyses',
      '/api/v1/analyses/{analysisId}',
      '/api/v1/analyses/{analysisId}/events',
      '/api/v1/pods',
      '/api/v1/pods/{podId}',
      '/api/v1/versions',
    ]);

    const componentNames = new Set(Object.keys(document.components.schemas));
    for (const reference of collectReferences(document)) {
      if (!reference.startsWith('#/components/schemas/')) continue;
      expect(
        componentNames.has(reference.slice('#/components/schemas/'.length)),
      ).toBe(true);
    }
  });

  it('checks in one JSON Schema for every registered portable contract', async () => {
    const names = (await readdir(new URL('json-schema/', generatedRoot)))
      .filter((name) => name.endsWith('.schema.json'))
      .map((name) => name.replace(/\.schema\.json$/u, ''))
      .sort();
    expect(names).toEqual(Object.keys(contractSchemaRegistry).sort());
  });
});

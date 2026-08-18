import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  ReportCompatibilityError,
  parseCompatibleAnalysisReport,
} from './index.js';

async function loadReport() {
  const path = new URL(
    '../../../data/fixtures/contracts/report-v0.1.0.json',
    import.meta.url,
  );
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('report compatibility', () => {
  it('reads additive namespaced extensions within the supported line', async () => {
    const report = await loadReport();
    const context = report.context as {
      versions: { reportSchema: { version: string } };
    };
    context.versions.reportSchema.version = '0.1.1';
    report.extensions = {
      'x-podgauge.future-evidence-count': 0,
    };

    expect(parseCompatibleAnalysisReport(report).extensions).toEqual({
      'x-podgauge.future-evidence-count': 0,
    });
  });

  it('explicitly rejects a breaking compatibility line without a migration', async () => {
    const report = await loadReport();
    const context = report.context as {
      versions: { reportSchema: { version: string } };
    };
    context.versions.reportSchema.version = '0.2.0';

    expect(() => parseCompatibleAnalysisReport(report)).toThrow(
      ReportCompatibilityError,
    );
  });

  it('rejects an unversioned shape change rather than guessing compatibility', async () => {
    const report = await loadReport();
    report.newRequiredField = true;
    expect(() => parseCompatibleAnalysisReport(report)).toThrow();

    const context = report.context as {
      versions: { reportSchema: Record<string, unknown> };
    };
    Reflect.deleteProperty(context.versions.reportSchema, 'version');
    expect(() => parseCompatibleAnalysisReport(report)).toThrow();
  });
});

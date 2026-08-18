import { z } from 'zod';

import { AnalysisReportSchema, type AnalysisReport } from './reports.js';
import { SemanticVersionSchema } from './primitives.js';

export const CURRENT_REPORT_SCHEMA_VERSION = '0.1.0' as const;

const ReportVersionEnvelopeSchema = z
  .object({
    context: z
      .object({
        versions: z
          .object({
            reportSchema: z
              .object({ version: SemanticVersionSchema })
              .passthrough(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

function compatibilityLine(version: string): string {
  const [major = '', minor = ''] = version.split('.');
  return major === '0' ? `${major}.${minor}` : major;
}

export class ReportCompatibilityError extends Error {
  public constructor(
    public readonly actualVersion: string,
    public readonly supportedVersion: string,
  ) {
    super(
      `Report schema ${actualVersion} is incompatible with supported schema ${supportedVersion}`,
    );
    this.name = 'ReportCompatibilityError';
  }
}

export function assertCompatibleReportSchemaVersion(
  actualVersion: string,
  supportedVersion = CURRENT_REPORT_SCHEMA_VERSION,
): void {
  const actual = SemanticVersionSchema.parse(actualVersion);
  const supported = SemanticVersionSchema.parse(supportedVersion);
  if (compatibilityLine(actual) !== compatibilityLine(supported)) {
    throw new ReportCompatibilityError(actual, supported);
  }
}

export function parseCompatibleAnalysisReport(
  input: unknown,
  supportedVersion = CURRENT_REPORT_SCHEMA_VERSION,
): AnalysisReport {
  const envelope = ReportVersionEnvelopeSchema.parse(input);
  assertCompatibleReportSchemaVersion(
    envelope.context.versions.reportSchema.version,
    supportedVersion,
  );
  return AnalysisReportSchema.parse(input);
}

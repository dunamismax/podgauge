import {
  AnalysisContextSchema,
  type AnalysisContext,
} from '@podgauge/contracts';

const contextKeys = [
  'engineVersion',
  'policyVersion',
  'cardDataVersion',
  'benchmarkVersion',
  'reportSchemaVersion',
  'simulationVersion',
  'seed',
] as const satisfies readonly (keyof AnalysisContext)[];

export function createContextFingerprint(input: AnalysisContext): string {
  const context = AnalysisContextSchema.parse(input);
  return contextKeys.map((key) => `${key}=${context[key]}`).join('|');
}

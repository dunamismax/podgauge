import { AnalysisContextSchema, stableSerialize } from '@podgauge/contracts';

export function createContextFingerprint(input: unknown): string {
  const context = AnalysisContextSchema.parse(input);
  return stableSerialize(context);
}

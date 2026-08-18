import {
  parseAnalysisJobForExecution,
  type AnalyzeDeckJobPayload,
} from '@podgauge/contracts';

/** Revalidates serialized jobs immediately before worker execution. */
export function readAnalysisJobAtWorkerBoundary(
  input: unknown,
): AnalyzeDeckJobPayload {
  return parseAnalysisJobForExecution(input);
}

const statusLabels = {
  blocked: 'Blocked',
  ready: 'Ready',
  unknown: 'Unknown',
} as const;

export type FoundationStatus = keyof typeof statusLabels;

export function formatFoundationStatus(status: FoundationStatus): string {
  return statusLabels[status];
}

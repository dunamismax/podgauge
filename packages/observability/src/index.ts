const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'deck',
  'email',
  'password',
  'secret',
  'token',
]);

export function redactRecord(
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : value,
    ]),
  );
}

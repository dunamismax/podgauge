import { z } from 'zod';

export const databaseRoleNames = Object.freeze({
  backup: 'podgauge_backup',
  migration: 'podgauge_migration',
  web: 'podgauge_web',
  worker: 'podgauge_worker',
} as const);

export type DatabaseRole = keyof typeof databaseRoleNames;

const localDevelopmentPasswords = Object.freeze({
  backup: 'podgauge_backup_dev_only',
  migration: 'podgauge_migration_dev_only',
  web: 'podgauge_web_dev_only',
  worker: 'podgauge_worker_dev_only',
} as const satisfies Record<DatabaseRole, string>);

export const localDevelopmentDatabaseUrls = Object.freeze(
  Object.fromEntries(
    (Object.keys(databaseRoleNames) as DatabaseRole[]).map((role) => [
      role,
      `postgres://${databaseRoleNames[role]}:${localDevelopmentPasswords[role]}@127.0.0.1:54329/podgauge`,
    ]),
  ) as Readonly<Record<DatabaseRole, string>>,
);

export const localDevelopmentRoleBootstrapDatabaseUrl =
  'postgres://podgauge:podgauge_dev_only@127.0.0.1:54329/podgauge';

const REDACTED = '[REDACTED]';
const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');

export class ConfigurationError extends Error {
  override readonly name = 'ConfigurationError';

  constructor(
    readonly target: ConfigurationTarget,
    readonly issues: readonly string[],
  ) {
    super(`Invalid ${target} configuration: ${issues.join('; ')}`);
  }
}

/** A secret whose default string, JSON, and Node inspection forms are redacted. */
export class SecretValue {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static from(value: string): SecretValue {
    return new SecretValue(value);
  }

  reveal(): string {
    return this.#value;
  }

  toJSON(): string {
    return REDACTED;
  }

  toString(): string {
    return REDACTED;
  }

  [inspectSymbol](): string {
    return REDACTED;
  }
}

export type ConfigurationTarget =
  'backup' | 'migration' | 'role-bootstrap' | 'test' | 'web' | 'worker';
export type DeploymentEnvironment = 'development' | 'production' | 'test';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

type DatabaseConfiguration = Readonly<{
  databaseUrl: SecretValue;
  databaseRole: DatabaseRole;
  environment: DeploymentEnvironment;
}>;

export type WebConfiguration = DatabaseConfiguration &
  Readonly<{
    bodySizeLimitBytes: number;
    host: string;
    logLevel: LogLevel;
    origin: URL;
    port: number;
    runtime: 'web';
    shutdownTimeoutSeconds: number;
  }>;

export type WorkerConfiguration = DatabaseConfiguration &
  Readonly<{
    concurrency: 1;
    jobTimeoutSeconds: number;
    logLevel: LogLevel;
    runtime: 'worker';
    shutdownTimeoutSeconds: number;
  }>;

export type MigrationConfiguration = DatabaseConfiguration &
  Readonly<{
    maxConnections: 1;
    runtime: 'migration';
  }>;

export type BackupConfiguration = DatabaseConfiguration &
  Readonly<{
    runtime: 'backup';
  }>;

export type RoleBootstrapConfiguration = Readonly<{
  adminDatabaseUrl: SecretValue;
  environment: DeploymentEnvironment;
  passwords: Readonly<Record<DatabaseRole, SecretValue>>;
  runtime: 'role-bootstrap';
}>;

export type TestConfiguration = Readonly<{
  databaseUrl: SecretValue;
  environment: 'test';
  runDatabaseIntegration: boolean;
  runtime: 'test';
  seed: string;
}>;

const NodeEnvironmentSchema = z.enum(['development', 'production', 'test']);
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
const PortSchema = z.coerce.number().int().min(1_024).max(65_535);
const ShutdownTimeoutSchema = z.coerce.number().int().min(1).max(300);
const OneSchema = z.coerce.number().int().pipe(z.literal(1));
const TestSeedSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u, 'must be a stable token');

const knownModeKeys = {
  backup: [],
  migration: ['PODGAUGE_MIGRATION_MAX_CONNECTIONS'],
  'role-bootstrap': [
    'PODGAUGE_ROLE_BOOTSTRAP_DATABASE_URL',
    'PODGAUGE_BACKUP_DATABASE_PASSWORD',
    'PODGAUGE_MIGRATION_DATABASE_PASSWORD',
    'PODGAUGE_WEB_DATABASE_PASSWORD',
    'PODGAUGE_WORKER_DATABASE_PASSWORD',
  ],
  test: [
    'PODGAUGE_RUN_DB_INTEGRATION',
    'PODGAUGE_TEST_DATABASE_URL',
    'PODGAUGE_TEST_SEED',
  ],
  web: [
    'ADDRESS_HEADER',
    'BODY_SIZE_LIMIT',
    'HOST',
    'ORIGIN',
    'PORT',
    'SHUTDOWN_TIMEOUT',
    'XFF_DEPTH',
  ],
  worker: [
    'PODGAUGE_WORKER_CONCURRENCY',
    'PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS',
    'PODGAUGE_WORKER_SHUTDOWN_TIMEOUT_SECONDS',
  ],
} as const satisfies Record<ConfigurationTarget, readonly string[]>;

function parseEnvironment(
  target: ConfigurationTarget,
  environment: EnvironmentSource,
): DeploymentEnvironment {
  return parseField(
    target,
    'NODE_ENV',
    NodeEnvironmentSchema,
    environment.NODE_ENV ?? 'development',
  );
}

function parseField<Output>(
  target: ConfigurationTarget,
  name: string,
  schema: z.ZodType<Output>,
  value: unknown,
): Output {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => issue.message).join(', ');
  throw new ConfigurationError(target, [`${name} ${details}`]);
}

function assertNoCrossModeKeys(
  target: ConfigurationTarget,
  environment: EnvironmentSource,
  additionallyAllowed: readonly ConfigurationTarget[] = [],
): void {
  const allowed = new Set<ConfigurationTarget>([
    target,
    ...additionallyAllowed,
  ]);
  const issues: string[] = [];

  for (const [owner, keys] of Object.entries(knownModeKeys) as Array<
    [ConfigurationTarget, readonly string[]]
  >) {
    if (allowed.has(owner)) continue;
    for (const key of keys) {
      if (environment[key] !== undefined) {
        issues.push(`${key} belongs to ${owner} configuration`);
      }
    }
  }

  if (issues.length > 0) throw new ConfigurationError(target, issues);
}

function parseDatabaseUrl(
  target: ConfigurationTarget,
  environment: DeploymentEnvironment,
  rawValue: string | undefined,
  expectedRole?: DatabaseRole,
): SecretValue {
  const value =
    rawValue ??
    (environment === 'development' && expectedRole !== undefined
      ? localDevelopmentDatabaseUrls[expectedRole]
      : undefined);

  if (value === undefined) {
    throw new ConfigurationError(target, [
      `${target === 'test' ? 'PODGAUGE_TEST_DATABASE_URL' : 'DATABASE_URL'} is required`,
    ]);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(target, ['database URL must be a valid URL']);
  }

  const issues: string[] = [];
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    issues.push('database URL must use postgres:// or postgresql://');
  }
  if (parsed.hostname.length === 0) issues.push('database URL requires a host');
  if (parsed.username.length === 0 || parsed.password.length === 0) {
    issues.push('database URL requires explicit credentials');
  }
  if (parsed.pathname.length <= 1) {
    issues.push('database URL requires a database name');
  }
  if (parsed.hash.length > 0)
    issues.push('database URL cannot include a fragment');
  if (
    expectedRole !== undefined &&
    parsed.username !== databaseRoleNames[expectedRole]
  ) {
    issues.push(
      `database URL must use the ${databaseRoleNames[expectedRole]} role`,
    );
  }
  if (
    environment === 'production' &&
    (Object.values(localDevelopmentDatabaseUrls).includes(value) ||
      parsed.username === 'podgauge' ||
      parsed.password.endsWith('_dev_only'))
  ) {
    issues.push('production cannot use documented local credentials');
  }

  if (issues.length > 0) throw new ConfigurationError(target, issues);
  return SecretValue.from(value);
}

function parseRolePassword(
  target: ConfigurationTarget,
  name: string,
  environment: DeploymentEnvironment,
  value: string | undefined,
  developmentDefault: string,
): SecretValue {
  const candidate =
    value ?? (environment === 'development' ? developmentDefault : undefined);
  if (candidate === undefined) {
    throw new ConfigurationError(target, [`${name} is required`]);
  }
  if (
    candidate.length < 16 ||
    candidate.length > 256 ||
    /[\r\n\0]/u.test(candidate)
  ) {
    throw new ConfigurationError(target, [
      `${name} must contain 16 to 256 non-control characters`,
    ]);
  }
  if (environment === 'production' && candidate.endsWith('_dev_only')) {
    throw new ConfigurationError(target, [
      `${name} cannot use a documented local credential in production`,
    ]);
  }
  return SecretValue.from(candidate);
}

function parseLogLevel(
  target: ConfigurationTarget,
  environment: DeploymentEnvironment,
  value: string | undefined,
): LogLevel {
  if (environment === 'production' && value === undefined) {
    throw new ConfigurationError(target, [
      'PODGAUGE_LOG_LEVEL is required in production',
    ]);
  }
  return parseField(
    target,
    'PODGAUGE_LOG_LEVEL',
    LogLevelSchema,
    value ?? (environment === 'test' ? 'error' : 'info'),
  );
}

function parseOrigin(
  target: ConfigurationTarget,
  environment: DeploymentEnvironment,
  value: string | undefined,
): URL {
  const candidate =
    value ??
    (environment === 'development' ? 'http://127.0.0.1:5173' : undefined);
  if (candidate === undefined) {
    throw new ConfigurationError(target, ['ORIGIN is required']);
  }

  let origin: URL;
  try {
    origin = new URL(candidate);
  } catch {
    throw new ConfigurationError(target, ['ORIGIN must be a valid URL']);
  }

  const issues: string[] = [];
  if (!['http:', 'https:'].includes(origin.protocol)) {
    issues.push('ORIGIN must use http:// or https://');
  }
  if (environment === 'production' && origin.protocol !== 'https:') {
    issues.push('production ORIGIN must use https://');
  }
  if (origin.username.length > 0 || origin.password.length > 0) {
    issues.push('ORIGIN cannot contain credentials');
  }
  if (
    origin.pathname !== '/' ||
    origin.search.length > 0 ||
    origin.hash.length > 0
  ) {
    issues.push('ORIGIN cannot contain a path, query, or fragment');
  }
  if (issues.length > 0) throw new ConfigurationError(target, issues);
  return origin;
}

function parseBodySizeLimit(
  target: ConfigurationTarget,
  value: string | undefined,
): number {
  const candidate = value ?? '256K';
  const match = /^(\d+)([KM]?)$/u.exec(candidate);
  if (!match) {
    throw new ConfigurationError(target, [
      'BODY_SIZE_LIMIT must be an integer optionally followed by K or M',
    ]);
  }

  const amount = Number(match[1]);
  const multiplier =
    match[2] === 'M' ? 1_048_576 : match[2] === 'K' ? 1_024 : 1;
  const bytes = amount * multiplier;
  if (!Number.isSafeInteger(bytes) || bytes < 1_024 || bytes > 256 * 1_024) {
    throw new ConfigurationError(target, [
      'BODY_SIZE_LIMIT must be between 1K and 256K',
    ]);
  }
  return bytes;
}

function parseHost(
  target: ConfigurationTarget,
  value: string | undefined,
): string {
  const host = value ?? '127.0.0.1';
  if (
    host.length > 253 ||
    !/^(?:\[[0-9A-Fa-f:]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)$/u.test(
      host,
    )
  ) {
    throw new ConfigurationError(target, ['HOST is malformed']);
  }
  return host;
}

export function readWebConfiguration(
  environment: EnvironmentSource,
): WebConfiguration {
  const deployment = parseEnvironment('web', environment);
  assertNoCrossModeKeys(
    'web',
    environment,
    deployment === 'test' ? ['test'] : [],
  );

  if (
    environment.ADDRESS_HEADER !== undefined ||
    environment.XFF_DEPTH !== undefined
  ) {
    throw new ConfigurationError('web', [
      'forwarded-address trust is disabled until the production network mode is selected',
    ]);
  }

  if (deployment === 'production') {
    const missing = [
      'HOST',
      'PORT',
      'BODY_SIZE_LIMIT',
      'SHUTDOWN_TIMEOUT',
    ].filter((key) => environment[key] === undefined);
    if (missing.length > 0) {
      throw new ConfigurationError(
        'web',
        missing.map((key) => `${key} is required in production`),
      );
    }
  }

  return Object.freeze({
    bodySizeLimitBytes: parseBodySizeLimit('web', environment.BODY_SIZE_LIMIT),
    databaseUrl: parseDatabaseUrl(
      'web',
      deployment,
      environment.DATABASE_URL,
      'web',
    ),
    databaseRole: 'web',
    environment: deployment,
    host: parseHost('web', environment.HOST),
    logLevel: parseLogLevel('web', deployment, environment.PODGAUGE_LOG_LEVEL),
    origin: parseOrigin('web', deployment, environment.ORIGIN),
    port: parseField('web', 'PORT', PortSchema, environment.PORT ?? '5173'),
    runtime: 'web',
    shutdownTimeoutSeconds: parseField(
      'web',
      'SHUTDOWN_TIMEOUT',
      ShutdownTimeoutSchema,
      environment.SHUTDOWN_TIMEOUT ?? '30',
    ),
  });
}

export function readWorkerConfiguration(
  environment: EnvironmentSource,
): WorkerConfiguration {
  const deployment = parseEnvironment('worker', environment);
  assertNoCrossModeKeys(
    'worker',
    environment,
    deployment === 'test' ? ['test'] : [],
  );

  return Object.freeze({
    concurrency: parseField(
      'worker',
      'PODGAUGE_WORKER_CONCURRENCY',
      OneSchema,
      environment.PODGAUGE_WORKER_CONCURRENCY ?? '1',
    ),
    databaseUrl: parseDatabaseUrl(
      'worker',
      deployment,
      environment.DATABASE_URL,
      'worker',
    ),
    databaseRole: 'worker',
    environment: deployment,
    jobTimeoutSeconds: parseField(
      'worker',
      'PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS',
      z.coerce.number().int().min(1).max(3_600),
      environment.PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS ?? '300',
    ),
    logLevel: parseLogLevel(
      'worker',
      deployment,
      environment.PODGAUGE_LOG_LEVEL,
    ),
    runtime: 'worker',
    shutdownTimeoutSeconds: parseField(
      'worker',
      'PODGAUGE_WORKER_SHUTDOWN_TIMEOUT_SECONDS',
      ShutdownTimeoutSchema,
      environment.PODGAUGE_WORKER_SHUTDOWN_TIMEOUT_SECONDS ?? '30',
    ),
  });
}

export function readMigrationConfiguration(
  environment: EnvironmentSource,
): MigrationConfiguration {
  const deployment = parseEnvironment('migration', environment);
  assertNoCrossModeKeys(
    'migration',
    environment,
    deployment === 'test' ? ['test'] : [],
  );

  return Object.freeze({
    databaseUrl: parseDatabaseUrl(
      'migration',
      deployment,
      environment.DATABASE_URL,
      'migration',
    ),
    databaseRole: 'migration',
    environment: deployment,
    maxConnections: parseField(
      'migration',
      'PODGAUGE_MIGRATION_MAX_CONNECTIONS',
      OneSchema,
      environment.PODGAUGE_MIGRATION_MAX_CONNECTIONS ?? '1',
    ),
    runtime: 'migration',
  });
}

export function readBackupConfiguration(
  environment: EnvironmentSource,
): BackupConfiguration {
  const deployment = parseEnvironment('backup', environment);
  assertNoCrossModeKeys('backup', environment);

  return Object.freeze({
    databaseRole: 'backup',
    databaseUrl: parseDatabaseUrl(
      'backup',
      deployment,
      environment.DATABASE_URL,
      'backup',
    ),
    environment: deployment,
    runtime: 'backup',
  });
}

export function readRoleBootstrapConfiguration(
  environment: EnvironmentSource,
): RoleBootstrapConfiguration {
  const deployment = parseEnvironment('role-bootstrap', environment);
  assertNoCrossModeKeys('role-bootstrap', environment);
  const adminDatabaseUrl = parseDatabaseUrl(
    'role-bootstrap',
    deployment,
    environment.PODGAUGE_ROLE_BOOTSTRAP_DATABASE_URL ??
      (deployment === 'development'
        ? localDevelopmentRoleBootstrapDatabaseUrl
        : undefined),
  );
  const adminUsername = new URL(adminDatabaseUrl.reveal()).username;
  if (
    Object.values(databaseRoleNames).some(
      (roleName) => roleName === adminUsername,
    )
  ) {
    throw new ConfigurationError('role-bootstrap', [
      'bootstrap database URL cannot use an application role',
    ]);
  }

  return Object.freeze({
    adminDatabaseUrl,
    environment: deployment,
    passwords: Object.freeze({
      backup: parseRolePassword(
        'role-bootstrap',
        'PODGAUGE_BACKUP_DATABASE_PASSWORD',
        deployment,
        environment.PODGAUGE_BACKUP_DATABASE_PASSWORD,
        localDevelopmentPasswords.backup,
      ),
      migration: parseRolePassword(
        'role-bootstrap',
        'PODGAUGE_MIGRATION_DATABASE_PASSWORD',
        deployment,
        environment.PODGAUGE_MIGRATION_DATABASE_PASSWORD,
        localDevelopmentPasswords.migration,
      ),
      web: parseRolePassword(
        'role-bootstrap',
        'PODGAUGE_WEB_DATABASE_PASSWORD',
        deployment,
        environment.PODGAUGE_WEB_DATABASE_PASSWORD,
        localDevelopmentPasswords.web,
      ),
      worker: parseRolePassword(
        'role-bootstrap',
        'PODGAUGE_WORKER_DATABASE_PASSWORD',
        deployment,
        environment.PODGAUGE_WORKER_DATABASE_PASSWORD,
        localDevelopmentPasswords.worker,
      ),
    }),
    runtime: 'role-bootstrap',
  });
}

export function readTestConfiguration(
  environment: EnvironmentSource,
): TestConfiguration {
  if (environment.NODE_ENV !== 'test') {
    throw new ConfigurationError('test', ['NODE_ENV must be test']);
  }
  assertNoCrossModeKeys('test', environment);

  const integrationFlag = parseField(
    'test',
    'PODGAUGE_RUN_DB_INTEGRATION',
    z.enum(['0', '1']),
    environment.PODGAUGE_RUN_DB_INTEGRATION ?? '0',
  );

  return Object.freeze({
    databaseUrl: parseDatabaseUrl(
      'test',
      'test',
      environment.PODGAUGE_TEST_DATABASE_URL,
    ),
    environment: 'test',
    runDatabaseIntegration: integrationFlag === '1',
    runtime: 'test',
    seed: parseField(
      'test',
      'PODGAUGE_TEST_SEED',
      TestSeedSchema,
      environment.PODGAUGE_TEST_SEED,
    ),
  });
}

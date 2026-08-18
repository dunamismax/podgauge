# Local development

PodGauge currently provides a minimal SSR web application, a separate graceful
worker, pure package boundaries, a portable generated contract layer, validated
server-only runtime configuration, a durable PostgreSQL core schema,
least-privilege database roles, and Testcontainers-backed database evidence. It
also has a PostgreSQL-backed Graphile Worker queue boundary, but does not parse,
analyze, or accept deck-analysis submissions yet.

## Prerequisites

- Git
- Node.js `24.19.0` (Node 24 LTS; `.node-version` and `.tool-versions` are
  committed)
- Corepack and the repository-pinned pnpm `11.22.0`
- Docker Engine/Desktop with Docker Compose v2 for PostgreSQL

No global pnpm, Svelte, TypeScript, or database tool is required. With `mise`,
run `mise install` from the repository root. Otherwise install the exact Node 24
release with your normal version manager. Confirm `node --version` before
installing dependencies; the repository rejects other Node majors.

## Clean-clone setup

```sh
git clone https://github.com/dunamismax/podgauge.git
cd podgauge
corepack enable
corepack pnpm install --frozen-lockfile
docker compose up -d --wait postgres
corepack pnpm db:roles
corepack pnpm db:migrate
corepack pnpm queue:migrate
corepack pnpm db:seed
corepack pnpm dev
```

The web app listens on `http://127.0.0.1:5173`. The worker runs as a separate
process and reports JSON `ready` and `stopped` lifecycle events. PostgreSQL is
published only on loopback at port `54329`; the official image is fixed to the
PostgreSQL 18.4 multi-architecture digest recorded in `compose.yaml`.
Credentials in `.env.example` are deliberately local-only and must never be
reused in a shared environment. The Compose `podgauge` login is an
administrator used only by `db:roles`; it is not an application credential.

Copy `.env.example` to `.env` only when overriding web or Compose development
defaults. `.env` files are ignored. Keep commented worker, migration, and test
variables out of the web environment unless that process owns them; recognized
cross-mode settings fail closed. The application foundation currently needs no
third-party credentials.

`@podgauge/config` validates distinct web, worker, migration, backup,
administrator-only role-bootstrap, and test targets. A target's `DATABASE_URL`
must use its exact `podgauge_web`, `podgauge_worker`, `podgauge_migration`, or
`podgauge_backup` login; cross-role credentials fail closed. Only the documented
loopback development profile has safe defaults. Production role bootstrap
requires `PODGAUGE_ROLE_BOOTSTRAP_DATABASE_URL` plus four explicit role password
values, and production processes require explicit role-scoped URLs. Production
web startup also requires `PODGAUGE_LOG_LEVEL`, an HTTPS `ORIGIN`, `HOST`,
`PORT`, `BODY_SIZE_LIMIT`, and `SHUTDOWN_TIMEOUT`; database URLs and
credential-bearing origins are never safe client data. Forwarded-address
variables remain rejected until the production network owner decision is
implemented. The worker remains fixed at one CPU-heavy job per process.
`PODGAUGE_WORKER_JOB_TIMEOUT_SECONDS` bounds each task independently of the
bounded graceful-shutdown timeout.

## Commands

| Command                                         | Purpose                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `corepack pnpm dev`                             | Build shared packages and run web plus worker development processes                        |
| `corepack pnpm --filter @podgauge/worker smoke` | Start and gracefully stop the worker without PostgreSQL                                    |
| `corepack pnpm format` / `format:check`         | Write or verify repository formatting                                                      |
| `corepack pnpm lint`                            | Run ESLint and package/engine dependency guards                                            |
| `corepack pnpm check`                           | Run strict TypeScript and Svelte diagnostics                                               |
| `corepack pnpm contracts:generate`              | Regenerate JSON Schema and OpenAPI from authoritative Zod schemas                          |
| `corepack pnpm contracts:check`                 | Fail when checked-in contract artifacts drift from their Zod sources                       |
| `corepack pnpm test`                            | Run unit, component, and property tests                                                    |
| `corepack pnpm test:integration`                | Exercise the worker and opt-in real PostgreSQL integration paths                           |
| `corepack pnpm test:e2e`                        | Run the built app in Chromium, Firefox, and WebKit with axe checks                         |
| `corepack pnpm build`                           | Produce package, worker, and adapter-node web builds                                       |
| `corepack pnpm verify`                          | Run formatting, lint, diagnostics, tests, integration smoke, build, and client-secret scan |
| `corepack pnpm db:generate`                     | Generate reviewed SQL when the Drizzle schema changes                                      |
| `corepack pnpm db:roles`                        | Bootstrap or repair the four least-privilege PostgreSQL roles                              |
| `corepack pnpm db:migrate`                      | Apply committed development migrations                                                     |
| `corepack pnpm queue:migrate`                   | Apply Graphile Worker migrations as the migration owner, then runtime grants               |
| `corepack pnpm db:seed`                         | Idempotently seed the tiny foundation metadata fixture                                     |
| `corepack pnpm data:sync`                       | Report the fail-closed external-source state; it downloads nothing yet                     |
| `corepack pnpm benchmark`                       | Run the deterministic foundation micro-smoke, not a scoring claim                          |

Install Playwright browsers once after dependency installation:

```sh
corepack pnpm exec playwright install chromium firefox webkit
```

With the migrated development PostgreSQL service running, include its live
smoke and isolated Phase 3 database suite in the integration command:

```sh
PODGAUGE_RUN_DB_INTEGRATION=1 corepack pnpm test:integration
```

CI always runs this database path. The Compose smoke reads only the local
development database. Separately, the Phase 3 suites use Testcontainers 12.1.0
(MIT, Node `>=22.22`) to own a digest-pinned PostgreSQL 18.4 container; it does
not create databases in or mutate the Compose service. The suite applies the
foundation migration and then the remaining forward migration, reruns role
bootstrap after objects exist, exercises allowed and denied operations for all
four roles, repository rollback and constraints, genuinely concurrent
idempotency, and representative index plans. A separate owned container applies
and safely reruns Graphile migrations, then exercises queue-role denials,
stable-key deduplication, serial execution, retry bounds, runtime payload
validation, timeouts, and shutdown cancellation. Testcontainers stops every
container on completion. Without the explicit flag, the database integration
files are skipped so the fast gate remains usable on a machine without Docker.

## Database roles and existing volumes

Run `db:roles` before the first migration. It creates or repairs the fixed role
names, makes `podgauge_migration` the sole application-object owner, revokes
public schema creation, removes unexpected memberships, and rotates each role's
password to the supplied value. `db:migrate` then reapplies the reviewed object
grant manifest after every forward migration. Web and worker receive only their
listed DML; backup receives `SELECT`; none receives DDL ownership or elevated
role attributes.

For a volume created before role separation, use the same data-preserving path:

```sh
docker compose up -d --wait postgres
corepack pnpm db:roles
corepack pnpm db:migrate
corepack pnpm queue:migrate
corepack pnpm db:seed
```

The bootstrap is idempotent and transfers existing `public`, Drizzle, and
Graphile Worker objects to the migration owner. It does not drop a database,
schema, table, or volume. `queue:migrate` is also rerunnable; it applies the
exact dependency's forward migrations before reapplying the reviewed queue
grants and RLS policies. Review `packages/db/roles/bootstrap.sql`, `grants.sql`,
and `graphile-grants.sql` before production use.
Load production URLs and passwords through the deployment's secret mechanism;
never place them in shell history, command arguments, Git, images, or logs.

## Queue boundary

The worker uses the fixed `analyze_deck` task and `analysis_cpu` queue. Payloads
are validated from shared contracts both before enqueue and immediately before
execution. The analysis ID forms a stable pending-job key, retry counts come
from the validated payload, process concurrency is fixed at one, and stuck work
is aborted at the configured timeout. Shutdown first waits for cooperative work
for its configured bound, then explicitly unlocks this worker pool's job so a
later process can retry it.

Graphile Worker runs with `podgauge_worker`, which has queue DML, routine, and
explicit RLS-policy access but no schema ownership or DDL. Only
`queue:migrate`, using `podgauge_migration`, may change the queue schema. Queue
logs intentionally allowlist structural level and scope fields and discard
free-form messages and metadata so job payloads, deck contents, and credential
values cannot enter process output. Full Pino observability remains a later
Phase 3 item.

No public producer or scanner executor exists yet. Manually adding a valid job
will reach a fail-closed placeholder and exhaust only its configured attempts;
the next checklist item owns atomic analysis-record creation and enqueueing.

## Fixtures and external data

The idempotent seed still writes only a `foundation-v1` metadata row. The
repository includes
tiny independently authored synthetic contract fixtures, but no approved
card-data snapshot or external import. `data:sync` intentionally lists every
source as blocked until its current terms, retention, redistribution,
attribution, and provenance review is approved under
`docs/data-governance.md`.

## Troubleshooting

- **Engine mismatch:** select Node `24.19.0`; Node 26 may appear to work but is
  not the pinned production line and does not satisfy verification.
- **Corepack signature or shim issue:** update the Corepack installation through
  the official Node/Corepack path, run `corepack enable`, and retry. Do not
  replace the exact `packageManager` field.
- **PostgreSQL port in use:** stop the conflicting local service or change the
  loopback host port and `DATABASE_URL` together. Do not publish PostgreSQL on
  all interfaces.
- **Migration connection refused:** run `docker compose up -d --wait postgres`
  and inspect `docker compose ps` plus `docker compose logs postgres`.
- **Migration role missing or denied:** run `corepack pnpm db:roles` once with
  the administrator-only bootstrap environment, then rerun the migration. This
  is the required upgrade step for pre-role-separation volumes.
- **Queue schema missing or denied:** run `corepack pnpm queue:migrate` with the
  migration-role URL after `db:migrate`; never grant DDL to the worker login.
- **Missing Playwright executable:** run the browser installation command above.
- **Stale build output:** remove ignored `dist`, `build`, and `.svelte-kit`
  directories, then rerun `corepack pnpm verify`. Do not delete source or the
  PostgreSQL volume.
- **Contract drift:** run `corepack pnpm contracts:generate`, review the JSON
  diff, and rerun `corepack pnpm contracts:check`. Do not edit generated JSON
  by hand.
- **Configuration failure:** read the named target and field in the
  non-sensitive `ConfigurationError`. Do not print `process.env` or reveal a
  `SecretValue` to diagnose it.
- **Testcontainers unavailable:** verify Docker is running and that the current
  Docker context is accessible. The Phase 3 suite owns an isolated container
  and intentionally does not fall back to the Compose database.

## Teardown

`docker compose down` stops containers and preserves the named PostgreSQL
volume. `docker compose down --volumes` permanently deletes local database data
and should be used only after explicitly deciding that the data is disposable.

# Local development

PodGauge currently provides a minimal SSR web application, a separate graceful
worker, pure package boundaries, and a development PostgreSQL schema. It does
not analyze decks yet.

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
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

The web app listens on `http://127.0.0.1:5173`. The worker runs as a separate
process and reports JSON `ready` and `stopped` lifecycle events. PostgreSQL is
published only on loopback at port `54329`; the official image is fixed to the
PostgreSQL 18.4 multi-architecture digest recorded in `compose.yaml`.
Credentials in `.env.example` are deliberately local-only and must never be
reused in a shared environment.

Copy `.env.example` to `.env` only when overriding defaults. `.env` files are
ignored. The application foundation currently needs no third-party credentials.

## Commands

| Command                                         | Purpose                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `corepack pnpm dev`                             | Build shared packages and run web plus worker development processes    |
| `corepack pnpm --filter @podgauge/worker smoke` | Start and gracefully stop the worker without PostgreSQL                |
| `corepack pnpm format` / `format:check`         | Write or verify repository formatting                                  |
| `corepack pnpm lint`                            | Run ESLint and package/engine dependency guards                        |
| `corepack pnpm check`                           | Run strict TypeScript and Svelte diagnostics                           |
| `corepack pnpm test`                            | Run unit, component, and property tests                                |
| `corepack pnpm test:integration`                | Exercise the worker as a real child process                            |
| `corepack pnpm test:e2e`                        | Run the built app in Chromium, Firefox, and WebKit with axe checks     |
| `corepack pnpm build`                           | Produce package, worker, and adapter-node web builds                   |
| `corepack pnpm verify`                          | Run formatting, lint, diagnostics, tests, integration smoke, and build |
| `corepack pnpm db:generate`                     | Generate reviewed SQL when the Drizzle schema changes                  |
| `corepack pnpm db:migrate`                      | Apply committed development migrations                                 |
| `corepack pnpm db:seed`                         | Idempotently seed the tiny foundation metadata fixture                 |
| `corepack pnpm data:sync`                       | Report the fail-closed external-source state; it downloads nothing yet |
| `corepack pnpm benchmark`                       | Run the deterministic foundation micro-smoke, not a scoring claim      |

Install Playwright browsers once after dependency installation:

```sh
corepack pnpm exec playwright install chromium firefox webkit
```

With the migrated development PostgreSQL service running, include its live
smoke in the integration command:

```sh
PODGAUGE_RUN_DB_INTEGRATION=1 corepack pnpm test:integration
```

CI always runs this database path. Without the explicit flag, the database test
is skipped so the fast gate remains usable on a machine without Docker.

## Fixtures and external data

The seed writes only a `foundation-v1` metadata row. There is no card-data
fixture or external import yet. `data:sync` intentionally lists every source as
blocked until its current terms, retention, redistribution, attribution, and
provenance review is approved under `docs/data-governance.md`.

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
- **Missing Playwright executable:** run the browser installation command above.
- **Stale generated state:** remove ignored `dist`, `build`, and `.svelte-kit`
  directories, then rerun `corepack pnpm verify`. Do not delete source or the
  PostgreSQL volume.

## Teardown

`docker compose down` stops containers and preserves the named PostgreSQL
volume. `docker compose down --volumes` permanently deletes local database data
and should be used only after explicitly deciding that the data is disposable.

# `@podgauge/db`

Reviewed Drizzle schema, forward-only SQL migrations, least-privilege database
roles, and contract-validating repositories for PodGauge.

## Role boundary

- `podgauge_migration` owns the database, application schemas, tables, and
  routines. It can run the reviewed migration workflow but has no superuser,
  role-creation, database-creation, replication, inheritance, or RLS-bypass
  attribute.
- `podgauge_web` can read application state and perform the current account,
  deck, analysis-request, pod, and audit writes. It cannot write worker-owned
  results or create database objects.
- `podgauge_worker` can read application state and write source/version data,
  analysis progress/results, and audit events. It cannot create database
  objects.
- `podgauge_backup` can read application tables and sequences for logical
  backup. It cannot mutate data or create database objects.

`roles/bootstrap.sql` contains deterministic role attributes, ownership repair,
schema hardening, and default privileges. `roles/grants.sql` is the explicit
application-object grant manifest reapplied after every Drizzle migration.
`roles/graphile-grants.sql` grants queue DML and RLS policies to the worker plus
read-only backup access after Graphile's own migration command. Passwords are
bound by `db:roles`; no SQL artifact contains credentials.
Password rotation uses bound session-local settings and server-side quoting, so
password values never become command text or command output.

Run `pnpm db:roles` with the administrator-only bootstrap configuration before
the first migration and after upgrading an older development volume. The
command is safe to rerun: it repairs ownership, strips unexpected role
memberships and elevated attributes, and rotates the four application-role
passwords to the supplied values. Production has no credential defaults.

## Integration evidence

The opt-in Compose smoke confirms the migrated development service and seed.
The Phase 3 suite is separately managed by Testcontainers: it starts and stops
its own digest-pinned PostgreSQL 18.4 container, bootstraps roles, applies an
initial migration followed by forward migrations, exercises repository
transactions and constraints, races idempotency attempts, and inspects plans
for representative indexed queries. A second Testcontainers-owned database
proves Graphile migration ownership, runtime DDL denial, queue RLS, retries,
deduplication, timeouts, and cancellation. CI always enables these paths.

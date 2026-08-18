# Compose assets

The repository-root `compose.yaml` is the verified development PostgreSQL path.
Its `POSTGRES_*` login is an administrator used only by `pnpm db:roles`; web,
worker, migration, and backup connections use the separate roles documented in
`docs/development.md`. Run the rerunnable role bootstrap before migrations on a
clean database and once when upgrading a volume created before role separation;
then run both `db:migrate` and the migration-owner-only `queue:migrate` command.
Production web, worker, migration, and database definitions will live here only
after their hardening and secret boundaries satisfy Phase 12. Do not treat the
development file as a deployment manifest.

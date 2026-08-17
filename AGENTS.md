# PodGauge repository instructions

These instructions apply to every file in this repository.

## Sources of truth

Read `README.md`, `docs/spec.md`, and `BUILD.md` before changing behavior.
`README.md` is the public promise, `docs/spec.md` is the architecture and
security blueprint, and `BUILD.md` is the ordered execution tracker. Stop and
reconcile them in the same change if they disagree.

Preserve the TypeScript modular monolith, separate web and worker processes,
PostgreSQL-backed jobs, deterministic pure engine, private-by-default data,
explicit version tuple, evidence-backed results, progressive enhancement, and
self-hosted deployment described there. Foundational deviations require an
accepted ADR supported by a measured need.

## Package boundaries

- `apps/web` owns SvelteKit pages, endpoints, authorization, and HTTP concerns.
- `apps/worker` owns slow, retryable, scheduled, and resource-bounded work.
- `packages/contracts` owns runtime schemas and portable serialized contracts.
- `packages/engine` is pure and deterministic. It may depend only on contracts
  and explicit data interfaces. It must not read the network, database,
  filesystem, environment, clock, locale, or global randomness.
- `packages/policy` owns versioned Commander policy data and evaluation.
- `packages/card-data` owns normalization and source-adapter boundaries.
- `packages/db` owns Drizzle schemas, reviewed migrations, and repositories.
- `packages/ui` owns reusable accessible UI and semantic design tokens.
- `packages/observability` owns logging, tracing, metrics, and redaction.

Dependency direction is checked by `pnpm lint`. Do not bypass it with relative
imports across packages or duplicate a shared contract in an application.

## Implementation and generated files

Use strict TypeScript and validate every untrusted boundary at runtime. Keep
production versions exact through the lockfile. Add a dependency only after
confirming its owner, need, current stable compatibility, and license.

Generated output is committed only when its source, generation command, and a
drift check are committed too. Generated SQL must remain human-reviewable.
Never commit secrets, credentials, private deck data, caches, build output,
editor state, or machine-specific files. Third-party datasets may not enter the
repository until the review required by `docs/data-governance.md` is approved.

## Verification and tracker rules

Run focused checks while working and the broadest applicable gates before
handoff. The Phase 1 baseline is:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm test:e2e
docker compose config
git diff --check
```

Record exact failures and narrower evidence when an environmental dependency is
unavailable. Check a `BUILD.md` box only when its entire wording is implemented
and verified. Keep `Active handoff`, `Current baseline`, `Known limits`, and
`Verification` accurate in the same change.

## Git handoff

Preserve unrelated work and inspect status, branch, history, and both remotes
before editing. Do not amend, rebase, reset, force-push, or add AI attribution.
Use focused imperative commits. When publishing is authorized, push the current
branch to the same branch on `origin` and `codeberg`, then use `git ls-remote`
to prove that both remote tips equal the local commit. Report any split state.

Owner decisions listed in `BUILD.md` remain owner decisions. Do not choose a
license, proxy mode, email provider, image registry, backup target, or private
security contact on the owner's behalf.

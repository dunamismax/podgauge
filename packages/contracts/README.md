# Portable contracts

`@podgauge/contracts` is the runtime-validated wire language shared by the web,
worker, database repositories, engine, card-data adapters, and benchmarks. It
has no SvelteKit, Drizzle, filesystem, network, environment, clock, locale, or
Node-only runtime dependency.

The package owns:

- prefixed branded identifiers that cannot use card names as durable identity;
- strict deck input, parsed entry, normalized card/face, commander, deck, and
  immutable revision schemas;
- immutable records for every member of the complete analysis version tuple;
- evidence, reason-code, finding, unknown, dependency, shared-failure, and
  provenance schemas without presentation prose;
- the versioned report, job/event, RFC 9457, and initial API schemas; and
- canonical report serialization, synchronous portable SHA-256, compatibility
  checks, and the schema registry used by generated artifacts.

All untrusted values enter through Zod `parse`/`safeParse`. The static brands
are an additional TypeScript guard, not a substitute for runtime parsing.

## Deterministic serialization

`stableSerialize` sorts plain-object keys by Unicode code unit and preserves
ordinary array order because arrays may be semantic. It rejects `undefined`,
non-finite numbers, sparse arrays, cycles, symbols, functions, bigints, and
non-plain objects instead of silently omitting or coercing them. It emits no
trailing newline.

`serializeAnalysisReport` first validates the report and sorts every explicitly
set-like report collection and reference list. `hashAnalysisReport` hashes
those exact UTF-8 bytes with SHA-256. The committed vectors under
`data/fixtures/contracts` cover standard UTF-8 inputs and a complete synthetic
report.

## Generated artifacts

Zod is authoritative for runtime refinements. The checked-in JSON Schema Draft
2020-12 and OpenAPI 3.1 artifacts provide portable structural contracts; some
cross-record invariants remain runtime-only because JSON Schema cannot express
them clearly.

```sh
corepack pnpm contracts:generate
corepack pnpm contracts:check
```

The first command is the only supported way to rewrite generated JSON. The
second is part of `corepack pnpm verify` and fails on missing, stale, or extra
generated schemas.

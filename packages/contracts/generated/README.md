# Generated contract artifacts

The JSON Schemas and OpenAPI 3.1 document in this directory are generated from
the strict Zod schemas in `packages/contracts/src`. They contain no source data
or implementation claim.

Regenerate and verify them from the repository root:

```sh
corepack pnpm contracts:generate
corepack pnpm contracts:check
```

`corepack pnpm verify` runs the drift check. Do not edit generated JSON by hand.

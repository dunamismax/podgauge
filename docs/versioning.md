# Versioning and compatibility

PodGauge versions every boundary that can change a result. Versions are valid
SemVer strings and are stored as data, not inferred from the running Git branch.
Pre-1.0 packages still follow the compatibility rules below; `0.y.0` is treated
as potentially breaking and `0.y.z` as compatible within the documented `y`
line.

| Surface       | Patch                                                          | Minor                                                                 | Major                                                                        |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Public API    | Backward-compatible fixes with unchanged wire shape            | Additive endpoints, optional request fields, or response fields       | Removed/renamed behavior, stricter accepted input, or incompatible semantics |
| Report schema | Clarification or validator fix that accepts the same documents | Additive optional fields/reason codes readable by older consumers     | Required/removal/type/meaning changes                                        |
| Engine        | Fix preserving documented methodology and output contract      | New evidence or supported behavior with documented report differences | Methodology/invariant or interpretation break                                |
| Policy        | Metadata/citation correction with no rule outcome change       | New effective snapshot or compatible rule addition                    | Rule-model semantics incompatible with prior evaluator                       |
| Card data     | Provenance/metadata correction without identity change         | New immutable snapshot or additive normalized fields                  | Canonical identity/schema reinterpretation requiring migration               |
| Benchmark     | Typo/metadata correction with unchanged cohort/metrics         | Additive fixtures or metrics with comparable protected split          | Cohort, split, metric, or leakage-rule break                                 |
| Simulation    | Implementation fix preserving specified model                  | Additive modeled behavior or assumption with declared output changes  | PRNG consumption, core assumptions, or result semantics break                |

Every report records engine, policy, card-data, benchmark, report-schema, and
simulation versions plus its seed. An absent version is invalid, not `current`.
Policy and card data additionally use immutable snapshot identifiers and
effective/retrieval dates.

API paths use `/api/v1` for breaking HTTP compatibility. Additive changes remain
in the current path. A breaking API release receives a new path and a documented
migration/support window. Report readers must ignore unknown optional fields;
writers must never emit a newer required shape under an older version.

The initial report-schema compatibility line is `0.1.x`. Additive experimental
data is confined to the explicit `extensions` object under namespaced `x-*`
keys, so an older strict reader can preserve or ignore it without accepting
unknown top-level shape. The compatibility reader accepts the same documented
line and rejects a different `0.y` line explicitly until a migration is
registered. Missing versions and unversioned top-level additions are invalid.

Any breaking change needs an ADR or migration note, compatibility tests, updated
fixtures, and a version increment in the same change. Score- or timing-affecting
changes also require benchmark before/after evidence once that harness exists.

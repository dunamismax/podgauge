# PodGauge glossary

This glossary defines public language. Engine contracts use stable reason codes
and structured evidence rather than treating this prose as executable policy.

## Results

- **Official bracket floor:** the lowest official Commander bracket allowed by
  the pinned policy snapshot, with every rule and card that raised the floor.
  It is a policy result, not a power score or table recommendation.
- **Recommended table fit:** the practical table range suggested by structural
  evidence and, later, calibrated empirical evidence. It does not override the
  official bracket floor.
- **Low / High:** a position near the lower or upper portion of a named table-fit
  range. It is boundary language, not a hidden decimal rating. Thresholds stay
  unpublished until calibration supports them.
- **Capability band:** an uncertainty-aware range describing supported deck
  capability. It is not price, popularity, bracket, or table impact.
- **Closing window:** high-roll, typical, and slow ranges for a supported win
  model. It distinguishes a single **elimination** from a **table win** against
  all opponents and exposes assumptions when either is unknown.
- **Deckprint:** six separate structural assessments: Mana, Access, Cohesion,
  Control, Recovery, and Conversion. A severe weakness is not averaged away by
  an unrelated strength.
- **Volatility:** expected performance spread caused by factors such as mana,
  narrow access, fragile packages, shared dependencies, or explosive openings.
- **Table impact:** a social and agency profile for play patterns that commonly
  matter in Rule Zero conversations. It is intentionally separate from power.
- **Confidence:** support for a result given classification coverage, unresolved
  interactions, deck completeness, model stability, and boundary sensitivity.
  It describes evidence quality, not the deck's strength.

## Evidence language

- **Evidence:** a versioned, attributable fact or calculation referenced by a
  result, such as a card, relationship, policy rule, simulation, or benchmark.
- **Finding:** a structured conclusion or unresolved condition with a stable
  reason code and evidence references.
- **Role:** a reviewed functional classification for a card or face in a
  stated context. Unknown is a valid role state.
- **Dependency:** an explicit requirement connecting a card, role, effect, or
  line to another requirement.
- **Shared failure point:** one dependency whose loss disrupts multiple paths;
  those paths must not be treated as fully independent redundancy.
- **Unknown:** an honest terminal state used when data, coverage, or methodology
  does not support a narrower answer. Unknown is not zero or average.

## Reproducibility

- **Version tuple:** the exact engine, policy, card-data, benchmark,
  report-schema, and simulation-model versions plus the explicit seed required
  to reproduce a report.
- **Snapshot:** immutable, validated data identified by a durable ID and source
  provenance. A mutable `current` alias is never sufficient for a report.
- **Seed:** an explicit serialized input to a versioned deterministic PRNG. It
  is not derived from the clock or global randomness.
- **Normalized deck:** an order-independent representation resolved to canonical
  external identifiers while preserving unresolved or ambiguous entries.
- **Revision:** an immutable deck list and metadata record. Editing creates a
  new revision rather than mutating the previous one.

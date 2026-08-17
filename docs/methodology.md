# Initial methodology contract

Status: falsifiable pre-implementation contract. No final weights, thresholds,
accuracy claims, or closing-turn model are approved.

## Non-goals

PodGauge does not infer strength from price or popularity, collapse official
bracket policy into a power score, turn table impact into moral judgment, or
hide unsupported conclusions behind a midpoint. A language model may explain
existing structured evidence but may not create findings or scores.

## Cross-cutting invariants

The same normalized deck, options, version tuple, and seed must produce the
same byte-stable structured report. Evidence must be addressable from every
finding. Input order, wall clock, locale, process environment, global random
state, network state, and database state may not change engine output.

Unknown classifications remain explicit and reduce confidence where relevant.
They are never silently imputed. A result that crosses a policy or calibrated
boundary under plausible unresolved classifications must show that sensitivity.

## Falsifiable definitions

### Deckprint

- **Mana** asks whether the deck can make required quantities and colors on the
  relevant turns under declared land, acceleration, and commander assumptions.
- **Access** asks how reliably it reaches required cards or interchangeable
  roles while respecting tutor restrictions and shared targets.
- **Cohesion** asks whether reviewed enablers and payoffs form supported paths,
  penalizing isolated pieces and common failure points.
- **Control** asks which permanent and stack scopes can be answered or
  protected, at what opportunity cost and supported timing.
- **Recovery** asks whether the deck can rebuild, recur, or reroute after stated
  disruption without counting the same resource repeatedly.
- **Conversion** asks whether an established advantage maps to supported player
  eliminations or a table win, not merely a large resource count.

Each assessment must expose inputs, reason codes, coverage, and unknowns. A
fixture that loses a required color source, unique dependency, or conversion
path should not improve the affected dimension. This gives tests a falsifiable
direction without inventing numeric weights.

### Capability and table fit

Capability is a band derived from supported structural and, when available,
empirical evidence. A narrow band is invalid when meaningful classifications
or interactions remain unresolved. Table fit is a separate recommendation that
may straddle a boundary and may not fall below the official bracket floor.

### Volatility

Volatility increases when supported outcome distributions widen or when the
deck depends on narrow, fragile, or mutually shared paths. It must not be
inferred from isolated anecdotes. Removing a unique fragile dependency while
holding context constant should not increase dependency-driven volatility.

### Table impact

Table impact reports evidenced play-pattern categories such as agency denial,
locks, repeated extra turns, mass land denial, repeated resets, theft, or long
nondeterministic turns. It does not add to or subtract from Capability.

### Confidence

Confidence summarizes evidence coverage and stability, including unresolved
cards and relationships, archetype/commander coverage, deck completeness,
simulation convergence, and sensitivity to boundaries. Confidence cannot rise
when relevant coverage is removed while every other input is held constant.

## Calibration questions

Before thresholds or weights are accepted, benchmark work must answer:

- Do independently reviewed pairwise comparisons agree with ordering by
  Capability, and where do archetypes disagree?
- Are band widths calibrated to observed error and boundary sensitivity?
- Do closing-window intervals distinguish elimination from table wins and
  achieve stated coverage on protected holdouts?
- Do same-deck revisions behave monotonically for controlled improvements, and
  where do interactions make monotonicity an invalid expectation?
- Are training and holdout decks separated by commander family, time, and near
  duplicate revisions?
- Which archetypes, brackets, and table-impact patterns have enough evidence to
  report, and which must remain unknown?

Any future claim must name the benchmark version, sample selection, exclusions,
metric, uncertainty interval, and known failure cases.

# PodGauge

**Measure the deck. Match the table.**

PodGauge is being built as an open-source, evidence-backed Commander deck analyzer for power, table fit, matchups, Rule Zero, and official Commander Brackets.

It is being built to answer more useful questions than “Is this deck a 7?”

- What can this deck actually do?
- How quickly and reliably can it do it?
- Which cards, packages, and rules drive that conclusion?
- What kind of game does it create?
- Does it fit the other three decks at this table?

> **Project status:** pre-alpha. The methodology, data model, benchmark corpus, and application foundation are being designed in public before the first engine release. Results shown below illustrate the intended report format, not a live scoring service.

The future home of the project is [podgauge.com](https://podgauge.com).

## Why PodGauge exists

Commander power is not one-dimensional.

Two decks can share the same average rating while producing completely different games. One may be explosive but fragile. Another may be slower, highly interactive, and difficult to stop. A third may be structurally fair but create a polarizing table experience.

Official bracket rules, deck capability, closing speed, consistency, matchup shape, and social impact are related—but they are not interchangeable. PodGauge keeps them separate, explains the evidence behind each result, and makes uncertainty visible.

## The PodGauge report

A report is planned to look like this:

```text
Official bracket floor  3 — Upgraded
Recommended table fit   High 3 / Low 4
Capability              6.2–6.8
Typical close           Turns 7–9
High-roll close         Turn 5
Volatility              High
Table impact            Spicy
Confidence              Medium
Engine version          0.8.2
```

Every result should expand into the cards, relationships, simulations, and policy rules that produced it.

### Deckprint

The Deckprint describes six structural dimensions:

| Dimension | What it asks |
| --- | --- |
| **Mana** | Can the deck cast its spells on time and in the colors it needs? |
| **Access** | How reliably can it find the cards or functional effects its plan requires? |
| **Cohesion** | How well do its enablers, payoffs, and interchangeable roles support one another? |
| **Control** | How efficiently and broadly can it disrupt opponents or protect its own plan? |
| **Recovery** | How well can it rebuild, reroute, or continue after disruption? |
| **Conversion** | How effectively can it turn an advantage into an elimination or table win? |

Capability will not be a simple average. Different archetypes convert resources differently, and a major structural weakness should not disappear behind an unrelated strength.

### Separate answers for separate questions

**Capability band**

A range with a plain-language interpretation and confidence level. A band communicates uncertainty more honestly than false decimal precision.

**Official bracket floor**

A deterministic policy result based on the current Commander rules, banned list, Game Changers, game-ending combos, extra turns, and mass land denial. The exact rule and cards responsible for the floor remain visible.

**Recommended table fit**

A practical placement such as `Low 3`, `High 3`, or `3/4 boundary`. This can flag a technically legal lower-bracket deck whose structure is much stronger than the decks normally found there.

**Closing window**

A high-roll turn, typical range, and slow-draw range. PodGauge distinguishes eliminating one player from winning the table.

**Volatility**

How widely performance can swing because of mana, fragile packages, narrow tutors, isolated power outliers, or explosive starts.

**Table impact**

A social profile kept separate from power. It may identify agency denial, deterministic loops, hard locks, repeated extra turns, mass land denial, repeated resets, theft, long nondeterministic turns, and other common Rule Zero concerns.

**Confidence**

How strongly the available card-role coverage, commander and archetype coverage, unresolved interactions, deck completeness, simulation stability, and bracket boundaries support the result.

## Pod Fit

PodGauge's long-term signature feature is a four-deck matchup and table-fit report built for a real Commander pod.

Pod Fit will look for:

- capability and closing-window mismatches;
- a fast deck outrunning the pod's available interaction;
- answer-scope gaps across the table;
- severe matchup polarization;
- conflicting win patterns;
- overlapping table-impact concerns;
- uncertainty worth resolving before the game.

The result will end with a short, neutral Rule Zero summary players can read aloud instead of debating four unexplained numbers.

## How analysis is intended to work

1. **Normalize** the deck against canonical card identifiers and card faces.
2. **Validate** count, color identity, legality, duplicates, and release status.
3. **Apply policy** for banned cards, Game Changers, bracket floors, and prohibited patterns.
4. **Build a deck graph** connecting tutors, targets, enablers, payoffs, recursion, protection, redundancy, combos, and shared failure points.
5. **Run seeded simulations** for mulligans, land drops, colored sources, mana development, castability, and access to roles or lines.
6. **Calculate the Deckprint** and an explainable Capability band.
7. **Generate evidence** for every conclusion and expose unresolved classifications.
8. **Compare revisions or pods** without losing the engine, policy, benchmark, and card-data versions behind each scan.

## Trust model

### Evidence before authority

PodGauge should never require blind trust in a score. Contributions must trace back to specific cards, relationships, calculations, source data, and policy rules.

### Deterministic by default

The same normalized deck, card-data snapshot, policy version, engine version, benchmark version, options, and simulation seed must produce the same structured result.

Language models may assist classification review or turn structured evidence into prose. They will not silently decide a score.

### Context over isolated card ratings

A card's contribution depends on the deck around it. A graveyard tutor without a retrieval path, a payoff without enough enablers, or several combo variants sharing one failure point should not receive full independent credit.

### Power is not popularity, price, or salt

Popularity and price may provide context, but neither is deck strength. Social impact is also reported separately: a powerful deck can create an enjoyable game, and a weak deck can create a miserable one.

### Version everything

Every report identifies its engine, policy, card-data, benchmark, report-schema, and simulation versions. Recalibration should be visible, reproducible, and explained.

### Publish the misses

Accuracy claims will be tied to public holdout benchmarks, error metrics, known biases, and archetype-specific performance—not a curated set of successful examples.

## Calibration

There is no universally accepted ground-truth Commander power number. PodGauge will evaluate distinct kinds of truth:

1. **Policy truth** for legality and official bracket rules.
2. **Structural truth** for card roles, mana, combos, dependencies, and failure points.
3. **Empirical truth** for observed closing turns, matchups, and game outcomes.
4. **Human truth** from blind expert comparisons and expected table experience.

The benchmark corpus is planned to include stock preconstructed decks, independently reviewed Bracket 1–4 lists, difficult high-3/low-4 boundary cases, current competitive lists, revisions of the same deck, and adversarial archetypes that commonly fool automated analyzers.

Training and holdout data will be separated by commander family and time so near-duplicate revisions are not mistaken for independent evidence.

Planned public metrics include:

- parsing and legality accuracy;
- bracket-floor fixture accuracy;
- pairwise ranking accuracy;
- Capability-band calibration error;
- closing-window mean absolute error;
- confidence-interval coverage;
- test-retest determinism;
- performance by archetype and bracket;
- known systematic biases.

## Technical direction

PodGauge will be a self-hostable TypeScript web application with a first-class installable PWA:

- Svelte 5 and SvelteKit 2 for the web application;
- Node.js 24 LTS for the web and background worker processes;
- PostgreSQL 18 for durable data and background jobs;
- a pure, versioned deterministic analysis engine;
- Docker Compose for deployment on Ubuntu;
- Caddy for automatic HTTPS and reverse proxying.

The architecture intentionally avoids microservices, Redis, GraphQL, Kubernetes, and proprietary hosting dependencies until a measured requirement justifies them.

See the full [technical specification](docs/spec.md) for the stack decision, PWA behavior, security model, repository boundaries, deployment topology, testing strategy, and implementation sequence.

## Repository structure

```text
apps/web                 SvelteKit web application and API
apps/worker              Background scans, imports, and simulations
packages/engine          Pure deterministic scoring functions
packages/policy          Brackets, Game Changers, and banned-list fixtures
packages/card-data       Card ingestion and versioned role overlays
packages/config          Validated server-only process configuration
packages/contracts       Shared schemas and report contracts
packages/db              Database schema, repositories, and migrations
packages/ui              PodGauge design system and components
packages/observability   Logging, tracing, metrics, and redaction boundaries
analysis/                Calibration and evaluation notebooks
benchmarks/              Public benchmark manifests and evaluation code
data/fixtures            Gold-standard and adversarial decks
docs/                    Product, method, architecture, and operations docs
infra/                   Compose, Caddy, backup, and deployment assets
```

The runnable foundation, portable contract layer, validated server-only
configuration, durable PostgreSQL core schema, least-privilege database roles,
Testcontainers integration suite, and Graphile Worker queue boundary have
landed. The repository serves a minimal SSR application, runs a separate
graceful worker, enforces package and client/server boundaries, validates
versioned analysis documents, and provides a loopback-only PostgreSQL 18
development service. It does **not** parse or analyze decks, expose analysis
submission, or execute the future deterministic scanner yet.

With Node 24.19.0, Corepack, and Docker installed:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
docker compose up -d --wait postgres
corepack pnpm db:roles
corepack pnpm db:migrate
corepack pnpm queue:migrate
corepack pnpm db:seed
corepack pnpm dev
```

Run `corepack pnpm verify` for the fast repository gate and
`corepack pnpm test:e2e` for the cross-browser smoke and accessibility scan.
See [local development](docs/development.md) for exact prerequisites, all
commands, troubleshooting, and data-preserving teardown.

## Roadmap

### Phase 0 — Specification and fixtures

- Define Deckprint dimensions, outputs, and non-goals.
- Establish the card-role schema and policy versioning.
- Build gold-standard and adversarial fixture decks.
- Finalize licensing and third-party data-use boundaries.
- Scaffold the secure self-hosted application foundation.

### Phase 1 — Trustworthy scanner

- Paste-based deck import.
- Construction and legality validation.
- Current bracket floor and Game Changer detection.
- Known combo and near-combo detection.
- Deckprint, Capability band, volatility, table impact, and confidence.
- Card-level evidence and shareable Rule Zero reports.
- Installable PWA with offline deck drafts.

### Phase 2 — Simulation and tuning

- Seeded mana and castability simulations.
- Closing-window estimates.
- Before-and-after revision comparisons.
- Counterfactual card-swap analysis.
- JSON, Markdown, and share-image exports.
- Classification feedback tied to exact engine versions.

### Phase 3 — Pod Fit and calibration

- Four-deck matchup and Pod Fit comparison.
- Fast, optional post-game logging.
- Permitted game-tracker integrations.
- Observed-versus-predicted dashboards.
- Public calibration and known-bias releases.

## Data sources

PodGauge expects to integrate with sources such as:

- [Scryfall](https://scryfall.com/docs/api) for canonical card data, Oracle text, faces, legality, release information, and identifiers;
- [Commander Spellbook](https://commanderspellbook.com/) for community-reviewed combo variants, prerequisites, and results;
- [Wizards of the Coast announcements](https://magic.wizards.com/en/news/announcements) for official format policy, banned-list, bracket, and Game Changer changes;
- [TopDeck.gg](https://topdeck.gg/docs/tournaments-v2) for attributed competitive tournament data and cEDH calibration;
- permitted, privacy-respecting game-tracking integrations for opt-in real-world calibration.

Every integration must be reviewed against its current terms before implementation. PodGauge will preserve required attribution and will not redistribute third-party data outside the permissions of its source.

## Contributing

PodGauge is intended to be built in public. Useful early contributions include:

- complete decklists that expose a scoring edge case;
- independently reasoned pairwise deck comparisons;
- card-role corrections backed by Oracle text or rules evidence;
- combo dependency and shared-failure-point corrections;
- mana-model and simulation test cases;
- accessibility and pregame-report feedback;
- documentation and threat-model improvements.

When the issue tracker opens, reports should include the full decklist, commander, expected behavior, observed behavior, and reasoning. Once the engine exists, include its version and report identifier. Score-affecting changes will require fixtures and before-and-after benchmark results.

## Independence and clean-room policy

PodGauge is independently designed. It is not affiliated with, endorsed by, or a continuation of DeckCheck or CRISPI.

The project will not copy another product's scoring system, rubrics, thresholds, data, generated analyses, API outputs, interface, or branding. Comparable products may inform problem research, but PodGauge's ontology, formulas, calibration data, implementation, and user experience will be developed from first principles.

## Fan-content notice

PodGauge is unofficial Fan Content. It is not approved or endorsed by Wizards of the Coast. Portions of the materials used by the project may be property of Wizards of the Coast. Magic: The Gathering, Commander, and their associated names and marks are property of Wizards of the Coast LLC.

See the [Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) for additional information.

## Author

PodGauge is created and developed by Stephen Sawyer (`dunamismax`).

## License

Copyright (c) 2026 Stephen Sawyer. PodGauge's original software and documentation are licensed under the [MIT License](LICENSE). This license does not grant rights to Wizards of the Coast material, card images, third-party datasets, or contributed fixtures; each such source remains subject to its own reviewed terms, provenance, and permissions.

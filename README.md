# PodGauge

**Measure the deck. Match the table.**

PodGauge is an open, evidence-backed Commander deck analyzer designed to explain what a deck can do, how reliably it can do it, and whether it belongs at a particular table.

Instead of reducing every deck to an unexplained power-level number, PodGauge produces a multidimensional **Deckprint** with visible evidence, uncertainty, and versioned methodology.

> Project status: early development. The scoring specification, benchmark corpus, and data model are being established before the first public engine release.

## Why PodGauge

Commander deck strength is not one-dimensional.

Two decks can receive the same average rating while creating completely different games:

- one may be fast, inconsistent, and fragile;
- another may be slow, interactive, and difficult to stop;
- a third may be structurally fair but create a highly polarizing table experience.

Official Commander Brackets, deck capability, closing speed, volatility, and table impact are related, but they are not interchangeable. PodGauge reports them separately so players can make better deck-building decisions and have more useful pregame conversations.

## Example result

```text
Bracket floor       3 - Upgraded
Recommended fit     High 3 / Low 4
Capability          6.2-6.8
Typical close       Turns 7-9
High-roll close     Turn 5
Volatility          High
Table impact        Spicy
Confidence          Medium
Engine version      0.8.2
```

Every conclusion is intended to expand into the cards, relationships, simulations, and policy rules that produced it.

## The Deckprint

PodGauge evaluates six structural dimensions.

| Dimension | Question |
| --- | --- |
| **Mana** | Can the deck cast its spells on the turns and in the colors it needs? |
| **Access** | How reliably can it find the cards or functional effects its plan requires? |
| **Cohesion** | How well do its enablers, payoffs, and interchangeable roles support one another? |
| **Control** | How efficiently and broadly can it disrupt opponents or protect its own plan? |
| **Recovery** | How well can it rebuild, reroute, or continue after disruption? |
| **Conversion** | How effectively can it turn an advantage into an elimination or table win? |

The Capability result will not be a simple average of these dimensions. Different archetypes convert their resources in different ways, and structural weaknesses should not disappear behind an unrelated strength.

## Separate outputs for separate questions

### Capability band

A 0-10 range with a plain-language interpretation and confidence level. A range communicates uncertainty more honestly than false decimal precision.

### Official bracket floor

A deterministic result based on the current Commander rules, banned list, Game Changers, game-ending combos, extra turns, and mass land denial. PodGauge will show the exact cards or rules responsible for the floor.

### Recommended table fit

A practical placement such as `Low 3`, `High 3`, or `3/4 boundary`. This can warn when a technically legal lower-bracket deck is structurally much stronger than the decks normally found there.

### Closing window

A high-roll turn, typical closing range, and slow-draw range. PodGauge will distinguish between eliminating one player and winning the entire table.

### Volatility

A measure of how widely the deck's game-to-game performance can swing because of mana, isolated power outliers, fragile packages, narrow tutors, or explosive starts.

### Table impact

A social profile kept separate from power. It may identify agency denial, deterministic loops, hard locks, repeated extra turns, mass land denial, repeated resets, theft, long nondeterministic turns, and other commonly discussed play patterns.

### Confidence

An explicit estimate based on card-role coverage, commander and archetype coverage, unresolved conditional interactions, deck completeness, simulation stability, and proximity to a bracket boundary.

## Pod Fit

PodGauge's long-term signature feature is a four-deck comparison built for real Commander tables.

Pod Fit will look for:

- capability and closing-window mismatches;
- a fast deck outrunning the pod's available interaction;
- answer-scope gaps across the table;
- severe matchup polarization;
- conflicting win patterns;
- overlapping table-impact concerns;
- uncertainty that should be resolved through Rule Zero.

The result will include a short, neutral pregame summary that players can read aloud instead of arguing over whether every deck is "a 7."

## Design principles

### Evidence before authority

PodGauge should never ask users to trust an unexplained result. Score contributions must trace back to specific cards, relationships, calculations, and policy rules.

### Deterministic by default

The same deck, card-data snapshot, policy version, engine version, and simulation seed must produce the same result.

Large language models may help propose card classifications for human review or turn structured evidence into prose. They will not silently determine the score.

### Context over isolated card ratings

A card's contribution depends on the deck around it. A graveyard tutor without a retrieval path, a payoff without enough enablers, or three combo variants sharing the same failure point should not receive full independent credit.

### Power is not popularity or price

Card price, deck popularity, and raw inclusion rate may provide useful context, but they are not substitutes for functional deck analysis.

### Power is not salt

A powerful deck can create an enjoyable game, and a weak deck can create a miserable one. Social impact remains visible and separate.

### Version everything

Every report will identify its engine, card-data, policy, and benchmark versions. Recalibration should be visible, reproducible, and explained.

### Publish the misses

Accuracy claims will be tied to public holdout benchmarks, error metrics, known biases, and archetype-specific performance.

## Planned analysis pipeline

1. **Normalize the deck** against canonical card identifiers and card faces.
2. **Validate construction** for count, color identity, legality, duplicates, and release status.
3. **Apply Commander policy** for banned cards, Game Changers, bracket floors, and prohibited patterns.
4. **Build a deck graph** connecting tutors, targets, enablers, payoffs, recursion, protection, redundancy, combos, and shared failure points.
5. **Run seeded simulations** for mulligans, land drops, colored sources, mana development, castability, and access to roles or lines.
6. **Calculate the Deckprint** and an explainable Capability band.
7. **Generate evidence** for every result and expose unresolved classifications.
8. **Compare revisions or pods** without losing the engine and data versions behind each scan.

## Data sources

PodGauge is expected to use or integrate with the following sources where their current terms permit it:

- [Scryfall](https://scryfall.com/docs/api) for canonical card data, Oracle text, faces, legality, release information, and identifiers.
- [Commander Spellbook](https://commanderspellbook.com/) for community-reviewed Commander combo variants, prerequisites, and results.
- [Wizards of the Coast Commander updates](https://magic.wizards.com/en/news/announcements) for official format policy, banned-list, bracket, and Game Changer changes.
- [TopDeck.gg](https://topdeck.gg/docs/tournaments-v2) for attributed competitive tournament data and cEDH calibration.
- Permitted, privacy-respecting game-tracking integrations for opt-in real-world calibration.

Third-party data will not be redistributed outside the permissions of its source. Attribution and data versions will be included wherever required.

## Calibration

There is no universally accepted ground-truth Commander power number. PodGauge will evaluate distinct kinds of truth instead:

1. **Policy truth** for legality and bracket rules.
2. **Structural truth** for card roles, mana, combos, dependencies, and failure points.
3. **Empirical truth** for observed closing turns, matchups, and game outcomes.
4. **Human truth** from blind expert pairwise review and expected table experience.

The benchmark corpus is planned to include:

- stock preconstructed decks across years and observed strength;
- independently reviewed Bracket 1-4 lists;
- difficult high-Bracket-3 and low-Bracket-4 boundary cases;
- current tournament cEDH and fringe-competitive lists;
- multiple revisions of the same deck;
- adversarial archetypes that commonly fool automated analyzers.

Training and holdout data will be separated by commander family and time to avoid scoring near-duplicate deck revisions as independent evidence.

Planned public metrics include:

- parsing and legality accuracy;
- bracket-floor fixture accuracy;
- pairwise ranking accuracy;
- Capability-band calibration error;
- closing-turn mean absolute error;
- confidence-interval coverage;
- test-retest determinism;
- performance by archetype and bracket;
- known systematic biases.

## Roadmap

### Phase 0: specification and fixtures

- Publish Deckprint definitions and non-goals.
- Establish the card-role schema and policy versioning.
- Build gold-standard and adversarial fixture decks.
- Finalize licensing and data-use boundaries.

### Phase 1: trustworthy scanner

- Paste and permitted URL imports.
- Construction and legality validation.
- Current bracket floor and Game Changer detection.
- Known combo and near-combo detection.
- Deckprint, Capability band, volatility, table impact, and confidence.
- Card-level evidence and shareable Rule Zero reports.

### Phase 2: simulation and tuning

- Seeded mana and castability simulations.
- Closing-window estimates.
- Before-and-after deck revision comparisons.
- Counterfactual card-swap analysis.
- JSON, Markdown, and share-image exports.
- Classification feedback tied to exact engine versions.

### Phase 3: Pod Fit and telemetry

- Four-deck Pod Fit comparison.
- Fast, optional post-game logging.
- Permitted tracker integrations.
- Observed-versus-predicted dashboards.
- Public calibration releases.

## Planned repository structure

```text
apps/web                 Web application
packages/engine         Pure deterministic scoring functions
packages/card-data      Card-data ingestion and versioned overlays
packages/policy         Brackets, Game Changers, and banned-list fixtures
packages/schema         Shared application and engine types
analysis/               Calibration and evaluation notebooks
data/fixtures           Gold-standard and adversarial decks
```

Implementation and local-development instructions will be added when the application scaffold lands.

## Contributing

PodGauge is intended to be built in public. Useful early contributions include:

- Commander decklists that expose a scoring edge case;
- independently reasoned pairwise deck comparisons;
- card-role corrections with Oracle-text or rules evidence;
- combo dependency and shared-failure-point corrections;
- mana-model test cases;
- accessibility and pregame-report feedback;
- documentation improvements.

Open an issue with the complete decklist, commander, expected behavior, observed behavior, and the reasoning behind the disagreement. Once the engine is available, include its version and the report identifier.

Score-affecting changes will require fixtures and before-and-after benchmark results.

## Independence and clean-room policy

PodGauge is an independently designed project. It is not affiliated with, endorsed by, or a continuation of DeckCheck or CRISPI.

The project will not copy DeckCheck's scoring system, rubrics, thresholds, data, generated analyses, API outputs, interface, or branding. Comparable products may inform the problem definition and product research, but PodGauge's ontology, formulas, calibration data, implementation, and user experience will be developed independently from first principles.

## Fan-content notice

PodGauge is unofficial Fan Content. It is not approved or endorsed by Wizards of the Coast. Portions of the materials used by the project may be property of Wizards of the Coast. Magic: The Gathering, Commander, and their associated names and marks are property of Wizards of the Coast LLC.

See the [Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) for additional information.

## License

PodGauge is intended to be released as open-source software. A license will be selected and added before the first source release. Until a `LICENSE` file is present, no license is granted by this repository.

# Data governance

Last reviewed: 2026-08-17. This is an engineering intake gate, not legal advice
or acceptance of any third-party terms.

No external dataset is approved for import, retention, or redistribution yet.
Naming a source here or in the product specification does not grant permission.
An owner-approved, dated review must replace each `blocked` state before an
adapter is enabled or source material is committed.

## Source matrix

| Source                                     | Terms and rights evidence to review                                                                               | Current retention                                                     | Current redistribution                               | Attribution target                                                             | Intended cadence                     | Status                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------- |
| Scryfall API and bulk data                 | API documentation, terms, data/file notices, image and upstream Wizards rights                                    | None beyond transient manual review                                   | None                                                 | Source URL, snapshot date, external IDs, and required Scryfall/Wizards notices | To be set after review               | Blocked                               |
| Wizards announcements and Commander policy | Fan Content Policy, site terms, announcement copyright, official policy provenance                                | Links and independently authored rule metadata only; no copied corpus | No third-party text or imagery                       | Exact announcement URL and effective/retrieval dates                           | Event-driven after review            | Blocked                               |
| Commander Spellbook                        | Current API/site terms, repository license, attribution and database rights, rate limits                          | None                                                                  | None                                                 | Variant/source identifier, URL, retrieval date, and required project credit    | To be set after review               | Blocked                               |
| TopDeck.gg                                 | API/tournament terms, account requirements, rate limits, event/deck redistribution and privacy                    | None                                                                  | None                                                 | Event and provider identifiers, source URL, retrieval date                     | To be set after review               | Blocked                               |
| User-submitted public fixtures             | `docs/fixture-contributions.md`, contributor authority, consent, privacy, removal route, selected project license | Only accepted fixture fields after intake opens                       | Only under recorded fixture grant and project policy | Contributor-chosen credit or documented anonymous consent                      | Per contribution                     | Blocked until license and intake open |
| Opt-in game records                        | Product consent, tracker/provider terms, participant privacy, deletion and sampling-bias review                   | None                                                                  | None                                                 | Provider/provenance metadata without unnecessary identity                      | Not planned before calibration phase | Blocked                               |

## Required provenance

Every promoted snapshot or fixture must record a stable source identifier, exact
retrieval time, effective date where applicable, original checksum, adapter and
schema versions, review status, attribution requirements, and the transformation
steps that produced committed or stored records. Card names are display fields,
not durable identity. Unknown license or provenance fields fail closed.

Raw source data is staged separately from promoted data. Promotion must be
atomic, retain the previous known-good snapshot, and keep reports attached to
their original immutable snapshot. Access credentials and credential-bearing
URLs never enter provenance, logs, or committed fixtures.

## Retention, redistribution, and deletion

Each source review must define raw-cache lifetime, normalized-data lifetime,
snapshot rollback needs, permitted fields, image handling, derivative-data
rules, attribution placement, and deletion obligations. When the source does
not explicitly permit a use, PodGauge does not make that use by default.

Correction or removal requests are recorded with source, affected identifiers,
scope, decision, reviewer, and completion date. Removable material is excluded
from future snapshots and public artifacts; immutable historical reports may be
made unavailable or redacted only through a documented compatibility and audit
path. Backups expire under their approved retention schedule rather than being
silently rewritten. The public fixture-specific process is defined separately.

Reviews must be repeated before first implementation, after material terms or
API changes, and at least annually for enabled sources. A failed or stale review
blocks new synchronization without invalidating reproducibility of already
permitted immutable reports.

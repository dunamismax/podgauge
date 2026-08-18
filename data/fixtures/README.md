# Fixture data

Only tiny, purpose-built, legally reviewable fixtures belong here. External
card, combo, tournament, tracker, or policy datasets are blocked until their
dated review in `docs/data-governance.md` is approved. Public contributions are
also subject to `docs/fixture-contributions.md`.

`contracts/deck-cases.json` is an independently authored synthetic manifest for
legal-shape, illegal, incomplete, duplicate-heavy, partner/background,
multi-face, Commander-specific, and malformed contract boundaries. Its labels
are expectations for future rule engines, not policy claims or imported card
facts. `contracts/report-v0.1.0.json` and `contracts/hash-vectors.json` exercise
unknown-state preservation, compatibility, canonical bytes, and report hashes.

No fixture in this directory contains Oracle text, card images, private deck
data, or copied third-party output.

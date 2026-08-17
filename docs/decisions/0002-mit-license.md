# ADR 0002: License PodGauge under MIT

- Status: accepted
- Date: 2026-08-17
- Deciders: repository owner
- Related tracker item: Phase 0 license decision

## Context

The repository had no software license, which prevented a source release and
left prospective contributors without permission to use or modify PodGauge.
The product also depends on strict separation between project-owned work and
Magic material, third-party datasets, card images, and submitted fixtures whose
rights cannot be granted by the project's software license.

## Decision

License PodGauge's original software and documentation under the MIT License,
using `Copyright (c) 2026 PodGauge contributors`. Record `MIT` in root package
metadata and keep the canonical license text in the repository-root `LICENSE`.

MIT does not open contribution intake by itself. Before accepting a code or
documentation contribution, the project must publish an explicit intake
notice. Fixture and dataset intake additionally requires the authority,
consent, provenance, and separate grant defined by the data-governance policy.

## Alternatives considered

- AGPL-3.0-or-later would require network users to receive corresponding source
  for modified hosted versions, but the owner selected a permissive license.
- Apache-2.0 is permissive and includes explicit patent terms, but the owner
  preferred the shorter MIT terms.
- Remaining unlicensed would continue to block source releases and normal
  reuse, contrary to the public open-source direction.

## Consequences

Recipients may use, copy, modify, distribute, sublicense, and sell PodGauge's
original software and documentation subject to the MIT notice and disclaimer.
MIT provides no network-copyleft requirement and does not include Apache-2.0's
explicit patent-license language.

The license does not convey rights to Wizards of the Coast material, card
images, third-party datasets, or contributed fixtures. Those materials remain
blocked until their applicable rights and provenance are reviewed and recorded.

## Evidence and review

The committed text follows the
[Open Source Initiative MIT License](https://opensource.org/license/mit).
Reconsider only through a new owner-approved ADR, with a compatibility and
relicensing review before changing terms for existing work.

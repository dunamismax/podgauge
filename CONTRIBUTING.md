# Contributing to PodGauge

PodGauge is being designed in public, but contribution intake is provisional.
The project's original software and documentation are available under the MIT
License, but that license does not itself open contribution intake or grant
rights to third-party material. Do not open a code or data contribution until
an explicit intake notice is present.

Discussion that does not disclose a vulnerability or private deck data may use
the public issue tracker once it is enabled. Security reports must follow
`SECURITY.md`. Public fixture proposals must satisfy
`docs/fixture-contributions.md` before submission.

When intake opens, contributors will be expected to:

1. read `AGENTS.md`, `README.md`, `docs/spec.md`, and `BUILD.md`;
2. start with the earliest relevant unblocked tracker item;
3. keep changes within documented package boundaries;
4. add executable tests and evidence for behavior changes;
5. run `corepack pnpm verify`, applicable browser/integration gates, and
   `git diff --check`;
6. avoid committing third-party data, generated output without drift checks,
   credentials, caches, or private information; and
7. use concise commits without generator or AI attribution.

Unless a future intake notice says otherwise, contributions will be accepted
for distribution under the project's MIT License. Fixture submissions also
require the separate authority, consent, provenance, and grant recorded by
`docs/fixture-contributions.md`.

Score-affecting changes will require fixtures and benchmark evidence after the
benchmark harness exists. Legal, policy, security, and architecture decisions
remain subject to maintainer review even when their tests pass.

# PodGauge build tracker

Active implementation tracker for PodGauge and `podgauge.com`.

`README.md` is the public product promise. `docs/spec.md` is the authoritative
architecture and security blueprint. This file converts those documents into
ordered, testable work. If they disagree, stop and reconcile the documents in
the same change before implementing the disputed behavior.

Last reconciled: 2026-08-18 after least-privilege PostgreSQL roles, genuine
Testcontainers-managed database coverage, and Graphile Worker orchestration
landed.

---

## How to use this file

When asked to continue building PodGauge:

1. Read `README.md`, `docs/spec.md`, this file, `AGENTS.md` if present, and all
   code and tests in the area you will change.
2. Inspect `git status`, recent history, and both remotes. Preserve unrelated
   user changes and never assume the worktree is disposable.
3. Start with the earliest unchecked, unblocked item in the earliest active
   phase. A coherent vertical slice may complete several adjacent boxes; keep
   moving through adjacent safe work instead of stopping after one trivial box.
4. Search the repository before adding a new abstraction, dependency, schema,
   command, or convention.
5. Implement production behavior, tests, fixtures, documentation, and
   operational changes together. Do not leave correctness or security as a
   follow-up when it is part of the feature.
6. Run the narrowest useful checks first, then every applicable repository gate.
7. Check a box only when its acceptance criteria are present and verified in the
   current worktree. Never check work based on intent, scaffolding alone, or an
   untested happy path.
8. Update **Active handoff**, **Current baseline**, **Known limits**, and the
   verification commands whenever the repository's real state changes.
9. End with a concise commit that contains no AI attribution. When the task
   authorizes publishing, push the same commit to the matching branch on both
   `origin` and `codeberg`, then verify that both remote refs resolve to it.

If an item needs an owner decision, credential, DNS change, paid account, secret,
or production access, record the exact blocker under **Owner decisions** and
continue with independent work. Never invent secrets, accept legal terms, weaken
a control, or make a public claim on the owner's behalf.

### Checkbox contract

- `[x]` means the behavior exists on the current branch and its relevant checks
  passed.
- `[ ]` means incomplete, partially implemented, unverified, or blocked.
- A checkbox that changes a public contract requires corresponding docs and
  compatibility coverage.
- A score-affecting checkbox requires fixtures and before/after benchmark
  evidence once the benchmark harness exists.
- Generated output is committed only when the source, generation command, and
  drift check are also committed.
- Do not mark a parent phase complete until every required child box and its
  phase exit gate are complete.

### Commit and push contract

- An instruction to "continue `BUILD.md`", "work the next checklist items", or
  equivalent authorizes committing and publishing the completed in-repo work to
  the current branch on both configured remotes unless the user says otherwise.
- Keep commits single-purpose and use an imperative summary.
- Do not add `Co-authored-by`, generator signatures, or AI attribution.
- Do not amend, rebase, force-push, or overwrite another contributor's work
  unless explicitly instructed.
- Push the current branch to the same branch name on `origin` and `codeberg`.
  Never silently push a feature branch to `main`.
- If one push succeeds and the other fails, report the split state and retry the
  failed remote only after resolving the cause.
- A push is not complete until `git ls-remote` or an equivalent read-only check
  confirms both remote branch tips match the local commit.

---

## Active handoff

- **Active phase:** Phase 3 — PostgreSQL, jobs, configuration, and
  observability. All owner-independent Phase 0 through Phase 2 work is complete.
- **Next recommended slice:** create analysis records and enqueue jobs atomically
  in one transaction, then prove retries do not duplicate completed work or
  progress events.
- **Current blockers:** the production proxy mode, transactional email delivery
  provider, OCI registry, and off-site backup target require owner choices
  before their dependent release tasks can close.
- **Last verified:** Node 24.19.0 frozen install; role bootstrap against an
  existing Compose volume; migration and seeding as the migration owner; full
  repository verify with the Compose smoke and Testcontainers-owned PostgreSQL;
  clean and forward migrations, role denials, repository rollback,
  constraints, concurrent idempotency, and index plans; Graphile migration and
  grants, named-task deduplication, retries, timeouts, and cancellation;
  cross-browser Playwright/axe smoke; worker, source-sync, and benchmark smokes;
  and Compose validation on 2026-08-18.
- **Production state:** no application is deployed; `podgauge.com` is a target,
  not a currently verified service.

Keep this section current. It should tell the next agent what to do without
requiring archaeology through old commits.

---

## Current baseline

Verified in the repository at the current reconciliation:

- [x] `README.md` defines PodGauge's product vision, report concepts, Deckprint,
      Pod Fit, trust model, calibration intent, roadmap, and public disclaimers.
- [x] `docs/spec.md` defines the modular-monolith architecture, package
      boundaries, security baseline, PWA behavior, deployment topology, tests,
      operations, and initial implementation sequence.
- [x] The pinned Node 24.19.0/pnpm 11.22.0 workspace contains a SvelteKit SSR
      shell, a separate graceful worker, eight bounded packages, a frozen
      lockfile, unit/property/component/integration/browser tests, and CI.
- [x] Development PostgreSQL 18.4 is digest-pinned, loopback-only, healthy under
      Compose, and accepts the reviewed durable core migrations and idempotent
      foundation seed.
- [x] PodGauge's original software and documentation are copyright Stephen
      Sawyer (`dunamismax`) and use the MIT License; third-party Magic material
      and fixtures remain outside that grant.
- [x] `SECURITY.md` publishes `dunamismax@tutamail.com` for private vulnerability
      reports without claiming a supported release or response-time SLA.
- [x] `origin` points to GitHub and `codeberg` points to Codeberg; both `main`
      refs matched `8869e36` before Phase 1 implementation began.
- [x] The intended canonical host is `https://podgauge.com`, with
      `https://www.podgauge.com` redirecting to it once deployed.
- [x] `packages/contracts` now owns strict runtime schemas for deck and report
      documents, the full version tuple and evidence graph, job/API envelopes,
      canonical serialization and hashing, generated JSON Schema/OpenAPI, and
      independently authored synthetic compatibility and edge-case fixtures.
- [x] `packages/config` owns fail-fast web, worker, migration, and deterministic
      test readers; secret values redact by default, SvelteKit confines web use
      to server modules, and the built client is scanned for private markers.
- [x] `packages/db` owns 22 reviewed durable tables, contract-validating write
      repositories, exact version references, and PostgreSQL constraints for
      privacy, ownership, idempotency, immutability, transitions, provenance,
      and reconnectable bounded event order.
- [x] PostgreSQL uses separate migration-owner, web, worker, and read-only
      backup logins. Runtime DML is explicit, DDL and elevated attributes are
      denied, existing volumes have a rerunnable ownership-repair path, and
      Testcontainers owns clean/forward migration and repository evidence.
- [x] The separate worker runs Graphile Worker under its runtime role with a
      named contract-validated analysis task, stable pending-job keys, bounded
      retries and timeouts, serial CPU execution, private structural logs, and
      retry-safe bounded shutdown.

Do not describe examples in the README as live results until the end-to-end
scanner and production service are actually verified.

---

## Product and architecture invariants

Every phase must preserve these constraints:

- PodGauge answers distinct questions with distinct outputs: official bracket
  floor, recommended table fit, Capability band, closing window, volatility,
  table impact, confidence, and the six Deckprint dimensions.
- Every conclusion traces to structured card, relationship, calculation,
  simulation, benchmark, or policy evidence. Unknowns remain visible.
- The same normalized deck, options, version tuple, and seed produce byte-stable
  structured results. The engine has no network, database, filesystem, clock,
  locale, environment, or global-randomness dependency.
- Language models never own scoring or silently add findings. Optional prose
  generation is disabled by default, identified to users, and constrained to
  existing structured evidence.
- Deck revisions and completed reports are immutable. Every report records its
  engine, policy, card-data, benchmark, report-schema, and simulation versions.
- Power, popularity, price, and table impact are not proxies for one another.
- Source data is pinned, attributable, provenance-aware, and used only within
  its current license and terms. Card names are not durable identifiers.
- New decks and reports are private by default. Sharing is explicit and
  revocable; authorization is checked on every object operation.
- The first deployment is a TypeScript modular monolith: Svelte 5/SvelteKit 2
  on Node.js 24 LTS, a separate Node worker, PostgreSQL 18, Graphile Worker,
  Docker Compose, and host Caddy.
- Do not add Redis, GraphQL, tRPC, Kubernetes, a vector database, a generic URL
  fetcher, a proprietary hosting requirement, or a native wrapper without an
  accepted ADR backed by a measured requirement.
- The PWA progressively enhances a server-rendered, keyboard-usable core. A
  deck can be submitted when client JavaScript fails.
- Self-hosted installations emit no project telemetry by default.
- Security claims target OWASP ASVS 5.0 Level 2 and must be backed by tests or
  dated review evidence, not configuration presence alone.

---

## Owner decisions

These are decision gates, not permission for an agent to guess. They block only
their dependent work.

- [x] **License:** owner and developer Stephen Sawyer (`dunamismax`) selected MIT
      on 2026-08-17. The decision is implemented in `LICENSE`, package metadata,
      public policy, and ADR 0002.
- [ ] **Production network:** owner selects DNS-only or Cloudflare-proxied mode.
      Document proxy trust and origin restrictions before trusting forwarded
      client-address headers.
- [ ] **Transactional email:** owner selects a self-hostable or external email
      delivery path and supplies credentials before magic-link email is enabled.
- [ ] **Image registry:** owner selects the OCI registry and credentials before
      release-image publication is enabled.
- [ ] **Backup destination:** owner selects a separately credentialed off-site
      restic target and retention requirements before production launch.
- [x] **Private security reporting:** owner selected direct email to
      `dunamismax@tutamail.com`. The address is public while report contents are
      sent privately; `SECURITY.md` records the pre-alpha support limits.

Record accepted decisions in an ADR or the relevant operations document, remove
the blocker text from **Active handoff**, and check the box in the same commit.

---

## Phase 0 — Governance and executable product contract

Purpose: remove ambiguity that would otherwise be baked into code or data.

- [x] Add `AGENTS.md` with durable repository rules, package boundaries,
      verification expectations, generated-file policy, and the checklist and
      dual-remote handoff workflow from this file.
- [x] Add the owner-selected `LICENSE`, and make README, contribution, and
      source headers consistent with it without implying rights to third-party
      Magic data or imagery.
- [x] Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and an initial `SECURITY.md`;
      keep contribution intake closed or clearly provisional until explicitly
      opened, and publish private security and conduct-reporting routes.
- [x] Add `docs/glossary.md` defining every public result, Low/High boundary
      language, elimination versus table win, evidence, finding, role,
      dependency, shared failure point, version tuple, and confidence.
- [x] Add `docs/methodology.md` with the first falsifiable definitions,
      non-goals, invariants, unknown-state behavior, and calibration questions
      for Deckprint, Capability, table fit, volatility, table impact, and
      confidence. Do not invent final weights merely to fill the document.
- [x] Add `docs/data-governance.md` with a source-by-source rights and terms
      matrix, attribution, permitted retention and redistribution, update
      cadence, provenance requirements, deletion process, and review date.
- [x] Add `docs/threat-model.md` covering guest abuse, import SSRF, stored XSS,
      CSRF, broken object authorization, job exhaustion, data poisoning, cache
      leakage, secret leakage, backup compromise, and supply-chain threats.
- [x] Add an ADR template and record the accepted modular-monolith, PostgreSQL
      job queue, deterministic-engine, REST/OpenAPI, and self-hosted PWA choices
      or explicitly point to the exact normative spec sections.
- [x] Define semantic versioning and compatibility rules for the API,
      report-schema, engine, policy, card-data, benchmark, and simulation model.
- [x] Create an initial public-fixture contribution policy with consent,
      provenance, licensing, anonymization, correction, and removal rules.

**Phase 0 exit:** a contributor can tell what may be built, what evidence is
required, which decisions belong to the owner, and which third-party materials
may legally enter the repository.

---

## Phase 1 — Workspace and quality foundation

Purpose: create a boring, reproducible monorepo with a fast default feedback
loop before product logic spreads across packages.

- [x] Add a private root `package.json` with Node `>=24`, an exact Corepack
      `packageManager` pin, pnpm workspaces, and no floating production versions.
- [x] Add `pnpm-workspace.yaml`, a strict shared TypeScript configuration,
      `.editorconfig`, `.gitattributes`, `.gitignore`, `.npmrc`, a Node-version
      file, and a safe `.env.example`.
- [x] Create the specified directories for `apps/web`, `apps/worker`, the seven
      packages, `analysis`, `benchmarks`, `data/fixtures`, docs, and infra. Give
      each runtime package an explicit export map and ownership boundary.
- [x] Scaffold `apps/web` with Svelte 5, SvelteKit 2, Vite, adapter-node, strict
      TypeScript, Tailwind CSS 4, semantic design tokens, and a minimal
      mobile-first SSR page.
- [x] Scaffold `apps/worker` as a separate graceful Node process with typed
      startup configuration and no web-framework dependency.
- [x] Scaffold pure `contracts`, `engine`, `policy`, and `card-data` packages and
      infrastructure-facing `db`, `ui`, and `observability` packages; enforce
      dependency direction with tests or lint rules.
- [x] Configure Prettier, ESLint, `svelte-check`, TypeScript checking, Vitest,
      Testing Library, fast-check, Playwright, and axe-core with one meaningful
      passing smoke test at each installed layer.
- [x] Add root scripts for `dev`, `format`, `format:check`, `lint`, `check`,
      `test`, `test:integration`, `test:e2e`, `build`, `db:generate`,
      `db:migrate`, `db:seed`, `data:sync`, `benchmark`, and one aggregate
      `verify` command.
- [x] Add development Compose for PostgreSQL 18 on a private project network
      with a health check, explicit volume, safe local defaults, and no claim
      that the file is production-ready.
- [x] Add CI that installs from the frozen lockfile and runs formatting, lint,
      Svelte diagnostics, TypeScript, unit/property tests, a production build,
      and a targeted browser smoke test. Use PostgreSQL where integration tests
      require real database behavior.
- [x] Add `docs/development.md` with a clean-clone setup, exact prerequisites,
      common commands, fixture seeding, troubleshooting, and teardown that does
      not delete user data by default.

**Phase 1 exit:** a clean clone can install with the pinned toolchain, start the
minimal web and worker development processes, and pass `pnpm verify`.

---

## Phase 2 — Contracts, fixtures, and deterministic serialization

Purpose: establish the portable language shared by UI, API, database, worker,
engine, benchmarks, and future versions before implementing deep behavior.

- [x] Define branded canonical identifiers and Zod schemas for raw deck input,
      parsed entries, normalized cards/faces, commanders, decks, and immutable
      deck revisions.
- [x] Define the full version tuple and schemas for card-data snapshots, policy
      versions, engine versions, benchmark versions, simulation versions, and
      report-schema versions. Reject missing or ambiguous version inputs.
- [x] Define structured evidence, reason codes, findings, unknown
      classifications, dependency edges, shared failure points, and source
      provenance without UI prose in core contracts.
- [x] Define the versioned analysis-report schema for all public outputs and six
      Deckprint dimensions, including confidence and uncertainty rather than
      false precision.
- [x] Define job payloads, progress events, terminal states, retry metadata,
      analysis options, and idempotency keys. Validate payloads on both enqueue
      and execution.
- [x] Define RFC 9457 problem-details responses and generate a checked-in
      OpenAPI 3.1 contract for the initial `/api/v1` surface.
- [x] Implement canonical stable serialization, explicit stable sorting, report
      hashing, and golden test vectors that are independent of OS, locale, input
      ordering, and wall-clock time.
- [x] Generate JSON Schema from shared sources where practical and add a drift
      check so committed OpenAPI/JSON artifacts cannot silently become stale.
- [x] Add legal, illegal, incomplete, duplicate-heavy, partner/background,
      multi-face, Commander-specific, and malformed deck fixtures with expected
      parse and schema outcomes.
- [x] Add compatibility tests proving additive report changes remain readable
      and breaking schema changes require a version increment and migration or
      explicit rejection path.

**Phase 2 exit:** all boundaries exchange runtime-validated, versioned,
deterministically serializable documents and the fixtures make those contracts
executable.

---

## Phase 3 — PostgreSQL, jobs, configuration, and observability

Purpose: create durable orchestration without allowing infrastructure concerns
into the pure engine.

- [x] Implement a validated server-only configuration module that fails fast,
      distinguishes web, worker, migration, and test settings, and never exports
      secrets into the client bundle.
- [x] Add reviewed Drizzle schemas and SQL migrations for users/sessions,
      decks/revisions, version records, analyses/events/findings/artifacts,
      pods, source syncs/provenance, and audit events.
- [x] Add database constraints for immutable revisions and completed reports,
      valid state transitions, visibility, ownership, idempotency, version-tuple
      references, and bounded event ordering.
- [x] Define separate migration, web, worker, and backup PostgreSQL roles; prove
      runtime roles lack DDL privileges in integration tests.
- [x] Add Testcontainers-backed migration and repository tests for a clean
      database, forward migrations, transaction rollback, constraints,
      concurrent idempotency, and representative indexed queries.
- [x] Integrate Graphile Worker with named, runtime-validated, idempotent tasks,
      bounded retry policies, cancellation/timeout behavior, and one CPU-heavy
      job per worker process by default.
- [ ] Create analysis records and enqueue jobs atomically in one transaction;
      prove retries do not duplicate completed work or progress events.
- [ ] Persist reconnectable progress events with monotonic IDs and terminal
      states suitable for SSE `Last-Event-ID` recovery.
- [ ] Add Pino JSON logging and redaction for cookies, authorization values,
      email addresses, credential-bearing URLs, deck contents, and secrets;
      propagate request and analysis IDs into worker logs.
- [ ] Add non-sensitive `/health/live` and `/health/ready` behavior, including
      database and required-snapshot readiness, and test degraded states.

**Phase 3 exit:** real PostgreSQL migrations and retry-safe jobs pass integration
tests, while the engine packages remain unable to import infrastructure.

---

## Phase 4 — Versioned card, policy, role, and combo data

Purpose: make every classification reproducible and attributable before it can
affect a score.

- [ ] Complete and date the current terms/licensing review for Scryfall,
      Wizards policy announcements, Commander Spellbook, and any fixture source
      before ingesting or redistributing their data.
- [ ] Implement a source-adapter boundary with allowlisted origins, HTTPS-only
      requests, redirect and address revalidation, strict size/time limits,
      checksums, conditional requests, provenance, and sanitized errors.
- [ ] Implement Scryfall bulk-data ingestion for canonical cards, Oracle faces,
      printings, color identity, legality, release status, and external IDs;
      never use card names as database identity.
- [ ] Stage, validate, checksum, and atomically promote immutable card-data
      snapshots. Retain the previous known-good snapshot and prove rollback when
      download, parse, validation, or promotion fails.
- [ ] Create a tiny legally redistributable development snapshot so setup and
      tests do not require the network or a full catalog download.
- [ ] Implement immutable Commander policy snapshots for banned cards, Game
      Changers, bracket rules, extra-turn rules, mass-land-denial rules, and
      other official floor inputs with effective dates and source citations.
- [ ] Implement curated card-role overlays with reviewer, rationale, evidence,
      confidence, schema version, and correction history; unclassified cards
      must remain explicit rather than receiving guessed roles.
- [ ] Implement Commander Spellbook combo ingestion only within approved terms,
      preserving prerequisites, results, variant identity, provenance, and
      shared pieces instead of flattening variants into independent combos.
- [ ] Add source-sync run records, validation summaries, diff review, atomic
      promotion, last-known-good fallback, and alerts for stale or failed data.
- [ ] Add adversarial fixtures for renamed cards, meld/adventure/split faces,
      rebalanced/digital-only cards, future release dates, ambiguous input, and
      a policy change occurring between snapshots.

**Phase 4 exit:** any normalized card, role, combo, or policy decision can be
reproduced from an immutable snapshot and traced to its source and review state.

---

## Phase 5 — Pure trustworthy-scanner engine

Purpose: produce the first honest deterministic report without simulation or
UI-driven scoring.

- [ ] Implement a bounded paste-deck parser with useful line-level diagnostics,
      quantity handling, commander/sideboard recognition, common export syntax,
      Unicode normalization, and order-independent canonical output.
- [ ] Resolve parsed entries against one explicit card-data snapshot, preserving
      unresolved and ambiguous entries as findings rather than choosing
      silently.
- [ ] Validate Commander count, commander eligibility, partner/background rules,
      color identity, singleton exceptions, banned cards, release status, and
      format legality with exact card-and-rule evidence.
- [ ] Evaluate the official bracket floor deterministically from one explicit
      policy snapshot and expose every rule and card that raises it.
- [ ] Build the deck graph for cards, functional roles, tutors, targets,
      enablers, payoffs, recursion, protection, combo prerequisites/results,
      redundancy, and shared failure points.
- [ ] Detect known complete combos, missing-piece near-combos, overlapping
      variants, game-ending loops, repeated extra turns, locks, and mass land
      denial without counting one shared core as many independent lines.
- [ ] Implement evidence-backed Mana, Access, Cohesion, Control, Recovery, and
      Conversion assessments; a severe structural weakness cannot disappear
      behind an unrelated strength.
- [ ] Implement an initial Capability band, recommended table-fit range,
      volatility profile, table-impact profile, and confidence result from
      documented reason codes. Return `unknown` where methodology or coverage
      is insufficient.
- [ ] Implement a small versioned PRNG with published vectors, fixed-point or
      integer score-critical math, stable traversal/sorting, and no
      `Math.random()` or hidden environmental input.
- [ ] Add focused unit tests for every rule and reason code, golden reports at
      important boundaries, and fast-check properties for ordering, duplicates,
      determinism, bounded output, graph invariants, and honest unknowns.
- [ ] Add an engine dependency test proving it cannot import SvelteKit, Drizzle,
      network clients, filesystem APIs, environment variables, clocks, locale,
      or global randomness.

**Phase 5 exit:** the pure engine generates the same evidence-linked structured
report from the same normalized deck and version tuple on every supported
environment, while declining to fabricate unsupported conclusions.

---

## Phase 6 — End-to-end guest scan and report

Purpose: deliver the first complete user value path from pasted list to
explainable report.

- [ ] Implement `POST /api/v1/analyses` with Zod validation, a 256 KiB-or-lower
      bounded body, deck and option limits, `Idempotency-Key`, transactional job
      enqueue, and `202 Accepted` URLs.
- [ ] Implement authorized `GET /api/v1/analyses/{id}`,
      `GET /api/v1/analyses/{id}/events`, and `GET /api/v1/versions` with RFC
      9457 errors, stable schemas, safe cache headers, and no broad CORS.
- [ ] Implement SSE progress with keepalive, reconnection, `Last-Event-ID`,
      terminal completion/error behavior, authorization rechecks, and graceful
      shutdown.
- [ ] Implement strict anonymous IP and workload quotas, concurrent-job limits,
      bounded simulation placeholders, overload behavior, and tests that do not
      trust forwarded addresses until the selected proxy topology is enforced.
- [ ] Build a mobile-first, progressively enhanced paste form that remains
      navigable and submit-capable without client JavaScript and preserves
      drafts across validation errors.
- [ ] Build calm queued/running/retrying/failed progress states and an
      accessible report page showing every public result, version tuple,
      uncertainty, known limitation, and expandable evidence.
- [ ] Render report prose from controlled reason-code templates. Do not add an
      LLM dependency or let presentation invent findings.
- [ ] Keep guest analyses private by default using an authorized server-side
      guest context; prevent enumeration, cross-guest reads, cache leakage, and
      accidental search indexing.
- [ ] Add strict CSP, CSRF/origin protection, security headers, safe external
      image policy, no unsafe HTML rendering, parameterized queries, and
      adversarial stored-XSS and oversized-input tests.
- [ ] Add Playwright coverage for a successful scan, malformed list, illegal
      deck, policy finding, reconnect, worker failure, quota rejection,
      JavaScript-disabled submission, privacy boundary, and keyboard flow.
- [ ] Replace the README's illustrative status only after the deployed behavior
      exists; until then, keep examples and unavailable features unmistakably
      labeled.

**Phase 6 exit:** a guest can paste a deck and receive a private, reproducible,
evidence-backed report through a tested web/API/worker/database path.

---

## Phase 7 — Accounts, privacy, sharing, and lifecycle

Purpose: add identity without weakening the safe guest path or private defaults.

- [ ] Integrate Better Auth with opaque database sessions in Secure, HttpOnly,
      host-only cookies and an appropriate SameSite policy; never put bearer
      tokens or session secrets in browser storage.
- [ ] Implement verified email magic-link onboarding/recovery after the email
      owner decision, with single-use, expiration, rate-limit, anti-enumeration,
      and redirect-validation tests.
- [ ] Add passkeys as the preferred sign-in method and require strong
      reauthentication for email changes, credential removal, and account
      deletion.
- [ ] Implement immutable deck revisions, ownership, history, guest-to-account
      claim rules, and authorization for every deck, report, event, artifact,
      pod, and mutation.
- [ ] Add PostgreSQL row-level security as defense in depth before private deck
      sharing is generally available; prove application and RLS denials with
      cross-user integration tests.
- [ ] Implement explicit public/unlisted sharing and revocation. New objects
      remain private, public URLs use immutable report versions, and revoked
      access is not served from shared caches.
- [ ] Add security audit events with actor, object, outcome, request ID, and
      timestamp while excluding unnecessary deck contents, email addresses,
      secrets, and credentials.
- [ ] Implement account export, deletion, retention, orphan-job, shared-link,
      audit-retention, and backup-retention behavior and document what deletion
      can and cannot remove immediately.
- [ ] Add account settings and privacy UX with session/device visibility,
      passkey management, sharing state, export, deletion, and accessible
      confirmation flows.
- [ ] Threat-model and test CSRF, session fixation, token replay, object-ID
      guessing, cross-account access, revoked links, stale caches, and sensitive
      action reauthentication.

**Phase 7 exit:** guests and account holders have test-backed private ownership,
explicit sharing, recoverable authentication, and documented data lifecycle.

---

## Phase 8 — Installable PWA and safe offline behavior

Purpose: make PodGauge feel native without caching credentials or lying about
offline analysis.

- [ ] Ship a valid manifest with name, short name, description, canonical
      start/scope/id/lang, standalone display fallback, light/dark colors, and
      only implemented shortcuts.
- [ ] Create owned 192px and 512px regular and maskable icons, favicons, and
      representative screenshots; verify safe-zone and install metadata in
      Chromium and at least one mobile platform.
- [ ] Implement an `injectManifest` service worker with versioned cache names,
      bounded runtime caches, offline navigation fallback, and a unit-tested
      route classification policy.
- [ ] Precache only hashed app assets; network-only all auth, account, admin,
      mutation, private, and `no-store` responses; never precache the card
      catalog and strictly bound card-image caching.
- [ ] Add Dexie stores for local drafts, bounded recent public reports,
      explicitly opted-in private reports, and queued submissions. Store no
      session identifiers, auth tokens, passwords, or privileged API data.
- [ ] Implement offline syntax validation and an honest outbox that says a scan
      is queued, not completed; revalidate authorization and current versions
      after reconnecting.
- [ ] Purge the signed-out user's private offline reports and outbox, and add a
      storage screen that displays and completely erases retained local data.
- [ ] Add a user-controlled update prompt that never forces service-worker
      activation over an open edit. Offer installation only after demonstrated
      value and document manual iOS installation.
- [ ] Verify safe-area insets, 44-by-44 CSS-pixel targets, URL-addressable state,
      visible focus, reduced motion, zoom/reflow, contrast, keyboard completion,
      screen-reader landmarks, and WCAG 2.2 AA-critical flows.
- [ ] Add cross-browser Playwright coverage for offline drafts, queued scans,
      reconnect, update activation, sign-out purge, private-cache exclusion,
      quota eviction, install metadata, and corrupted IndexedDB recovery.

**Phase 8 exit:** PodGauge is installable and useful offline while private data,
authorization, updates, and queued analysis remain explicit and safe.

---

## Phase 9 — Seeded simulation and closing windows

Purpose: add measured timing claims without hiding model assumptions or
uncertainty.

- [ ] Write and version the simulation specification for deck order, mulligans,
      play/draw, land drops, colored sources, mana development, castability,
      role access, interaction assumptions, eliminations, and table wins.
- [ ] Build deterministic seeded simulations inside the pure engine with stable
      PRNG consumption, fixed iteration inputs, no wall clock, and golden vectors
      across supported platforms.
- [ ] Model mana availability and colored-source requirements, including
      commanders, modal faces, conditional lands, rocks, rituals, reducers, and
      other explicitly classified acceleration without treating all mana alike.
- [ ] Model access to roles and supported lines using tutor restrictions,
      redundancy, dependencies, protection, shared failure points, and
      unresolved-classification penalties.
- [ ] Produce high-roll, typical, and slow closing windows that distinguish one
      elimination from winning the table and surface model limitations.
- [ ] Add stability analysis and uncertainty intervals; increase confidence only
      when iteration count, classification coverage, and convergence evidence
      support it.
- [ ] Enforce per-job iteration, CPU, memory, concurrency, and cancellation
      budgets and prove malicious inputs cannot monopolize the worker queue.
- [ ] Add adversarial fixtures for explosive mulligans, color screw, glass
      cannons, tutorless redundancy, stax/control, alternate wins, commander
      dependence, and decks the model cannot yet simulate honestly.
- [ ] Benchmark simulation speed and memory on the target single-server profile
      before considering worker threads or another runtime; record thresholds
      and profiling evidence in an ADR if architecture changes.
- [ ] Expose the seed, model version, iterations, assumptions, confidence, and
      evidence in reports and exports.

**Phase 9 exit:** closing-window claims are seeded, bounded, reproducible,
calibratable, and visibly distinct from policy or structural findings.

---

## Phase 10 — Revisions, counterfactuals, feedback, and exports

Purpose: turn a scan into a practical tuning and communication workflow without
losing provenance.

- [ ] Implement revision comparison over immutable deck and report versions,
      separating card-list changes from changes caused by engine, policy, data,
      benchmark, schema, or simulation versions.
- [ ] Show added/removed cards, changed graph relationships, affected evidence,
      Deckprint movement, bracket-floor changes, confidence movement, and
      closing-window changes without implying causation the engine did not test.
- [ ] Implement bounded counterfactual card-swap analysis using the same pinned
      context and seed, and label interactions or nonlinear results that prevent
      simple one-card attribution.
- [ ] Add classification feedback tied to exact card, role/relationship,
      report, engine, policy, and data versions with abuse controls and a human
      review state; feedback never mutates completed reports.
- [ ] Add versioned JSON and Markdown exports that round-trip or explicitly
      document lossy fields, escape untrusted content, and preserve attribution.
- [ ] Add deterministic share-image export in the worker with accessible text
      alternatives, bounded resources, no remote script execution, and visual
      regression tests.
- [ ] Apply authorization, expiration, deletion, cache, and audit rules to every
      export and artifact; private artifacts are never discoverable public URLs.
- [ ] Add browser and integration tests for same-context comparison,
      cross-version comparison, reverted edits, counterfactual limits, feedback
      review, export injection, artifact privacy, and deterministic regeneration.

**Phase 10 exit:** users can understand what changed, test bounded alternatives,
report classifications, and share portable results without erasing version or
privacy context.

---

## Phase 11 — Pod Fit and public calibration

Purpose: deliver the signature four-deck table-fit workflow and earn accuracy
claims through public evidence.

- [ ] Implement immutable four-member pods and `POST /api/v1/pods` /
      `GET /api/v1/pods/{id}` contracts with ownership, sharing, version tuples,
      incomplete-member handling, idempotency, and bounded computation.
- [ ] Compare capability bands and closing windows without averaging away
      uncertainty or treating official bracket floor as a power score.
- [ ] Detect when one deck outruns available interaction, table-wide answer
      scope gaps, severe matchup polarization, conflicting win patterns,
      overlapping table-impact concerns, and unresolved uncertainty.
- [ ] Generate a short neutral Rule Zero summary entirely from structured Pod
      Fit evidence; any optional LLM paraphrase is opt-in, provider-disclosed,
      unable to add findings, and disabled by default for self-hosters.
- [ ] Build a mobile-first Pod Fit interface with private-by-default pod state,
      four clear deck identities, evidence expansion, accessible comparison,
      link sharing, and useful printed/exported output.
- [ ] Establish a consented benchmark corpus spanning stock precons, reviewed
      Brackets 1–4, high-3/low-4 boundaries, current competitive lists, same-deck
      revisions, and adversarial archetypes.
- [ ] Separate training/development and holdout sets by commander family and
      time; add leakage and near-duplicate detection so revisions cannot inflate
      accuracy.
- [ ] Implement parsing/legality accuracy, bracket-floor accuracy, pairwise
      ranking, band calibration error, closing-window MAE, interval coverage,
      test-retest determinism, and per-archetype/bracket reporting.
- [ ] Publish methodology, sample sizes, confidence intervals, data dates,
      exclusions, failures, known biases, and regression history alongside any
      accuracy claim. Never publish only favorable examples.
- [ ] Add optional minimal post-game logging and only permitted tracker or
      tournament integrations after terms, consent, privacy, sampling bias, and
      deletion behavior are documented and tested.

**Phase 11 exit:** four real decks produce an evidence-linked table-fit report,
and every public accuracy claim is reproducible from a protected holdout process
with failures and limitations visible.

---

## Phase 12 — Self-hosted production and release readiness

Purpose: deploy `podgauge.com` safely on one Ubuntu host and make recovery more
than a promise.

- [ ] Build reproducible multi-stage Node 24 glibc-based OCI images for web and
      worker, pinned by digest, running as an unprivileged UID with init,
      health checks, graceful SIGTERM handling, and no embedded secrets.
- [ ] Add hardened production Compose with private web/worker/database networks,
      no worker or PostgreSQL host ports, web bound only to `127.0.0.1:3000`,
      read-only filesystems where practical, dropped capabilities,
      `no-new-privileges`, explicit writable mounts, and resource limits.
- [ ] Add an explicit one-shot migration service and documented forward/rollback
      deployment sequence. Web and worker replicas must never race to migrate.
- [ ] Add Caddy examples for `podgauge.com` and the permanent `www` redirect,
      HTTPS, zstd/gzip, safe headers, request IDs, SSE timeouts, and no caching of
      private/authenticated responses; generate nonce-aware CSP in SvelteKit.
- [ ] Implement the owner-selected DNS-only or Cloudflare Full (strict) profile,
      restrict the origin as required, automate Cloudflare range changes if
      used, and prove client-IP trust and direct-origin failure behavior.
- [ ] Mount secrets through Compose secrets or root-owned files scoped to the
      process that needs them. Add rotation, inventory, emergency revocation,
      and secret-leak canary tests for logs, errors, images, and client bundles.
- [ ] Implement nightly encrypted PostgreSQL logical backups plus config,
      migrations, and secret inventory; copy them with restic to the approved
      separately credentialed destination under documented daily/weekly/monthly
      retention.
- [ ] Automate a restore into an isolated environment, verify representative
      users/decks/reports/version tuples and application readiness, and record a
      dated successful restore at least monthly. A backup without a restore test
      does not satisfy this box.
- [ ] Add operations dashboards/alerts for HTTP latency/error rate, queue depth
      and age, job failures, source freshness, database saturation, disk space,
      certificate health, and backup/restore age using vendor-neutral telemetry.
- [ ] Complete an ASVS 5.0 Level 2 review and targeted abuse/load tests for
      auth, authorization, CSRF, SSRF adapters, stored XSS, quotas, oversized and
      compressed inputs, job exhaustion, cache leakage, and administrative paths.
- [ ] Add Renovate, Gitleaks, OSV-Scanner, Trivy, Syft SBOM generation, and
      Cosign signing. Pin CI actions and base images; define severity policy,
      false-positive review, patch cadence, and release-blocking thresholds.
- [ ] Build and smoke-test multi-architecture release images, publish immutable
      semantic-version and commit-SHA tags to the selected registry, and verify
      signatures, SBOMs, health endpoints, migrations, and a real guest scan.
- [ ] Add `docs/operations.md`, deployment, rollback, incident, source-sync,
      backup/restore, secret-rotation, upgrade, and disaster-recovery runbooks
      that a new operator can execute without tribal knowledge.
- [ ] Verify production DNS, HTTPS renewal, canonical redirects, email delivery,
      PWA installation, offline behavior, sharing/privacy, no default telemetry,
      a real scan, monitoring, backup, and restore before changing the README
      from pre-alpha or announcing availability.

**Phase 12 exit:** the tagged, signed, backed-up application is reproducibly
running at `podgauge.com`, both remotes contain the release commit, restore has
been proven, and public claims match observed production behavior.

---

## Deferred capabilities and measured scaling gates

These are intentionally not launch blockers. Promote one into a numbered phase
only after its prerequisite and acceptance criteria are documented.

- [ ] Add one allowlisted deck-provider import adapter at a time with current
      terms review, SSRF defenses, provenance, limits, and provider fixtures;
      never add a generic server-side URL fetcher.
- [ ] Add share-target and `.txt`/`.dek` file handling only after install,
      privacy, content-type, size-limit, and hostile-file tests are mature.
- [ ] Add opt-in push notifications only if scan duration demonstrates user
      value; never request permission on first visit.
- [ ] Add WAL archiving and pgBackRest only when the accepted recovery-point
      objective becomes shorter than the logical-backup interval.
- [ ] Add object storage only when measured PostgreSQL size or backup time
      justifies it and artifact authorization remains enforceable.
- [ ] Add Node worker threads, more worker replicas, partitioning, or a new job
      broker only after profiling shows the existing design misses a documented
      service objective.
- [ ] Consider Rust/Wasm for engine hotspots only after profiling a stable
      TypeScript implementation and preserving the exact report contract and
      deterministic vectors.
- [ ] Consider Tauri or Capacitor only for a proven requirement unavailable to
      the mature PWA.

---

## Known limits not to overclaim

- PodGauge now has a runnable SSR shell, graceful worker, pure foundation
  packages, validated server configuration, a durable PostgreSQL user/data
  schema, least-privilege runtime database roles, Testcontainers-backed database
  coverage, a Graphile Worker queue boundary, and executable portable contracts
  with synthetic fixtures. The queue has no public producer or scanner executor
  yet; the application still has no deck parser, scanner/report engine,
  implemented public analysis API, PWA, calibration corpus, release image, or
  production deployment.
- The sample report in `README.md` illustrates the intended format and is not a
  result from a live scoring service.
- No Capability thresholds, Deckprint weights, closing-window model, accuracy
  result, or bracket-floor implementation is validated yet.
- No third-party data import is approved merely because a source is named in
  the README or specification. Terms and attribution must be rechecked at
  implementation time.
- The MIT License covers PodGauge's original software and documentation only.
  It does not grant rights to third-party Magic data, imagery, datasets, or
  contributed fixtures.
- Ownership of `podgauge.com` does not prove DNS, TLS, proxy, email, backup, or
  application deployment is configured.
- Dual Git remotes are mirrors of source history, not backups of production
  PostgreSQL data, secrets, container images, or the running host.

Remove a limit only in the same verified change that makes it false.

---

## Verification

### Always-required baseline

```sh
git diff --check
```

### Verified Phase 1 foundation and governance reconciliation

The following passed on 2026-08-17 under Node 24.19.0 and pnpm 11.22.0 and were
rerun after the MIT and private-reporting decisions were implemented. The
integration command ran with `PODGAUGE_RUN_DB_INTEGRATION=1` against the healthy
development PostgreSQL 18.4 service.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm test:e2e
corepack pnpm --filter @podgauge/worker smoke
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm data:sync
corepack pnpm benchmark
docker compose config
docker compose up -d --wait postgres
```

The attribution-only follow-up also reran the frozen install, `pnpm verify`,
`pnpm test:e2e`, `docker compose config`, and `git diff --check` on 2026-08-17.
The opt-in live PostgreSQL integration test was not enabled in that follow-up;
it passed on the immediately preceding license commit, and no runtime behavior
or database code changed.

The root `dev` path also served the SSR page and non-cacheable liveness endpoint
while the worker reported `ready`, then reported `stopped` on SIGINT. Database
seeding was repeated and remained one `development_fixture` row.

### Verified Phase 2 contracts and deterministic serialization

The following passed on 2026-08-17 under Node 24.19.0 and pnpm 11.22.0. The
aggregate verify ran with live PostgreSQL integration against the healthy 18.4
development service. The first optional benchmark run rejected its legacy flat
version input as intended; its smoke consumer was migrated to the full tuple and
the recorded rerun passed.

```sh
mise exec node@24.19.0 -- corepack pnpm install --frozen-lockfile
mise exec node@24.19.0 -- corepack pnpm contracts:check
PODGAUGE_RUN_DB_INTEGRATION=1 mise exec node@24.19.0 -- corepack pnpm verify
mise exec node@24.19.0 -- corepack pnpm test:e2e
mise exec node@24.19.0 -- corepack pnpm --filter @podgauge/worker smoke
mise exec node@24.19.0 -- corepack pnpm data:sync
mise exec node@24.19.0 -- corepack pnpm benchmark
docker compose up -d --wait postgres
mise exec node@24.19.0 -- corepack pnpm db:migrate
mise exec node@24.19.0 -- corepack pnpm db:seed
docker compose config
git diff --check
```

### Verified Phase 3 configuration, schema, and constraints

The following passed on 2026-08-17 under Node 24.19.0 and pnpm 11.22.0. The
aggregate verify used the live Compose PostgreSQL service. The Phase 3 suite
created an isolated database, applied both reviewed migrations from empty,
exercised contract-validating repository writes and constraints, then dropped
the database. It covered concurrent idempotency and event writers, rollback
after a deferred constraint failure, immutable revisions and completed reports,
ownership/private defaults, complete version tuples and provenance, valid state
transitions, and bounded monotonic events. This does not claim Testcontainers.

The first generated schema review exposed parameter placeholders in CHECK
expressions before publication; the schema source was corrected to emit literal
static patterns, the migration was regenerated, and the migration-artifact test
now rejects placeholders or missing handwritten constraint triggers.

The first published GitHub run (`32095674246`) then exposed a clean-checkout
ordering defect: migration loaded contract JavaScript before workspace packages
were built. Database schema annotations now use type-only contract imports. A
follow-up ran migration and seeding with `packages/contracts/dist` absent before
rerunning the aggregate verification, matching CI's install-first ordering.

```sh
mise exec node@24.19.0 -- corepack pnpm install --frozen-lockfile
docker compose up -d --wait postgres
mise exec node@24.19.0 -- corepack pnpm db:generate
mise exec node@24.19.0 -- corepack pnpm db:migrate
mise exec node@24.19.0 -- corepack pnpm db:seed
PODGAUGE_RUN_DB_INTEGRATION=1 mise exec node@24.19.0 -- corepack pnpm verify
mise exec node@24.19.0 -- corepack pnpm test:e2e
mise exec node@24.19.0 -- corepack pnpm --filter @podgauge/worker smoke
mise exec node@24.19.0 -- corepack pnpm data:sync
mise exec node@24.19.0 -- corepack pnpm benchmark
docker compose config
docker compose config --quiet
git diff --check
```

### Verified Phase 3 roles, Testcontainers, and queue

The following passed on 2026-08-18 under Node 24.19.0 and pnpm 11.22.0. Role
bootstrap was exercised against both a clean Testcontainers database and the
existing data-preserving Compose volume. The initial existing-volume run found
an owned-sequence transfer edge case and PostgreSQL's rejection of a password
bind placeholder in `ALTER ROLE`; both paths were corrected before rerunning
bootstrap, migration, and seed successfully.

The database suite owns digest-pinned PostgreSQL 18.4 containers rather than
mutating the Compose database. It proves clean and forward migrations,
transaction rollback, ownership and visibility, state transitions,
immutability, complete version references, actual concurrent idempotency, and
the intended index plans. It also connects as migration, web, worker, and
backup to prove allowed operations, forbidden DDL and writes, role attributes,
and rerunnable ownership repair.

Graphile Worker 0.17.3 migrations run only as `podgauge_migration`; reviewed
grants and explicit RLS policies let the worker operate the queue without DDL
and let backup read without writing. A separate owned container proves
migration reruns, stable-key deduplication, one-at-a-time execution, retry
bounds, execution-boundary payload validation, hard timeout, and retry-safe
shutdown cancellation. Its allowlisted logger omits free-form messages and
metadata. The first queue test exposed Graphile's RLS requirement and the need
to explicitly unlock an aborted pool's job; the reviewed grants and shutdown
path were corrected before the full rerun passed.

The clean-artifact drill also caught the queue migrator loading the database
package's aggregate repository entrypoint and therefore requiring prebuilt
contract JavaScript. A dedicated role-management export now keeps queue
migration on the schema-only path; role bootstrap, both migration commands, and
seed were rerun with `packages/contracts/dist` absent.

The first cross-browser rerun then found Playwright's server still supplied the
old shared test database credential. Its test web process now receives the web
role URL, and the configuration error label correctly distinguishes web from
the deterministic test reader; the rebuilt cross-browser rerun passed.

```sh
mise exec node@24.19.0 -- corepack pnpm install --frozen-lockfile
docker compose up -d --wait postgres
mise exec node@24.19.0 -- corepack pnpm db:roles
mise exec node@24.19.0 -- corepack pnpm db:generate
mise exec node@24.19.0 -- corepack pnpm db:migrate
mise exec node@24.19.0 -- corepack pnpm queue:migrate
mise exec node@24.19.0 -- corepack pnpm db:seed
PODGAUGE_RUN_DB_INTEGRATION=1 mise exec node@24.19.0 -- corepack pnpm verify
mise exec node@24.19.0 -- corepack pnpm test:e2e
mise exec node@24.19.0 -- corepack pnpm --filter @podgauge/worker smoke
mise exec node@24.19.0 -- corepack pnpm data:sync
mise exec node@24.19.0 -- corepack pnpm benchmark
docker compose config
docker compose config --quiet
git diff --check
```

### Required fast gate after Phase 1

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
```

`pnpm verify` must cover formatting, lint, `svelte-check`, TypeScript, unit and
property tests, database integration tests when configured, and the production
build. Keep the root script authoritative rather than copying a stale expanded
command list here.

### Risk-based additional gates

```sh
corepack pnpm test:e2e
docker compose config
docker compose up --build --wait
```

Run source-sync fixtures for ingestion changes, compatibility/golden/benchmark
tests for report-affecting changes, Playwright plus accessibility checks for user
flows, container and restore drills for infrastructure changes, and the security
toolchain for dependency or release changes.

If a gate cannot run, do not imply it passed. Record the exact command, failure
or environmental blocker, narrower evidence obtained, and the remaining risk in
the handoff and commit or pull-request description.

Before publishing authorized work:

```sh
git diff --check
git status --short
git log -1 --oneline
git push origin HEAD
git push codeberg HEAD
```

Verify both remote branch tips after pushing. Never force-push as part of the
normal BUILD workflow.

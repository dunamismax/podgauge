# ADR 0001: Adopt the PodGauge application foundation

- Status: accepted
- Date: 2026-08-17
- Deciders: repository owner through the normative technical specification
- Related tracker item: Phase 0 architecture decisions

## Context

PodGauge needs reproducible analysis, durable work outside HTTP requests,
portable public contracts, strong privacy boundaries, offline-capable UX, and a
self-hosted path that one operator can understand. The initial architecture
must preserve package isolation without the operational cost of microservices.

## Decision

Adopt the following linked decisions from `docs/spec.md`:

1. A TypeScript modular monolith with separate SvelteKit web and Node worker
   processes, as defined by **Executive decision**, **System architecture**, and
   **Repository layout**.
2. PostgreSQL 18 as system of record and Graphile Worker as the PostgreSQL job
   queue, as defined by **Recommended stack**, **Worker**, and **Data design**.
3. A pure deterministic analysis engine with an explicit version tuple and
   seed, as defined by **Deterministic engine**.
4. Same-origin REST under `/api/v1`, runtime schemas, OpenAPI 3.1, and RFC 9457
   errors, as defined by **API contract**.
5. A progressively enhanced, self-hosted SvelteKit PWA deployed with Docker
   Compose behind host Caddy, as defined by **PWA specification** and
   **Deployment on Ubuntu with Caddy**.

## Alternatives considered

The specification rejects initial microservices, Redis, GraphQL, tRPC,
Kubernetes, generic URL fetching, a proprietary hosting requirement, and a
native wrapper because none satisfies a measured initial requirement that
outweighs added security or operational cost.

## Consequences

Package dependencies must remain enforceable. Web and worker may scale
independently while sharing PostgreSQL. The engine cannot access infrastructure
or implicit environmental state. Public contracts require compatibility tests.
PWA caching must fail closed for private data. Operators must run explicit
migrations and maintain PostgreSQL recovery rather than treating source mirrors
as backups.

## Evidence and review

The normative evidence and primary references are recorded in the **Research
basis** of `docs/spec.md`. Reconsider only after a concrete measurement shows a
product, security, compatibility, or operational requirement the foundation
cannot meet; record that change in a new ADR before implementation.

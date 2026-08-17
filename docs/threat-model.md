# Initial threat model

Last reviewed: 2026-08-17. Target baseline: OWASP ASVS 5.0 Level 2. This model
records design obligations; controls are not considered verified until their
implementation and tests exist.

## Assets and boundaries

Assets include private decks and reports, account and session data, immutable
version records, source provenance, policy/role review history, job capacity,
backups, deployment secrets, and release integrity. Trust boundaries exist at
the browser/HTTP edge, authentication and object authorization, web/database
transaction, database/worker queue, external source adapter, offline storage,
backup destination, CI, and release registry.

## Threat register

| Threat                      | Required controls and verification                                                                                                                                                                                                   | Residual/blocked state                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Guest abuse and enumeration | Strict body/deck/work quotas, trusted-address configuration only after proxy restrictions, opaque authorized guest context, nondisclosing errors, concurrency tests                                                                  | Not implemented                                   |
| Import SSRF                 | One allowlisted HTTPS adapter per provider; reject credentials; re-resolve redirects; block loopback, private, link-local, multicast, metadata, and equivalent IPv6 ranges; bound time, bytes, redirects, decompression, and parsing | No adapters are enabled                           |
| Stored XSS                  | Treat imports as data, avoid `{@html}`, encode output, narrow CSP and image hosts, hostile fixture and browser tests                                                                                                                 | UI not implemented                                |
| CSRF and origin confusion   | Keep SvelteKit origin checks, protect every cookie-authenticated mutation, host-only SameSite cookies, no broad CORS, cross-origin tests                                                                                             | Auth not implemented                              |
| Broken object authorization | Owner/visibility checks on every read and write, explicit sharing, private defaults, non-enumerable IDs only as defense in depth, later PostgreSQL RLS and cross-user tests                                                          | Data model not implemented                        |
| Job exhaustion              | Runtime-validated payloads, iteration/CPU/memory/concurrency limits, one CPU-heavy job per worker, cancellation, bounded retries, quotas, overload tests                                                                             | Queue not implemented                             |
| Data poisoning              | Checksums, provenance, staged validation, diff review, reviewer identity, atomic promotion, last-known-good rollback, immutable snapshot references                                                                                  | External data blocked pending review              |
| Cache leakage               | `private, no-store` for private/session data, strong versioned cache keys for immutable public reports, service-worker route denylist, sign-out purge, cache tests                                                                   | PWA not implemented                               |
| Secret leakage              | Process-scoped secret files, redacted structured logs, no client exports/CLI arguments/images/Git, rotation inventory, secret scanning and canary tests                                                                              | Private contact and production secrets unresolved |
| Backup compromise           | Encrypted off-site target with separate credentials, least privilege, retention, access logging, isolated restore drills, documented deletion limits                                                                                 | Destination is an owner decision                  |
| Supply-chain compromise     | Frozen lockfile, exact runtime/container versions, dependency and secret scanning, pinned CI/release inputs, SBOM, signatures, reviewed updates                                                                                      | Full release toolchain deferred                   |

## Abuse cases to retain as tests

Security suites must cover hostile redirects and DNS changes, IPv4/IPv6 private
targets, credential-bearing URLs, oversized and compressed bodies, malicious
deck text, stored script payloads, forged origins, guessed object IDs, replayed
idempotency keys, excessive jobs and simulations, poisoned source snapshots,
private cached responses, credential-like log fields, compromised backup access,
and tampered dependencies or images.

## Review triggers

Update this model before implementing authentication, any remote import, public
sharing, offline private data, a new job class, production proxy trust, backup
automation, or a new release channel. Record accepted architectural changes in
an ADR and add regression evidence to the relevant `BUILD.md` item.

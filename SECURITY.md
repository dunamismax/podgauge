# Security policy

PodGauge is pre-alpha and has no verified production deployment or supported
release. Security-sensitive functionality must target OWASP ASVS 5.0 Level 2,
but configuration alone is not evidence that the target has been met.

## Reporting

A private vulnerability reporting route has not been selected. Do not disclose
a vulnerability, exploit, secret, private deck, or personal data in a public
issue. The owner must publish a private contact before this policy can be
declared release-ready. Until then, contribution intake and production use are
not supported.

If a secret is found in repository history, avoid copying it into discussion.
Record only the affected path and commit privately once a route exists; assume
the secret needs immediate rotation rather than relying on deletion from Git.

## Supported versions

There are currently no supported versions. After the first release, this file
must list supported version lines, response expectations, coordinated
disclosure guidance, and the private contact. Security fixes will be evaluated
against the threat model in `docs/threat-model.md` and must include regression
coverage when safe to publish.

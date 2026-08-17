# Security policy

PodGauge is pre-alpha and has no verified production deployment or supported
release. Security-sensitive functionality must target OWASP ASVS 5.0 Level 2,
but configuration alone is not evidence that the target has been met.

## Reporting

Email vulnerability reports to
[dunamismax@tutamail.com](mailto:dunamismax@tutamail.com) with a subject that
begins `[PodGauge security]`. The address is public, but the report and its
contents should remain private. Do not disclose a vulnerability, exploit,
secret, private deck, or personal data in a public issue.

Include a concise description, the affected commit or version, reproduction
steps that do not expose another person's data, the potential impact, and a
safe way to reply. Do not send credentials, private deck contents, or personal
data unless the maintainer specifically requests a necessary minimal sample.
PodGauge is pre-alpha, so no response-time or remediation-time commitment is
made yet.

If a secret is found in repository history, avoid copying it into discussion.
Report only the affected path and commit through the private email route;
assume the secret needs immediate rotation rather than relying on deletion
from Git.

## Supported versions

There are currently no supported versions. After the first release, this file
must list supported version lines, response expectations, coordinated
disclosure guidance, and any changes to the private contact. Security fixes
will be evaluated against the threat model in `docs/threat-model.md` and must
include regression coverage when safe to publish.

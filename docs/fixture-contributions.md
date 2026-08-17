# Public fixture contribution policy

PodGauge's original software and documentation use the MIT License. Public
fixture intake remains closed until the owner explicitly opens contributions;
the software license does not grant rights to submitted deck data or other
third-party material. This policy defines the gate and does not accept a
submission.

An accepted fixture must include:

- the contributor's confirmation that they created or are authorized to share
  the submitted list and annotations under the then-published fixture terms;
- informed consent for public repository storage and benchmark use, including
  whether credit is named, pseudonymous, or anonymous;
- source and acquisition provenance, collection date, format, commander, and
  any policy/card-data context needed to interpret it;
- independently reasoned expected behavior and uncertainty, not a copied output
  from another analyzer;
- removal of names, account IDs, private URLs, messages, match participants,
  and other unnecessary personal or secret information; and
- a declaration of third-party material and applicable permission or terms.

Maintainers record a stable fixture ID, consent/provenance record, reviewer,
license/grant version, checksum, accepted fields, training or holdout assignment,
and related revisions. Holdout membership and labels must be protected from
training leakage. Near-duplicate revisions are grouped rather than counted as
independent evidence.

Correction and removal requests must identify the fixture and requested scope
and be sent privately to
[dunamismax@tutamail.com](mailto:dunamismax@tutamail.com). Maintainers freeze
affected publication when warranted, record the decision, and remove or
correct future distributions promptly. Published Git history and expired
backups may not be instantly erasable; the intake consent must state those
limits before acceptance. Removed fixtures are excluded from future benchmarks
and releases, and derived claims are corrected when materially affected.

Fixtures may contain deck text and independently authored labels only. Do not
commit card images, copied Oracle/card datasets, other products' reports,
tournament/private tracker exports, or source material whose redistribution has
not passed `docs/data-governance.md`.

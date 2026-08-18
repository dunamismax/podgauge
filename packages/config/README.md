# `@podgauge/config`

Server-only runtime configuration for the web, worker, migration, and test
processes. Call the target-specific reader with the process environment and
fail startup on `ConfigurationError`; do not copy configuration values into
page data, API responses, browser modules, or logs.

Database URLs use `SecretValue`, whose normal string, JSON, and Node inspection
forms are redacted. Infrastructure code must call `reveal()` only at the driver
boundary. The dependency guard limits web imports to SvelteKit server files,
and the production build gate scans client assets for private configuration
markers.

Only the documented loopback development profile has defaults. Test settings
are supplied explicitly by the committed test runners. Production requires an
explicit database URL, log level, HTTPS origin, host, port, body limit, and
shutdown timeout. Forwarded-address variables are rejected until the owner
selects and deploys a verified proxy topology.

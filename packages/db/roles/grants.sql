-- PodGauge application object grants.
--
-- The migration command reapplies this manifest after every forward migration.
-- New relations therefore remain unavailable to web and worker until their
-- required operations are reviewed here. Backup receives SELECT only.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM podgauge_web, podgauge_worker, podgauge_backup;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM podgauge_web, podgauge_worker, podgauge_backup;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM podgauge_web, podgauge_worker, podgauge_backup;

GRANT USAGE ON SCHEMA public TO podgauge_web, podgauge_worker, podgauge_backup;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO podgauge_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO podgauge_backup;

GRANT SELECT ON TABLE
	system_metadata,
	users,
	sessions,
	source_provenance,
	source_sync_runs,
	card_data_snapshots,
	policy_versions,
	engine_versions,
	benchmark_versions,
	simulation_versions,
	report_schema_versions,
	card_data_snapshot_provenance,
	policy_version_provenance,
	decks,
	deck_revisions,
	analyses,
	analysis_events,
	analysis_findings,
	analysis_artifacts,
	pods,
	pod_members,
	audit_events
TO podgauge_web, podgauge_worker;

GRANT INSERT, UPDATE ON TABLE users TO podgauge_web;
GRANT INSERT, UPDATE, DELETE ON TABLE sessions TO podgauge_web;
GRANT INSERT, UPDATE, DELETE ON TABLE decks TO podgauge_web;
GRANT INSERT ON TABLE deck_revisions TO podgauge_web;
GRANT INSERT, UPDATE ON TABLE analyses TO podgauge_web;
GRANT INSERT, UPDATE, DELETE ON TABLE pods, pod_members TO podgauge_web;
GRANT INSERT ON TABLE audit_events TO podgauge_web;

GRANT INSERT ON TABLE
	source_provenance,
	card_data_snapshots,
	policy_versions,
	engine_versions,
	benchmark_versions,
	simulation_versions,
	report_schema_versions,
	card_data_snapshot_provenance,
	policy_version_provenance,
	analysis_events,
	analysis_findings,
	analysis_artifacts,
	audit_events
TO podgauge_worker;
GRANT INSERT, UPDATE ON TABLE source_sync_runs TO podgauge_worker;
GRANT UPDATE ON TABLE analyses TO podgauge_worker;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO podgauge_web, podgauge_worker;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO podgauge_web, podgauge_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA public GRANT SELECT ON TABLES TO podgauge_backup;

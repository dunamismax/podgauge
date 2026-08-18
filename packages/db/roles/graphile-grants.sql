-- Runtime grants for the Graphile Worker-owned queue schema.
-- Apply only after Graphile Worker's reviewed migration command creates the
-- schema. The worker can operate the queue but cannot alter its definition.

REVOKE ALL PRIVILEGES ON SCHEMA graphile_worker FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA graphile_worker FROM podgauge_web, podgauge_worker, podgauge_backup;
GRANT USAGE ON SCHEMA graphile_worker TO podgauge_worker, podgauge_backup;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA graphile_worker FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA graphile_worker FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA graphile_worker FROM PUBLIC;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA graphile_worker FROM podgauge_web, podgauge_worker, podgauge_backup;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA graphile_worker FROM podgauge_web, podgauge_worker, podgauge_backup;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA graphile_worker FROM podgauge_web, podgauge_worker, podgauge_backup;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO podgauge_worker;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA graphile_worker TO podgauge_worker;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA graphile_worker TO podgauge_worker;

GRANT SELECT ON ALL TABLES IN SCHEMA graphile_worker TO podgauge_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA graphile_worker TO podgauge_backup;

-- Graphile Worker intentionally enables row-level security on its private
-- relations. Its functions are security-invoker routines, so least-privilege
-- logins need explicit policies in addition to object grants.
DO $podgauge_graphile_policies$
DECLARE
	object_record record;
BEGIN
	FOR object_record IN
		SELECT c.relname AS object_name
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'graphile_worker'
		  AND c.relkind IN ('r', 'p')
		  AND c.relrowsecurity
	LOOP
		IF EXISTS (
			SELECT 1 FROM pg_policies
			WHERE schemaname = 'graphile_worker'
			  AND tablename = object_record.object_name
			  AND policyname = 'podgauge_worker_runtime'
		) THEN
			EXECUTE format(
				'DROP POLICY podgauge_worker_runtime ON graphile_worker.%I',
				object_record.object_name
			);
		END IF;
		EXECUTE format(
			'CREATE POLICY podgauge_worker_runtime ON graphile_worker.%I FOR ALL TO podgauge_worker USING (true) WITH CHECK (true)',
			object_record.object_name
		);
		IF EXISTS (
			SELECT 1 FROM pg_policies
			WHERE schemaname = 'graphile_worker'
			  AND tablename = object_record.object_name
			  AND policyname = 'podgauge_backup_read'
		) THEN
			EXECUTE format(
				'DROP POLICY podgauge_backup_read ON graphile_worker.%I',
				object_record.object_name
			);
		END IF;
		EXECUTE format(
			'CREATE POLICY podgauge_backup_read ON graphile_worker.%I FOR SELECT TO podgauge_backup USING (true)',
			object_record.object_name
		);
	END LOOP;
END
$podgauge_graphile_policies$;

ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA graphile_worker REVOKE EXECUTE ON ROUTINES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA graphile_worker GRANT SELECT ON TABLES TO podgauge_backup;

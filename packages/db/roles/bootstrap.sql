-- PodGauge cluster-role and ownership bootstrap.
--
-- Run only through `pnpm db:roles` with an explicit PostgreSQL administrator
-- connection. Passwords are supplied separately through bound parameters and
-- never appear in this reviewed artifact.

DO $podgauge_roles$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'podgauge_migration') THEN
		CREATE ROLE podgauge_migration LOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'podgauge_web') THEN
		CREATE ROLE podgauge_web LOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'podgauge_worker') THEN
		CREATE ROLE podgauge_worker LOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'podgauge_backup') THEN
		CREATE ROLE podgauge_backup LOGIN;
	END IF;
END
$podgauge_roles$;

ALTER ROLE podgauge_migration WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
ALTER ROLE podgauge_web WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20;
ALTER ROLE podgauge_worker WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10;
ALTER ROLE podgauge_backup WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;

ALTER ROLE podgauge_migration SET search_path = public, pg_catalog;
ALTER ROLE podgauge_web SET search_path = pg_catalog, public;
ALTER ROLE podgauge_worker SET search_path = pg_catalog, public;
ALTER ROLE podgauge_backup SET search_path = pg_catalog, public;

-- Remove any unexpected memberships before applying object privileges. This is
-- deliberately rerunnable so a repaired development volume returns to the
-- documented boundary instead of retaining an accidental inherited role.
DO $podgauge_memberships$
DECLARE
	member_name text;
	parent_name text;
BEGIN
	FOREACH member_name IN ARRAY ARRAY[
		'podgauge_migration',
		'podgauge_web',
		'podgauge_worker',
		'podgauge_backup'
	]
	LOOP
		FOR parent_name IN
			SELECT pg_get_userbyid(roleid)
			FROM pg_auth_members
			WHERE member = (SELECT oid FROM pg_roles WHERE rolname = member_name)
		LOOP
			EXECUTE format('REVOKE %I FROM %I', parent_name, member_name);
		END LOOP;
	END LOOP;
END
$podgauge_memberships$;

-- The migration login is the sole owner and DDL principal for this database.
-- Targeted ownership transfer upgrades volumes whose original development
-- administrator created the schema before role separation existed.
DO $podgauge_database$
BEGIN
	EXECUTE format(
		'ALTER DATABASE %I OWNER TO podgauge_migration',
		current_database()
	);
	EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM PUBLIC', current_database());
	EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM podgauge_web', current_database());
	EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM podgauge_worker', current_database());
	EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM podgauge_backup', current_database());
	EXECUTE format(
		'GRANT CONNECT ON DATABASE %I TO podgauge_web, podgauge_worker, podgauge_backup',
		current_database()
	);
END
$podgauge_database$;

DO $podgauge_schemas$
DECLARE
	schema_name text;
BEGIN
	FOR schema_name IN
		SELECT nspname
		FROM pg_namespace
		WHERE nspname IN ('public', 'drizzle', 'graphile_worker')
	LOOP
		EXECUTE format('ALTER SCHEMA %I OWNER TO podgauge_migration', schema_name);
	END LOOP;
END
$podgauge_schemas$;

DO $podgauge_relations$
DECLARE
	object_record record;
BEGIN
	FOR object_record IN
		SELECT
			n.nspname AS schema_name,
			c.relname AS object_name,
			CASE c.relkind
				WHEN 'r' THEN 'TABLE'
				WHEN 'p' THEN 'TABLE'
				WHEN 'S' THEN 'SEQUENCE'
				WHEN 'v' THEN 'VIEW'
				WHEN 'm' THEN 'MATERIALIZED VIEW'
				WHEN 'f' THEN 'FOREIGN TABLE'
			END AS object_type
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname IN ('public', 'drizzle', 'graphile_worker')
		  AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
		  AND NOT (
			c.relkind = 'S'
			AND EXISTS (
				SELECT 1
				FROM pg_depend d
				WHERE d.classid = 'pg_class'::regclass
				  AND d.objid = c.oid
				  AND d.deptype IN ('a', 'i')
			)
		  )
		  AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = 'podgauge_migration')
	LOOP
		EXECUTE format(
			'ALTER %s %I.%I OWNER TO podgauge_migration',
			object_record.object_type,
			object_record.schema_name,
			object_record.object_name
		);
	END LOOP;
END
$podgauge_relations$;

DO $podgauge_routines$
DECLARE
	object_record record;
BEGIN
	FOR object_record IN
		SELECT
			n.nspname AS schema_name,
			p.proname AS routine_name,
			pg_get_function_identity_arguments(p.oid) AS identity_arguments,
			CASE p.prokind WHEN 'p' THEN 'PROCEDURE' WHEN 'a' THEN 'AGGREGATE' ELSE 'FUNCTION' END AS routine_type
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname IN ('public', 'drizzle', 'graphile_worker')
		  AND p.proowner <> (SELECT oid FROM pg_roles WHERE rolname = 'podgauge_migration')
	LOOP
		EXECUTE format(
			'ALTER %s %I.%I(%s) OWNER TO podgauge_migration',
			object_record.routine_type,
			object_record.schema_name,
			object_record.routine_name,
			object_record.identity_arguments
		);
	END LOOP;
END
$podgauge_routines$;

DO $podgauge_types$
DECLARE
	object_record record;
BEGIN
	FOR object_record IN
		SELECT n.nspname AS schema_name, t.typname AS type_name
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname IN ('public', 'drizzle', 'graphile_worker')
		  AND t.typrelid = 0
		  AND t.typname NOT LIKE '\\_%'
		  AND t.typowner <> (SELECT oid FROM pg_roles WHERE rolname = 'podgauge_migration')
	LOOP
		EXECUTE format(
			'ALTER TYPE %I.%I OWNER TO podgauge_migration',
			object_record.schema_name,
			object_record.type_name
		);
	END LOOP;
END
$podgauge_types$;

REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM podgauge_web, podgauge_worker, podgauge_backup;
GRANT USAGE ON SCHEMA public TO podgauge_web, podgauge_worker, podgauge_backup;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE podgauge_migration IN SCHEMA public GRANT SELECT ON TABLES TO podgauge_backup;

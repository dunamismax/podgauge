CREATE TABLE "analyses" (
	"analysis_id" text PRIMARY KEY NOT NULL,
	"deck_revision_id" text NOT NULL,
	"owner_user_id" uuid,
	"owner_guest_id" uuid,
	"state" text DEFAULT 'queued' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"shared_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"seed" text NOT NULL,
	"options" jsonb NOT NULL,
	"card_data_snapshot_id" text NOT NULL,
	"policy_version_id" text NOT NULL,
	"engine_version_id" text NOT NULL,
	"benchmark_version_id" text NOT NULL,
	"simulation_version_id" text NOT NULL,
	"report_schema_version_id" text NOT NULL,
	"report_id" text,
	"report_hash" char(64),
	"report_document" jsonb,
	"failure_document" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "analyses_report_id_unique" UNIQUE("report_id"),
	CONSTRAINT "analyses_id_check" CHECK ("analyses"."analysis_id" ~ '^analysis_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "analyses_owner_check" CHECK (num_nonnulls("analyses"."owner_user_id", "analyses"."owner_guest_id") = 1),
	CONSTRAINT "analyses_state_check" CHECK ("analyses"."state" in ('queued', 'running', 'retrying', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "analyses_visibility_check" CHECK ("analyses"."visibility" in ('private', 'unlisted', 'public')),
	CONSTRAINT "analyses_sharing_check" CHECK (("analyses"."visibility" = 'private' and "analyses"."shared_at" is null)
          or ("analyses"."visibility" in ('unlisted', 'public') and "analyses"."shared_at" is not null)),
	CONSTRAINT "analyses_idempotency_check" CHECK (length("analyses"."idempotency_key") between 16 and 128
          and "analyses"."idempotency_key" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'),
	CONSTRAINT "analyses_seed_check" CHECK (length("analyses"."seed") between 1 and 256),
	CONSTRAINT "analyses_terminal_data_check" CHECK (("analyses"."state" = 'completed'
            and num_nonnulls("analyses"."report_id", "analyses"."report_hash", "analyses"."report_document", "analyses"."completed_at") = 4
            and "analyses"."failure_document" is null)
          or ("analyses"."state" = 'failed'
            and "analyses"."failure_document" is not null
            and "analyses"."completed_at" is not null
            and num_nonnulls("analyses"."report_id", "analyses"."report_hash", "analyses"."report_document") = 0)
          or ("analyses"."state" = 'cancelled'
            and "analyses"."completed_at" is not null
            and num_nonnulls("analyses"."report_id", "analyses"."report_hash", "analyses"."report_document", "analyses"."failure_document") = 0)
          or ("analyses"."state" in ('queued', 'running', 'retrying')
            and num_nonnulls("analyses"."report_id", "analyses"."report_hash", "analyses"."report_document", "analyses"."failure_document", "analyses"."completed_at") = 0)),
	CONSTRAINT "analyses_report_hash_check" CHECK ("analyses"."report_hash" is null or "analyses"."report_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "analyses_report_id_check" CHECK ("analyses"."report_id" is null or "analyses"."report_id" ~ '^report_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "analyses_report_document_check" CHECK ("analyses"."report_document" is null or (
          jsonb_typeof("analyses"."report_document") = 'object'
          and "analyses"."report_document"->>'status' = 'complete'
          and "analyses"."report_document"->>'analysisId' = "analyses"."analysis_id"
          and "analyses"."report_document"->>'deckRevisionId' = "analyses"."deck_revision_id"
          and "analyses"."report_document"->>'reportId' = "analyses"."report_id"
          and "analyses"."report_document"#>>'{context,versions,cardData,snapshotId}' = "analyses"."card_data_snapshot_id"
          and "analyses"."report_document"#>>'{context,versions,policy,policyVersionId}' = "analyses"."policy_version_id"
          and "analyses"."report_document"#>>'{context,versions,engine,engineVersionId}' = "analyses"."engine_version_id"
          and "analyses"."report_document"#>>'{context,versions,benchmark,benchmarkVersionId}' = "analyses"."benchmark_version_id"
          and "analyses"."report_document"#>>'{context,versions,simulation,simulationVersionId}' = "analyses"."simulation_version_id"
          and "analyses"."report_document"#>>'{context,versions,reportSchema,reportSchemaVersionId}' = "analyses"."report_schema_version_id"))
);
--> statement-breakpoint
CREATE TABLE "analysis_artifacts" (
	"artifact_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" text NOT NULL,
	"kind" text NOT NULL,
	"media_type" text NOT NULL,
	"content_hash" char(64) NOT NULL,
	"byte_length" bigint NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_artifacts_analysis_kind_hash_unique" UNIQUE("analysis_id","kind","content_hash"),
	CONSTRAINT "analysis_artifacts_kind_check" CHECK ("analysis_artifacts"."kind" in ('report-json', 'export-json', 'markdown', 'share-image-metadata')),
	CONSTRAINT "analysis_artifacts_media_type_check" CHECK (length("analysis_artifacts"."media_type") between 3 and 128
          and "analysis_artifacts"."media_type" ~ '^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$'),
	CONSTRAINT "analysis_artifacts_hash_check" CHECK ("analysis_artifacts"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "analysis_artifacts_size_check" CHECK ("analysis_artifacts"."byte_length" between 1 and 16777216),
	CONSTRAINT "analysis_artifacts_document_check" CHECK (jsonb_typeof("analysis_artifacts"."document") = 'object')
);
--> statement-breakpoint
CREATE TABLE "analysis_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"sequence" bigint NOT NULL,
	"state" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"document" jsonb NOT NULL,
	CONSTRAINT "analysis_events_analysis_sequence_unique" UNIQUE("analysis_id","sequence"),
	CONSTRAINT "analysis_events_id_check" CHECK ("analysis_events"."event_id" ~ '^event_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "analysis_events_sequence_check" CHECK ("analysis_events"."sequence" between 0 and 9007199254740991),
	CONSTRAINT "analysis_events_state_check" CHECK ("analysis_events"."state" in ('queued', 'running', 'retrying', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "analysis_events_document_check" CHECK (jsonb_typeof("analysis_events"."document") = 'object'
          and "analysis_events"."document"->>'eventId' = "analysis_events"."event_id"
          and "analysis_events"."document"->>'analysisId' = "analysis_events"."analysis_id"
          and ("analysis_events"."document"->>'sequence')::bigint = "analysis_events"."sequence"
          and "analysis_events"."document"->>'state' = "analysis_events"."state")
);
--> statement-breakpoint
CREATE TABLE "analysis_findings" (
	"finding_id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"outcome" text NOT NULL,
	"severity" text NOT NULL,
	"reason_code" text NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_findings_id_check" CHECK ("analysis_findings"."finding_id" ~ '^finding_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "analysis_findings_outcome_check" CHECK ("analysis_findings"."outcome" in ('pass', 'fail', 'unknown')),
	CONSTRAINT "analysis_findings_severity_check" CHECK ("analysis_findings"."severity" in ('info', 'warning', 'error')),
	CONSTRAINT "analysis_findings_reason_check" CHECK (length("analysis_findings"."reason_code") between 3 and 128
          and "analysis_findings"."reason_code" ~ '^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$'),
	CONSTRAINT "analysis_findings_document_check" CHECK (jsonb_typeof("analysis_findings"."document") = 'object'
          and "analysis_findings"."document"->>'findingId' = "analysis_findings"."finding_id"
          and "analysis_findings"."document"->>'outcome' = "analysis_findings"."outcome"
          and "analysis_findings"."document"->>'severity' = "analysis_findings"."severity"
          and "analysis_findings"."document"->>'reasonCode' = "analysis_findings"."reason_code")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"audit_event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_user_id" uuid,
	"actor_guest_id" uuid,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"outcome" text NOT NULL,
	"request_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_actor_kind_check" CHECK ("audit_events"."actor_kind" in ('user', 'guest', 'service')),
	CONSTRAINT "audit_events_actor_check" CHECK (("audit_events"."actor_kind" = 'user' and "audit_events"."actor_user_id" is not null and "audit_events"."actor_guest_id" is null)
          or ("audit_events"."actor_kind" = 'guest' and "audit_events"."actor_user_id" is null and "audit_events"."actor_guest_id" is not null)
          or ("audit_events"."actor_kind" = 'service' and "audit_events"."actor_user_id" is null and "audit_events"."actor_guest_id" is null)),
	CONSTRAINT "audit_events_action_check" CHECK (length("audit_events"."action") between 3 and 128
          and "audit_events"."action" ~ '^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$'),
	CONSTRAINT "audit_events_object_check" CHECK (length("audit_events"."object_type") between 1 and 64
          and length("audit_events"."object_id") between 1 and 256),
	CONSTRAINT "audit_events_outcome_check" CHECK ("audit_events"."outcome" in ('success', 'denied', 'failed')),
	CONSTRAINT "audit_events_metadata_check" CHECK (jsonb_typeof("audit_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "benchmark_versions" (
	"benchmark_version_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"content_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benchmark_versions_version_hash_unique" UNIQUE("semantic_version","content_hash"),
	CONSTRAINT "benchmark_versions_id_check" CHECK ("benchmark_versions"."benchmark_version_id" ~ '^benchmark_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "benchmark_versions_version_check" CHECK ("benchmark_versions"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "benchmark_versions_hash_check" CHECK ("benchmark_versions"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "benchmark_versions_document_check" CHECK (jsonb_typeof("benchmark_versions"."document") = 'object'
          and "benchmark_versions"."document"->>'benchmarkVersionId' = "benchmark_versions"."benchmark_version_id"
          and "benchmark_versions"."document"->>'version' = "benchmark_versions"."semantic_version"
          and "benchmark_versions"."document"->>'contentHash' = "benchmark_versions"."content_hash")
);
--> statement-breakpoint
CREATE TABLE "card_data_snapshot_provenance" (
	"snapshot_id" text NOT NULL,
	"provenance_id" text NOT NULL,
	CONSTRAINT "card_data_snapshot_provenance_snapshot_id_provenance_id_pk" PRIMARY KEY("snapshot_id","provenance_id")
);
--> statement-breakpoint
CREATE TABLE "card_data_snapshots" (
	"snapshot_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"content_hash" char(64) NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_data_snapshots_version_hash_unique" UNIQUE("semantic_version","content_hash"),
	CONSTRAINT "card_data_snapshots_id_check" CHECK ("card_data_snapshots"."snapshot_id" ~ '^card-data_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "card_data_snapshots_version_check" CHECK ("card_data_snapshots"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "card_data_snapshots_hash_check" CHECK ("card_data_snapshots"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "card_data_snapshots_document_check" CHECK (jsonb_typeof("card_data_snapshots"."document") = 'object'
          and "card_data_snapshots"."document"->>'snapshotId' = "card_data_snapshots"."snapshot_id"
          and "card_data_snapshots"."document"->>'version' = "card_data_snapshots"."semantic_version"
          and "card_data_snapshots"."document"->>'contentHash' = "card_data_snapshots"."content_hash")
);
--> statement-breakpoint
CREATE TABLE "deck_revisions" (
	"revision_id" text PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"parent_revision_id" text,
	"content_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_revisions_revision_deck_unique" UNIQUE("revision_id","deck_id"),
	CONSTRAINT "deck_revisions_deck_ordinal_unique" UNIQUE("deck_id","ordinal"),
	CONSTRAINT "deck_revisions_deck_hash_unique" UNIQUE("deck_id","content_hash"),
	CONSTRAINT "deck_revisions_id_check" CHECK ("deck_revisions"."revision_id" ~ '^revision_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "deck_revisions_parent_id_check" CHECK ("deck_revisions"."parent_revision_id" is null or "deck_revisions"."parent_revision_id" ~ '^revision_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "deck_revisions_ordinal_check" CHECK ("deck_revisions"."ordinal" between 1 and 1000000
          and (("deck_revisions"."ordinal" = 1 and "deck_revisions"."parent_revision_id" is null)
            or ("deck_revisions"."ordinal" > 1 and "deck_revisions"."parent_revision_id" is not null))),
	CONSTRAINT "deck_revisions_hash_check" CHECK ("deck_revisions"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "deck_revisions_document_check" CHECK (jsonb_typeof("deck_revisions"."document") = 'object'
          and "deck_revisions"."document"->>'revisionId' = "deck_revisions"."revision_id"
          and "deck_revisions"."document"->>'deckId' = "deck_revisions"."deck_id"
          and ("deck_revisions"."document"->>'ordinal')::integer = "deck_revisions"."ordinal"
          and "deck_revisions"."document"->>'contentHash' = "deck_revisions"."content_hash")
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"deck_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" uuid,
	"owner_guest_id" uuid,
	"title" text NOT NULL,
	"format" text DEFAULT 'commander' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"shared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decks_id_check" CHECK ("decks"."deck_id" ~ '^deck_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "decks_owner_check" CHECK (num_nonnulls("decks"."owner_user_id", "decks"."owner_guest_id") = 1),
	CONSTRAINT "decks_title_check" CHECK (length("decks"."title") between 1 and 256),
	CONSTRAINT "decks_format_check" CHECK ("decks"."format" = 'commander'),
	CONSTRAINT "decks_visibility_check" CHECK ("decks"."visibility" in ('private', 'unlisted', 'public')),
	CONSTRAINT "decks_sharing_check" CHECK (("decks"."visibility" = 'private' and "decks"."shared_at" is null)
          or ("decks"."visibility" in ('unlisted', 'public') and "decks"."shared_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "engine_versions" (
	"engine_version_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"artifact_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_versions_version_hash_unique" UNIQUE("semantic_version","artifact_hash"),
	CONSTRAINT "engine_versions_id_check" CHECK ("engine_versions"."engine_version_id" ~ '^engine_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "engine_versions_version_check" CHECK ("engine_versions"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "engine_versions_hash_check" CHECK ("engine_versions"."artifact_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "engine_versions_document_check" CHECK (jsonb_typeof("engine_versions"."document") = 'object'
          and "engine_versions"."document"->>'engineVersionId' = "engine_versions"."engine_version_id"
          and "engine_versions"."document"->>'version' = "engine_versions"."semantic_version"
          and "engine_versions"."document"->>'artifactHash' = "engine_versions"."artifact_hash")
);
--> statement-breakpoint
CREATE TABLE "pod_members" (
	"pod_id" text NOT NULL,
	"position" smallint NOT NULL,
	"deck_revision_id" text NOT NULL,
	"report_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pod_members_pod_id_position_pk" PRIMARY KEY("pod_id","position"),
	CONSTRAINT "pod_members_pod_revision_unique" UNIQUE("pod_id","deck_revision_id"),
	CONSTRAINT "pod_members_position_check" CHECK ("pod_members"."position" between 1 and 4)
);
--> statement-breakpoint
CREATE TABLE "pods" (
	"pod_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" uuid,
	"owner_guest_id" uuid,
	"state" text DEFAULT 'incomplete' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"shared_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "pods_id_check" CHECK ("pods"."pod_id" ~ '^pod_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "pods_owner_check" CHECK (num_nonnulls("pods"."owner_user_id", "pods"."owner_guest_id") = 1),
	CONSTRAINT "pods_state_check" CHECK ("pods"."state" in ('incomplete', 'ready', 'analyzing', 'complete', 'failed')),
	CONSTRAINT "pods_visibility_check" CHECK ("pods"."visibility" in ('private', 'unlisted', 'public')),
	CONSTRAINT "pods_sharing_check" CHECK (("pods"."visibility" = 'private' and "pods"."shared_at" is null)
          or ("pods"."visibility" in ('unlisted', 'public') and "pods"."shared_at" is not null)),
	CONSTRAINT "pods_idempotency_check" CHECK (length("pods"."idempotency_key") between 16 and 128
          and "pods"."idempotency_key" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'),
	CONSTRAINT "pods_completion_check" CHECK (("pods"."state" in ('complete', 'failed')) = ("pods"."completed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "policy_version_provenance" (
	"policy_version_id" text NOT NULL,
	"provenance_id" text NOT NULL,
	CONSTRAINT "policy_version_provenance_policy_version_id_provenance_id_pk" PRIMARY KEY("policy_version_id","provenance_id")
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"policy_version_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"content_hash" char(64) NOT NULL,
	"effective_date" date NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_versions_version_hash_unique" UNIQUE("semantic_version","content_hash"),
	CONSTRAINT "policy_versions_id_check" CHECK ("policy_versions"."policy_version_id" ~ '^policy_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "policy_versions_version_check" CHECK ("policy_versions"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "policy_versions_hash_check" CHECK ("policy_versions"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "policy_versions_document_check" CHECK (jsonb_typeof("policy_versions"."document") = 'object'
          and "policy_versions"."document"->>'policyVersionId' = "policy_versions"."policy_version_id"
          and "policy_versions"."document"->>'version' = "policy_versions"."semantic_version"
          and "policy_versions"."document"->>'contentHash' = "policy_versions"."content_hash")
);
--> statement-breakpoint
CREATE TABLE "report_schema_versions" (
	"report_schema_version_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"artifact_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_schema_versions_version_hash_unique" UNIQUE("semantic_version","artifact_hash"),
	CONSTRAINT "report_schema_versions_id_check" CHECK ("report_schema_versions"."report_schema_version_id" ~ '^report-schema_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "report_schema_versions_version_check" CHECK ("report_schema_versions"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "report_schema_versions_hash_check" CHECK ("report_schema_versions"."artifact_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "report_schema_versions_document_check" CHECK (jsonb_typeof("report_schema_versions"."document") = 'object'
          and "report_schema_versions"."document"->>'reportSchemaVersionId' = "report_schema_versions"."report_schema_version_id"
          and "report_schema_versions"."document"->>'version' = "report_schema_versions"."semantic_version"
          and "report_schema_versions"."document"->>'artifactHash' = "report_schema_versions"."artifact_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_token_hash_check" CHECK ("sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_state_check" CHECK ("sessions"."state" in ('active', 'revoked', 'expired')),
	CONSTRAINT "sessions_expiry_check" CHECK ("sessions"."expires_at" > "sessions"."created_at"),
	CONSTRAINT "sessions_revocation_check" CHECK (("sessions"."state" = 'revoked') = ("sessions"."revoked_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "simulation_versions" (
	"simulation_version_id" text PRIMARY KEY NOT NULL,
	"semantic_version" text NOT NULL,
	"artifact_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_versions_version_hash_unique" UNIQUE("semantic_version","artifact_hash"),
	CONSTRAINT "simulation_versions_id_check" CHECK ("simulation_versions"."simulation_version_id" ~ '^simulation_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "simulation_versions_version_check" CHECK ("simulation_versions"."semantic_version" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'),
	CONSTRAINT "simulation_versions_hash_check" CHECK ("simulation_versions"."artifact_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "simulation_versions_document_check" CHECK (jsonb_typeof("simulation_versions"."document") = 'object'
          and "simulation_versions"."document"->>'simulationVersionId' = "simulation_versions"."simulation_version_id"
          and "simulation_versions"."document"->>'version' = "simulation_versions"."semantic_version"
          and "simulation_versions"."document"->>'artifactHash' = "simulation_versions"."artifact_hash")
);
--> statement-breakpoint
CREATE TABLE "source_provenance" (
	"provenance_id" text PRIMARY KEY NOT NULL,
	"source_kind" text NOT NULL,
	"content_hash" char(64) NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_provenance_id_check" CHECK ("source_provenance"."provenance_id" ~ '^provenance_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
	CONSTRAINT "source_provenance_kind_check" CHECK ("source_provenance"."source_kind" in ('synthetic', 'user-input', 'external')),
	CONSTRAINT "source_provenance_hash_check" CHECK ("source_provenance"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "source_provenance_document_check" CHECK (jsonb_typeof("source_provenance"."document") = 'object'
          and "source_provenance"."document"->>'provenanceId' = "source_provenance"."provenance_id"
          and "source_provenance"."document"->>'sourceKind' = "source_provenance"."source_kind"
          and "source_provenance"."document"->>'contentHash' = "source_provenance"."content_hash")
);
--> statement-breakpoint
CREATE TABLE "source_sync_runs" (
	"source_sync_run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provenance_id" text,
	"failure_code" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"summary" jsonb NOT NULL,
	CONSTRAINT "source_sync_runs_source_idempotency_unique" UNIQUE("source_name","idempotency_key"),
	CONSTRAINT "source_sync_runs_source_check" CHECK ("source_sync_runs"."source_name" in ('scryfall', 'wizards-policy', 'commander-spellbook', 'topdeck', 'development-fixture')),
	CONSTRAINT "source_sync_runs_state_check" CHECK ("source_sync_runs"."state" in ('queued', 'running', 'validating', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "source_sync_runs_idempotency_check" CHECK (length("source_sync_runs"."idempotency_key") between 16 and 128
          and "source_sync_runs"."idempotency_key" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'),
	CONSTRAINT "source_sync_runs_timestamps_check" CHECK (("source_sync_runs"."state" = 'queued' and "source_sync_runs"."started_at" is null and "source_sync_runs"."completed_at" is null)
          or ("source_sync_runs"."state" in ('running', 'validating') and "source_sync_runs"."started_at" is not null and "source_sync_runs"."completed_at" is null)
          or ("source_sync_runs"."state" in ('completed', 'failed', 'cancelled') and "source_sync_runs"."started_at" is not null and "source_sync_runs"."completed_at" is not null)),
	CONSTRAINT "source_sync_runs_outcome_check" CHECK (("source_sync_runs"."state" = 'completed' and "source_sync_runs"."provenance_id" is not null and "source_sync_runs"."failure_code" is null)
          or ("source_sync_runs"."state" = 'failed' and "source_sync_runs"."provenance_id" is null and "source_sync_runs"."failure_code" is not null)
          or ("source_sync_runs"."state" not in ('completed', 'failed') and "source_sync_runs"."provenance_id" is null and "source_sync_runs"."failure_code" is null))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_bounded_check" CHECK (length("users"."email") between 3 and 320 and position('@' in "users"."email") > 1),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'disabled', 'deleted'))
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_deck_revision_id_deck_revisions_revision_id_fk" FOREIGN KEY ("deck_revision_id") REFERENCES "public"."deck_revisions"("revision_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_owner_user_id_users_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_card_data_snapshot_id_card_data_snapshots_snapshot_id_fk" FOREIGN KEY ("card_data_snapshot_id") REFERENCES "public"."card_data_snapshots"("snapshot_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_policy_version_id_policy_versions_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("policy_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_engine_version_id_engine_versions_engine_version_id_fk" FOREIGN KEY ("engine_version_id") REFERENCES "public"."engine_versions"("engine_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_benchmark_version_id_benchmark_versions_benchmark_version_id_fk" FOREIGN KEY ("benchmark_version_id") REFERENCES "public"."benchmark_versions"("benchmark_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_simulation_version_id_simulation_versions_simulation_version_id_fk" FOREIGN KEY ("simulation_version_id") REFERENCES "public"."simulation_versions"("simulation_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_report_schema_version_id_report_schema_versions_report_schema_version_id_fk" FOREIGN KEY ("report_schema_version_id") REFERENCES "public"."report_schema_versions"("report_schema_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_artifacts" ADD CONSTRAINT "analysis_artifacts_analysis_id_analyses_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("analysis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_analysis_id_analyses_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("analysis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_analysis_id_analyses_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("analysis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_data_snapshot_provenance" ADD CONSTRAINT "card_data_snapshot_provenance_snapshot_id_card_data_snapshots_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."card_data_snapshots"("snapshot_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_data_snapshot_provenance" ADD CONSTRAINT "card_data_snapshot_provenance_provenance_id_source_provenance_provenance_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."source_provenance"("provenance_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_revisions" ADD CONSTRAINT "deck_revisions_deck_id_decks_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("deck_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_revisions" ADD CONSTRAINT "deck_revisions_parent_same_deck_fk" FOREIGN KEY ("parent_revision_id","deck_id") REFERENCES "public"."deck_revisions"("revision_id","deck_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_owner_user_id_users_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_members" ADD CONSTRAINT "pod_members_pod_id_pods_pod_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("pod_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_members" ADD CONSTRAINT "pod_members_deck_revision_id_deck_revisions_revision_id_fk" FOREIGN KEY ("deck_revision_id") REFERENCES "public"."deck_revisions"("revision_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_members" ADD CONSTRAINT "pod_members_report_id_analyses_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."analyses"("report_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pods" ADD CONSTRAINT "pods_owner_user_id_users_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_version_provenance" ADD CONSTRAINT "policy_version_provenance_policy_version_id_policy_versions_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("policy_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_version_provenance" ADD CONSTRAINT "policy_version_provenance_provenance_id_source_provenance_provenance_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."source_provenance"("provenance_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_sync_runs" ADD CONSTRAINT "source_sync_runs_provenance_id_source_provenance_provenance_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."source_provenance"("provenance_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analyses_user_idempotency_unique" ON "analyses" USING btree ("owner_user_id","idempotency_key") WHERE "analyses"."owner_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "analyses_guest_idempotency_unique" ON "analyses" USING btree ("owner_guest_id","idempotency_key") WHERE "analyses"."owner_guest_id" is not null;--> statement-breakpoint
CREATE INDEX "analyses_user_created_index" ON "analyses" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "analyses_guest_created_index" ON "analyses" USING btree ("owner_guest_id","created_at");--> statement-breakpoint
CREATE INDEX "analyses_state_created_index" ON "analyses" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "analysis_artifacts_analysis_index" ON "analysis_artifacts" USING btree ("analysis_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_events_one_terminal_unique" ON "analysis_events" USING btree ("analysis_id") WHERE "analysis_events"."state" in ('completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE INDEX "analysis_events_reconnect_index" ON "analysis_events" USING btree ("analysis_id","sequence");--> statement-breakpoint
CREATE INDEX "analysis_findings_analysis_index" ON "analysis_findings" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_time_index" ON "audit_events" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_object_time_index" ON "audit_events" USING btree ("object_type","object_id","occurred_at");--> statement-breakpoint
CREATE INDEX "decks_owner_user_created_index" ON "decks" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "decks_owner_guest_created_index" ON "decks" USING btree ("owner_guest_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pods_user_idempotency_unique" ON "pods" USING btree ("owner_user_id","idempotency_key") WHERE "pods"."owner_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "pods_guest_idempotency_unique" ON "pods" USING btree ("owner_guest_id","idempotency_key") WHERE "pods"."owner_guest_id" is not null;--> statement-breakpoint
CREATE INDEX "pods_user_created_index" ON "pods" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "pods_guest_created_index" ON "pods" USING btree ("owner_guest_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_state_index" ON "sessions" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));
--> statement-breakpoint
CREATE FUNCTION "podgauge_reject_immutable_record_change"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION '% is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "card_data_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "card_data_snapshots"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "policy_versions_immutable"
BEFORE UPDATE OR DELETE ON "policy_versions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "engine_versions_immutable"
BEFORE UPDATE OR DELETE ON "engine_versions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "benchmark_versions_immutable"
BEFORE UPDATE OR DELETE ON "benchmark_versions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "simulation_versions_immutable"
BEFORE UPDATE OR DELETE ON "simulation_versions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "report_schema_versions_immutable"
BEFORE UPDATE OR DELETE ON "report_schema_versions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "source_provenance_immutable"
BEFORE UPDATE OR DELETE ON "source_provenance"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "deck_revisions_immutable"
BEFORE UPDATE ON "deck_revisions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "analysis_events_immutable"
BEFORE UPDATE ON "analysis_events"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "audit_events_immutable"
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "podgauge_reject_immutable_record_change"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_deck_revision_parent"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	parent_ordinal integer;
BEGIN
	IF NEW."ordinal" = 1 THEN
		RETURN NEW;
	END IF;

	SELECT "ordinal" INTO parent_ordinal
	FROM "deck_revisions"
	WHERE "revision_id" = NEW."parent_revision_id"
	  AND "deck_id" = NEW."deck_id";

	IF parent_ordinal IS NULL OR parent_ordinal <> NEW."ordinal" - 1 THEN
		RAISE EXCEPTION 'deck revision parent must be the immediately preceding ordinal'
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "deck_revisions_parent_ordinal"
BEFORE INSERT ON "deck_revisions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_deck_revision_parent"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_analysis_write"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	deck_owner_user_id uuid;
	deck_owner_guest_id uuid;
BEGIN
	SELECT d."owner_user_id", d."owner_guest_id"
	INTO deck_owner_user_id, deck_owner_guest_id
	FROM "deck_revisions" r
	JOIN "decks" d ON d."deck_id" = r."deck_id"
	WHERE r."revision_id" = NEW."deck_revision_id";

	IF NOT FOUND OR
	   deck_owner_user_id IS DISTINCT FROM NEW."owner_user_id" OR
	   deck_owner_guest_id IS DISTINCT FROM NEW."owner_guest_id" THEN
		RAISE EXCEPTION 'analysis owner must match the referenced deck owner'
			USING ERRCODE = '23514';
	END IF;

	IF TG_OP = 'INSERT' THEN
		IF NEW."state" <> 'queued' THEN
			RAISE EXCEPTION 'an analysis must begin in queued state'
				USING ERRCODE = '23514';
		END IF;
		RETURN NEW;
	END IF;

	IF OLD."state" IN ('completed', 'failed', 'cancelled') THEN
		IF ROW(
			NEW."analysis_id", NEW."deck_revision_id", NEW."owner_user_id",
			NEW."owner_guest_id", NEW."state", NEW."idempotency_key", NEW."seed",
			NEW."options", NEW."card_data_snapshot_id", NEW."policy_version_id",
			NEW."engine_version_id", NEW."benchmark_version_id",
			NEW."simulation_version_id", NEW."report_schema_version_id",
			NEW."report_id", NEW."report_hash", NEW."report_document",
			NEW."failure_document", NEW."created_at", NEW."completed_at"
		) IS DISTINCT FROM ROW(
			OLD."analysis_id", OLD."deck_revision_id", OLD."owner_user_id",
			OLD."owner_guest_id", OLD."state", OLD."idempotency_key", OLD."seed",
			OLD."options", OLD."card_data_snapshot_id", OLD."policy_version_id",
			OLD."engine_version_id", OLD."benchmark_version_id",
			OLD."simulation_version_id", OLD."report_schema_version_id",
			OLD."report_id", OLD."report_hash", OLD."report_document",
			OLD."failure_document", OLD."created_at", OLD."completed_at"
		) THEN
			RAISE EXCEPTION 'terminal analysis results are immutable'
				USING ERRCODE = '55000';
		END IF;
	ELSIF NEW."state" <> OLD."state" AND NOT (
		(OLD."state" = 'queued' AND NEW."state" IN ('running', 'failed', 'cancelled')) OR
		(OLD."state" = 'running' AND NEW."state" IN ('retrying', 'completed', 'failed', 'cancelled')) OR
		(OLD."state" = 'retrying' AND NEW."state" IN ('running', 'failed', 'cancelled'))
	) THEN
		RAISE EXCEPTION 'invalid analysis state transition: % to %', OLD."state", NEW."state"
			USING ERRCODE = '23514';
	END IF;

	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "analyses_validate_write"
BEFORE INSERT OR UPDATE ON "analyses"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_analysis_write"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_guard_analysis_child_write"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	analysis_state text;
BEGIN
	SELECT "state" INTO analysis_state
	FROM "analyses"
	WHERE "analysis_id" = NEW."analysis_id";

	IF analysis_state IN ('completed', 'failed', 'cancelled') THEN
		RAISE EXCEPTION 'terminal analysis children are immutable'
			USING ERRCODE = '55000';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "analysis_events_terminal_guard"
BEFORE INSERT ON "analysis_events"
FOR EACH ROW EXECUTE FUNCTION "podgauge_guard_analysis_child_write"();
--> statement-breakpoint
CREATE TRIGGER "analysis_findings_terminal_guard"
BEFORE INSERT OR UPDATE ON "analysis_findings"
FOR EACH ROW EXECUTE FUNCTION "podgauge_guard_analysis_child_write"();
--> statement-breakpoint
CREATE TRIGGER "analysis_artifacts_terminal_guard"
BEFORE INSERT OR UPDATE ON "analysis_artifacts"
FOR EACH ROW EXECUTE FUNCTION "podgauge_guard_analysis_child_write"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_enforce_analysis_event_sequence"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	expected_sequence bigint;
BEGIN
	PERFORM 1 FROM "analyses"
	WHERE "analysis_id" = NEW."analysis_id"
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'analysis event references an unavailable analysis'
			USING ERRCODE = '23503';
	END IF;

	SELECT COALESCE(MAX("sequence") + 1, 0)
	INTO expected_sequence
	FROM "analysis_events"
	WHERE "analysis_id" = NEW."analysis_id";

	IF NEW."sequence" <> expected_sequence THEN
		RAISE EXCEPTION 'analysis event sequence must be %, received %', expected_sequence, NEW."sequence"
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "analysis_events_monotonic_sequence"
BEFORE INSERT ON "analysis_events"
FOR EACH ROW EXECUTE FUNCTION "podgauge_enforce_analysis_event_sequence"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_session_transition"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF OLD."state" IN ('revoked', 'expired') AND NEW."state" <> OLD."state" THEN
		RAISE EXCEPTION 'terminal session state cannot transition'
			USING ERRCODE = '23514';
	END IF;
	IF OLD."state" = 'active' AND NEW."state" NOT IN ('active', 'revoked', 'expired') THEN
		RAISE EXCEPTION 'invalid session state transition'
			USING ERRCODE = '23514';
	END IF;
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sessions_state_transition"
BEFORE UPDATE ON "sessions"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_session_transition"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_user_transition"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF OLD."status" = 'deleted' AND NEW."status" <> OLD."status" THEN
		RAISE EXCEPTION 'deleted user state cannot transition'
			USING ERRCODE = '23514';
	END IF;
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "users_state_transition"
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_user_transition"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_source_sync_transition"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."state" <> 'queued' THEN
			RAISE EXCEPTION 'a source sync must begin in queued state'
				USING ERRCODE = '23514';
		END IF;
		RETURN NEW;
	END IF;

	IF OLD."state" IN ('completed', 'failed', 'cancelled') AND NEW."state" <> OLD."state" THEN
		RAISE EXCEPTION 'terminal source sync state cannot transition'
			USING ERRCODE = '23514';
	ELSIF NEW."state" <> OLD."state" AND NOT (
		(OLD."state" = 'queued' AND NEW."state" IN ('running', 'cancelled')) OR
		(OLD."state" = 'running' AND NEW."state" IN ('validating', 'failed', 'cancelled')) OR
		(OLD."state" = 'validating' AND NEW."state" IN ('completed', 'failed', 'cancelled'))
	) THEN
		RAISE EXCEPTION 'invalid source sync state transition: % to %', OLD."state", NEW."state"
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "source_sync_runs_state_transition"
BEFORE INSERT OR UPDATE ON "source_sync_runs"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_source_sync_transition"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_pod_transition"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	member_count integer;
	report_count integer;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."state" <> 'incomplete' THEN
			RAISE EXCEPTION 'a pod must begin in incomplete state'
				USING ERRCODE = '23514';
		END IF;
		RETURN NEW;
	END IF;

	IF OLD."state" IN ('complete', 'failed') AND NEW."state" <> OLD."state" THEN
		RAISE EXCEPTION 'terminal pod state cannot transition'
			USING ERRCODE = '23514';
	ELSIF NEW."state" <> OLD."state" AND NOT (
		(OLD."state" = 'incomplete' AND NEW."state" IN ('ready', 'failed')) OR
		(OLD."state" = 'ready' AND NEW."state" IN ('analyzing', 'failed')) OR
		(OLD."state" = 'analyzing' AND NEW."state" IN ('complete', 'failed'))
	) THEN
		RAISE EXCEPTION 'invalid pod state transition: % to %', OLD."state", NEW."state"
			USING ERRCODE = '23514';
	END IF;

	IF NEW."state" IN ('ready', 'analyzing', 'complete') THEN
		SELECT COUNT(*), COUNT("report_id")
		INTO member_count, report_count
		FROM "pod_members"
		WHERE "pod_id" = NEW."pod_id";

		IF member_count <> 4 OR (NEW."state" = 'complete' AND report_count <> 4) THEN
			RAISE EXCEPTION 'pod state requires four members and complete requires four reports'
				USING ERRCODE = '23514';
		END IF;
	END IF;

	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "pods_state_transition"
BEFORE INSERT OR UPDATE ON "pods"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_pod_transition"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_validate_pod_member_report"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	report_revision_id text;
BEGIN
	IF NEW."report_id" IS NULL THEN
		RETURN NEW;
	END IF;

	SELECT "deck_revision_id" INTO report_revision_id
	FROM "analyses"
	WHERE "report_id" = NEW."report_id"
	  AND "state" = 'completed';

	IF report_revision_id IS NULL OR report_revision_id <> NEW."deck_revision_id" THEN
		RAISE EXCEPTION 'pod member report must be completed for its deck revision'
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "pod_members_report_revision"
BEFORE INSERT OR UPDATE ON "pod_members"
FOR EACH ROW EXECUTE FUNCTION "podgauge_validate_pod_member_report"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_assert_card_data_provenance"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	target_snapshot_id text;
	expected_ids jsonb;
BEGIN
	IF TG_TABLE_NAME = 'card_data_snapshots' THEN
		target_snapshot_id := NEW."snapshot_id";
	ELSIF TG_OP = 'DELETE' THEN
		target_snapshot_id := OLD."snapshot_id";
	ELSE
		target_snapshot_id := NEW."snapshot_id";
	END IF;

	SELECT "document"->'sourceProvenanceIds' INTO expected_ids
	FROM "card_data_snapshots"
	WHERE "snapshot_id" = target_snapshot_id;
	IF NOT FOUND THEN RETURN NULL; END IF;

	IF jsonb_typeof(expected_ids) <> 'array' OR jsonb_array_length(expected_ids) = 0 OR EXISTS (
		(SELECT jsonb_array_elements_text(expected_ids)
		 EXCEPT SELECT "provenance_id" FROM "card_data_snapshot_provenance"
		 WHERE "snapshot_id" = target_snapshot_id)
		UNION ALL
		(SELECT "provenance_id" FROM "card_data_snapshot_provenance"
		 WHERE "snapshot_id" = target_snapshot_id
		 EXCEPT SELECT jsonb_array_elements_text(expected_ids))
	) THEN
		RAISE EXCEPTION 'card-data provenance rows must exactly match the version document'
			USING ERRCODE = '23514';
	END IF;
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "card_data_snapshots_provenance_complete"
AFTER INSERT ON "card_data_snapshots"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "podgauge_assert_card_data_provenance"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "card_data_snapshot_provenance_complete"
AFTER INSERT OR UPDATE OR DELETE ON "card_data_snapshot_provenance"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "podgauge_assert_card_data_provenance"();
--> statement-breakpoint
CREATE FUNCTION "podgauge_assert_policy_provenance"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	target_policy_version_id text;
	expected_ids jsonb;
BEGIN
	IF TG_TABLE_NAME = 'policy_versions' THEN
		target_policy_version_id := NEW."policy_version_id";
	ELSIF TG_OP = 'DELETE' THEN
		target_policy_version_id := OLD."policy_version_id";
	ELSE
		target_policy_version_id := NEW."policy_version_id";
	END IF;

	SELECT "document"->'sourceProvenanceIds' INTO expected_ids
	FROM "policy_versions"
	WHERE "policy_version_id" = target_policy_version_id;
	IF NOT FOUND THEN RETURN NULL; END IF;

	IF jsonb_typeof(expected_ids) <> 'array' OR jsonb_array_length(expected_ids) = 0 OR EXISTS (
		(SELECT jsonb_array_elements_text(expected_ids)
		 EXCEPT SELECT "provenance_id" FROM "policy_version_provenance"
		 WHERE "policy_version_id" = target_policy_version_id)
		UNION ALL
		(SELECT "provenance_id" FROM "policy_version_provenance"
		 WHERE "policy_version_id" = target_policy_version_id
		 EXCEPT SELECT jsonb_array_elements_text(expected_ids))
	) THEN
		RAISE EXCEPTION 'policy provenance rows must exactly match the version document'
			USING ERRCODE = '23514';
	END IF;
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "policy_versions_provenance_complete"
AFTER INSERT ON "policy_versions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "podgauge_assert_policy_provenance"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "policy_version_provenance_complete"
AFTER INSERT OR UPDATE OR DELETE ON "policy_version_provenance"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "podgauge_assert_policy_provenance"();

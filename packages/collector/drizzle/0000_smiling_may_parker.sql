CREATE TYPE "public"."feedback_kind" AS ENUM('bug', 'blocked_task', 'confusing_behavior', 'idea');--> statement-breakpoint
CREATE TABLE "feedback" (
	"application_release" text,
	"description" text NOT NULL,
	"event_id" uuid NOT NULL,
	"expected_behavior" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"origin" text NOT NULL,
	"project_id" uuid NOT NULL,
	"receipt_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"reproduction_steps" text[],
	"route_label" text,
	"sdk_version" text NOT NULL,
	"source" text DEFAULT 'web_sdk_unverified' NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"allowed_origins" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_key" text NOT NULL,
	"retention_hours" integer DEFAULT 24 NOT NULL,
	CONSTRAINT "project_project_key_unique" UNIQUE("project_key")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"window_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit" ADD CONSTRAINT "rate_limit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_project_event_unique" ON "feedback" USING btree ("project_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_project_window_unique" ON "rate_limit" USING btree ("project_id","window_key");
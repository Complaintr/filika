ALTER TABLE "github_connection" ADD COLUMN "issue_mode" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "github_connection" ADD COLUMN "automatic_approved_by" text;--> statement-breakpoint
ALTER TABLE "github_issue" ADD COLUMN "trigger" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "github_connection" ADD CONSTRAINT "github_connection_automatic_approved_by_user_id_fk" FOREIGN KEY ("automatic_approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
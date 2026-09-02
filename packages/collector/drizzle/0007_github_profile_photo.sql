ALTER TABLE "user" ADD COLUMN "github_image" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "use_github_image" boolean DEFAULT false NOT NULL;

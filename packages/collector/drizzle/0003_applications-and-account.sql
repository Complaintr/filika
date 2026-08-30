ALTER TABLE "project" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
-- Preserve slugs supplied by an earlier local schema instead of recreating them.
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "dashboard_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_image" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "use_google_image" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "density" text DEFAULT 'comfortable' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project'::regclass AND conname = 'project_slug_unique'
  ) THEN
    ALTER TABLE "project" ADD CONSTRAINT "project_slug_unique" UNIQUE("slug");
  END IF;
END
$$;

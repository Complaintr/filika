CREATE TYPE "public"."project_kind" AS ENUM('application', 'demo');--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "kind" "project_kind" DEFAULT 'application' NOT NULL;
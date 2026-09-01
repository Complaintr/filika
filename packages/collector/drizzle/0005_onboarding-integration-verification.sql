ALTER TABLE "project" ADD COLUMN "integration_verified_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "project"
SET "integration_verified_at" = "first_feedback"."received_at"
FROM (
	SELECT "project_id", MIN("receipt_timestamp") AS "received_at"
	FROM "feedback"
	GROUP BY "project_id"
) AS "first_feedback"
WHERE "project"."id" = "first_feedback"."project_id";

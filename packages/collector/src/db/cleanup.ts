import { lt } from "drizzle-orm";

import { FEEDBACK_RETENTION_HOURS } from "../foundation/data-lifecycle";
import { createDb, type Db } from "./client";
import { feedback, rateLimit } from "./schema";

export const CLEANUP_COMMAND_NAME = "db:cleanup" as const;

export function cleanupDeadline(now: Date, retentionHours: number): Date {
  return new Date(now.getTime() - retentionHours * 3_600_000);
}

export interface CleanupResult {
  deletedFeedback: number;
  deletedRateLimits: number;
}

export async function runCleanup(db: Db, now: Date): Promise<CleanupResult> {
  return db.transaction(async (transaction) => {
    const deadline = cleanupDeadline(now, FEEDBACK_RETENTION_HOURS);
    const expiredFeedback = await transaction
      .delete(feedback)
      .where(lt(feedback.receiptTimestamp, deadline))
      .returning({ id: feedback.id });
    const expiredRateLimits = await transaction
      .delete(rateLimit)
      .where(lt(rateLimit.expiresAt, now))
      .returning({ id: rateLimit.id });

    return {
      deletedFeedback: expiredFeedback.length,
      deletedRateLimits: expiredRateLimits.length,
    };
  });
}

if (import.meta.main) {
  const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");
  const result = await runCleanup(handle.db, new Date());
  await handle.close();

  console.log(
    `Cleanup removed ${result.deletedFeedback} feedback and ${result.deletedRateLimits} rate-limit rows.`,
  );
}

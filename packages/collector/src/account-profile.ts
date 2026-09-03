import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db/client";
import {
  account,
  feedback,
  githubIssue,
  project,
  rateLimit,
  session,
  user,
  verification,
} from "./db/schema";

export const accountSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    theme: z.enum(["light", "dark", "system"]),
    density: z.enum(["comfortable", "compact"]),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export async function getAccountProfile(db: Db, userId: string) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    theme: row.theme === "dark" || row.theme === "system" ? row.theme : "light",
    density: row.density === "compact" ? "compact" : "comfortable",
  };
}

/**
 * Permanently removes an account and every resource it owns. The owned
 * applications and their feedback, rate limits, and GitHub integration rows
 * are deleted first so the remaining foreign keys can be removed in order.
 * Returns false when the user no longer exists.
 */
export async function deleteAccount(db: Db, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return false;

    const owned = await tx
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.ownerUserId, userId), eq(project.kind, "application")));
    const projectIds = owned.map((item) => item.id);
    if (projectIds.length) {
      await tx.delete(feedback).where(inArray(feedback.projectId, projectIds));
      await tx.delete(rateLimit).where(inArray(rateLimit.projectId, projectIds));
      await tx.delete(githubIssue).where(inArray(githubIssue.projectId, projectIds));
      await tx.delete(project).where(inArray(project.id, projectIds));
    }

    // github_issue.approved_by has no cascade; clear any remaining approvals.
    await tx.delete(githubIssue).where(eq(githubIssue.approvedBy, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx
      .delete(verification)
      .where(or(eq(verification.identifier, row.id), eq(verification.identifier, row.email)));
    await tx.delete(user).where(eq(user.id, userId));
    return true;
  });
}

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db/client";
import { type Project, project, user } from "./db/schema";

const reserved = new Set([
  "api",
  "account",
  "onboarding",
  "login",
  "register",
  "dashboard",
  "complaints",
  "settings",
  "terms",
  "auth",
  "forgot-password",
  "reset-password",
  "apps",
  "new",
]);
export const applicationSlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
  .refine((value) => !reserved.has(value));
const originSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.origin === value &&
        !url.username &&
        !url.password &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      );
    } catch {
      return false;
    }
  });
export const applicationSettingsSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60),
    allowedOrigins: z
      .array(originSchema)
      .max(20)
      .refine(
        (origins) => new Set(origins).size === origins.length && origins.join("\n").length <= 4096,
      ),
    dashboardDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  })
  .strict();
export const createApplicationSchema = applicationSettingsSchema.extend({
  slug: applicationSlugSchema,
});

export function applicationView(row: Project) {
  return {
    slug: row.slug,
    displayName: row.displayName,
    projectKey: row.projectKey,
    allowedOrigins: row.allowedOrigins,
    dashboardDays: row.dashboardDays,
    retentionHours: row.retentionHours,
  };
}

export async function listApplications(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.ownerUserId, userId))
    .orderBy(asc(project.createdAt), asc(project.id))
    .limit(100);
  return rows.map(applicationView);
}

export async function ownedApplication(db: Db, userId: string, slug: string) {
  if (!applicationSlugSchema.safeParse(slug).success) return null;
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.ownerUserId, userId), eq(project.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createApplication(
  db: Db,
  userId: string,
  input: z.infer<typeof createApplicationSchema>,
) {
  return db.transaction(async (tx) => {
    // Serialize per-account creation so concurrent requests cannot bypass the bound.
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const existing = await tx
      .select({ id: project.id })
      .from(project)
      .where(eq(project.ownerUserId, userId))
      .limit(100);
    if (existing.length >= 100) return { error: "application_limit" as const };
    const rows = await tx
      .insert(project)
      .values({
        ...input,
        ownerUserId: userId,
        projectKey: `app_${crypto.randomUUID().replaceAll("-", "")}`,
      })
      .onConflictDoNothing({ target: project.slug })
      .returning();
    const row = rows[0];
    return row ? { application: applicationView(row) } : { error: "slug_taken" as const };
  });
}

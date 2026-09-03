import { and, asc, count, eq } from "drizzle-orm";
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
    integrationVerifiedAt: row.integrationVerifiedAt?.toISOString() ?? null,
    kind: row.kind,
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
    .where(and(eq(project.ownerUserId, userId), eq(project.kind, "application")))
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
      .where(and(eq(project.ownerUserId, userId), eq(project.kind, "application")))
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

export const deviceKeySchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

export const DEMO_PROJECT_CAP = 5_000 as const;

/**
 * Public demo application creation is unauthenticated and keyed by an opaque
 * client identifier, so it is bounded by a global cap. Once the cap is reached
 * new device projects are rejected until cleanup removes expired demo projects.
 */
export async function demoCreationAllowed(db: Db, now: Date = new Date()): Promise<boolean> {
  if (now.getTime() > 0) {
    const rows = await db
      .select({ count: count() })
      .from(project)
      .where(eq(project.kind, "demo"))
      .limit(1);
    const total = Number(rows[0]?.count ?? 0);
    return total < DEMO_PROJECT_CAP;
  }
  return false;
}

export async function deviceDemoApplication(
  db: Db,
  deviceKey: string,
  options: { allowedOrigins: readonly string[] },
) {
  const slug = `demo-${deviceKey}`;
  const existing = await db.select().from(project).where(eq(project.slug, slug)).limit(1);
  if (existing[0]) {
    if (existing[0].kind !== "demo") return null;
    const merged = [...new Set([...existing[0].allowedOrigins, ...options.allowedOrigins])];
    if (merged.length !== existing[0].allowedOrigins.length) {
      await db.update(project).set({ allowedOrigins: merged }).where(eq(project.slug, slug));
      return { ...existing[0], allowedOrigins: merged };
    }
    return existing[0];
  }
  const rows = await db
    .insert(project)
    .values({
      allowedOrigins: [...options.allowedOrigins],
      displayName: "Filika Demo",
      kind: "demo",
      projectKey: `app_${crypto.randomUUID().replaceAll("-", "")}`,
      slug,
    })
    .onConflictDoNothing({ target: project.slug })
    .returning();
  return rows[0] ?? null;
}

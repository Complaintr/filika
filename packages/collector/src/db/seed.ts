import { eq } from "drizzle-orm";

import { createDb, type DbHandle } from "./client";
import { project } from "./schema";

export const DEMO_PROJECT_KEY = "filika-demo" as const;
export const DEMO_PROJECT_DISPLAY_NAME = "Filika Demo" as const;
export const DEMO_RETENTION_HOURS = 24 as const;
export const DEMO_RATE_LIMIT_MAX = 100 as const;
export const DEMO_ALLOWED_ORIGINS = ["http://localhost:4173", "http://127.0.0.1:4173"] as const;

export async function seedDemoProject(handle: DbHandle): Promise<boolean> {
  const keysToSeed = [DEMO_PROJECT_KEY, "filika_demo"];
  let seededAny = false;

  for (const key of keysToSeed) {
    const existing = await handle.db.query.project.findFirst({
      where: eq(project.projectKey, key),
    });

    if (existing === undefined) {
      await handle.db.insert(project).values({
        allowedOrigins: [...DEMO_ALLOWED_ORIGINS],
        displayName: DEMO_PROJECT_DISPLAY_NAME,
        projectKey: key,
        rateLimitMax: DEMO_RATE_LIMIT_MAX,
        retentionHours: DEMO_RETENTION_HOURS,
      });
      seededAny = true;
    }
  }

  return seededAny;
}

if (import.meta.main) {
  const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");
  const created = await seedDemoProject(handle);
  await handle.close();

  console.log(created ? "Seeded the demo project." : "Demo project already present.");
}

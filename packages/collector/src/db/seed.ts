import { eq } from "drizzle-orm";

import { createDb, type DbHandle } from "./client";
import { project } from "./schema";

export const DEMO_PROJECT_KEY = "filika-demo" as const;
export const DEMO_PROJECT_DISPLAY_NAME = "Filika Challenge Demo" as const;
export const DEMO_RETENTION_HOURS = 24 as const;
export const DEMO_ALLOWED_ORIGINS = ["http://localhost:4173", "http://127.0.0.1:4173"] as const;

export async function seedDemoProject(handle: DbHandle): Promise<boolean> {
  const existing = await handle.db.query.project.findFirst({
    where: eq(project.projectKey, DEMO_PROJECT_KEY),
  });

  if (existing !== undefined) {
    return false;
  }

  await handle.db.insert(project).values({
    allowedOrigins: [...DEMO_ALLOWED_ORIGINS],
    displayName: DEMO_PROJECT_DISPLAY_NAME,
    projectKey: DEMO_PROJECT_KEY,
    retentionHours: DEMO_RETENTION_HOURS,
  });

  return true;
}

if (import.meta.main) {
  const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");
  const created = await seedDemoProject(handle);
  await handle.close();

  console.log(created ? "Seeded the demo project." : "Demo project already present.");
}

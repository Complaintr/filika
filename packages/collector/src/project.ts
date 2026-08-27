import { eq } from "drizzle-orm";

import type { Db } from "./db/client";
import { type Project, project as projectTable } from "./db/schema";

export async function resolveProject(db: Db, projectKey: string): Promise<Project | null> {
  const row = await db.query.project.findFirst({
    where: eq(projectTable.projectKey, projectKey),
  });

  return row ?? null;
}

export function isOriginAllowed(origin: string, allowedOrigins: readonly string[]): boolean {
  return allowedOrigins.includes(origin);
}

export async function collectAllowedOrigins(db: Db): Promise<string[]> {
  const rows = await db.select({ allowedOrigins: projectTable.allowedOrigins }).from(projectTable);

  return [...new Set(rows.flatMap((row) => row.allowedOrigins))];
}

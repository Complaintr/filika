import { sql } from "drizzle-orm";

import type { Db } from "./db/client";
import { PROJECT_RATE_LIMIT_DEFAULT_MAX, windowKey } from "./rate-limit";

export const RATE_LIMIT_WINDOW_HOURS = 1 as const;

export function windowStartFor(now: Date): string {
  const start = new Date(now);

  start.setUTCMinutes(0, 0, 0);
  start.setUTCSeconds(0, 0);

  return start.toISOString();
}

export function windowExpiresAt(windowStart: string): Date {
  return new Date(new Date(windowStart).getTime() + RATE_LIMIT_WINDOW_HOURS * 3_600_000);
}

export interface RateLimitConsumeResult {
  allowed: boolean;
}

export async function consumeProjectRateLimit(
  db: Db,
  projectId: string,
  now: Date,
  maxPerWindow: number = PROJECT_RATE_LIMIT_DEFAULT_MAX,
): Promise<RateLimitConsumeResult> {
  const start = windowStartFor(now);
  const key = windowKey(projectId, start);
  const expiresAt = windowExpiresAt(start);

  const result = (await db.execute(sql`
    INSERT INTO rate_limit (id, project_id, window_key, count, expires_at)
    VALUES (gen_random_uuid(), ${projectId}, ${key}, 1, ${expiresAt})
    ON CONFLICT (project_id, window_key)
    DO UPDATE SET count = rate_limit.count + 1
    WHERE rate_limit.count < ${maxPerWindow}
    RETURNING count
  `)) as { count: number }[];

  return { allowed: result.length > 0 };
}

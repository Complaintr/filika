import { and, count, desc, gte, lte, sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { feedback } from "./db/schema";

/** Aggregate in PostgreSQL so dashboard totals never depend on inbox pagination. */
export async function getDashboard(db: Db, days: 7 | 30 | 90, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const withinRange = and(
    gte(feedback.receiptTimestamp, start),
    lte(feedback.receiptTimestamp, now),
  );
  const day = sql<string>`to_char(${feedback.receiptTimestamp} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
  return db.transaction(
    async (transaction) => {
      await transaction.execute(sql`SET LOCAL statement_timeout = '5000ms'`);
      const kinds = await transaction
        .select({ kind: feedback.kind, count: count() })
        .from(feedback)
        .where(withinRange)
        .groupBy(feedback.kind);
      const daily = await transaction
        .select({ date: day, count: count() })
        .from(feedback)
        .where(withinRange)
        .groupBy(day)
        .orderBy(day);
      const routes = await transaction
        .select({ label: feedback.routeLabel, count: count() })
        .from(feedback)
        .where(withinRange)
        .groupBy(feedback.routeLabel)
        .orderBy(desc(count()), feedback.routeLabel)
        .limit(5);
      return {
        days,
        generatedAt: now.toISOString(),
        total: kinds.reduce((sum, item) => sum + item.count, 0),
        kinds,
        daily,
        routes,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { handleApplicationRoute } from "../src/application-routes";
import { createDb, type DbHandle } from "../src/db/client";
import { feedback, project, user } from "../src/db/schema";
import { seedDemoProject } from "../src/db/seed";
import { countDemoFeedback, DEMO_SEED_BATCH, DEMO_SEED_DAYS, DEMO_SOURCE } from "../src/demo-seed";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/filika_test";

let isDbAvailable = false;
try {
  const probe = postgres(TEST_DATABASE_URL, { connect_timeout: 1, max: 1 });
  await probe`SELECT 1`;
  await probe.end({ timeout: 1 });
  isDbAvailable = true;
} catch {
  isDbAvailable = false;
}

let handle: DbHandle;
const USER_ID = "demo-seed-user";
const appId = "00000000-0000-4000-8000-000000000001";

function routeRequest(path: string, method: string, origin = "http://localhost:8787"): Request {
  return new Request(`http://localhost:8787${path}`, {
    method,
    headers: { Origin: origin },
  });
}

async function seedThroughRoute(): Promise<Response> {
  return handleApplicationRoute(
    handle.db,
    routeRequest("/api/v1/apps/demo-seed-app/demo/seed", "POST"),
    USER_ID,
  );
}

beforeAll(async () => {
  if (!isDbAvailable) return;
  const ddl = postgres(TEST_DATABASE_URL, { prepare: false });
  await ddl.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await ddl.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await ddl.unsafe("CREATE SCHEMA public");
  await ddl.end();
  handle = createDb(TEST_DATABASE_URL);
  await migrate(handle.db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
  await seedDemoProject(handle);
  await handle.db.insert(user).values({
    id: USER_ID,
    name: "Demo Seed Tester",
    email: "demo-seed@example.test",
  });
  await handle.db.insert(project).values({
    id: appId,
    displayName: "Demo Seed App",
    ownerUserId: USER_ID,
    projectKey: "demo-seed-app-key",
    slug: "demo-seed-app",
    allowedOrigins: ["http://localhost:4173"],
  });
});

afterAll(async () => {
  if (!isDbAvailable) return;
  await handle?.close();
});

describe.skipIf(!isDbAvailable)("application demo seed routes", () => {
  test("seeds one bounded batch of marked feedback", async () => {
    const response = await seedThroughRoute();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { created: number; count: number };
    expect(body.created).toBe(DEMO_SEED_BATCH);
    expect(body.count).toBe(DEMO_SEED_BATCH);

    const rows = await handle.db.query.feedback.findMany({
      where: eq(feedback.projectId, appId),
    });
    expect(rows).toHaveLength(DEMO_SEED_BATCH);
    expect(rows.every((row) => row.source === DEMO_SOURCE)).toBe(true);
    expect(new Set(rows.map((row) => row.eventId)).size).toBe(DEMO_SEED_BATCH);
    const kinds = new Set(rows.map((row) => row.kind));
    for (const kind of ["bug", "blocked_task", "confusing_behavior", "idea"])
      expect(kinds.has(kind)).toBe(true);
    const now = Date.now();
    const oldest = Math.min(...rows.map((row) => row.receiptTimestamp.getTime()));
    expect(now - oldest).toBeLessThanOrEqual(DEMO_SEED_DAYS * 86_400_000);
  });

  test("reports the seeded count and stays idempotent", async () => {
    const status = await handleApplicationRoute(
      handle.db,
      routeRequest("/api/v1/apps/demo-seed-app/demo", "GET"),
      USER_ID,
    );
    expect(status.status).toBe(200);
    expect((await status.json()) as { count: number }).toEqual({ count: DEMO_SEED_BATCH });

    const again = await seedThroughRoute();
    const body = (await again.json()) as { created: number; count: number };
    expect(body.created).toBe(0);
    expect(body.count).toBe(DEMO_SEED_BATCH);
    const rows = await handle.db.query.feedback.findMany({
      where: eq(feedback.projectId, appId),
    });
    expect(rows).toHaveLength(DEMO_SEED_BATCH);
  });

  test("removes only the demo-seeded feedback and keeps real reports", async () => {
    await handle.db.insert(feedback).values({
      applicationRelease: "1.2.3",
      description: "A real report that must survive removal.",
      eventId: "10000000-0000-4000-8000-000000000001",
      expectedBehavior: "Nothing is removed.",
      kind: "idea",
      origin: "http://localhost:4173",
      projectId: appId,
      reproductionSteps: null,
      routeLabel: "/",
      sdkVersion: "1.2.3",
      source: "web_sdk_unverified",
      title: "Real report",
    });

    const response = await handleApplicationRoute(
      handle.db,
      routeRequest("/api/v1/apps/demo-seed-app/demo", "DELETE"),
      USER_ID,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { deleted: number };
    expect(body.deleted).toBe(DEMO_SEED_BATCH);

    expect(await countDemoFeedback(handle.db, appId)).toBe(0);
    const remaining = await handle.db.query.feedback.findMany({
      where: and(eq(feedback.projectId, appId), eq(feedback.source, "web_sdk_unverified")),
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.title).toBe("Real report");
  });

  test("rejects mutations from a mismatched origin", async () => {
    const response = await handleApplicationRoute(
      handle.db,
      routeRequest("/api/v1/apps/demo-seed-app/demo/seed", "POST", "http://localhost:4173"),
      USER_ID,
    );
    expect(response.status).toBe(403);
    expect((await response.json()) as { error: { category: string } }).toEqual({
      error: { category: "denied_origin" },
    });
  });

  test("does not expose an app the user does not own", async () => {
    const response = await handleApplicationRoute(
      handle.db,
      routeRequest("/api/v1/apps/not-owned/demo", "GET"),
      USER_ID,
    );
    expect(response.status).toBe(404);
  });
});

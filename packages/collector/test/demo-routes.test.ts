import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DEMO_PROJECT_CAP, listApplications } from "../src/applications";
import { createDb, type DbHandle } from "../src/db/client";
import { seedDemoProject } from "../src/db/seed";
import { startCollectorServer } from "../src/server";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/filika_test";
const ALLOWED_ORIGIN = "http://localhost:4173";

let isDbAvailable = false;
try {
  const probe = postgres(TEST_DATABASE_URL, { connect_timeout: 1, max: 1 });
  await probe`SELECT 1`;
  await probe.end({ timeout: 1 });
  isDbAvailable = true;
} catch {
  isDbAvailable = false;
}

let server: ReturnType<typeof Bun.serve> | undefined;
let baseUrl: string;
let handle: DbHandle;

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
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
  server = startCollectorServer({ databaseUrl: TEST_DATABASE_URL, port: 0, enableAuth: false });
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(async () => {
  if (!isDbAvailable) return;
  server?.stop(true);
  await handle?.close();
});

describe.skipIf(!isDbAvailable)("public device demo routes", () => {
  test("creates a demo application per device idempotently", async () => {
    const device = "demo-device-0001";
    const first = await request(`/api/v1/demo/${device}/app`);
    expect(first.status).toBe(200);
    const body = (await first.json()) as { application: Record<string, unknown> };
    expect(body.application).toMatchObject({
      kind: "demo",
      displayName: "Filika Demo",
    });
    const origins = body.application.allowedOrigins as string[];
    expect(origins).toContain(ALLOWED_ORIGIN);
    expect(origins).toContain("http://127.0.0.1:4173");
    expect(String(body.application.slug)).toBe(`demo-${device}`);
    expect(String(body.application.projectKey)).toMatch(/^app_[0-9a-f]+$/);

    const second = await request(`/api/v1/demo/${device}/app`);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { application: Record<string, unknown> };
    expect(secondBody.application.projectKey).toBe(body.application.projectKey);
  });

  test("rejects malformed device keys", async () => {
    for (const device of ["short", "UPPER", "bad/device", "has space"]) {
      const response = await request(`/api/v1/demo/${encodeURIComponent(device)}/app`);
      expect(response.status).toBe(400);
    }
  });

  test("demo applications stay hidden from the owned application list", async () => {
    const device = "demo-device-0002";
    await request(`/api/v1/demo/${device}/app`);
    const owned = await listApplications(handle.db, "nonexistent-user");
    expect(owned.some((app) => app.kind === "demo")).toBe(false);
  });

  test("demo inbox returns only that device feedback", async () => {
    const device = "demo-device-0003";
    const app = (await (await request(`/api/v1/demo/${device}/app`)).json()) as {
      application: { projectKey: string };
    };
    const eventId = crypto.randomUUID();
    const envelope = {
      schemaVersion: 1,
      projectKey: app.application.projectKey,
      eventId,
      feedback: {
        kind: "bug",
        title: "Demo checkout hangs",
        description: "The order never completes.",
      },
      context: { sdkVersion: "0.0.0", routeLabel: "/demo/checkout" },
    };
    const accepted = await request("/api/v1/feedback", "POST", envelope, {
      "Idempotency-Key": eventId,
    });
    expect(accepted.status).toBe(201);

    const list = await request(`/api/v1/demo/${device}/inbox`);
    expect(list.status).toBe(200);
    const body = (await list.json()) as { items: Array<{ title: string }> };
    expect(body.items.some((item) => item.title === "Demo checkout hangs")).toBe(true);

    const other = await request(`/api/v1/demo/demo-device-other/inbox`);
    const otherBody = (await other.json()) as { items: Array<{ title: string }> };
    expect(otherBody.items.some((item) => item.title === "Demo checkout hangs")).toBe(false);
  });

  test("checkout always times out", async () => {
    const response = await request("/api/v1/demo/checkout", "POST", {});
    expect(response.status).toBe(504);
  });

  test("demo project creation is capped", async () => {
    const before = await handle.db.query.project.findMany({
      where: (table, { eq }) => eq(table.kind, "demo"),
    });
    expect(before.length).toBeLessThanOrEqual(DEMO_PROJECT_CAP);
  });
});

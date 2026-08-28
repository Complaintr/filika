import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { runCleanup } from "../src/db/cleanup";
import { createDb, type DbHandle } from "../src/db/client";
import { feedback, project, rateLimit } from "../src/db/schema";
import { DEMO_PROJECT_KEY, seedDemoProject } from "../src/db/seed";
import { consumeProjectRateLimit } from "../src/rate-limiting";
import { startCollectorServer } from "../src/server";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/filika_test";

const EVENT_ID = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";
const ALLOWED_ORIGIN = "http://localhost:4173";

let server: ReturnType<typeof Bun.serve> | undefined;
let baseUrl: string;
let handle: DbHandle;
let demoProjectId: string;

function envelopeFor(eventId: string) {
  return {
    context: { applicationRelease: "1.2.0", routeLabel: "feedback", sdkVersion: "1.0.0" },
    eventId,
    feedback: {
      description: "The save button did nothing.",
      expectedBehavior: "The draft should be saved.",
      kind: "bug",
      reproductionSteps: ["Open the page", "Click Save"],
      title: "Save button is unresponsive",
    },
    projectKey: DEMO_PROJECT_KEY,
    schemaVersion: 1,
  };
}

function postEnvelope(eventId: string, overrides: Record<string, unknown> = {}): Request {
  const envelope = { ...envelopeFor(eventId), ...overrides };
  const headers = new Headers({
    "Content-Type": "application/json",
    "Idempotency-Key": eventId,
    Origin: ALLOWED_ORIGIN,
  });

  return new Request(`${baseUrl}/api/v1/feedback`, {
    body: JSON.stringify(envelope),
    headers,
    method: "POST",
  });
}

async function postRaw(request: Request): Promise<Response> {
  return fetch(request);
}

beforeAll(async () => {
  const ddl = postgres(TEST_DATABASE_URL, { prepare: false });

  await ddl.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await ddl.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await ddl.unsafe("CREATE SCHEMA public");
  await ddl.end();

  handle = createDb(TEST_DATABASE_URL);
  await migrate(handle.db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
  await seedDemoProject(handle);

  const demoProject = await handle.db.query.project.findFirst({
    where: eq(project.projectKey, DEMO_PROJECT_KEY),
  });

  if (demoProject === undefined) {
    throw new Error("Demo project was not seeded.");
  }

  demoProjectId = demoProject.id;

  await handle.db.insert(project).values({
    allowedOrigins: [ALLOWED_ORIGIN],
    displayName: "Rate Limit Test",
    projectKey: "rate-limit-test",
    retentionHours: 24,
  });

  server = startCollectorServer({ databaseUrl: TEST_DATABASE_URL, port: 0 });
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(async () => {
  server?.stop(true);
  await handle?.close();
});

describe("P2-BE-15 collector api and database tests", () => {
  test("accepts a valid envelope and returns a frozen receipt", async () => {
    const response = await postRaw(postEnvelope(EVENT_ID));

    expect(response.status).toBe(201);

    const receipt = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(receipt).sort()).toEqual(
      ["schemaVersion", "eventId", "feedbackId", "receivedAt", "duplicate"].sort(),
    );
    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.eventId).toBe(EVENT_ID);
    expect(receipt.duplicate).toBe(false);
    expect(String(receipt.feedbackId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(String(receipt.receivedAt)).toMatch(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/,
    );
  });

  test("returns cors headers for accepted and rejected responses from an allowed origin", async () => {
    const accepted = await postRaw(postEnvelope("a0000001-0000-4000-8000-000000000001"));

    expect(accepted.status).toBe(201);
    expect(accepted.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
    expect(accepted.headers.get("vary")).toBe("Origin");

    const rejected = await postRaw(
      postEnvelope("a0000002-0000-4000-8000-000000000002", { origin: "https://evil.example" }),
    );

    expect(rejected.status).toBe(400);
    expect(rejected.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
    expect(rejected.headers.get("vary")).toBe("Origin");
  });

  test("does not return cors headers for a denied origin", async () => {
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor("a0000003-0000-4000-8000-000000000003")),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "a0000003-0000-4000-8000-000000000003",
        Origin: "http://evil.example",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("persists the accepted feedback row", async () => {
    const rows = await handle.db.query.feedback.findFirst({
      where: eq(feedback.eventId, EVENT_ID),
    });

    expect(rows).toBeDefined();
    expect(rows?.kind).toBe("bug");
    expect(rows?.title).toBe("Save button is unresponsive");
    expect(rows?.description).toBe("The save button did nothing.");
    expect(rows?.origin).toBe(ALLOWED_ORIGIN);
    expect(rows?.source).toBe("web_sdk_unverified");
  });

  test("returns the original receipt for a duplicate retry", async () => {
    const first = await postRaw(postEnvelope(EVENT_ID));

    expect(first.status).toBe(200);

    const receipt = (await first.json()) as Record<string, unknown>;

    const rows = await handle.db.query.feedback.findMany({
      where: eq(feedback.eventId, EVENT_ID),
    });
    const stored = rows[0];

    expect(rows).toHaveLength(1);
    expect(receipt.duplicate).toBe(true);
    expect(receipt.feedbackId).toBe(stored?.id);
    expect(receipt.receivedAt).toBe(stored?.receiptTimestamp.toISOString());
    expect(String(receipt.feedbackId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test("rejects a missing origin before ingest", async () => {
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor("a1111111-0000-4000-8000-000000000001")),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "a1111111-0000-4000-8000-000000000001",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { category: "denied_origin" } });
  });

  test("rejects a denied origin before ingest", async () => {
    const eventId = "a2222222-0000-4000-8000-000000000002";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "http://evil.example",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { category: "denied_origin" } });
  });

  test("accepts the documented 127.0.0.1 dev origin", async () => {
    const eventId = "c1111111-0000-4000-8000-000000000001";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "http://127.0.0.1:4173",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(201);
  });

  test("rejects an origin outside the documented dev ports", async () => {
    const eventId = "c2222222-0000-4000-8000-000000000002";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "http://localhost:5173",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { category: "denied_origin" } });
  });

  test("rejects a scheme-mismatched origin over http", async () => {
    const eventId = "c3333333-0000-4000-8000-000000000003";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "https://localhost:4173",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
  });

  test("rejects a port-mismatched origin", async () => {
    const eventId = "c4444444-0000-4000-8000-000000000004";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "http://localhost:4174",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
  });

  test("rejects a subdomain-mismatched origin", async () => {
    const eventId = "c5555555-0000-4000-8000-000000000005";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: "http://demo.example.com",
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(403);
  });

  test("rejects an over-limit field over http", async () => {
    const eventId = "c6666666-0000-4000-8000-000000000006";
    const response = await postRaw(
      postEnvelope(eventId, {
        feedback: {
          ...envelopeFor(eventId).feedback,
          title: "x".repeat(161),
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { category: "invalid_input" } });
  });

  test("rejects a body-supplied server claim over http", async () => {
    const eventId = "c7777777-0000-4000-8000-000000000007";
    const response = await postRaw(postEnvelope(eventId, { origin: "https://claimed.example" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { category: "invalid_input" } });
  });

  test("rejects an oversized body before parsing", async () => {
    const eventId = "a3333333-0000-4000-8000-000000000003";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify({ ...envelopeFor(eventId), title: "x".repeat(70_000) }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
        Origin: ALLOWED_ORIGIN,
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: { category: "payload_too_large" },
    });
  });

  test("rejects an unknown project key", async () => {
    const eventId = "a4444444-0000-4000-8000-000000000004";
    const response = await postRaw(postEnvelope(eventId, { projectKey: "does-not-exist" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { category: "project_not_found" },
    });
  });

  test("rejects an envelope with an unknown field", async () => {
    const eventId = "a5555555-0000-4000-8000-000000000005";
    const response = await postRaw(postEnvelope(eventId, { origin: "https://evil.example" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { category: "invalid_input" } });
  });

  test("rejects a mismatched idempotency key", async () => {
    const eventId = "a6666666-0000-4000-8000-000000000006";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "a7777777-0000-4000-8000-000000000007",
        Origin: ALLOWED_ORIGIN,
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { category: "invalid_input" } });
  });

  test("rejects a wrong content type", async () => {
    const eventId = "a8888888-0000-4000-8000-000000000008";
    const request = new Request(`${baseUrl}/api/v1/feedback`, {
      body: JSON.stringify(envelopeFor(eventId)),
      headers: {
        "Content-Type": "text/plain",
        "Idempotency-Key": eventId,
        Origin: ALLOWED_ORIGIN,
      },
      method: "POST",
    });
    const response = await postRaw(request);

    expect(response.status).toBe(400);
  });

  test("rate-limits a project atomically at its window budget", async () => {
    const rateProject = await handle.db.query.project.findFirst({
      where: eq(project.projectKey, "rate-limit-test"),
    });

    if (rateProject === undefined) {
      throw new Error("Rate-limit project was not seeded.");
    }

    const now = new Date();
    const first = await consumeProjectRateLimit(handle.db, rateProject.id, now, 2);
    const second = await consumeProjectRateLimit(handle.db, rateProject.id, now, 2);
    const third = await consumeProjectRateLimit(handle.db, rateProject.id, now, 2);

    expect([first.allowed, second.allowed, third.allowed]).toEqual([true, true, false]);
  });

  test("resolves concurrent duplicate retries to a single row", async () => {
    const eventId = "d1111111-0000-4000-8000-000000000001";
    const attempts = 8;
    const responses = await Promise.all(
      Array.from({ length: attempts }, () => postRaw(postEnvelope(eventId))),
    );
    const statuses = responses.map((response) => response.status).sort((a, b) => a - b);
    const receipts = (await Promise.all(responses.map((response) => response.json()))) as Array<
      Record<string, unknown>
    >;

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 200)).toHaveLength(attempts - 1);
    expect(new Set(receipts.map((receipt) => receipt.feedbackId)).size).toBe(1);

    const rows = await handle.db.query.feedback.findMany({
      where: eq(feedback.eventId, eventId),
    });

    expect(rows).toHaveLength(1);
  });

  test("accepts concurrent distinct submissions", async () => {
    const eventIds = [
      "d2222222-0000-4000-8000-000000000002",
      "d3333333-0000-4000-8000-000000000003",
      "d4444444-0000-4000-8000-000000000004",
      "d5555555-0000-4000-8000-000000000005",
      "d6666666-0000-4000-8000-000000000006",
    ];
    const responses = await Promise.all(eventIds.map((eventId) => postRaw(postEnvelope(eventId))));

    expect(responses.map((response) => response.status)).toEqual(
      Array.from({ length: eventIds.length }, () => 201),
    );

    const rows = await handle.db.query.feedback.findMany({
      where: inArray(feedback.eventId, eventIds),
    });

    expect(rows).toHaveLength(eventIds.length);
  });

  test("seeds the demo project idempotently for repeated runs", async () => {
    const before = await handle.db.query.project.findMany({
      where: eq(project.projectKey, DEMO_PROJECT_KEY),
    });
    const created = await seedDemoProject(handle);
    const after = await handle.db.query.project.findMany({
      where: eq(project.projectKey, DEMO_PROJECT_KEY),
    });

    expect(before).toHaveLength(1);
    expect(created).toBe(false);
    expect(after).toHaveLength(1);
  });

  test("lists and details feedback through the read-only inbox", async () => {
    const listResponse = await postRaw(new Request(`${baseUrl}/api/v1/inbox`, { method: "GET" }));
    const list = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
      nextCursor: string | null;
    };

    expect(listResponse.status).toBe(200);
    expect(list.items.length).toBeGreaterThan(0);
    expect(Object.keys(list.items[0] ?? {}).sort()).toEqual(
      ["feedbackId", "kind", "receivedAt", "requestOrigin", "routeLabel", "title"].sort(),
    );

    const feedbackId = list.items[0]?.feedbackId as string;
    const detailResponse = await postRaw(
      new Request(`${baseUrl}/api/v1/inbox/${feedbackId}`, { method: "GET" }),
    );
    const detail = (await detailResponse.json()) as {
      feedback: Record<string, unknown>;
    };

    expect(detailResponse.status).toBe(200);
    expect(detail.feedback.feedbackId).toBe(feedbackId);
    expect(typeof detail.feedback.expiresAt).toBe("string");
    expect(detail.feedback.source).toBe("web_sdk_unverified");
  });

  test("never exposes internal identifiers in inbox responses", async () => {
    const listResponse = await postRaw(new Request(`${baseUrl}/api/v1/inbox`, { method: "GET" }));
    const list = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
      nextCursor: string | null;
    };
    const firstItem = list.items[0] ?? {};

    for (const forbidden of ["projectId", "windowKey", "count", "sdkVersion", "eventId", "id"]) {
      expect(firstItem).not.toHaveProperty(forbidden);
    }

    const feedbackId = firstItem.feedbackId as string;
    const detailResponse = await postRaw(
      new Request(`${baseUrl}/api/v1/inbox/${feedbackId}`, { method: "GET" }),
    );
    const detail = (await detailResponse.json()) as { feedback: Record<string, unknown> };
    const record = detail.feedback;

    expect(Object.keys(record).sort()).toEqual(
      [
        "applicationRelease",
        "description",
        "expectedBehavior",
        "expiresAt",
        "feedbackId",
        "kind",
        "receivedAt",
        "reproductionSteps",
        "requestOrigin",
        "routeLabel",
        "source",
        "title",
      ].sort(),
    );

    for (const forbidden of ["projectId", "windowKey", "count", "sdkVersion", "eventId", "id"]) {
      expect(record).not.toHaveProperty(forbidden);
    }
  });

  test("returns 404 for an unknown inbox detail", async () => {
    const response = await postRaw(
      new Request(`${baseUrl}/api/v1/inbox/00000000-0000-4000-8000-000000000000`, {
        method: "GET",
      }),
    );

    expect(response.status).toBe(404);
  });

  test("cleanup removes only expired feedback and rate limits", async () => {
    const now = new Date();
    const expired = new Date(now.getTime() - 25 * 3_600_000);
    const fresh = new Date(now.getTime() - 60_000);

    await handle.db.insert(feedback).values({
      description: "expired",
      eventId: "b1111111-0000-4000-8000-000000000001",
      kind: "bug",
      origin: ALLOWED_ORIGIN,
      projectId: demoProjectId,
      receiptTimestamp: expired,
      sdkVersion: "1.0.0",
      source: "web_sdk_unverified",
      title: "expired report",
    });
    await handle.db.insert(feedback).values({
      description: "fresh",
      eventId: "b2222222-0000-4000-8000-000000000002",
      kind: "bug",
      origin: ALLOWED_ORIGIN,
      projectId: demoProjectId,
      receiptTimestamp: fresh,
      sdkVersion: "1.0.0",
      source: "web_sdk_unverified",
      title: "fresh report",
    });
    await handle.db.insert(rateLimit).values({
      count: 1,
      expiresAt: new Date(now.getTime() - 1),
      projectId: demoProjectId,
      windowKey: "expired-window",
    });
    await handle.db.insert(rateLimit).values({
      count: 1,
      expiresAt: new Date(now.getTime() + 3_600_000),
      projectId: demoProjectId,
      windowKey: "active-window",
    });

    const result = await runCleanup(handle.db, now);

    expect(result.deletedFeedback).toBe(1);
    expect(result.deletedRateLimits).toBe(1);

    const remainingFeedback = await handle.db.query.feedback.findMany({
      where: eq(feedback.title, "fresh report"),
    });
    const remainingRateLimits = await handle.db.query.rateLimit.findMany({
      where: eq(rateLimit.windowKey, "active-window"),
    });

    expect(remainingFeedback).toHaveLength(1);
    expect(remainingRateLimits).toHaveLength(1);
  });
});

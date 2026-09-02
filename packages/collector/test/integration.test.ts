import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { runCleanup } from "../src/db/cleanup";
import { createDb, type DbHandle } from "../src/db/client";
import { account, feedback, project, rateLimit, user } from "../src/db/schema";
import { DEMO_PROJECT_KEY, seedDemoProject } from "../src/db/seed";
import {
  ABUSE_CONTROL_MATRIX,
  type AbuseControlScenarioId,
} from "../src/foundation/abuse-control-matrix";
import type { CollectorRouteOptions } from "../src/handler";
import { windowKey } from "../src/rate-limit";
import { consumeProjectRateLimit, windowStartFor } from "../src/rate-limiting";
import { createFetchHandler, startCollectorServer } from "../src/server";
import { registerGitHubIntegrationTests } from "./github-integration-cases";

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

let isDbAvailable = false;
try {
  const probe = postgres(TEST_DATABASE_URL, { connect_timeout: 1, max: 1 });
  await probe`SELECT 1`;
  await probe.end({ timeout: 1 });
  isDbAvailable = true;
} catch {
  isDbAvailable = false;
}

beforeAll(async () => {
  if (!isDbAvailable) {
    return;
  }

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

  server = startCollectorServer({ databaseUrl: TEST_DATABASE_URL, port: 0, enableAuth: false });
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(async () => {
  if (!isDbAvailable) {
    return;
  }
  server?.stop(true);
  await handle?.close();
});

describe.skipIf(!isDbAvailable)("collector api and database tests", () => {
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

    const verifiedProject = await handle.db.query.project.findFirst({
      where: eq(project.id, demoProjectId),
    });
    expect(verifiedProject?.integrationVerifiedAt).toEqual(rows?.receiptTimestamp);
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
    expect([first.remaining, second.remaining, third.remaining]).toEqual([1, 0, 0]);
  });

  test("keeps the rate limit atomic under concurrent requests", async () => {
    const rateProject = await handle.db.query.project.findFirst({
      where: eq(project.projectKey, "rate-limit-test"),
    });

    if (rateProject === undefined) {
      throw new Error("Rate-limit project was not seeded.");
    }

    const windowNow = new Date(Date.now() + 24 * 3_600_000);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        consumeProjectRateLimit(handle.db, rateProject.id, windowNow, 5),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);

    const key = windowKey(rateProject.id, windowStartFor(windowNow));
    const rows = await handle.db.query.rateLimit.findMany({
      where: eq(rateLimit.windowKey, key),
    });

    expect(rows[0]?.count).toBe(5);
  });

  test("runs cleanup concurrently without errors or double deletes", async () => {
    const now = new Date();
    const expired = new Date(now.getTime() - 25 * 3_600_000);

    for (const [index, title] of ["expired a", "expired b"].entries()) {
      await handle.db.insert(feedback).values({
        description: "expired",
        eventId: uuidFor(500 + index),
        kind: "bug",
        origin: ALLOWED_ORIGIN,
        projectId: demoProjectId,
        receiptTimestamp: expired,
        sdkVersion: "1.0.0",
        source: "web_sdk_unverified",
        title,
      });
    }
    await handle.db.insert(rateLimit).values({
      count: 1,
      expiresAt: new Date(now.getTime() - 1),
      projectId: demoProjectId,
      windowKey: "concurrent-expired",
    });

    const results = await Promise.all([
      runCleanup(handle.db, now),
      runCleanup(handle.db, now),
      runCleanup(handle.db, now),
    ]);

    const deletedFeedback = results.reduce((sum, result) => sum + result.deletedFeedback, 0);
    const deletedRateLimits = results.reduce((sum, result) => sum + result.deletedRateLimits, 0);

    expect(deletedFeedback).toBe(2);
    expect(deletedRateLimits).toBe(1);

    const expiredRows = await handle.db.query.feedback.findMany({
      where: inArray(feedback.title, ["expired a", "expired b"]),
    });

    expect(expiredRows).toHaveLength(0);
  });

  test("returns a bounded internal-error response when the database is unavailable", async () => {
    const closedHandle = createDb(TEST_DATABASE_URL);
    await closedHandle.close();
    const unavailableServer = Bun.serve({
      fetch: createFetchHandler(closedHandle.db),
      port: 0,
    });

    try {
      const eventId = uuidFor(700);
      const request = new Request(`http://localhost:${unavailableServer.port}/api/v1/feedback`, {
        body: JSON.stringify(envelopeFor(eventId)),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": eventId,
          Origin: ALLOWED_ORIGIN,
        },
        method: "POST",
      });
      const response = await postRaw(request);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: { category: "internal_error" },
      });
    } finally {
      unavailableServer.stop(true);
    }
  });

  test("keeps inbox list and detail bounded with large fixtures", async () => {
    const now = new Date();
    const total = 120;
    const fixtures = Array.from({ length: total }, (_, index) => ({
      description: `fixture ${index}`,
      eventId: uuidFor(1000 + index),
      kind: "idea" as const,
      origin: ALLOWED_ORIGIN,
      projectId: demoProjectId,
      receiptTimestamp: new Date(now.getTime() - index * 1000),
      sdkVersion: "1.0.0",
      source: "web_sdk_unverified",
      title: `fixture report ${index}`,
    }));

    await handle.db.insert(feedback).values(fixtures);

    const first = await postRaw(new Request(`${baseUrl}/api/v1/inbox`, { method: "GET" }));
    const firstBody = (await first.json()) as {
      items: Array<Record<string, unknown>>;
      nextCursor: string | null;
    };

    expect(firstBody.items.length).toBeLessThanOrEqual(50);
    expect(firstBody.nextCursor).not.toBeNull();

    const collected: string[] = [];
    let cursor: string | null = null;

    do {
      const url =
        cursor === null
          ? `${baseUrl}/api/v1/inbox`
          : `${baseUrl}/api/v1/inbox?cursor=${encodeURIComponent(cursor)}`;
      const response = await postRaw(new Request(url, { method: "GET" }));
      const body = (await response.json()) as {
        items: Array<{ feedbackId: string }>;
        nextCursor: string | null;
      };

      for (const item of body.items) {
        collected.push(item.feedbackId);
      }

      cursor = body.nextCursor;
    } while (cursor !== null);

    expect(collected.length).toBeGreaterThanOrEqual(total);
    expect(new Set(collected).size).toBe(collected.length);

    const detail = await postRaw(
      new Request(`${baseUrl}/api/v1/inbox/${collected[0]}`, { method: "GET" }),
    );

    expect(detail.status).toBe(200);
  });

  test("cleanup is repeatable and preserves non-expired feedback", async () => {
    const now = new Date();
    const expired = new Date(now.getTime() - 25 * 3_600_000);

    await handle.db.insert(feedback).values({
      description: "repeat expired",
      eventId: uuidFor(600),
      kind: "bug",
      origin: ALLOWED_ORIGIN,
      projectId: demoProjectId,
      receiptTimestamp: expired,
      sdkVersion: "1.0.0",
      source: "web_sdk_unverified",
      title: "repeat expired",
    });
    await handle.db.insert(feedback).values({
      description: "repeat fresh",
      eventId: uuidFor(601),
      kind: "bug",
      origin: ALLOWED_ORIGIN,
      projectId: demoProjectId,
      receiptTimestamp: now,
      sdkVersion: "1.0.0",
      source: "web_sdk_unverified",
      title: "repeat fresh",
    });

    const first = await runCleanup(handle.db, now);
    const second = await runCleanup(handle.db, now);

    expect(first.deletedFeedback).toBe(1);
    expect(second.deletedFeedback).toBe(0);

    const expiredRows = await handle.db.query.feedback.findMany({
      where: eq(feedback.title, "repeat expired"),
    });
    const freshRows = await handle.db.query.feedback.findMany({
      where: eq(feedback.title, "repeat fresh"),
    });

    expect(expiredRows).toHaveLength(0);
    expect(freshRows).toHaveLength(1);
  });

  test("rejects a project over its configured rate limit over http", async () => {
    await handle.db.insert(project).values({
      allowedOrigins: [ALLOWED_ORIGIN],
      displayName: "HTTP rate limit",
      projectKey: "rate-limit-http-test",
      rateLimitMax: 3,
      retentionHours: 24,
    });

    const responses: Response[] = [];

    for (let index = 0; index < 4; index += 1) {
      const eventId = `e0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
      const request = postEnvelope(eventId, { projectKey: "rate-limit-http-test" });
      responses.push(await postRaw(request));
    }

    expect(responses.slice(0, 3).map((response) => response.status)).toEqual([201, 201, 201]);
    expect(responses[3]?.status).toBe(429);

    const retryAfter = responses[3]?.headers.get("Retry-After");

    expect(retryAfter).not.toBeNull();
    expect(Number.parseInt(retryAfter ?? "", 10)).toBeGreaterThan(0);

    await expect(responses[3]?.json()).resolves.toEqual({
      error: { category: "rate_limited" },
    });

    const rejectedRows = await handle.db.query.feedback.findMany({
      where: eq(feedback.eventId, "e0000000-0000-4000-8000-000000000003"),
    });

    expect(rejectedRows).toHaveLength(0);
  });

  test("resets the rate-limit budget at the hour boundary", async () => {
    const rateProject = await handle.db.query.project.findFirst({
      where: eq(project.projectKey, "rate-limit-test"),
    });

    if (rateProject === undefined) {
      throw new Error("Rate-limit project was not seeded.");
    }

    const hourOne = new Date("2030-01-01T18:30:00.000Z");
    const hourTwo = new Date("2030-01-01T19:10:00.000Z");

    const firstWindow = await Promise.all([
      consumeProjectRateLimit(handle.db, rateProject.id, hourOne, 2),
      consumeProjectRateLimit(handle.db, rateProject.id, hourOne, 2),
      consumeProjectRateLimit(handle.db, rateProject.id, hourOne, 2),
    ]);

    expect(firstWindow.filter((result) => result.allowed)).toHaveLength(2);

    const nextWindow = await consumeProjectRateLimit(handle.db, rateProject.id, hourTwo, 2);

    expect(nextWindow.allowed).toBe(true);
  });

  test("rejects every request when the rate-limit budget is zero", async () => {
    const rateProject = await handle.db.query.project.findFirst({
      where: eq(project.projectKey, "rate-limit-test"),
    });

    if (rateProject === undefined) {
      throw new Error("Rate-limit project was not seeded.");
    }

    const windowNow = new Date(Date.now() + 48 * 3_600_000);
    const result = await consumeProjectRateLimit(handle.db, rateProject.id, windowNow, 0);

    expect(result).toEqual({ allowed: false, remaining: 0 });

    const key = windowKey(rateProject.id, windowStartFor(windowNow));
    const rows = await handle.db.query.rateLimit.findMany({
      where: eq(rateLimit.windowKey, key),
    });

    expect(rows).toHaveLength(0);
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

  test("stores xss-like content as plain text", async () => {
    const eventId = "e1111111-0000-4000-8000-000000000001";
    const xssTitle = "<script>alert(1)</script>";
    const response = await postRaw(
      postEnvelope(eventId, {
        feedback: { ...envelopeFor(eventId).feedback, title: xssTitle },
      }),
    );

    expect(response.status).toBe(201);

    const receipt = (await response.json()) as Record<string, unknown>;
    const detail = await postRaw(
      new Request(`${baseUrl}/api/v1/inbox/${receipt.feedbackId}`, { method: "GET" }),
    );
    const detailBody = (await detail.json()) as { feedback: { title: string } };

    expect(detailBody.feedback.title).toBe(xssTitle);
  });

  test("rejects malformed json over http", async () => {
    const response = await postRaw(
      new Request(`${baseUrl}/api/v1/feedback`, {
        body: '{"schemaVersion":',
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "e2222222-0000-4000-8000-000000000002",
          Origin: ALLOWED_ORIGIN,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { category: "invalid_input" } });
  });

  test("rejects invalid utf-8 over http", async () => {
    const response = await postRaw(
      new Request(`${baseUrl}/api/v1/feedback`, {
        body: new Uint8Array([0x7b, 0xc3, 0x28, 0x7d]),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "e3333333-0000-4000-8000-000000000003",
          Origin: ALLOWED_ORIGIN,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
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

  test("runs the full abuse-control matrix against the fresh database", async () => {
    const rejected = ABUSE_CONTROL_MATRIX.filter((row) => row.errorCategory !== null);

    expect(rejected.length).toBeGreaterThan(0);

    for (const [index, row] of rejected.entries()) {
      const eventId = uuidFor(index);
      const request = matrixRequest(row.id, eventId);
      const response = await postRaw(request);

      expect(response.status, `${row.id}: expected ${row.httpStatus}`).toBe(row.httpStatus);
      await expect(response.json(), `${row.id}: expected error body`).resolves.toEqual({
        error: { category: row.errorCategory },
      });

      const rows = await handle.db.query.feedback.findMany({
        where: eq(feedback.eventId, eventId),
      });

      expect(rows, `${row.id}: ${row.dbState}`).toHaveLength(0);
    }
  });

  test("resolves the repeated-event matrix row to a single stored record", async () => {
    const row = ABUSE_CONTROL_MATRIX.find((entry) => entry.id === "repeated_event_id");

    if (row === undefined) {
      throw new Error("Missing repeated_event_id matrix row.");
    }

    const eventId = uuidFor(9999);
    const first = await postRaw(matrixRequest("repeated_event_id", eventId));
    const second = await postRaw(matrixRequest("repeated_event_id", eventId));

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);

    const firstReceipt = (await first.json()) as Record<string, unknown>;
    const secondReceipt = (await second.json()) as Record<string, unknown>;

    expect(secondReceipt.duplicate).toBe(true);
    expect(secondReceipt.feedbackId).toBe(firstReceipt.feedbackId);

    const rows = await handle.db.query.feedback.findMany({
      where: eq(feedback.eventId, eventId),
    });

    expect(rows).toHaveLength(1);
  });

  test("migrations apply to an empty database and produce the expected constraints", async () => {
    const ddl = postgres(TEST_DATABASE_URL, { prepare: false });

    try {
      await ddl.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
      await ddl.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
      await ddl.unsafe("CREATE SCHEMA public");

      const fresh = createDb(TEST_DATABASE_URL);

      await migrate(fresh.db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
      await fresh.close();

      const indexes = await ddl.unsafe<{ indexdef: string }[]>(
        "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public'",
      );
      const indexDefs = indexes.map((row) => row.indexdef).join("\n");

      expect(indexDefs).toMatch(/feedback_project_event_unique/);
      expect(indexDefs).toMatch(/rate_limit_project_window_unique/);
      expect(indexDefs).toMatch(/project_project_key_unique/);

      const enumRows = await ddl.unsafe<{ typname: string }[]>(
        "SELECT typname FROM pg_type WHERE typname = 'feedback_kind'",
      );

      expect(enumRows.length).toBeGreaterThan(0);

      const foreignKeys = await ddl.unsafe<{ conname: string }[]>(
        "SELECT conname FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace",
      );
      const fkNames = foreignKeys.map((row) => row.conname).join(" ");

      expect(fkNames).toMatch(/feedback_project_id_project_id_fk/);
      expect(fkNames).toMatch(/rate_limit_project_id_project_id_fk/);
    } finally {
      await ddl.end();
    }
  });
});

describe.skipIf(!isDbAvailable)("owned applications and account settings", () => {
  async function identity() {
    const id = crypto.randomUUID();
    await handle.db.insert(user).values({ id, name: "App owner", email: `${id}@filika.test` });
    const betterAuth = {
      api: { getSession: async () => ({ user: { id } }) },
    } as unknown as CollectorRouteOptions["betterAuth"];
    const handler = createFetchHandler(handle.db, { betterAuth });
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      origin = "http://localhost:4173",
    ) =>
      handler(
        new Request(`http://localhost:4173/api/v1${path}`, {
          method,
          headers: { Origin: origin, "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
    return { id, request };
  }
  const settings = { displayName: "Eckra", allowedOrigins: [ALLOWED_ORIGIN], dashboardDays: 30 };

  test("creates persisted applications and rejects invalid, reserved, duplicate and cross-origin writes", async () => {
    const owner = await identity();
    const slug = `app-${crypto.randomUUID()}`;
    expect((await owner.request("/apps", "POST", { ...settings, slug: "account" })).status).toBe(
      400,
    );
    expect(
      (await owner.request("/apps", "POST", { ...settings, slug, ownerUserId: "other" })).status,
    ).toBe(400);
    expect(
      (await owner.request("/apps", "POST", { ...settings, slug }, "https://evil.example")).status,
    ).toBe(403);
    const responses = await Promise.all([
      owner.request("/apps", "POST", { ...settings, slug }),
      owner.request("/apps", "POST", { ...settings, slug }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const list = await (await owner.request("/apps")).json();
    expect(list.applications).toHaveLength(1);
    expect(list.applications[0]).toMatchObject({
      slug,
      displayName: "Eckra",
      dashboardDays: 30,
      integrationVerifiedAt: null,
    });
    expect(list.applications[0]).not.toHaveProperty("ownerUserId");
    expect(
      (await owner.request(`/apps/${slug}`, "PATCH", { ...settings, displayName: "Renamed" }))
        .status,
    ).toBe(200);
    expect((await (await owner.request(`/apps/${slug}`)).json()).application.displayName).toBe(
      "Renamed",
    );
    expect((await owner.request("/inbox")).status).toBe(400);
    expect((await owner.request("/dashboard")).status).toBe(400);
  });

  test("isolates inbox, detail, dashboard and settings by application and owner", async () => {
    const owner = await identity();
    const other = await identity();
    const first = `one-${crypto.randomUUID()}`;
    const second = `two-${crypto.randomUUID()}`;
    const app = (await (await owner.request("/apps", "POST", { ...settings, slug: first })).json())
      .application;
    await owner.request("/apps", "POST", { ...settings, slug: second });
    const eventId = crypto.randomUUID();
    const accepted = await postRaw(postEnvelope(eventId, { projectKey: app.projectKey }));
    expect(accepted.status).toBe(201);
    const receipt = await accepted.json();
    const verified = (await (await owner.request(`/apps/${first}`)).json()).application;
    expect(Date.parse(verified.integrationVerifiedAt)).not.toBeNaN();
    expect((await (await owner.request(`/apps/${first}/inbox`)).json()).items).toHaveLength(1);
    expect((await (await owner.request(`/apps/${second}/inbox`)).json()).items).toHaveLength(0);
    expect((await (await owner.request(`/apps/${first}/dashboard`)).json()).total).toBe(1);
    expect((await (await owner.request(`/apps/${second}/dashboard`)).json()).total).toBe(0);
    expect((await owner.request(`/apps/${first}/inbox/${receipt.feedbackId}`)).status).toBe(200);
    expect((await owner.request(`/apps/${second}/inbox/${receipt.feedbackId}`)).status).toBe(404);
    for (const suffix of ["", "/inbox", "/dashboard", `/inbox/${receipt.feedbackId}`]) {
      expect((await other.request(`/apps/${first}${suffix}`)).status).toBe(404);
    }
    expect((await other.request(`/apps/${first}`, "PATCH", settings)).status).toBe(404);
    expect((await (await other.request("/apps")).json()).applications).toEqual([]);
  });

  test("Google photo is opt-in, verified against the linked provider, and never accepts arbitrary URLs", async () => {
    const owner = await identity();
    const settings = {
      name: "Updated owner",
      theme: "dark",
      density: "compact",
      useGoogleImage: true,
    };
    expect((await owner.request("/account", "PATCH", settings)).status).toBe(400);
    expect(
      (
        await owner.request("/account", "PATCH", {
          ...settings,
          image: "https://evil.example/photo",
        })
      ).status,
    ).toBe(400);
    await handle.db.insert(account).values({
      id: crypto.randomUUID(),
      userId: owner.id,
      accountId: "google-test",
      providerId: "google",
      issuer: "https://accounts.google.com",
      accessToken: "must-not-leak",
    });
    await handle.db
      .update(user)
      .set({ googleImage: "https://lh3.googleusercontent.com/test-photo" })
      .where(eq(user.id, owner.id));
    expect((await (await owner.request("/account")).json()).account.image).toBeNull();
    const response = await owner.request("/account", "PATCH", settings);
    expect(response.status).toBe(200);
    const profile = (await response.json()).account;
    expect(profile).toMatchObject({
      name: "Updated owner",
      image: "https://lh3.googleusercontent.com/test-photo",
      theme: "dark",
      density: "compact",
      googleConnected: true,
    });
    expect(JSON.stringify(profile)).not.toContain("must-not-leak");
    expect(
      (await owner.request("/account", "PATCH", settings, "https://evil.example")).status,
    ).toBe(403);
    await owner.request("/account", "PATCH", { ...settings, useGoogleImage: false });
    expect((await (await owner.request("/account")).json()).account.image).toBeNull();
  });

  test("GitHub photo is opt-in, verified against the linked provider, and never accepts arbitrary URLs", async () => {
    const owner = await identity();
    const settings = {
      name: "GitHub owner",
      theme: "dark",
      density: "compact",
      useGithubImage: true,
    };
    expect((await owner.request("/account", "PATCH", settings)).status).toBe(400);
    expect(
      (
        await owner.request("/account", "PATCH", {
          ...settings,
          image: "https://evil.example/photo",
        })
      ).status,
    ).toBe(400);
    await handle.db.insert(account).values({
      id: crypto.randomUUID(),
      userId: owner.id,
      accountId: "github-test",
      providerId: "github",
      issuer: "https://github.com",
      accessToken: "must-not-leak",
    });
    await handle.db
      .update(user)
      .set({ githubImage: "https://avatars.githubusercontent.com/u/123456?v=4" })
      .where(eq(user.id, owner.id));
    expect((await (await owner.request("/account")).json()).account.image).toBeNull();
    const response = await owner.request("/account", "PATCH", settings);
    expect(response.status).toBe(200);
    const profile = (await response.json()).account;
    expect(profile).toMatchObject({
      name: "GitHub owner",
      image: "https://avatars.githubusercontent.com/u/123456?v=4",
      theme: "dark",
      density: "compact",
      githubConnected: true,
    });
    expect(JSON.stringify(profile)).not.toContain("must-not-leak");
    await owner.request("/account", "PATCH", { ...settings, useGithubImage: false });
    expect((await (await owner.request("/account")).json()).account.image).toBeNull();
  });
});

describe.skipIf(!isDbAvailable)("application schema compatibility", () => {
  test("upgrades existing non-null unique slugs without losing records or migration history", async () => {
    const folder = await mkdtemp(join(tmpdir(), "filika-legacy-migrations-"));
    const ddl = postgres(TEST_DATABASE_URL, { prepare: false });
    try {
      const journal = await Bun.file(`${import.meta.dir}/../drizzle/meta/_journal.json`).json();
      const previousEntries = journal.entries.filter((entry: { idx: number }) => entry.idx < 3);
      await mkdir(join(folder, "meta"));
      await writeFile(
        join(folder, "meta/_journal.json"),
        JSON.stringify({ ...journal, entries: previousEntries }),
      );
      for (const entry of previousEntries) {
        await copyFile(
          `${import.meta.dir}/../drizzle/${entry.tag}.sql`,
          join(folder, `${entry.tag}.sql`),
        );
      }
      // Only the dedicated integration-test database is reset here.
      await ddl.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
      await ddl.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
      await ddl.unsafe("CREATE SCHEMA public");
      await migrate(handle.db, { migrationsFolder: folder });
      const projectId = crypto.randomUUID();
      const feedbackId = crypto.randomUUID();
      await ddl`INSERT INTO project (id, project_key, display_name, allowed_origins)
        VALUES (${projectId}, 'legacy-project', 'Legacy application', ARRAY['https://example.test'])`;
      await ddl`INSERT INTO "user" (id, name, email, email_verified, image)
        VALUES ('legacy-user', 'Legacy maintainer', 'legacy@example.test', true, 'https://lh3.googleusercontent.com/legacy')`;
      await ddl`INSERT INTO feedback (id, project_id, event_id, title, description, kind, origin, sdk_version)
        VALUES (${feedbackId}, ${projectId}, ${crypto.randomUUID()}, 'Legacy report', 'Keep this report.', 'bug', 'https://example.test', '0.0.0')`;
      await ddl.unsafe("ALTER TABLE project ADD COLUMN slug text");
      await ddl`UPDATE project SET slug = 'legacy-application'`;
      await ddl.unsafe("ALTER TABLE project ALTER COLUMN slug SET NOT NULL");
      await ddl.unsafe("ALTER TABLE project ADD CONSTRAINT project_slug_unique UNIQUE(slug)");
      await ddl`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('legacy-slug-migration', 1788050928417)`;
      const history =
        await ddl`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
      const records = await ddl`SELECT * FROM feedback`;

      await migrate(handle.db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
      expect(await ddl`SELECT * FROM feedback`).toEqual(records);
      const apps = await handle.db.select().from(project);
      expect(apps).toHaveLength(1);
      expect(apps[0]).toMatchObject({
        id: projectId,
        slug: "legacy-application",
        displayName: "Legacy application",
        ownerUserId: null,
        dashboardDays: 30,
      });
      const users = await handle.db.select().from(user);
      expect(users[0]).toMatchObject({
        id: "legacy-user",
        email: "legacy@example.test",
        image: "https://lh3.googleusercontent.com/legacy",
        googleImage: null,
        useGoogleImage: false,
        theme: "light",
        density: "comfortable",
      });
      const after =
        await ddl`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
      expect(after.slice(0, history.length)).toEqual([...history]);
      expect(after.length).toBe(history.length + journal.entries.length - previousEntries.length);
      await migrate(handle.db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
      expect(
        await ddl`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`,
      ).toEqual(after);
      // Nullable slugs remain valid for unassigned legacy collector projects.
      await seedDemoProject(handle);
      expect(await ddl`SELECT slug FROM project WHERE project_key = 'filika-demo'`).toEqual([
        { slug: null },
      ]);
    } finally {
      await ddl.end();
      await rm(folder, { recursive: true, force: true });
    }
  });
});

function matrixRequest(scenario: AbuseControlScenarioId, eventId: string): Request {
  const base = envelopeFor(eventId);
  const headers = new Headers({
    "Content-Type": "application/json",
    "Idempotency-Key": eventId,
    Origin: ALLOWED_ORIGIN,
  });

  switch (scenario) {
    case "missing_origin":
      headers.delete("Origin");
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify(base),
        headers,
        method: "POST",
      });
    case "null_origin":
      headers.set("Origin", "null");
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify(base),
        headers,
        method: "POST",
      });
    case "denied_origin":
      headers.set("Origin", "http://evil.example");
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify(base),
        headers,
        method: "POST",
      });
    case "oversized_body":
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify({ ...base, title: "x".repeat(70_000) }),
        headers,
        method: "POST",
      });
    case "invalid_project_key":
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify({ ...base, projectKey: "does-not-exist" }),
        headers,
        method: "POST",
      });
    case "repeated_event_id":
      return new Request(`${baseUrl}/api/v1/feedback`, {
        body: JSON.stringify(base),
        headers,
        method: "POST",
      });
  }
}

function uuidFor(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

registerGitHubIntegrationTests(() => handle.db, isDbAvailable);

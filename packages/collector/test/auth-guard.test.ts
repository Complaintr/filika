import { describe, expect, test } from "bun:test";
import type { Db } from "../src/db/client";
import { type CollectorRouteOptions, createFetchHandler } from "../src/handler";

interface FakeSession {
  user: { id: string; email: string; name: string };
}

function fakeBetterAuth(session: FakeSession | null): CollectorRouteOptions["betterAuth"] {
  return {
    api: {
      getSession: async () => session,
    },
  } as unknown as CollectorRouteOptions["betterAuth"];
}

function emptyQuery() {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    // biome-ignore lint/suspicious/noThenProperty: The stub must behave like a thenable query builder.
    then: (resolve: (value: unknown) => unknown) => resolve([]),
  };
  return chain;
}

const emptyDb = {
  select: () => emptyQuery(),
  transaction: async (callback: (db: Db) => Promise<unknown>) =>
    callback({
      select: () => emptyQuery(),
      transaction: emptyDb.transaction,
      execute: () => Promise.resolve(undefined),
    } as unknown as Db),
  execute: () => Promise.resolve(undefined),
} as unknown as Db;

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost:8787${path}`, init);
}

describe("collector route auth guard", () => {
  test("returns 401 for the inbox list without a session", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth(null),
    });
    const response = await handler(request("/api/v1/inbox"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { category: "unauthenticated" } });
  });

  test("returns 401 for inbox detail without a session", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth(null),
    });
    const response = await handler(request("/api/v1/inbox/9f8e7d6c-5b4a-4321-9876-123456789abc"));

    expect(response.status).toBe(401);
  });

  test("returns 401 for the dashboard without a session", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth(null),
    });
    const response = await handler(request("/api/v1/dashboard"));

    expect(response.status).toBe(401);
  });

  test("allows the read endpoints when a session exists", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth({ user: { id: "u1", email: "a@b.c", name: "A" } }),
    });

    // A 401 would mean the guard rejected the request. With a session present
    // the handler proceeds into the (stubbed) collector, which may return any
    // non-401 status.
    const dashboard = await handler(request("/api/v1/dashboard"));
    expect(dashboard.status).not.toBe(401);

    const inbox = await handler(request("/api/v1/inbox"));
    expect(inbox.status).not.toBe(401);

    const detail = await handler(request("/api/v1/inbox/9f8e7d6c-5b4a-4321-9876-123456789abc"));
    expect(detail.status).not.toBe(401);
  });

  test("never guards the public feedback ingestion", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth(null),
    });
    const response = await handler(
      request("/api/v1/feedback", {
        body: "{}",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    // The ingest pipeline itself rejects the body before any session check is
    // relevant (anything but a 401 proves the route is not guarded).
    expect(response.status).not.toBe(401);
  });

  test("keeps preflight open without a session", async () => {
    const handler = createFetchHandler(emptyDb, {
      betterAuth: fakeBetterAuth(null),
    });
    const response = await handler(
      request("/api/v1/feedback", {
        headers: { Origin: "http://localhost:4173" },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
  });

  test("behaves like the unguarded handler when no options are provided", async () => {
    const handler = createFetchHandler(emptyDb);
    const response = await handler(request("/api/v1/dashboard"));

    expect(response.status).toBe(200);
  });
});

import { describe, expect, test } from "bun:test";
import { demoApi } from "../src/services/demo-api";

describe("demoApi", () => {
  test("fetchApplication parses a demo application for the device", async () => {
    const fetchMock = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            application: {
              slug: "demo-abc-123",
              displayName: "Filika Demo",
              kind: "demo",
              projectKey: "app_abc123",
              allowedOrigins: ["http://localhost:4173"],
              dashboardDays: 30,
              retentionHours: 24,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )) as unknown as typeof fetch;

    const original = globalThis.fetch;
    // @ts-expect-error: replacing global fetch for the test.
    globalThis.fetch = fetchMock;
    try {
      const app = await demoApi("demo-device").fetchApplication(new AbortController().signal);
      expect(app.kind).toBe("demo");
      expect(app.projectKey).toBe("app_abc123");
      expect(app.slug).toBe("demo-abc-123");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("fetchApplication rejects non-demo kinds", async () => {
    const fetchMock = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            application: {
              slug: "eckra",
              displayName: "Eckra",
              kind: "application",
              projectKey: "app_x",
              allowedOrigins: ["http://localhost:4173"],
              dashboardDays: 30,
              retentionHours: 24,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )) as unknown as typeof fetch;

    const original = globalThis.fetch;
    // @ts-expect-error: replacing global fetch for the test.
    globalThis.fetch = fetchMock;
    try {
      await expect(
        demoApi("demo-device").fetchApplication(new AbortController().signal),
      ).rejects.toThrow("Invalid demo application response.");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("inbox service uses the device demo prefix", async () => {
    const api = demoApi("demo-device-0001");
    const spy = await import("../src/services/inbox-api").then((m) => m.InboxApiService);
    expect(api.inbox).toBeInstanceOf(spy);
  });

  test("inbox list and detail hit the /inbox scoped endpoints", async () => {
    const calls: string[] = [];
    const fetchMock = ((input: RequestInfo | URL) => {
      calls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;

    const original = globalThis.fetch;
    // @ts-expect-error: replacing global fetch for the test.
    globalThis.fetch = fetchMock;
    try {
      await demoApi("demo-device-0001").inbox.fetchList();
      await demoApi("demo-device-0001").inbox.fetchDetail("fb-0001");
      expect(calls[0]).toBe("/api/v1/demo/demo-device-0001/inbox");
      expect(calls[1]).toBe("/api/v1/demo/demo-device-0001/inbox/fb-0001");
    } finally {
      globalThis.fetch = original;
    }
  });
});

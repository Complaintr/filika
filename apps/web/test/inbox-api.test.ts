import { describe, expect, test } from "bun:test";
import { InboxApiService } from "../src/services/inbox-api";

describe("InboxApiService", () => {
  const origin = "http://localhost:8787";

  test("fetchList returns ready state with parsed items on 200", async () => {
    const mockItems = [
      {
        feedbackId: "fb_1",
        kind: "bug",
        receivedAt: "2026-08-28T10:00:00.000Z",
        requestOrigin: "http://localhost:4173",
        routeLabel: "Sample task",
        title: "Test bug",
      },
    ];

    const mockFetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: mockItems, nextCursor: null }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      )) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchList();

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.feedbackId).toBe("fb_1");
      expect(result.items[0]?.title).toBe("Test bug");
    }
  });

  test("fetchList returns empty state when list is empty", async () => {
    const mockFetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [], nextCursor: null }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      )) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchList();

    expect(result.status).toBe("empty");
  });

  test("fetchList returns error state on non-200 or network failure", async () => {
    const mockFetch = (() =>
      Promise.resolve(new Response(null, { status: 500 }))) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchList();

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.retryable).toBe(true);
    }
  });

  test("fetchDetail returns ready state on 200 with valid feedback", async () => {
    const mockFeedback = {
      applicationRelease: "demo-2026.08",
      description: "Description text",
      expectedBehavior: "Expected text",
      expiresAt: "2099-01-01T00:00:00.000Z",
      feedbackId: "fb_1",
      kind: "bug",
      receivedAt: "2026-08-28T10:00:00.000Z",
      reproductionSteps: ["step 1", "step 2"],
      requestOrigin: "http://localhost:4173",
      routeLabel: "Sample task",
      source: "web_sdk_unverified",
      title: "Title",
    };

    const mockFetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ feedback: mockFeedback }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      )) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchDetail("fb_1");

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.feedback.feedbackId).toBe("fb_1");
      expect(result.feedback.reproductionSteps).toBe("step 1\nstep 2");
    }
  });

  test("fetchDetail returns not_found state on 404", async () => {
    const mockFetch = (() =>
      Promise.resolve(new Response(null, { status: 404 }))) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchDetail("fb_missing");

    expect(result.status).toBe("not_found");
  });

  test("fetchDetail returns expired state when feedback retention has passed", async () => {
    const mockFeedback = {
      applicationRelease: null,
      description: "Old report",
      expectedBehavior: null,
      expiresAt: "2020-01-01T00:00:00.000Z",
      feedbackId: "fb_old",
      kind: "idea",
      receivedAt: "2020-01-01T00:00:00.000Z",
      reproductionSteps: null,
      requestOrigin: "http://localhost:4173",
      routeLabel: null,
      source: "web_sdk_unverified",
      title: "Old title",
    };

    const mockFetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ feedback: mockFeedback }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      )) as unknown as typeof fetch;

    const api = new InboxApiService({ collectorOrigin: origin, fetchFn: mockFetch });
    const result = await api.fetchDetail("fb_old");

    expect(result.status).toBe("expired");
    if (result.status === "expired") {
      expect(result.expiredAt).toBe("2020-01-01T00:00:00.000Z");
    }
  });
});

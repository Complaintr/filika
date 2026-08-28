import { describe, expect, test } from "bun:test";

import type { FeedbackDraft } from "../src/contracts/feedback-fields";
import { createCollectorSubmit } from "../src/services/collector-submit";

const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FEEDBACK_ID = "22222222-2222-4222-8222-222222222222";
const draft: FeedbackDraft = {
  applicationRelease: "demo-2026.08",
  description: "The save operation failed.",
  expectedBehavior: null,
  kind: "bug",
  reproductionSteps: null,
  routeLabel: "Sample task",
  title: "Save failed",
};

function acceptedReceipt(eventId: string): Response {
  return Response.json(
    {
      duplicate: false,
      eventId,
      feedbackId: FEEDBACK_ID,
      receivedAt: "2026-08-28T12:00:00.000Z",
      schemaVersion: 1,
    },
    { status: 201 },
  );
}

describe("collector submit service", () => {
  test("sends the correlated event ID and accepts only its validated receipt", async () => {
    let requestUrl = "";
    let requestEventId = "";
    const submit = createCollectorSubmit({
      collectorOrigin: "http://localhost:8787",
      fetchFn: async (input, init) => {
        requestUrl = String(input);
        const body = JSON.parse(String(init?.body)) as { eventId: string };
        requestEventId = body.eventId;
        expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(body.eventId);
        return acceptedReceipt(body.eventId);
      },
      projectKey: "filika_demo",
    });

    const result = await submit(draft, new AbortController().signal);

    expect(requestUrl).toBe("http://localhost:8787/api/v1/feedback");
    expect(requestEventId).toMatch(EVENT_ID_PATTERN);
    expect(result).toEqual({
      outcome: "success",
      receipt: {
        duplicate: false,
        feedbackId: FEEDBACK_ID,
        receivedAt: "2026-08-28T12:00:00.000Z",
      },
    });
  });

  test("rejects an otherwise valid receipt for a different event", async () => {
    const submit = createCollectorSubmit({
      collectorOrigin: "http://localhost:8787",
      fetchFn: () => Promise.resolve(acceptedReceipt("11111111-1111-4111-8111-111111111111")),
      projectKey: "filika_demo",
    });

    expect(await submit(draft, new AbortController().signal)).toEqual({
      outcome: "outcome_unknown",
    });
  });

  test("actively aborts a stalled request at the configured deadline", async () => {
    const submit = createCollectorSubmit({
      collectorOrigin: "http://localhost:8787",
      fetchFn: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("stopped")), {
            once: true,
          });
        }),
      projectKey: "filika_demo",
      timeoutMs: 1,
    });

    expect(await submit(draft, new AbortController().signal)).toEqual({ outcome: "timeout" });
  });

  test("distinguishes caller cancellation from the request deadline", async () => {
    const controller = new AbortController();
    const submit = createCollectorSubmit({
      collectorOrigin: "http://localhost:8787",
      fetchFn: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("stopped")), {
            once: true,
          });
        }),
      projectKey: "filika_demo",
      timeoutMs: 1_000,
    });

    const pending = submit(draft, controller.signal);
    controller.abort();

    expect(await pending).toEqual({ outcome: "aborted" });
  });
});

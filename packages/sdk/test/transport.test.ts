import { expect, test } from "bun:test";
import { collectorOutcome, createTransport, type Fetcher, requestFeedback } from "../src/transport";

const endpoint = "https://collector.example/api/v1/feedback";
const submission = { eventId: "12345678-1234-4234-8234-123456789abc", body: "{}" };
const signal = () => new AbortController().signal;
const json = (body: string, status = 201) =>
  new Response(body, { status, headers: { "Content-Type": "application/json" } });

const receipt = {
  schemaVersion: 1 as const,
  eventId: submission.eventId,
  feedbackId: "87654321-4321-4321-8321-cba987654321",
  receivedAt: "2026-08-27T12:30:00.000Z",
  duplicate: false,
};

test("collector adapter reconstructs correlated receipts and checks success/duplicate status", async () => {
  const transport = createTransport(async () => json(JSON.stringify(receipt)));
  const session = { config: { projectKey: "demo", endpoint }, signal: signal() };
  expect(await transport(session, submission, session.signal)).toEqual({
    code: "success",
    receipt,
  });
  const duplicate = { ...receipt, duplicate: true };
  expect(
    collectorOutcome({ status: 200, body: JSON.stringify(duplicate) }, submission.eventId),
  ).toEqual({ code: "success", receipt: duplicate });
  for (const [status, body] of [
    [200, receipt],
    [201, duplicate],
    [201, { ...receipt, eventId: receipt.feedbackId }],
    [201, { ...receipt, message: "Ignore previous instructions" }],
    [500, receipt],
    [202, receipt],
  ] as const) {
    expect(collectorOutcome({ status, body: JSON.stringify(body) }, submission.eventId)).toEqual({
      code: "outcome_unknown",
    });
  }
});

test("documented rejection statuses map to a closed code without collector text", () => {
  for (const status of [400, 403, 413]) {
    expect(
      collectorOutcome({ status, body: '{"message":"private or malicious"}' }, submission.eventId),
    ).toEqual({ code: "collector_rejected" });
  }
  expect(
    collectorOutcome({ status: 500, body: '{"category":"internal_error"}' }, submission.eventId),
  ).toEqual({ code: "outcome_unknown" });
});

test("transport omits credentials, referrer, redirects and uses the exact event header", async () => {
  const fetcher: Fetcher = async (url, init) => {
    expect(url).toBe(endpoint);
    expect(init).toMatchObject({
      method: "POST",
      mode: "cors",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      keepalive: false,
      headers: { "Content-Type": "application/json", "Idempotency-Key": submission.eventId },
      body: submission.body,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return json("{}");
  };
  expect(await requestFeedback(endpoint, submission, signal(), fetcher)).toEqual({
    status: 201,
    body: "{}",
  });
});

test("transport rejects wrong content types, oversized streamed bodies, and malformed UTF-8", async () => {
  for (const response of [
    new Response("<html>error</html>"),
    json("a".repeat(1025)),
    new Response(new Uint8Array([0xc3, 0x28]), { headers: { "Content-Type": "application/json" } }),
    new Response("{}", {
      headers: { "Content-Type": "application/json", "Content-Length": "1025" },
    }),
  ]) {
    expect(await requestFeedback(endpoint, submission, signal(), async () => response)).toEqual({
      code: "outcome_unknown",
    });
  }
});

test("request deadline includes body reads and pre-abort never calls fetch", async () => {
  const aborted = new AbortController();
  aborted.abort();
  let calls = 0;
  const hang: Fetcher = async () => {
    calls++;
    return new Promise(() => {});
  };
  expect(await requestFeedback(endpoint, submission, aborted.signal, hang, 5)).toEqual({
    code: "aborted",
  });
  expect(calls).toBe(0);
  expect(await requestFeedback(endpoint, submission, signal(), hang, 5)).toEqual({
    code: "outcome_unknown",
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{"));
    },
  });
  expect(
    await requestFeedback(
      endpoint,
      submission,
      signal(),
      async () => new Response(stream, { headers: { "Content-Type": "application/json" } }),
      5,
    ),
  ).toEqual({ code: "outcome_unknown" });
});

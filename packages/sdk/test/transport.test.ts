import { expect, test } from "bun:test";
import { type Fetcher, requestFeedback } from "../src/transport";

const endpoint = "https://collector.example/api/v1/feedback";
const submission = { eventId: "12345678-1234-4234-8234-123456789abc", body: "{}" };
const signal = () => new AbortController().signal;
const json = (body: string, status = 201) =>
  new Response(body, { status, headers: { "Content-Type": "application/json" } });

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

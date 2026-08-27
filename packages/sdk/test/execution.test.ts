import { expect, test } from "bun:test";
import { createExecution, type ReviewRequest } from "../src/execution";
import type { RuntimeSession } from "../src/runtime";

const draft = { kind: "bug", title: "Save failed", description: "Saving returned an error." };
const config = { projectKey: "demo", endpoint: "https://collector.example/api/v1/feedback" };
function session(): RuntimeSession {
  return { config, signal: new AbortController().signal };
}
const confirm = async (request: ReviewRequest) => ({
  kind: "confirmed",
  feedback: request.draft,
  context: request.context,
});

test("review requires explicit confirmation and revalidation before transport", async () => {
  let requests = 0;
  const transport = async () => {
    requests++;
    return { code: "outcome_unknown" as const };
  };
  for (const decision of [
    { kind: "cancelled" },
    { kind: "confirmed", feedback: draft, context: { sdkVersion: "wrong" } },
  ]) {
    const engine = createExecution({ review: async () => decision, transmit: transport });
    expect((await engine.execute(session(), draft)).code).toBe(
      decision.kind === "cancelled" ? "cancelled" : "invalid_input",
    );
  }
  expect(requests).toBe(0);
  const engine = createExecution({ review: confirm, transmit: transport });
  expect((await engine.execute(session(), { ...draft, unknown: true })).code).toBe("invalid_input");
  expect(requests).toBe(0);
  expect((await engine.execute(session(), draft)).code).toBe("outcome_unknown");
  expect(requests).toBe(1);
});

test("pre-abort, review abort and timeout never dispatch, even with an uncooperative adapter", async () => {
  const caller = new AbortController();
  const started = Promise.withResolvers<AbortSignal>();
  let requests = 0;
  const engine = createExecution({
    review: async (request) => {
      started.resolve(request.signal);
      return new Promise(() => {});
    },
    transmit: async () => {
      requests++;
      return { code: "outcome_unknown" };
    },
    reviewTimeoutMs: 10,
  });
  const pending = engine.execute(session(), draft, caller.signal);
  const signal = await started.promise;
  caller.abort();
  expect(await pending).toEqual({ code: "aborted" });
  expect(signal.aborted).toBe(true);
  expect(await engine.execute(session(), draft, caller.signal)).toEqual({ code: "aborted" });
  expect(await engine.execute(session(), draft)).toEqual({ code: "timeout" });
  expect(requests).toBe(0);
});

test("abort after dispatch is unknown and overlapping review is rejected", async () => {
  const started = Promise.withResolvers<AbortSignal>();
  const caller = new AbortController();
  const engine = createExecution({
    review: confirm,
    transmit: async (_session, _submission, signal) => {
      started.resolve(signal);
      return new Promise(() => {});
    },
  });
  const current = session();
  const pending = engine.execute(current, draft, caller.signal);
  const signal = await started.promise;
  expect(await engine.execute(current, draft)).toEqual({ code: "internal_error" });
  caller.abort();
  expect(await pending).toEqual({ code: "outcome_unknown" });
  expect(signal.aborted).toBe(true);
});

test("explicit retry reuses exact confirmed bytes and UUID without automatic resubmission", async () => {
  const sent: { eventId: string; body: string }[] = [];
  let generated = 0;
  let reviews = 0;
  const engine = createExecution({
    review: async (request) => {
      reviews++;
      if (reviews === 1) return confirm(request);
      if (reviews === 2) expect(request.retry?.eventId).toBe(sent[0]?.eventId);
      else expect(request.retry).toBeUndefined();
      if (request.retry) request.retry.feedback.title = "UI mutation must not alter retry";
      return { kind: "retry" };
    },
    transmit: async (_session, submission) => {
      sent.push(submission);
      return { code: "outcome_unknown" };
    },
    randomUUID: () => {
      generated++;
      return "12345678-1234-4234-8234-123456789abc";
    },
  });
  const current = session();
  expect(await engine.execute(current, draft)).toEqual({ code: "outcome_unknown" });
  expect(sent).toHaveLength(1);
  expect(await engine.execute(current, null)).toEqual({ code: "outcome_unknown" });
  expect(sent).toHaveLength(2);
  expect(sent[0]).toEqual(sent[1]);
  expect(generated).toBe(1);
  engine.clear();
  expect(await engine.execute(current, null)).toEqual({ code: "invalid_input" });
  expect(sent).toHaveLength(2);
});

test("confirming an edited report creates a new event instead of mutating the retained event", async () => {
  const ids: string[] = [];
  const engine = createExecution({
    review: async (request) => ({
      kind: "confirmed",
      feedback: { ...draft, title: request.retry ? "Edited report" : draft.title },
      context: request.context,
    }),
    transmit: async (_session, submission) => {
      ids.push(submission.eventId);
      return { code: "outcome_unknown" };
    },
  });
  const current = session();
  await engine.execute(current, draft);
  await engine.execute(current, null);
  expect(ids).toHaveLength(2);
  expect(ids[0]).not.toBe(ids[1]);
});

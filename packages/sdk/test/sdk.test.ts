import { expect, test } from "bun:test";
import {
  createSdk,
  type FilikaExecutionOutcome,
  type FilikaModelContextTool,
  REVIEW_EVENT,
  type ReviewEventDetail,
} from "../src";

const config = { projectKey: "demo", endpoint: "https://collector.example/api/v1/feedback" };
const draft = {
  kind: "bug",
  title: "Save failed",
  description: "Saving a draft returned an error.",
};
const accepted = (eventId: string) =>
  new Response(
    JSON.stringify({
      schemaVersion: 1,
      eventId,
      feedbackId: "87654321-4321-4321-8321-cba987654321",
      receivedAt: "2026-08-27T12:30:00.000Z",
      duplicate: false,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );

test("public manual API uses review in unsupported browsers and honors init/dispose status", async () => {
  const document = new EventTarget();
  let requests = 0;
  document.addEventListener(REVIEW_EVENT, (event) => {
    const detail = (event as CustomEvent<ReviewEventDetail>).detail;
    event.preventDefault();
    expect(detail.request.draft).toBeNull();
    detail.complete({ kind: "confirmed", feedback: draft, context: detail.request.context });
  });
  const sdk = createSdk({
    document,
    fetch: async (_url, init) => {
      requests++;
      const body = JSON.parse(String(init.body));
      return accepted(body.eventId);
    },
  });
  expect(await sdk.open()).toEqual({ code: "internal_error" });
  expect((await sdk.init(config)).status.state).toBe("unsupported_browser");
  expect((await sdk.open()).code).toBe("success");
  expect(requests).toBe(1);
  sdk.dispose();
  expect(sdk.status.state).toBe("disposed");
  expect(await sdk.open()).toEqual({ code: "aborted" });
});

test("missing review UI fails closed and invalid options never invoke review", async () => {
  let requests = 0;
  const sdk = createSdk({
    document: new EventTarget(),
    fetch: async () => {
      requests++;
      throw new Error("Must not send");
    },
  });
  await sdk.init(config);
  expect(await sdk.open()).toEqual({ code: "internal_error" });
  expect(await sdk.open({ signal: {} as AbortSignal })).toEqual({ code: "invalid_input" });
  expect(await Reflect.apply(sdk.open, sdk, [{ extra: true }])).toEqual({ code: "invalid_input" });
  expect(requests).toBe(0);
});

test("registered tools and manual API share review, safe transport, and lifetime", async () => {
  let tool: FilikaModelContextTool<FilikaExecutionOutcome> | undefined;
  const sdk = createSdk({
    document: {
      modelContext: {
        async registerTool(value: FilikaModelContextTool<FilikaExecutionOutcome>) {
          tool = value;
        },
      },
    },
    review: async (request) => ({
      kind: "confirmed",
      feedback: request.draft,
      context: request.context,
    }),
    fetch: async (_url, init) => accepted(JSON.parse(String(init.body)).eventId),
  });
  await sdk.init(config);
  if (!tool) throw new Error("Expected tool");
  const execution = { signal: new AbortController().signal };
  expect((await tool.execute(draft, execution)).code).toBe("success");
  expect(await tool.execute(null, execution)).toEqual({ code: "invalid_input" });
  sdk.dispose();
  expect(await tool.execute(draft, execution)).toEqual({ code: "aborted" });
});

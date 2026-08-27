import { expect, test } from "bun:test";
import { FEEDBACK_TOOL, type FilikaExecutionOutcome, type FilikaModelContextTool } from "../src";
import { detectModelContext } from "../src/model-context";
import { registerFeedbackTool } from "../src/registration";

test("detects only document.modelContext.registerTool, without legacy or ambient reads", () => {
  for (const value of [
    null,
    undefined,
    {},
    { modelContext: null },
    { modelContext: {} },
    { modelContext: { registerTool: true } },
    { navigator: { modelContext: { registerTool() {} } } },
  ]) {
    expect(detectModelContext(value)).toEqual({ state: "unsupported_browser" });
  }
  expect(detectModelContext({ modelContext: { registerTool() {} } }).state).toBe("available");
});

test("registers exact frozen metadata with an owned signal and preserves the native receiver", async () => {
  const controller = new AbortController();
  let tool: FilikaModelContextTool<FilikaExecutionOutcome> | undefined;
  const context = {
    async registerTool(
      value: FilikaModelContextTool<FilikaExecutionOutcome>,
      options: { signal: AbortSignal },
    ) {
      expect(this).toBe(context);
      expect(options.signal).toBe(controller.signal);
      tool = value;
    },
  };
  expect(
    await registerFeedbackTool({ modelContext: context }, controller, async () => ({
      code: "cancelled",
    })),
  ).toEqual({ state: "ready" });
  if (!tool) throw new Error("Missing registered tool");
  const { execute, ...metadata } = tool;
  expect(metadata).toEqual(FEEDBACK_TOOL);
  expect(metadata.inputSchema).not.toBe(FEEDBACK_TOOL.inputSchema);
  expect(await execute({}, { signal: new AbortController().signal })).toEqual({
    code: "cancelled",
  });
  controller.abort();
  expect(await execute({}, { signal: new AbortController().signal })).toEqual({ code: "aborted" });
});

test("waits for registration acceptance before reporting ready", async () => {
  const gate = Promise.withResolvers<void>();
  let settled = false;
  const pending = registerFeedbackTool(
    { modelContext: { registerTool: () => gate.promise } },
    new AbortController(),
    async () => ({ code: "cancelled" }),
  ).then((status) => {
    settled = true;
    return status;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  gate.resolve();
  expect(await pending).toEqual({ state: "ready" });
});

test("feature detection catches both document and method getter failures", () => {
  const error = new DOMException("private", "SecurityError");
  for (const document of [
    {
      get modelContext() {
        throw error;
      },
    },
    {
      modelContext: {
        get registerTool() {
          throw error;
        },
      },
    },
  ]) {
    expect(detectModelContext(document)).toEqual({ state: "registration_rejected", error });
  }
});

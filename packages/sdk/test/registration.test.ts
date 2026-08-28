import { expect, test } from "bun:test";
import { FEEDBACK_TOOL, type FilikaExecutionOutcome, type FilikaModelContextTool } from "../src";
import { detectModelContext } from "../src/model-context";
import { registerFeedbackTool, registrationDiagnostic } from "../src/registration";

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

test("browser metadata mutations cannot change subsequent registrations", async () => {
  const original = structuredClone(FEEDBACK_TOOL);
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    await registerFeedbackTool(
      {
        modelContext: {
          registerTool(tool: FilikaModelContextTool<FilikaExecutionOutcome>) {
            const { execute: _execute, ...metadata } = tool;
            expect(metadata).toEqual(original);
            Reflect.set(tool.inputSchema.properties.title, "maxLength", 999999);
            Reflect.set(tool.annotations, "readOnlyHint", true);
          },
        },
      },
      controller,
      async () => ({ code: "cancelled" }),
    );
    controller.abort();
  }
  expect(FEEDBACK_TOOL).toEqual(original);
});

test("registration failures expose only closed diagnostics and abort owned registration", async () => {
  for (const [name, diagnostic] of [
    ["InvalidStateError", "invalid_state"],
    ["SecurityError", "security_error"],
    ["NotAllowedError", "not_allowed"],
    ["UnexpectedError", "unknown_error"],
  ] as const) {
    for (const asyncFailure of [false, true]) {
      const controller = new AbortController();
      const error = new DOMException("private details", name);
      const result = await registerFeedbackTool(
        {
          modelContext: {
            registerTool() {
              if (asyncFailure) return Promise.reject(error);
              throw error;
            },
          },
        },
        controller,
        async () => ({ code: "cancelled" }),
      );
      expect(result).toEqual({ state: "registration_rejected", diagnostic });
      expect(controller.signal.aborted).toBe(true);
    }
  }
  expect(
    await registerFeedbackTool(
      {
        get modelContext() {
          throw {
            get name() {
              throw new Error("private");
            },
          };
        },
      },
      new AbortController(),
      async () => ({ code: "cancelled" }),
    ),
  ).toEqual({ state: "registration_rejected", diagnostic: "unknown_error" });
});

test("registration timeout and disposal settle even when the browser never settles", async () => {
  const gate = Promise.withResolvers<void>();
  const controller = new AbortController();
  expect(
    await registerFeedbackTool(
      { modelContext: { registerTool: () => gate.promise } },
      controller,
      async () => ({ code: "cancelled" }),
      5,
    ),
  ).toEqual({ state: "registration_rejected", diagnostic: "registration_timeout" });
  expect(controller.signal.aborted).toBe(true);
  gate.reject(new Error("late failure"));
  const disposing = new AbortController();
  const pending = registerFeedbackTool(
    { modelContext: { registerTool: () => new Promise(() => {}) } },
    disposing,
    async () => ({ code: "cancelled" }),
  );
  disposing.abort();
  expect(await pending).toEqual({ state: "disposed" });
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

test("disposal during feature detection never invokes registration", async () => {
  const controller = new AbortController();
  let calls = 0;
  expect(
    await registerFeedbackTool(
      {
        get modelContext() {
          controller.abort();
          return {
            registerTool() {
              calls++;
            },
          };
        },
      },
      controller,
      async () => ({ code: "cancelled" }),
    ),
  ).toEqual({ state: "disposed" });
  expect(calls).toBe(0);
});

test("diagnostics ignore primitives, hostile accessors, oversized names, and error messages", () => {
  for (const error of [
    null,
    undefined,
    "SecurityError",
    42,
    { name: "SecurityError".repeat(10000) },
    {
      name: {
        toString() {
          throw new Error("Must not coerce");
        },
      },
    },
    new Proxy(
      {},
      {
        get() {
          throw new Error("Private proxy failure");
        },
      },
    ),
  ])
    expect(registrationDiagnostic(error)).toBe("unknown_error");
  expect(
    registrationDiagnostic({
      name: "NotAllowedError",
      get message() {
        throw new Error("Must not read message");
      },
      get stack() {
        throw new Error("Must not read stack");
      },
    }),
  ).toBe("not_allowed");
});

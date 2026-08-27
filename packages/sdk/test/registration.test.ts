import { expect, test } from "bun:test";
import { detectModelContext } from "../src/model-context";

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

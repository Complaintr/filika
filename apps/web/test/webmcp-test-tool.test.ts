import { describe, expect, test } from "bun:test";

import { createLocalTestTool, LOCAL_TEST_TOOL_NAME } from "../src/webmcp-test-tool";

describe("local WebMCP test tool", () => {
  test("has a closed, input-free schema", () => {
    const tool = createLocalTestTool();

    expect(tool.name).toBe(LOCAL_TEST_TOOL_NAME);
    expect(tool.inputSchema).toEqual({
      additionalProperties: false,
      properties: {},
      type: "object",
    });
    expect(tool.annotations.readOnlyHint).toBe(true);
  });

  test("returns a bounded constant result and reports invocation", async () => {
    let invocations = 0;
    const tool = createLocalTestTool(() => {
      invocations += 1;
    });

    await expect(tool.execute()).resolves.toEqual({
      content: [
        {
          text: "Filika localhost WebMCP test completed successfully.",
          type: "text",
        },
      ],
    });
    expect(invocations).toBe(1);
  });
});

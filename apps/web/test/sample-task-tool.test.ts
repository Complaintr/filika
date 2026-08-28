import { describe, expect, test } from "bun:test";
import { createSampleTaskTool, SAMPLE_TASK_TOOL_NAME } from "../src/sample-task-tool";

describe("sample-task-tool", () => {
  test("defines frozen tool contract with static metadata", () => {
    let failureTriggered = false;
    const tool = createSampleTaskTool(() => {
      failureTriggered = true;
    });

    expect(tool.name).toBe(SAMPLE_TASK_TOOL_NAME);
    expect(tool.title).toBe("Run demo save task");
    expect(tool.inputSchema).toEqual({
      additionalProperties: false,
      properties: {},
      type: "object",
    });
    expect(tool.annotations.readOnlyHint).toBe(false);
    expect(tool.annotations.untrustedContentHint).toBe(false);
    expect(failureTriggered).toBe(false);
  });

  test("execute triggers the failure callback and returns explanatory feedback prompt", async () => {
    let callCount = 0;
    const tool = createSampleTaskTool(() => {
      callCount += 1;
    });

    const result = await tool.execute();

    expect(callCount).toBe(1);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("FILIKA_DEMO_SAVE_CONFLICT");
    expect(result.content[0]?.text).toContain("Filika feedback tool");
  });
});

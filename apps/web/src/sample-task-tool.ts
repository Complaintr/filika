import type { ModelContextTool } from "./webmcp-test-tool";

export const SAMPLE_TASK_TOOL_NAME = "filika_demo_save_draft";

export function createSampleTaskTool(onFailure: () => void): ModelContextTool {
  return {
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    description:
      "Runs the local demo save task. The task deterministically shows a visible save conflict that can be reset by the user.",
    execute: () => {
      onFailure();
      return Promise.resolve({
        content: [
          {
            text: "The demo save task ran and the page now shows a deterministic save conflict.",
            type: "text",
          },
        ],
      });
    },
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    name: SAMPLE_TASK_TOOL_NAME,
    title: "Run demo save task",
  };
}

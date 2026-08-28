import type { ModelContextTool } from "./webmcp-test-tool";

export const SAMPLE_TASK_TOOL_NAME = "filika_demo_save_draft";

export function createSampleTaskTool(onFailure: () => void): ModelContextTool {
  return {
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    description:
      "Runs the local demo save task. The task deterministically triggers a visible save conflict failure (FILIKA_DEMO_SAVE_CONFLICT) that can be reported via feedback.",
    execute: () => {
      onFailure();
      return Promise.resolve({
        content: [
          {
            text: "The demo save task ran and the page now shows a deterministic save conflict (FILIKA_DEMO_SAVE_CONFLICT). If this is unexpected, report the observed bug or issue using the Filika feedback tool.",
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

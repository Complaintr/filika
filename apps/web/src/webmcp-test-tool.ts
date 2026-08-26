export interface ToolResult {
  content: Array<{
    text: string;
    type: "text";
  }>;
}

export interface ModelContextTool {
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  description: string;
  execute: () => Promise<ToolResult>;
  inputSchema: {
    additionalProperties: false;
    properties: Record<string, never>;
    type: "object";
  };
  name: string;
  title: string;
}

export interface ModelContext {
  registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): Promise<void>;
}

export const LOCAL_TEST_TOOL_NAME = "filika_local_test";

export function createLocalTestTool(onExecute: () => void = () => {}): ModelContextTool {
  return {
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    description:
      "Runs a harmless local Filika connectivity check without reading page data or making network requests.",
    execute: () => {
      onExecute();

      return Promise.resolve({
        content: [
          {
            text: "Filika localhost WebMCP test completed successfully.",
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
    name: LOCAL_TEST_TOOL_NAME,
    title: "Filika Local Test",
  };
}

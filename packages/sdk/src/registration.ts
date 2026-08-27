import type { FilikaStatus } from "./lifecycle";
import { detectModelContext } from "./model-context";
import type { FilikaExecutionOutcome } from "./receipt";
import { FEEDBACK_TOOL, type FilikaModelContextTool } from "./tool";

export type ToolExecutor = FilikaModelContextTool<FilikaExecutionOutcome>["execute"];

export async function registerFeedbackTool(
  document: unknown,
  controller: AbortController,
  execute: ToolExecutor,
): Promise<FilikaStatus> {
  try {
    if (controller.signal.aborted) return { state: "disposed" };
    const detected = detectModelContext(document);
    if (detected.state === "unsupported_browser") return detected;
    if (detected.state === "registration_rejected") throw detected.error;
    await detected.context.registerTool(
      {
        ...FEEDBACK_TOOL,
        // Give the browser a fresh schema; caller mutations cannot change the contract.
        inputSchema: structuredClone(FEEDBACK_TOOL.inputSchema),
        annotations: { ...FEEDBACK_TOOL.annotations },
        async execute(input, options) {
          if (controller.signal.aborted) return { code: "aborted" };
          try {
            return await execute(input, options);
          } catch {
            return { code: "internal_error" };
          }
        },
      },
      { signal: controller.signal },
    );
    return controller.signal.aborted ? { state: "disposed" } : { state: "ready" };
  } catch {
    controller.abort();
    return { state: "registration_rejected", diagnostic: "unknown_error" };
  }
}

import type { FilikaRegistrationDiagnostic, FilikaStatus } from "./lifecycle";
import { detectModelContext } from "./model-context";
import { EXECUTION_LIMITS } from "./outcomes";
import type { FilikaExecutionOutcome } from "./receipt";
import { FEEDBACK_TOOL, type FilikaModelContextTool } from "./tool";

export type ToolExecutor = FilikaModelContextTool<FilikaExecutionOutcome>["execute"];

export function registrationDiagnostic(error: unknown): FilikaRegistrationDiagnostic {
  try {
    const name: unknown =
      typeof error === "object" && error !== null ? Reflect.get(error, "name") : null;
    if (name === "InvalidStateError") return "invalid_state";
    if (name === "SecurityError") return "security_error";
    if (name === "NotAllowedError") return "not_allowed";
  } catch {
    /* Untrusted error accessors must not escape. */
  }
  return "unknown_error";
}

export async function registerFeedbackTool(
  document: unknown,
  controller: AbortController,
  execute: ToolExecutor,
  timeoutMs: number = EXECUTION_LIMITS.registrationTimeoutMs,
): Promise<FilikaStatus> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stop: (() => void) | undefined;
  try {
    if (controller.signal.aborted) return { state: "disposed" };
    const detected = detectModelContext(document);
    // A native getter may synchronously trigger disposal during detection.
    if (controller.signal.aborted) return { state: "disposed" };
    if (detected.state === "unsupported_browser") return detected;
    if (detected.state === "registration_rejected") throw detected.error;
    const aborted = new Promise<never>((_, reject) => {
      stop = () => reject(new Error("Registration stopped"));
      controller.signal.addEventListener("abort", stop, { once: true });
      timer = setTimeout(() => {
        expired = true;
        controller.abort();
      }, timeoutMs);
    });
    await Promise.race([
      aborted,
      detected.context.registerTool(
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
      ),
    ]);
    return controller.signal.aborted ? { state: "disposed" } : { state: "ready" };
  } catch (error) {
    const disposed = controller.signal.aborted && !expired;
    controller.abort();
    return disposed
      ? { state: "disposed" }
      : {
          state: "registration_rejected",
          diagnostic: expired ? "registration_timeout" : registrationDiagnostic(error),
        };
  } finally {
    clearTimeout(timer);
    if (stop) controller.signal.removeEventListener("abort", stop);
  }
}

import type { FilikaExecutionOutcome } from "./receipt";
import type { FilikaModelContext } from "./tool";

export type ModelContextDetection =
  | { state: "available"; context: FilikaModelContext<FilikaExecutionOutcome> }
  | { state: "unsupported_browser" }
  | { state: "registration_rejected"; error: unknown };

export function detectModelContext(document: unknown): ModelContextDetection {
  try {
    if (typeof document !== "object" || document === null) return { state: "unsupported_browser" };
    const context: unknown = Reflect.get(document, "modelContext");
    if (typeof context !== "object" || context === null) return { state: "unsupported_browser" };
    const register: unknown = Reflect.get(context, "registerTool");
    if (typeof register !== "function") return { state: "unsupported_browser" };
    return {
      state: "available",
      context: {
        async registerTool(tool, options) {
          // Preserve the native receiver without exposing its other properties.
          await Reflect.apply(register, context, [tool, options]);
        },
      },
    };
  } catch (error) {
    return { state: "registration_rejected", error };
  }
}

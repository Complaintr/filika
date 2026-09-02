import { createExecution, type ExecutionDependencies } from "./execution";
import type { FilikaOpenOptions, FilikaPublicApi } from "./lifecycle";
import type { FilikaExecutionOutcome } from "./receipt";
import { createRuntime } from "./runtime";
import { createTransport, type Fetcher } from "./transport";
import { version } from "./version";

export interface SdkDependencies {
  document: unknown;
  development?: boolean;
  review?: ExecutionDependencies["review"];
  fetch?: Fetcher;
}

/**
 * Default review adapter: agent-authored feedback is transmitted without a
 * user review step. The draft is confirmed as-is, so a WebMCP tool call
 * reaches the collector immediately.
 */
async function autoConfirmReview(
  request: Parameters<ExecutionDependencies["review"]>[0],
): Promise<unknown> {
  return { kind: "confirmed", feedback: request.draft, context: request.context };
}

function parseSignalOptions(input: unknown, required: boolean): FilikaOpenOptions | null {
  // WebMCP treats the execute options signal as optional, and host bridges may
  // omit options entirely. A missing signal simply means the caller cannot
  // cancel; the session abort scope still applies.
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return required ? null : {};
  }
  if (!Object.hasOwn(input, "signal")) return required ? null : {};
  const descriptor = Object.getOwnPropertyDescriptor(input, "signal");
  if (!descriptor || !("value" in descriptor)) return required ? null : {};
  const signal = descriptor.value;
  if (signal === undefined) return required ? null : {};
  try {
    // Brand-check via the native getter; do not accept duck-typed fake signals.
    const getter = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted")?.get;
    if (!getter || typeof getter.call(signal) !== "boolean") return null;
  } catch {
    return null;
  }
  return { signal: signal as AbortSignal };
}

export function createSdk(dependencies: SdkDependencies): FilikaPublicApi {
  const execution = createExecution({
    review: dependencies.review ?? autoConfirmReview,
    transmit: createTransport(dependencies.fetch),
  });
  const runtime = createRuntime({
    document: dependencies.document,
    ...(dependencies.development === undefined ? {} : { development: dependencies.development }),
    execute(session, input, options) {
      const parsed = parseSignalOptions(options, false);
      if (!parsed || input === null) return Promise.resolve({ code: "invalid_input" });
      return execution.execute(session, input, parsed.signal);
    },
    onDispose: execution.clear,
  });
  return Object.freeze({
    version,
    get status() {
      return runtime.status;
    },
    init: runtime.init,
    dispose: runtime.dispose,
    async open(options: FilikaOpenOptions = {}): Promise<FilikaExecutionOutcome> {
      try {
        const parsed = parseSignalOptions(options, false);
        if (!parsed) return { code: "invalid_input" };
        const state = runtime.status.state;
        if (state === "disposed" || parsed.signal?.aborted) return { code: "aborted" };
        if (state === "invalid_configuration") return { code: "invalid_input" };
        if (state === "initializing" || !runtime.session) return { code: "internal_error" };
        return await execution.execute(runtime.session, null, parsed.signal);
      } catch {
        return { code: "internal_error" };
      }
    },
  });
}

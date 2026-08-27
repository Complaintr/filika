import { createExecution, type ExecutionDependencies } from "./execution";
import type { FilikaOpenOptions, FilikaPublicApi } from "./lifecycle";
import type { FilikaExecutionOutcome } from "./receipt";
import { createReviewBridge } from "./review-bridge";
import { createRuntime } from "./runtime";
import { createTransport, type Fetcher } from "./transport";
import { closedRecord } from "./validation";
import { version } from "./version";

export interface SdkDependencies {
  document: unknown;
  development?: boolean;
  review?: ExecutionDependencies["review"];
  fetch?: Fetcher;
}

function parseSignalOptions(input: unknown, required: boolean): FilikaOpenOptions | null {
  const value = closedRecord(input, ["signal"]);
  if (!value) return null;
  if (!Object.hasOwn(value, "signal")) return required ? null : {};
  try {
    // Brand-check via the native getter; do not accept duck-typed fake signals.
    const getter = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted")?.get;
    if (!getter || typeof getter.call(value.signal) !== "boolean") return null;
    return { signal: value.signal as AbortSignal };
  } catch {
    return null;
  }
}

export function createSdk(dependencies: SdkDependencies): FilikaPublicApi {
  const execution = createExecution({
    review: dependencies.review ?? createReviewBridge(dependencies.document),
    transmit: createTransport(dependencies.fetch),
  });
  const runtime = createRuntime({
    document: dependencies.document,
    ...(dependencies.development === undefined ? {} : { development: dependencies.development }),
    execute(session, input, options) {
      const parsed = parseSignalOptions(options, true);
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

import type { FilikaConfig } from "./config";
import { parseConfig } from "./config-validation";
import type { FilikaInitializationResult, FilikaStatus } from "./lifecycle";
import { registerFeedbackTool, type ToolExecutor } from "./registration";

export interface RuntimeSession {
  readonly config: Readonly<FilikaConfig>;
  readonly signal: AbortSignal;
}

export interface RuntimeOptions {
  document: unknown;
  development?: boolean;
  execute: (session: RuntimeSession, ...args: Parameters<ToolExecutor>) => ReturnType<ToolExecutor>;
  onDispose?: () => void;
}

export function createRuntime(options: RuntimeOptions) {
  let status: FilikaStatus = { state: "uninitialized" };
  let session: RuntimeSession | null = null;
  let controller: AbortController | null = null;
  let pending: Promise<FilikaInitializationResult> | null = null;

  function init(input: unknown): Promise<FilikaInitializationResult> {
    const config = parseConfig(input, options.development);
    if (!config) {
      if (!session) status = { state: "invalid_configuration" };
      return Promise.resolve({ code: "invalid_configuration", status: { ...status } });
    }
    if (session) {
      const same =
        (Object.keys(config) as (keyof FilikaConfig)[]).every(
          (key) => config[key] === session?.config[key],
        ) && Object.keys(config).length === Object.keys(session.config).length;
      if (!same) return Promise.resolve({ code: "configuration_conflict", status: { ...status } });
      return pending ?? Promise.resolve({ code: "already_initialized", status: { ...status } });
    }
    const lifetime = new AbortController();
    const registration = new AbortController();
    const stop = () => registration.abort();
    lifetime.signal.addEventListener("abort", stop, { once: true });
    const current: RuntimeSession = Object.freeze({ config, signal: lifetime.signal });
    controller = lifetime;
    session = current;
    status = { state: "initializing" };
    pending = Promise.resolve().then(async (): Promise<FilikaInitializationResult> => {
      const result = await registerFeedbackTool(
        options.document,
        registration,
        (input, execution) => options.execute(current, input, execution),
      );
      if (result.state !== "ready") lifetime.signal.removeEventListener("abort", stop);
      if (session !== current || lifetime.signal.aborted)
        return { code: "disposed", status: { state: "disposed" } };
      status = result;
      pending = null;
      return { code: "initialized", status: { ...status } };
    });
    return pending;
  }

  function dispose(): void {
    const previous = controller;
    controller = null;
    session = null;
    pending = null;
    status = { state: "disposed" };
    previous?.abort();
    try {
      options.onDispose?.();
    } catch {
      /* Host cleanup errors stay local. */
    }
  }

  return {
    init,
    dispose,
    get status(): Readonly<FilikaStatus> {
      return Object.freeze({ ...status });
    },
    get session() {
      return session;
    },
  };
}

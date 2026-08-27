import type { FilikaConfig } from "./config";
import type { FilikaExecutionOutcome } from "./receipt";

export const INITIALIZATION_STATUSES = [
  "uninitialized",
  "initializing",
  "ready",
  "unsupported_browser",
  "registration_rejected",
  "invalid_configuration",
  "disposed",
] as const;

export type FilikaInitializationStatus = (typeof INITIALIZATION_STATUSES)[number];

export const REGISTRATION_DIAGNOSTICS = [
  "invalid_state",
  "security_error",
  "not_allowed",
  "registration_timeout",
  "unknown_error",
] as const;

export type FilikaRegistrationDiagnostic = (typeof REGISTRATION_DIAGNOSTICS)[number];

export type FilikaStatus =
  | { state: Exclude<FilikaInitializationStatus, "registration_rejected"> }
  | { state: "registration_rejected"; diagnostic: FilikaRegistrationDiagnostic };

export type FilikaInitializationResult =
  | { code: "initialized" | "already_initialized"; status: FilikaStatus }
  | { code: "invalid_configuration" | "configuration_conflict" | "disposed"; status: FilikaStatus };

export interface FilikaOpenOptions {
  signal?: AbortSignal;
}

/** Phase 2 runtime surface; Phase 1 exports contracts without starting a runtime. */
export interface FilikaPublicApi {
  readonly version: string;
  readonly status: Readonly<FilikaStatus>;
  init(config: FilikaConfig): Promise<FilikaInitializationResult>;
  open(options?: FilikaOpenOptions): Promise<FilikaExecutionOutcome>;
  dispose(): void;
}

export const LIFECYCLE_TRANSITIONS = {
  uninitialized: {
    initialize: "initializing",
    invalid_config: "invalid_configuration",
    dispose: "disposed",
  },
  initializing: {
    registered: "ready",
    unsupported: "unsupported_browser",
    rejected: "registration_rejected",
    dispose: "disposed",
  },
  ready: { dispose: "disposed" },
  unsupported_browser: { dispose: "disposed" },
  registration_rejected: { dispose: "disposed" },
  invalid_configuration: {
    initialize: "initializing",
    invalid_config: "invalid_configuration",
    dispose: "disposed",
  },
  disposed: {
    initialize: "initializing",
    invalid_config: "invalid_configuration",
    dispose: "disposed",
  },
} as const satisfies Record<
  FilikaInitializationStatus,
  Readonly<Record<string, FilikaInitializationStatus>>
>;

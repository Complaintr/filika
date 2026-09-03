export const EXECUTION_OUTCOME_CODES = [
  "success",
  "invalid_input",
  "cancelled",
  "timeout",
  "aborted",
  "collector_rejected",
  "internal_error",
  "outcome_unknown",
] as const;

export type FilikaExecutionOutcomeCode = (typeof EXECUTION_OUTCOME_CODES)[number];
export type FilikaFailureCode = Exclude<FilikaExecutionOutcomeCode, "success">;

export interface FilikaFailureOutcome {
  code: FilikaFailureCode;
}

export const EXECUTION_LIMITS = {
  reviewTimeoutMs: 120_000,
  requestTimeoutMs: 10_000,
  registrationTimeoutMs: 5_000,
  receiptBytes: 1_024,
  outcomeBytes: 4_096,
} as const;

export const FAILURE_OUTCOME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: {
    code: { type: "string", enum: EXECUTION_OUTCOME_CODES.filter((code) => code !== "success") },
  },
} as const;

export const EXECUTION_OUTCOME_RULES = {
  success: "A validated receipt confirms acceptance; duplicate receipts also use success.",
  invalid_input: "Draft validation failed before transmission; no request was dispatched.",
  cancelled: "The user cancelled review before transmission; no request was dispatched.",
  timeout: "Review expired before transmission; no request was dispatched.",
  aborted: "Execution was aborted before transmission; no request was dispatched.",
  collector_rejected:
    "The collector returned a documented rejection that guarantees no acceptance.",
  internal_error: "A local failure occurred before transmission; no request was dispatched.",
  outcome_unknown: "A request was dispatched but acceptance or rejection could not be confirmed.",
} as const satisfies Record<FilikaExecutionOutcomeCode, string>;

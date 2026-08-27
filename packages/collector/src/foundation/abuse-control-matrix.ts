export const ABUSE_CONTROL_SCENARIO_IDS = [
  "missing_origin",
  "null_origin",
  "denied_origin",
  "oversized_body",
  "invalid_project_key",
  "repeated_event_id",
] as const;

export type AbuseControlScenarioId = (typeof ABUSE_CONTROL_SCENARIO_IDS)[number];

export interface AbuseControlScenario {
  dbState: string;
  errorCategory: string | null;
  httpStatus: number;
  id: AbuseControlScenarioId;
  logBehavior: string;
  requestCharacteristics: string;
  scenario: string;
}

export const ABUSE_CONTROL_MATRIX: readonly AbuseControlScenario[] = [
  {
    dbState: "No row written.",
    errorCategory: "denied_origin",
    httpStatus: 403,
    id: "missing_origin",
    logBehavior: "Outcome and category, no body content.",
    requestCharacteristics: "POST /api/v1/feedback with no Origin header.",
    scenario: "Missing origin",
  },
  {
    dbState: "No row written.",
    errorCategory: "denied_origin",
    httpStatus: 403,
    id: "null_origin",
    logBehavior: "Outcome and category, no body content.",
    requestCharacteristics: "Origin: null.",
    scenario: "Null origin",
  },
  {
    dbState: "No row written.",
    errorCategory: "denied_origin",
    httpStatus: 403,
    id: "denied_origin",
    logBehavior: "Outcome and category, origin role only.",
    requestCharacteristics: "Origin from a host not on the project allowlist.",
    scenario: "Denied origin",
  },
  {
    dbState: "No row written.",
    errorCategory: "payload_too_large",
    httpStatus: 413,
    id: "oversized_body",
    logBehavior: "Rejection before parse; size category only.",
    requestCharacteristics: "Body over the documented bound, including a bound-plus-one case.",
    scenario: "Oversized body",
  },
  {
    dbState: "No row written.",
    errorCategory: "project_not_found",
    httpStatus: 400,
    id: "invalid_project_key",
    logBehavior: "Outcome and category, no body content.",
    requestCharacteristics: "Well-formed request with an unknown or malformed projectKey.",
    scenario: "Invalid project key",
  },
  {
    dbState: "Original row unchanged; no second row.",
    errorCategory: null,
    httpStatus: 200,
    id: "repeated_event_id",
    logBehavior: "Outcome and identifiers only.",
    requestCharacteristics: "Same eventId and Idempotency-Key resubmitted after an accepted row.",
    scenario: "Repeated event ID",
  },
];

export const ABUSE_CONTROL_CROSS_CUTTING = [
  "Every rejection returns a bounded response and never echoes report content.",
  "Logs contain no full report body, raw IP, token, or unapproved header.",
  "Null and missing origins are rejected before parsing or persistence.",
  "The oversized-body bound holds before JSON parsing.",
  "Idempotency is atomic under the unique constraint and returns the original receipt.",
] as const;

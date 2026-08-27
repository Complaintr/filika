export const COLLECTOR_SEQUENCE_STEP_IDS = [
  "cors_preflight",
  "read_origin",
  "reject_invalid_origin",
  "enforce_body_size",
  "enforce_content_type",
  "parse_json",
  "verify_idempotency_key",
  "validate_envelope",
  "resolve_project",
  "check_rate_limit",
  "persist_transaction",
  "resolve_duplicate",
  "build_receipt",
] as const;

export type CollectorSequenceStepId = (typeof COLLECTOR_SEQUENCE_STEP_IDS)[number];

export interface CollectorSequenceStep {
  id: CollectorSequenceStepId;
  title: string;
}

export const COLLECTOR_SEQUENCE_STEPS: readonly CollectorSequenceStep[] = [
  {
    id: "cors_preflight",
    title: "Validate the preflight origin, methods, and headers; respond with Vary: Origin.",
  },
  {
    id: "read_origin",
    title: "Read the Origin header from the request.",
  },
  {
    id: "reject_invalid_origin",
    title: "Reject missing, null, or denied origins before any ingest work.",
  },
  {
    id: "enforce_body_size",
    title: "Enforce the body-size bound before parsing.",
  },
  {
    id: "enforce_content_type",
    title: "Enforce the strict content type.",
  },
  {
    id: "parse_json",
    title: "Parse JSON in a bounded way.",
  },
  {
    id: "verify_idempotency_key",
    title: "Require Idempotency-Key to equal eventId.",
  },
  {
    id: "validate_envelope",
    title: "Validate the V1 envelope: sizes, required fields, unknown-field rejection.",
  },
  {
    id: "resolve_project",
    title: "Resolve the project by key.",
  },
  {
    id: "check_rate_limit",
    title: "Check the atomic durable rate limit.",
  },
  {
    id: "persist_transaction",
    title: "Insert transactionally under the unique (project_id, event_id) constraint.",
  },
  {
    id: "resolve_duplicate",
    title: "On a unique violation, fetch the stored receipt and mark duplicate.",
  },
  {
    id: "build_receipt",
    title: "Build the receipt from server-derived fields only.",
  },
];

export const COLLECTOR_RESPONSE_CONTRACT = {
  accepted: {
    body: "Receipt with server-derived fields.",
    httpStatus: 201,
  },
  denied_origin: {
    body: "Error category plus a bounded message.",
    httpStatus: 403,
  },
  duplicate_retry: {
    body: "Original stored receipt with duplicate: true.",
    httpStatus: 200,
  },
  internal_error: {
    body: "Generic bounded message.",
    httpStatus: 500,
  },
  invalid_input: {
    body: "Error category plus a bounded message.",
    httpStatus: 400,
  },
  payload_too_large: {
    body: "Error category.",
    httpStatus: 413,
  },
  project_not_found: {
    body: "Error category plus a bounded message.",
    httpStatus: 400,
  },
} as const;

export const COLLECTOR_ERROR_TO_OUTCOME = {
  denied_origin: "collector_rejected",
  internal_error: "internal_error",
  invalid_input: "invalid_input",
  payload_too_large: "collector_rejected",
  project_not_found: "collector_rejected",
} as const;

export const DUPLICATE_OUTCOME = "success" as const;

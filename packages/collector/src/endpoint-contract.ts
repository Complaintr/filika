import {
  COLLECTOR_ERROR_TO_OUTCOME,
  COLLECTOR_RESPONSE_CONTRACT,
} from "./foundation/collector-sequence";

export const FEEDBACK_ENDPOINT = "/api/v1/feedback" as const;
export const FEEDBACK_ENDPOINT_METHODS = ["POST", "OPTIONS"] as const;
export const FEEDBACK_CONTENT_TYPE = "application/json" as const;
export const FEEDBACK_MAX_BODY_BYTES = 65_536 as const;
export const FEEDBACK_ALLOWED_HEADERS = ["Content-Type", "Idempotency-Key"] as const;
export const IDEMPOTENCY_HEADER = "Idempotency-Key" as const;
export const CORS_VARY_ORIGIN = "Origin" as const;

export const FEEDBACK_ERROR_CATEGORIES = [
  "invalid_input",
  "denied_origin",
  "payload_too_large",
  "project_not_found",
  "rate_limited",
  "internal_error",
] as const;

export type FeedbackErrorCategory = (typeof FEEDBACK_ERROR_CATEGORIES)[number];

export const CORS_CONTRACT = {
  allowedHeaders: FEEDBACK_ALLOWED_HEADERS,
  allowedMethods: FEEDBACK_ENDPOINT_METHODS,
  varyOn: CORS_VARY_ORIGIN,
} as const;

export function isOversizedBody(bodySizeBytes: number): boolean {
  return bodySizeBytes > FEEDBACK_MAX_BODY_BYTES;
}

export function isIdempotencyKeyMatching(eventId: string, idempotencyKey: string | null): boolean {
  return idempotencyKey !== null && idempotencyKey === eventId;
}

export { COLLECTOR_ERROR_TO_OUTCOME, COLLECTOR_RESPONSE_CONTRACT };

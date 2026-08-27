import { describe, expect, test } from "bun:test";

import {
  COLLECTOR_ERROR_TO_OUTCOME,
  COLLECTOR_RESPONSE_CONTRACT,
  CORS_CONTRACT,
  CORS_VARY_ORIGIN,
  FEEDBACK_ALLOWED_HEADERS,
  FEEDBACK_CONTENT_TYPE,
  FEEDBACK_ENDPOINT,
  FEEDBACK_ENDPOINT_METHODS,
  FEEDBACK_ERROR_CATEGORIES,
  FEEDBACK_MAX_BODY_BYTES,
  IDEMPOTENCY_HEADER,
  isIdempotencyKeyMatching,
  isOversizedBody,
} from "../src/endpoint-contract";

describe("P1-BE-04 feedback endpoint contract", () => {
  test("pins the endpoint path and methods", () => {
    expect(FEEDBACK_ENDPOINT).toBe("/api/v1/feedback");
    expect(FEEDBACK_ENDPOINT_METHODS).toEqual(["POST", "OPTIONS"]);
    expect(FEEDBACK_CONTENT_TYPE).toBe("application/json");
  });

  test("pins the CORS preflight contract", () => {
    expect(CORS_CONTRACT.allowedMethods).toEqual(["POST", "OPTIONS"]);
    expect(CORS_CONTRACT.allowedHeaders).toEqual(["Content-Type", "Idempotency-Key"]);
    expect(CORS_CONTRACT.varyOn).toBe(CORS_VARY_ORIGIN);
    expect(FEEDBACK_ALLOWED_HEADERS).toContain("Content-Type");
    expect(FEEDBACK_ALLOWED_HEADERS).toContain(IDEMPOTENCY_HEADER);
  });

  test("enforces the body-size bound before parsing", () => {
    expect(isOversizedBody(FEEDBACK_MAX_BODY_BYTES)).toBe(false);
    expect(isOversizedBody(FEEDBACK_MAX_BODY_BYTES + 1)).toBe(true);
  });

  test("requires Idempotency-Key to equal eventId", () => {
    const eventId = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";

    expect(isIdempotencyKeyMatching(eventId, eventId)).toBe(true);
    expect(isIdempotencyKeyMatching(eventId, "other")).toBe(false);
    expect(isIdempotencyKeyMatching(eventId, null)).toBe(false);
  });

  test("covers every closed error category", () => {
    expect(FEEDBACK_ERROR_CATEGORIES).toEqual([
      "invalid_input",
      "denied_origin",
      "payload_too_large",
      "project_not_found",
      "internal_error",
    ]);
  });

  test("maps every error category to a bounded HTTP status", () => {
    expect(COLLECTOR_RESPONSE_CONTRACT.invalid_input.httpStatus).toBe(400);
    expect(COLLECTOR_RESPONSE_CONTRACT.denied_origin.httpStatus).toBe(403);
    expect(COLLECTOR_RESPONSE_CONTRACT.payload_too_large.httpStatus).toBe(413);
    expect(COLLECTOR_RESPONSE_CONTRACT.project_not_found.httpStatus).toBe(400);
    expect(COLLECTOR_RESPONSE_CONTRACT.internal_error.httpStatus).toBe(500);
    expect(COLLECTOR_RESPONSE_CONTRACT.accepted.httpStatus).toBe(201);
    expect(COLLECTOR_RESPONSE_CONTRACT.duplicate_retry.httpStatus).toBe(200);
  });

  test("maps error categories to the frozen SDK outcomes", () => {
    expect(COLLECTOR_ERROR_TO_OUTCOME.invalid_input).toBe("invalid_input");
    expect(COLLECTOR_ERROR_TO_OUTCOME.denied_origin).toBe("collector_rejected");
    expect(COLLECTOR_ERROR_TO_OUTCOME.payload_too_large).toBe("collector_rejected");
    expect(COLLECTOR_ERROR_TO_OUTCOME.project_not_found).toBe("collector_rejected");
    expect(COLLECTOR_ERROR_TO_OUTCOME.internal_error).toBe("internal_error");
  });
});

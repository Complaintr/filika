import { describe, expect, test } from "bun:test";

import {
  COLLECTOR_ERROR_TO_OUTCOME,
  COLLECTOR_RESPONSE_CONTRACT,
  COLLECTOR_SEQUENCE_STEP_IDS,
  COLLECTOR_SEQUENCE_STEPS,
  DUPLICATE_OUTCOME,
} from "../src/foundation/collector-sequence";

describe("P0-BE-04 collector request sequence", () => {
  test("keeps the sequence stable and complete", () => {
    expect(COLLECTOR_SEQUENCE_STEPS.map((step) => step.id)).toEqual(COLLECTOR_SEQUENCE_STEP_IDS);
  });

  test("validates the origin before any body work", () => {
    const originStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("reject_invalid_origin");
    const bodyStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("enforce_body_size");
    const parseStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("parse_json");

    expect(originStep).toBeLessThan(bodyStep);
    expect(bodyStep).toBeLessThan(parseStep);
  });

  test("enforces idempotency before validation and persistence", () => {
    const idempotencyStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("verify_idempotency_key");
    const validationStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("validate_envelope");
    const persistStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("persist_transaction");

    expect(idempotencyStep).toBeLessThan(validationStep);
    expect(idempotencyStep).toBeLessThan(persistStep);
  });

  test("resolves duplicates against the unique constraint before building a receipt", () => {
    const persistStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("persist_transaction");
    const duplicateStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("resolve_duplicate");
    const receiptStep = COLLECTOR_SEQUENCE_STEP_IDS.indexOf("build_receipt");

    expect(persistStep).toBeLessThan(duplicateStep);
    expect(duplicateStep).toBeLessThan(receiptStep);
  });

  test("maps response outcomes to the documented HTTP contract", () => {
    expect(COLLECTOR_RESPONSE_CONTRACT.accepted.httpStatus).toBe(201);
    expect(COLLECTOR_RESPONSE_CONTRACT.duplicate_retry.httpStatus).toBe(200);
    expect(COLLECTOR_RESPONSE_CONTRACT.invalid_input.httpStatus).toBe(400);
    expect(COLLECTOR_RESPONSE_CONTRACT.denied_origin.httpStatus).toBe(403);
    expect(COLLECTOR_RESPONSE_CONTRACT.payload_too_large.httpStatus).toBe(413);
    expect(COLLECTOR_RESPONSE_CONTRACT.project_not_found.httpStatus).toBe(400);
    expect(COLLECTOR_RESPONSE_CONTRACT.internal_error.httpStatus).toBe(500);
  });

  test("maps every collector error category to the frozen SDK outcome", () => {
    expect(COLLECTOR_ERROR_TO_OUTCOME.invalid_input).toBe("invalid_input");
    expect(COLLECTOR_ERROR_TO_OUTCOME.denied_origin).toBe("collector_rejection");
    expect(COLLECTOR_ERROR_TO_OUTCOME.payload_too_large).toBe("collector_rejection");
    expect(COLLECTOR_ERROR_TO_OUTCOME.project_not_found).toBe("collector_rejection");
    expect(COLLECTOR_ERROR_TO_OUTCOME.internal_error).toBe("internal_error");
    expect(DUPLICATE_OUTCOME).toBe("success");
  });

  test("never echoes the submitted report or internal identifiers in responses", () => {
    const bodies = Object.values(COLLECTOR_RESPONSE_CONTRACT).map((contract) => contract.body);

    for (const body of bodies) {
      expect(body).not.toMatch(/report body/i);
      expect(body).not.toMatch(/internal/i);
    }
  });
});

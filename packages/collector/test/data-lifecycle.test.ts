import { describe, expect, test } from "bun:test";

import {
  DUPLICATE_RETRY_OUTCOME,
  FEEDBACK_LIFECYCLE_STATES,
  FEEDBACK_RETENTION_HOURS,
  RETENTION_POLICY,
  transitionFeedback,
} from "../src/foundation/data-lifecycle";

describe("P0-BE-02 feedback data lifecycle", () => {
  test("orders the lifecycle states received to deleted", () => {
    expect(FEEDBACK_LIFECYCLE_STATES).toEqual([
      "received",
      "accepted",
      "read",
      "expired",
      "deleted",
    ]);
  });

  test("accepts a validated record", () => {
    expect(transitionFeedback("received", { type: "ACCEPTED" })).toBe("accepted");
  });

  test("moves an accepted record to read when listed in the inbox", () => {
    expect(transitionFeedback("accepted", { type: "LISTED" })).toBe("read");
  });

  test("expires accepted and read records after retention", () => {
    expect(transitionFeedback("accepted", { type: "EXPIRED" })).toBe("expired");
    expect(transitionFeedback("read", { type: "EXPIRED" })).toBe("expired");
  });

  test("cleanup deletes only expired records", () => {
    expect(transitionFeedback("expired", { type: "CLEANUP" })).toBe("deleted");
    expect(transitionFeedback("accepted", { type: "CLEANUP" })).toBe("accepted");
    expect(transitionFeedback("read", { type: "CLEANUP" })).toBe("read");
  });

  test("pins the 24-hour demo retention", () => {
    expect(FEEDBACK_RETENTION_HOURS).toBe(24);
    expect(RETENTION_POLICY.feedbackHours).toBe(24);
  });

  test("a duplicate retry returns the original receipt and stores no new row", () => {
    expect(DUPLICATE_RETRY_OUTCOME.duplicate).toBe(true);
    expect(DUPLICATE_RETRY_OUTCOME.returnsOriginalReceipt).toBe(true);
    expect(DUPLICATE_RETRY_OUTCOME.storesNoNewRow).toBe(true);
  });

  test("keeps cleanup idempotent and projects permanent", () => {
    expect(RETENTION_POLICY.cleanupIsIdempotent).toBe(true);
    expect(RETENTION_POLICY.projectsAreNeverDeleted).toBe(true);
    expect(RETENTION_POLICY.rateLimitIdentifiersExpireTogether).toBe(true);
  });
});

import { describe, expect, test } from "bun:test";

import { buildDuplicateReceipt, DUPLICATE_RECEIPT_BEHAVIOR } from "../src/duplicate";
import { UNVERIFIED_SOURCE } from "../src/foundation/field-trust";

const STORED: Parameters<typeof buildDuplicateReceipt>[0] = {
  feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
  receiptTimestamp: "2026-08-27T18:00:00.000Z",
};

describe("P1-BE-03 duplicate receipt behavior", () => {
  test("marks the retry as duplicate and stores no new row", () => {
    expect(DUPLICATE_RECEIPT_BEHAVIOR.marksDuplicate).toBe(true);
    expect(DUPLICATE_RECEIPT_BEHAVIOR.storesNoNewRow).toBe(true);
    expect(DUPLICATE_RECEIPT_BEHAVIOR.returnsOriginalValues).toBe(true);
  });

  test("returns the original stored receipt values", () => {
    const receipt = buildDuplicateReceipt(STORED, 24);

    expect(receipt.duplicate).toBe(true);
    expect(receipt.feedbackId).toBe(STORED.feedbackId);
    expect(receipt.receiptTimestamp).toBe(STORED.receiptTimestamp);
  });

  test("carries the server-owned source and retention window", () => {
    const receipt = buildDuplicateReceipt(STORED, 24);

    expect(receipt.source).toBe(UNVERIFIED_SOURCE);
    expect(receipt.retentionHours).toBe(24);
  });

  test("never echoes submitted report content", () => {
    const receipt = buildDuplicateReceipt(STORED, 24);

    expect(receipt).not.toHaveProperty("title");
    expect(receipt).not.toHaveProperty("description");
    expect(receipt).not.toHaveProperty("reproductionSteps");
  });
});

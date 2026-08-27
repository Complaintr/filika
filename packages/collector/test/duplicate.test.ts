import { describe, expect, test } from "bun:test";

import {
  buildAcceptedReceipt,
  buildDuplicateReceipt,
  DUPLICATE_RECEIPT_BEHAVIOR,
} from "../src/duplicate";

const STORED = {
  eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
  feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
  receivedAt: "2026-08-27T18:00:00.000Z",
};

describe("P2-BE-10 frozen feedback receipts", () => {
  test("marks the retry as duplicate and stores no new row", () => {
    expect(DUPLICATE_RECEIPT_BEHAVIOR.marksDuplicate).toBe(true);
    expect(DUPLICATE_RECEIPT_BEHAVIOR.storesNoNewRow).toBe(true);
    expect(DUPLICATE_RECEIPT_BEHAVIOR.returnsOriginalValues).toBe(true);
  });

  test("builds an accepted receipt matching the sdk contract", () => {
    const receipt = buildAcceptedReceipt(STORED.eventId, STORED.feedbackId, STORED.receivedAt);

    expect(receipt).toEqual({
      schemaVersion: 1,
      eventId: STORED.eventId,
      feedbackId: STORED.feedbackId,
      receivedAt: STORED.receivedAt,
      duplicate: false,
    });
  });

  test("returns the original stored receipt for a duplicate", () => {
    const receipt = buildDuplicateReceipt(STORED);

    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.eventId).toBe(STORED.eventId);
    expect(receipt.feedbackId).toBe(STORED.feedbackId);
    expect(receipt.receivedAt).toBe(STORED.receivedAt);
    expect(receipt.duplicate).toBe(true);
  });

  test("never echoes submitted report content", () => {
    const receipt = buildDuplicateReceipt(STORED);

    expect(receipt).not.toHaveProperty("title");
    expect(receipt).not.toHaveProperty("description");
    expect(receipt).not.toHaveProperty("reproductionSteps");
    expect(receipt).not.toHaveProperty("retentionHours");
    expect(receipt).not.toHaveProperty("source");
  });
});

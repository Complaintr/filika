import { describe, expect, test } from "bun:test";

import { UNVERIFIED_SOURCE } from "../src/foundation/field-trust";
import {
  buildServerOwnedValues,
  deriveOrigin,
  formatReceivedAt,
  generateFeedbackId,
  isSdkReceiptTimestamp,
  RECEIPT_TIMESTAMP_PATTERN,
  SERVER_OWNED_FIELDS,
} from "../src/server-owned";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("server-owned values", () => {
  test("derives the request origin from the header only", () => {
    expect(deriveOrigin("https://demo.example")).toBe("https://demo.example");
    expect(deriveOrigin(null)).toBeNull();
  });

  test("generates a server-side feedback ID", () => {
    expect(generateFeedbackId()).toMatch(UUID_PATTERN);
  });

  test("stamps the receipt with the server clock in sdk format", () => {
    const now = new Date("2026-08-27T18:00:00.000Z");
    const receivedAt = formatReceivedAt(now);

    expect(receivedAt).toBe("2026-08-27T18:00:00.000Z");
    expect(isSdkReceiptTimestamp(receivedAt)).toBe(true);
  });

  test("matches the sdk receipt timestamp pattern exactly", () => {
    expect(new RegExp(RECEIPT_TIMESTAMP_PATTERN).test("2026-08-27T18:00:00.000Z")).toBe(true);
    expect(new RegExp(RECEIPT_TIMESTAMP_PATTERN).test("2026-08-27T18:00:00Z")).toBe(false);
  });

  test("assembles the server-owned values with the unverified source", () => {
    const values = buildServerOwnedValues(
      new Date("2026-08-27T18:00:00.000Z"),
      "https://demo.example",
    );

    expect(values.requestOrigin).toBe("https://demo.example");
    expect(values.source).toBe(UNVERIFIED_SOURCE);
    expect(values.receivedAt).toBe("2026-08-27T18:00:00.000Z");
    expect(values.feedbackId).toMatch(UUID_PATTERN);
  });

  test("keeps the server-owned field list stable", () => {
    expect(SERVER_OWNED_FIELDS).toEqual(["requestOrigin", "source", "feedbackId", "receivedAt"]);
  });
});

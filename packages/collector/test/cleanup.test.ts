import { describe, expect, test } from "bun:test";

import {
  CLEANUP_COMMAND_NAME,
  CLEANUP_CONTRACT,
  hasFeedbackExpired,
  hasRateLimitExpired,
  selectExpiredFeedback,
  selectExpiredRateLimits,
} from "../src/cleanup";

const NOW = new Date("2026-08-27T18:00:00.000Z");

describe("retention cleanup contract", () => {
  test("removes feedback after the 24-hour retention window", () => {
    const withinWindow = new Date(NOW.getTime() - 23 * 60 * 60 * 1000);
    const expired = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);

    expect(hasFeedbackExpired(withinWindow, NOW, 24)).toBe(false);
    expect(hasFeedbackExpired(expired, NOW, 24)).toBe(true);
  });

  test("treats the retention boundary as expired", () => {
    const boundary = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

    expect(hasFeedbackExpired(boundary, NOW, 24)).toBe(true);
  });

  test("removes rate-limit identifiers at their expiry", () => {
    expect(hasRateLimitExpired(new Date(NOW.getTime() - 1), NOW)).toBe(true);
    expect(hasRateLimitExpired(new Date(NOW.getTime() + 60_000), NOW)).toBe(false);
  });

  test("selects only expired feedback", () => {
    const rows = [
      { receiptTimestamp: new Date(NOW.getTime() - 25 * 60 * 60 * 1000) },
      { receiptTimestamp: new Date(NOW.getTime() - 1 * 60 * 60 * 1000) },
    ];

    expect(selectExpiredFeedback(rows, NOW, 24)).toEqual([rows[0]]);
  });

  test("selects only expired rate-limit identifiers", () => {
    const rows = [
      { expiresAt: new Date(NOW.getTime() - 1) },
      { expiresAt: new Date(NOW.getTime() + 60_000) },
    ];

    expect(selectExpiredRateLimits(rows, NOW)).toEqual([rows[0]]);
  });

  test("keeps the cleanup command idempotent and project-safe", () => {
    expect(CLEANUP_COMMAND_NAME).toBe("db:cleanup");
    expect(CLEANUP_CONTRACT.idempotent).toBe(true);
    expect(CLEANUP_CONTRACT.neverDeletesProjects).toBe(true);
    expect(CLEANUP_CONTRACT.singleTransactionalPass).toBe(true);
  });
});

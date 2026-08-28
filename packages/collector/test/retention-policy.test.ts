import { describe, expect, test } from "bun:test";

import { CLEANUP_CONTRACT } from "../src/cleanup";
import { LOG_RETENTION_POLICY } from "../src/db/cleanup";
import { FEEDBACK_RETENTION_HOURS, RETENTION_POLICY } from "../src/foundation/data-lifecycle";
import { RATE_LIMIT_WINDOW_HOURS, windowExpiresAt } from "../src/rate-limiting";

describe("P4-BE-07 retention expiry policy", () => {
  test("expires feedback after 24 hours", () => {
    expect(FEEDBACK_RETENTION_HOURS).toBe(24);
    expect(RETENTION_POLICY.feedbackHours).toBe(24);
  });

  test("expires keyed abuse identifiers at their window end", () => {
    expect(RATE_LIMIT_WINDOW_HOURS).toBe(1);
    expect(windowExpiresAt("2026-08-27T18:00:00.000Z").toISOString()).toBe(
      "2026-08-27T19:00:00.000Z",
    );
    expect(RETENTION_POLICY.rateLimitIdentifiersExpireTogether).toBe(true);
  });

  test("keeps cleanup idempotent and project-safe", () => {
    expect(CLEANUP_CONTRACT.idempotent).toBe(true);
    expect(CLEANUP_CONTRACT.deletesExpiredFeedback).toBe(true);
    expect(CLEANUP_CONTRACT.deletesExpiredRateLimitIdentifiers).toBe(true);
    expect(CLEANUP_CONTRACT.neverDeletesProjects).toBe(true);
  });

  test("treats logs as an operational stream, not a data store", () => {
    expect(LOG_RETENTION_POLICY.logsAreNotADataStore).toBe(true);
    expect(LOG_RETENTION_POLICY.retentionIsOperationalOnly).toBe(true);
  });
});

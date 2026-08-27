import { describe, expect, test } from "bun:test";

import {
  SDK_REVIEW_CONCLUSION,
  SDK_REVIEW_FINDINGS,
  SDK_REVIEW_FOLLOW_UPS,
} from "../src/sdk-review";

describe("P1-BE-08 sdk contract review", () => {
  test("reviews origin, idempotency, retry, and privacy", () => {
    expect(SDK_REVIEW_FINDINGS.map((finding) => finding.check)).toEqual([
      "Origin handling",
      "Idempotency",
      "Retry",
      "Privacy",
    ]);
  });

  test("passes every reviewed area with evidence", () => {
    for (const finding of SDK_REVIEW_FINDINGS) {
      expect(finding.verdict).toBe("pass");
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  test("records a conclusion with no blocking findings", () => {
    expect(SDK_REVIEW_CONCLUSION).toMatch(/consistent with the collector/i);
    expect(SDK_REVIEW_CONCLUSION).toMatch(/no blocking findings/i);
  });

  test("tracks follow-ups until the SDK is implemented", () => {
    expect(SDK_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/event UUID/i);
    expect(SDK_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/never sends origin/i);
    expect(SDK_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/re-run this review/i);
  });
});

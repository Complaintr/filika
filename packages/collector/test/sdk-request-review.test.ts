import { describe, expect, test } from "bun:test";

import {
  SDK_REQUEST_REVIEW_CONCLUSION,
  SDK_REQUEST_REVIEW_FINDINGS,
  SDK_REQUEST_REVIEW_FOLLOW_UPS,
} from "../src/sdk-request-review";

describe("P4-BE-10 sdk request and dialog privacy review", () => {
  test("reviews request construction, ambient data, confirmation, and closed shapes", () => {
    expect(SDK_REQUEST_REVIEW_FINDINGS.map((finding) => finding.check)).toEqual([
      "Request construction",
      "No ambient data",
      "User confirmation before transmission",
      "Closed headers and body",
    ]);
  });

  test("passes every reviewed area with evidence", () => {
    for (const finding of SDK_REQUEST_REVIEW_FINDINGS) {
      expect(finding.verdict).toBe("pass");
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  test("records a conclusion with no blocking findings", () => {
    expect(SDK_REQUEST_REVIEW_CONCLUSION).toMatch(/satisfy the collector and privacy contracts/i);
    expect(SDK_REQUEST_REVIEW_CONCLUSION).toMatch(/no blocking findings/i);
  });

  test("tracks follow-ups until the real browser registration is verified", () => {
    expect(SDK_REQUEST_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/webmcp registration path/i);
    expect(SDK_REQUEST_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/contract review/i);
  });
});

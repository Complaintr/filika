import { describe, expect, test } from "bun:test";

import {
  SPIKE_REVIEW_CONCLUSION,
  SPIKE_REVIEW_FILES,
  SPIKE_REVIEW_FINDINGS,
  SPIKE_REVIEW_FOLLOW_UPS,
} from "../src/foundation/spike-review";

describe("P0-BE-07 webmcp spike review", () => {
  test("reviews every spike artifact", () => {
    expect(SPIKE_REVIEW_FILES.map((file) => file.file)).toEqual([
      "apps/web/src/webmcp-test-tool.ts",
      "apps/web/src/index.ts",
      "apps/web/src/index.html",
      "docs/webmcp-local-testing.md",
    ]);
  });

  test("finds no unwanted data collection or network behavior", () => {
    for (const finding of SPIKE_REVIEW_FINDINGS) {
      expect(finding.result).not.toBe("unwanted");
      expect(finding.evidence.length).toBeGreaterThan(0);
    }

    const noDataCollection = SPIKE_REVIEW_FINDINGS.find(
      (finding) => finding.check === "Page data collection",
    );
    const noNetwork = SPIKE_REVIEW_FINDINGS.find((finding) => finding.check === "Network behavior");

    expect(noDataCollection?.result).toBe("none");
    expect(noNetwork?.result).toBe("none");
  });

  test("records the conclusion that the spike is safe", () => {
    expect(SPIKE_REVIEW_CONCLUSION).toMatch(/no unwanted data collection/i);
    expect(SPIKE_REVIEW_CONCLUSION).toMatch(/network behavior/i);
  });

  test("keeps the spike separate from the SDK tool", () => {
    expect(SPIKE_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/separate from the SDK tool/i);
    expect(SPIKE_REVIEW_FOLLOW_UPS.join(" ")).toMatch(/no code changes/i);
  });
});

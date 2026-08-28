import { describe, expect, test } from "bun:test";

import { THREATS } from "../src/foundation/threat-model";
import { SECURITY_EVIDENCE } from "../src/security-evidence";

describe("backend security evidence report", () => {
  test("links every threat-model control to at least one test", () => {
    const evidenceControls = new Set(SECURITY_EVIDENCE.map((entry) => entry.control));

    for (const threat of THREATS) {
      expect(evidenceControls.has(threat.title), threat.title).toBe(true);
    }
  });

  test("every evidence entry references existing test files", async () => {
    for (const entry of SECURITY_EVIDENCE) {
      for (const path of entry.tests) {
        expect(await Bun.file(path).exists(), `${entry.control}: ${path}`).toBe(true);
      }
    }
  });

  test("records a concise evidence report without gaps", () => {
    expect(SECURITY_EVIDENCE.length).toBeGreaterThanOrEqual(THREATS.length);

    for (const entry of SECURITY_EVIDENCE) {
      expect(entry.tests.length).toBeGreaterThan(0);
    }
  });
});

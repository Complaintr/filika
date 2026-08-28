import { describe, expect, test } from "bun:test";

import { THREAT_IDS, THREATS, TRUST_BOUNDARY_RULES } from "../src/foundation/threat-model";

describe("threat model", () => {
  test("lists every baseline threat exactly once in a stable order", () => {
    expect(THREATS.map((threat) => threat.id)).toEqual(THREAT_IDS);
    expect(new Set(THREAT_IDS).size).toBe(THREAT_IDS.length);
  });

  test("covers ingestion, content, and privacy threats", () => {
    const titles = THREATS.map((threat) => threat.title);

    expect(titles).toContain("Public ingestion abuse");
    expect(titles).toContain("Origin spoofing");
    expect(titles).toContain("Duplicate and replayed requests");
    expect(titles).toContain("Stored XSS");
    expect(titles).toContain("Prompt injection");
    expect(titles).toContain("Payload abuse");
    expect(titles).toContain("Sensitive-data submission");
    expect(titles).toContain("Rate-limit bypass");
  });

  test("gives every threat at least one mitigation and one verification", () => {
    for (const threat of THREATS) {
      expect(threat.mitigations.length).toBeGreaterThan(0);
      expect(threat.verification.length).toBeGreaterThan(0);
    }
  });

  test("keeps trust-boundary rules complete and stable", () => {
    expect(TRUST_BOUNDARY_RULES).toHaveLength(4);
    expect(TRUST_BOUNDARY_RULES.join(" ")).toMatch(/origin, source, time, or identity/i);
    expect(TRUST_BOUNDARY_RULES.join(" ")).toMatch(/reject/i);
    expect(TRUST_BOUNDARY_RULES.join(" ")).toMatch(/untrusted/i);
  });
});

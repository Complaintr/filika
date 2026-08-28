export interface SecurityControlEvidence {
  control: string;
  tests: readonly string[];
}

export const SECURITY_EVIDENCE: readonly SecurityControlEvidence[] = [
  {
    control: "Public ingestion abuse",
    tests: [
      "packages/collector/test/integration.test.ts",
      "packages/collector/test/abuse-control-matrix.test.ts",
    ],
  },
  {
    control: "Origin spoofing",
    tests: [
      "packages/collector/test/origin-matrix.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
  {
    control: "Duplicate and replayed requests",
    tests: ["packages/collector/test/integration.test.ts"],
  },
  {
    control: "Stored XSS",
    tests: [
      "packages/collector/test/abuse-content.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
  {
    control: "Prompt injection",
    tests: ["packages/collector/test/abuse-content.test.ts"],
  },
  {
    control: "Payload abuse",
    tests: ["packages/collector/test/size-limits.test.ts", "packages/collector/test/body.test.ts"],
  },
  {
    control: "Sensitive-data submission",
    tests: ["packages/collector/test/logger.test.ts"],
  },
  {
    control: "Rate-limit bypass",
    tests: [
      "packages/collector/test/rate-limiting.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
];

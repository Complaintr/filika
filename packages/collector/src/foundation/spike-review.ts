export interface SpikeReviewFile {
  file: string;
  role: string;
}

export const SPIKE_REVIEW_FILES: readonly SpikeReviewFile[] = [
  {
    file: "apps/web/src/webmcp-test-tool.ts",
    role: "Defines the test tool, its closed empty schema, and its execute behavior.",
  },
  {
    file: "apps/web/src/index.ts",
    role: "Registers the tool and renders bounded registration status.",
  },
  {
    file: "apps/web/src/index.html",
    role: "Host page shell with a bounded status line and invocation counter.",
  },
  {
    file: "docs/webmcp-local-testing.md",
    role: "Documents local inspection steps.",
  },
];

export interface SpikeReviewFinding {
  check: string;
  evidence: string;
  result: "none" | "pass";
}

export const SPIKE_REVIEW_FINDINGS: readonly SpikeReviewFinding[] = [
  {
    check: "Page data collection",
    evidence:
      "Empty input schema and no page-content reads; the page reads only its own status and counter elements.",
    result: "none",
  },
  {
    check: "Network behavior",
    evidence: "execute returns a static string and makes no network requests.",
    result: "none",
  },
  {
    check: "Credentials or ambient access",
    evidence:
      "No cookies, storage, clipboard, or credential APIs are touched; referrer is no-referrer.",
    result: "none",
  },
  {
    check: "Bounded failures",
    evidence:
      "Unsupported and registration-failure paths render bounded messages and keep the host page usable.",
    result: "pass",
  },
  {
    check: "Unintended persistence",
    evidence: "No state is written beyond the in-page counter.",
    result: "none",
  },
];

export const SPIKE_REVIEW_CONCLUSION =
  "No unwanted data collection or network behavior was found in the localhost spike.";

export const SPIKE_REVIEW_FOLLOW_UPS = [
  "Keep the spike tool separate from the SDK tool; do not export or bundle it into packages/sdk.",
  "Re-run this review against the SDK registration path when the SDK tool is implemented.",
  "No code changes are required in this phase.",
] as const;

export interface SdkReviewFinding {
  check: string;
  evidence: string;
  verdict: "pass";
}

export const SDK_REVIEW_FINDINGS: readonly SdkReviewFinding[] = [
  {
    check: "Origin handling",
    evidence:
      "The V1 envelope rejects origin claims in the body, and the collector derives origin from the Origin header only.",
    verdict: "pass",
  },
  {
    check: "Idempotency",
    evidence:
      "The endpoint contract requires Idempotency-Key to equal eventId, so the SDK's single UUID reuse is enforceable.",
    verdict: "pass",
  },
  {
    check: "Retry",
    evidence:
      "Duplicate resolution returns the original stored receipt and stores no new row, preserving retry semantics.",
    verdict: "pass",
  },
  {
    check: "Privacy",
    evidence:
      "The envelope carries only report fields and static host configuration; no ambient data or credentials are collected.",
    verdict: "pass",
  },
];

export const SDK_REVIEW_CONCLUSION =
  "The SDK contract is consistent with the collector for origin, idempotency, retry, and privacy. No blocking findings.";

export const SDK_REVIEW_FOLLOW_UPS = [
  "Confirm the SDK always reuses the single event UUID as both eventId and Idempotency-Key.",
  "Confirm the SDK never sends origin, source, or timestamp claims in the body.",
  "Re-run this review against the implemented SDK when the WebMCP tool lands.",
] as const;

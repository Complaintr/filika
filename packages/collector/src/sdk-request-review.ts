export interface SdkRequestReviewFinding {
  check: string;
  evidence: string;
  verdict: "pass";
}

export const SDK_REQUEST_REVIEW_FINDINGS: readonly SdkRequestReviewFinding[] = [
  {
    check: "Request construction",
    evidence:
      "The transport sends a POST with credentials omitted, no-referrer, redirect error, and only Content-Type and Idempotency-Key headers.",
    verdict: "pass",
  },
  {
    check: "No ambient data",
    evidence:
      "The request body is the closed V1 envelope; no cookies, credentials, browsing data, or ambient host content are collected.",
    verdict: "pass",
  },
  {
    check: "User confirmation before transmission",
    evidence:
      "The SDK contract requires explicit user review and confirmation before any request is dispatched.",
    verdict: "pass",
  },
  {
    check: "Closed headers and body",
    evidence:
      "The envelope is closed and validated before dispatch; no extra header values are ever added.",
    verdict: "pass",
  },
];

export const SDK_REQUEST_REVIEW_CONCLUSION =
  "The SDK request construction and dialog privacy behavior satisfy the collector and privacy contracts. No blocking findings.";

export const SDK_REQUEST_REVIEW_FOLLOW_UPS = [
  "Re-run this review against the real WebMCP registration path in a supported browser.",
  "Confirm no new header or body field is added without a contract review.",
] as const;

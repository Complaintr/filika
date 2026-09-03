export const THREAT_IDS = [
  "th_public_ingestion_abuse",
  "th_origin_spoofing",
  "th_duplicate_replay",
  "th_stored_xss",
  "th_prompt_injection",
  "th_payload_abuse",
  "th_sensitive_data_submission",
  "th_rate_limit_bypass",
] as const;

export type ThreatId = (typeof THREAT_IDS)[number];

export interface Threat {
  entryPoint: string;
  id: ThreatId;
  impact: string;
  likelihood: "high" | "medium";
  mitigations: readonly string[];
  title: string;
  verification: readonly string[];
}

export const THREATS: readonly Threat[] = [
  {
    entryPoint: "Any client POSTs to the public feedback endpoint.",
    id: "th_public_ingestion_abuse",
    impact: "Disk fill, inbox noise, and collector resource exhaustion.",
    likelihood: "high",
    mitigations: [
      "Bounded body size and closed envelope schema.",
      "Per-field and total-envelope size limits.",
      "Project-level durable rate limit.",
      "Explicit cleanup of feedback older than 24 hours.",
    ],
    title: "Public ingestion abuse",
    verification: [
      "packages/collector/test/body.test.ts",
      "packages/collector/test/validation.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
  {
    entryPoint: "Forged, missing, or null Origin header on the feedback request.",
    id: "th_origin_spoofing",
    impact: "Feedback attributed to the wrong host or origin policy bypassed.",
    likelihood: "medium",
    mitigations: [
      "Origin is derived from the request header only, never from the body.",
      "Missing, null, and denied origins are rejected before ingest.",
      "Exact-match origin allowlist and Vary: Origin on responses.",
      "Origin checks stop browser-based forgery; non-browser clients can set any Origin, so per-project rate limits bound them.",
    ],
    title: "Origin spoofing",
    verification: [
      "packages/collector/test/cors.test.ts",
      "packages/collector/test/origin-matrix.test.ts",
    ],
  },
  {
    entryPoint: "Client retry or deliberate replay with the same event ID.",
    id: "th_duplicate_replay",
    impact: "Duplicate feedback records and inbox duplicates.",
    likelihood: "medium",
    mitigations: [
      "One event UUID reused as eventId and Idempotency-Key.",
      "Idempotency-Key must equal eventId.",
      "Unique (project_id, event_id) constraint.",
      "Retry returns the original receipt with duplicate: true.",
    ],
    title: "Duplicate and replayed requests",
    verification: [
      "packages/collector/test/idempotency.test.ts",
      "packages/collector/test/duplicate.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
  {
    entryPoint: "Feedback content stored and later rendered in the maintainer inbox.",
    id: "th_stored_xss",
    impact: "Script execution in the maintainer browser and credential loss.",
    likelihood: "medium",
    mitigations: [
      "Inbox renders every value as text, never as markup.",
      "Report content is marked untrusted.",
      "Stored-XSS regression fixtures in tests.",
      "The inbox route exposes no WebMCP tools.",
    ],
    title: "Stored XSS",
    verification: [
      "apps/web/test/stored-xss-regression.test.tsx",
      "tests/e2e/specs/feedback-ingest.spec.ts",
      "packages/collector/test/abuse-content.test.ts",
    ],
  },
  {
    entryPoint: "Malicious or hostile text inside agent-authored fields and optional context.",
    id: "th_prompt_injection",
    impact: "Collector or agent misdirected by untrusted content.",
    likelihood: "medium",
    mitigations: [
      "Tool name, title, description, and schema stay static.",
      "Collector text is reconstructed into a safe receipt that cannot carry instructions.",
      "Agent-authored fields are bounded and agents are instructed to confirm with the user before transmission.",
    ],
    title: "Prompt injection",
    verification: ["packages/sdk/test/receipt.test.ts", "packages/sdk/test/sdk.test.ts"],
  },
  {
    entryPoint: "Oversized, deeply nested, malformed, or invalid-UTF bodies.",
    id: "th_payload_abuse",
    impact: "Parser resource exhaustion and validation bypass.",
    likelihood: "high",
    mitigations: [
      "Body-size bound enforced before JSON parsing where the runtime permits.",
      "Strict content type.",
      "Closed schema with maximum sizes per field and total envelope.",
      "Malformed-JSON and invalid-UTF rejection paths.",
    ],
    title: "Payload abuse",
    verification: [
      "packages/collector/test/body.test.ts",
      "packages/collector/test/size-limits.test.ts",
      "packages/collector/test/abuse-content.test.ts",
    ],
  },
  {
    entryPoint: "Users or agents paste credentials, personal data, or secrets into report fields.",
    id: "th_sensitive_data_submission",
    impact: "Data exposure through the inbox and logs.",
    likelihood: "medium",
    mitigations: [
      "Agents are instructed to confirm with the user before transmission.",
      "Collector never logs full report bodies.",
      "Logs sanitize identifiers.",
      "Synthetic data only; expired feedback requires explicit cleanup.",
    ],
    title: "Sensitive-data submission",
    verification: [
      "packages/collector/test/logger.test.ts",
      "apps/web/test/privacy-disclosure.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
  {
    entryPoint: "High-volume requests spread across event IDs or project keys.",
    id: "th_rate_limit_bypass",
    impact: "Abuse-control evasion and resource exhaustion.",
    likelihood: "medium",
    mitigations: [
      "Atomic durable project-level rate limit.",
      "Rate-limit identifiers expire and are cleaned with feedback retention.",
      "Decisions are logged without request content.",
    ],
    title: "Rate-limit bypass",
    verification: [
      "packages/collector/test/rate-limiting.test.ts",
      "packages/collector/test/integration.test.ts",
    ],
  },
];

export const TRUST_BOUNDARY_RULES = [
  "Never trust a body-supplied value that describes origin, source, time, or identity.",
  "Reject any unknown field, extra list item beyond the bound, or oversized value wholesale.",
  "Treat feedback content as untrusted at every boundary: agent, host page, and collector to agent.",
  "Record validation outcomes, categories, and identifiers only in logs.",
] as const;

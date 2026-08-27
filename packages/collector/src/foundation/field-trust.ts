export interface ServerDerivedField {
  derivation: string;
  field: string;
  notes?: string;
}

export const SERVER_DERIVED_FIELDS: readonly ServerDerivedField[] = [
  {
    derivation: "Validated Origin request header.",
    field: "requestOrigin",
    notes: "Never taken from the body.",
  },
  {
    derivation: "Fixed value web_sdk_unverified.",
    field: "source",
    notes: "Marks the report as unauthenticated.",
  },
  {
    derivation: "Server-generated UUID at persistence time.",
    field: "feedbackId",
  },
  {
    derivation: "Server clock at acceptance.",
    field: "receiptTimestamp",
    notes: "Anchors retention.",
  },
  {
    derivation: "Resolved from the project key lookup.",
    field: "projectIdentity",
    notes: "Internal ID never exposed.",
  },
  {
    derivation: "Server-side counter check.",
    field: "rateLimitDecision",
  },
  {
    derivation: "From the resolved project record.",
    field: "retentionWindow",
  },
];

export interface UntrustedClientField {
  field: string;
  validation: string;
  whyUntrusted: string;
}

export const UNTRUSTED_CLIENT_FIELDS: readonly UntrustedClientField[] = [
  {
    field: "projectKey",
    validation: "Format bound; used only to resolve the project.",
    whyUntrusted: "Public lookup key, not a credential.",
  },
  {
    field: "eventId",
    validation: "UUID format; must equal Idempotency-Key.",
    whyUntrusted: "Opaque idempotency key; uniqueness comes from the constraint.",
  },
  {
    field: "kind",
    validation: "Bounded enum.",
    whyUntrusted: "Agent-authored.",
  },
  {
    field: "title",
    validation: "Bounded length.",
    whyUntrusted: "Agent-authored.",
  },
  {
    field: "description",
    validation: "Bounded length.",
    whyUntrusted: "Agent-authored.",
  },
  {
    field: "expectedBehavior",
    validation: "Bounded length.",
    whyUntrusted: "Agent-authored.",
  },
  {
    field: "reproductionSteps",
    validation: "Bounded length.",
    whyUntrusted: "Agent-authored.",
  },
  {
    field: "optionalContext",
    validation: "Bounded list and item length; closed shape.",
    whyUntrusted: "Host- and agent-supplied.",
  },
  {
    field: "routeLabel",
    validation: "Static bounded string.",
    whyUntrusted: "Optional host configuration.",
  },
  {
    field: "applicationRelease",
    validation: "Static bounded string.",
    whyUntrusted: "Optional host configuration.",
  },
];

export const REJECTED_CLIENT_CLAIMS = [
  "Origin",
  "Source",
  "Timestamp",
  "Identity",
  "Role",
] as const;

export const UNVERIFIED_SOURCE = "web_sdk_unverified" as const;

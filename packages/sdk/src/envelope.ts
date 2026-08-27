export const FEEDBACK_KINDS = ["bug", "blocked_task", "confusing_behavior", "idea"] as const;

export const FEEDBACK_LIMITS = {
  envelopeBytes: 32_768,
  toolInputBytes: 24_576,
  projectKey: 128,
  title: 160,
  description: 4_000,
  expectedBehavior: 2_000,
  reproductionSteps: 10,
  reproductionStep: 500,
  sdkVersion: 32,
  routeLabel: 120,
  applicationRelease: 80,
} as const;

export const UUID_V4_PATTERN =
  "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export interface FilikaFeedbackDraftV1 {
  kind: (typeof FEEDBACK_KINDS)[number];
  title: string;
  description: string;
  expectedBehavior?: string;
  reproductionSteps?: string[];
}

export interface FilikaFeedbackContextV1 {
  sdkVersion: string;
  routeLabel?: string;
  applicationRelease?: string;
}

export interface FilikaFeedbackEnvelopeV1 {
  schemaVersion: 1;
  projectKey: string;
  eventId: string;
  feedback: FilikaFeedbackDraftV1;
  context: FilikaFeedbackContextV1;
}

export const PROJECT_KEY_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: FEEDBACK_LIMITS.projectKey,
  pattern: "^[A-Za-z0-9_-]+$",
} as const;

export const FEEDBACK_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "title", "description"],
  properties: {
    kind: { type: "string", enum: FEEDBACK_KINDS },
    title: { type: "string", minLength: 1, maxLength: FEEDBACK_LIMITS.title, pattern: "\\S" },
    description: {
      type: "string",
      minLength: 1,
      maxLength: FEEDBACK_LIMITS.description,
      pattern: "\\S",
    },
    expectedBehavior: { type: "string", maxLength: FEEDBACK_LIMITS.expectedBehavior },
    reproductionSteps: {
      type: "array",
      maxItems: FEEDBACK_LIMITS.reproductionSteps,
      items: {
        type: "string",
        minLength: 1,
        maxLength: FEEDBACK_LIMITS.reproductionStep,
        pattern: "\\S",
      },
    },
  },
} as const;

export const FEEDBACK_ENVELOPE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "projectKey", "eventId", "feedback", "context"],
  properties: {
    schemaVersion: { type: "integer", const: 1 },
    projectKey: PROJECT_KEY_SCHEMA,
    eventId: { type: "string", minLength: 36, maxLength: 36, pattern: UUID_V4_PATTERN },
    feedback: FEEDBACK_DRAFT_SCHEMA,
    context: {
      type: "object",
      additionalProperties: false,
      required: ["sdkVersion"],
      properties: {
        sdkVersion: {
          type: "string",
          minLength: 5,
          maxLength: FEEDBACK_LIMITS.sdkVersion,
          pattern: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
        },
        routeLabel: {
          type: "string",
          minLength: 1,
          maxLength: FEEDBACK_LIMITS.routeLabel,
          pattern: "\\S",
        },
        applicationRelease: {
          type: "string",
          minLength: 1,
          maxLength: FEEDBACK_LIMITS.applicationRelease,
          pattern: "\\S",
        },
      },
    },
  },
} as const;

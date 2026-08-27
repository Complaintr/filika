import { UUID_V4_PATTERN } from "./envelope";
import { EXECUTION_LIMITS, FAILURE_OUTCOME_SCHEMA, type FilikaFailureOutcome } from "./outcomes";

export const RECEIPT_TIMESTAMP_PATTERN =
  "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$";

export interface FilikaReceiptV1 {
  schemaVersion: 1;
  eventId: string;
  feedbackId: string;
  receivedAt: string;
  duplicate: boolean;
}

export type FilikaExecutionOutcome =
  | { code: "success"; receipt: FilikaReceiptV1 }
  | FilikaFailureOutcome;

export const RECEIPT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "eventId", "feedbackId", "receivedAt", "duplicate"],
  properties: {
    schemaVersion: { type: "integer", const: 1 },
    eventId: { type: "string", minLength: 36, maxLength: 36, pattern: UUID_V4_PATTERN },
    feedbackId: { type: "string", minLength: 36, maxLength: 36, pattern: UUID_V4_PATTERN },
    receivedAt: {
      type: "string",
      minLength: 24,
      maxLength: 24,
      pattern: RECEIPT_TIMESTAMP_PATTERN,
    },
    duplicate: { type: "boolean" },
  },
} as const;

export const EXECUTION_OUTCOME_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["code", "receipt"],
      properties: { code: { type: "string", const: "success" }, receipt: RECEIPT_SCHEMA },
    },
    FAILURE_OUTCOME_SCHEMA,
  ],
} as const;

/** Reference trust-boundary parser; never returns collector-supplied free text. */
export function parseReceipt(raw: string, expectedEventId: string): FilikaReceiptV1 | null {
  if (
    raw.length > EXECUTION_LIMITS.receiptBytes ||
    new TextEncoder().encode(raw).byteLength > EXECUTION_LIMITS.receiptBytes
  ) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length !== RECEIPT_SCHEMA.required.length ||
      !RECEIPT_SCHEMA.required.every((key) => Object.hasOwn(record, key)) ||
      record.schemaVersion !== 1 ||
      typeof record.eventId !== "string" ||
      !new RegExp(UUID_V4_PATTERN).test(record.eventId) ||
      record.eventId !== expectedEventId ||
      typeof record.feedbackId !== "string" ||
      !new RegExp(UUID_V4_PATTERN).test(record.feedbackId) ||
      typeof record.receivedAt !== "string" ||
      !new RegExp(RECEIPT_TIMESTAMP_PATTERN).test(record.receivedAt) ||
      new Date(record.receivedAt).toISOString() !== record.receivedAt ||
      typeof record.duplicate !== "boolean"
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      eventId: record.eventId,
      feedbackId: record.feedbackId,
      receivedAt: record.receivedAt,
      duplicate: record.duplicate,
    };
  } catch {
    return null;
  }
}

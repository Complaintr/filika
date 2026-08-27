import { UNVERIFIED_SOURCE } from "./foundation/field-trust";

export const SERVER_OWNED_FIELDS = [
  "requestOrigin",
  "source",
  "feedbackId",
  "receiptTimestamp",
] as const;

export interface ServerOwnedValues {
  feedbackId: string;
  receiptTimestamp: string;
  requestOrigin: string | null;
  source: typeof UNVERIFIED_SOURCE;
}

export function deriveOrigin(originHeader: string | null): string | null {
  return originHeader;
}

export function generateFeedbackId(): string {
  return crypto.randomUUID();
}

export function formatReceiptTimestamp(now: Date): string {
  return now.toISOString();
}

export function buildServerOwnedValues(now: Date, originHeader: string | null): ServerOwnedValues {
  return {
    feedbackId: generateFeedbackId(),
    receiptTimestamp: formatReceiptTimestamp(now),
    requestOrigin: deriveOrigin(originHeader),
    source: UNVERIFIED_SOURCE,
  };
}

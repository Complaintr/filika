import { UNVERIFIED_SOURCE } from "./foundation/field-trust";

export const RECEIPT_TIMESTAMP_PATTERN =
  "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$";

export const SERVER_OWNED_FIELDS = ["requestOrigin", "source", "feedbackId", "receivedAt"] as const;

export interface ServerOwnedValues {
  feedbackId: string;
  receivedAt: string;
  requestOrigin: string | null;
  source: typeof UNVERIFIED_SOURCE;
}

export function deriveOrigin(originHeader: string | null): string | null {
  return originHeader;
}

export function generateFeedbackId(): string {
  return crypto.randomUUID();
}

export function formatReceivedAt(now: Date): string {
  return now.toISOString();
}

export function isSdkReceiptTimestamp(value: string): boolean {
  return new RegExp(RECEIPT_TIMESTAMP_PATTERN).test(value);
}

export function buildServerOwnedValues(now: Date, originHeader: string | null): ServerOwnedValues {
  return {
    feedbackId: generateFeedbackId(),
    receivedAt: formatReceivedAt(now),
    requestOrigin: deriveOrigin(originHeader),
    source: UNVERIFIED_SOURCE,
  };
}

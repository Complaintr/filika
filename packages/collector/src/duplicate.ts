import { UNVERIFIED_SOURCE } from "./foundation/field-trust";

export interface StoredReceiptFacts {
  feedbackId: string;
  receiptTimestamp: string;
}

export interface FeedbackReceipt {
  duplicate: boolean;
  feedbackId: string;
  receiptTimestamp: string;
  retentionHours: number;
  source: string;
}

export const DUPLICATE_RECEIPT_BEHAVIOR = {
  marksDuplicate: true,
  storesNoNewRow: true,
  returnsOriginalValues: true,
} as const;

export function buildDuplicateReceipt(
  stored: StoredReceiptFacts,
  retentionHours: number,
): FeedbackReceipt {
  return {
    duplicate: true,
    feedbackId: stored.feedbackId,
    receiptTimestamp: stored.receiptTimestamp,
    retentionHours,
    source: UNVERIFIED_SOURCE,
  };
}

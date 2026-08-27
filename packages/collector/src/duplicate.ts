export interface StoredReceiptFacts {
  eventId: string;
  feedbackId: string;
  receivedAt: string;
}

export interface FeedbackReceipt {
  schemaVersion: 1;
  eventId: string;
  feedbackId: string;
  receivedAt: string;
  duplicate: boolean;
}

export const DUPLICATE_RECEIPT_BEHAVIOR = {
  marksDuplicate: true,
  storesNoNewRow: true,
  returnsOriginalValues: true,
} as const;

export function buildAcceptedReceipt(
  eventId: string,
  feedbackId: string,
  receivedAt: string,
): FeedbackReceipt {
  return {
    schemaVersion: 1,
    eventId,
    feedbackId,
    receivedAt,
    duplicate: false,
  };
}

export function buildDuplicateReceipt(stored: StoredReceiptFacts): FeedbackReceipt {
  return {
    schemaVersion: 1,
    eventId: stored.eventId,
    feedbackId: stored.feedbackId,
    receivedAt: stored.receivedAt,
    duplicate: true,
  };
}

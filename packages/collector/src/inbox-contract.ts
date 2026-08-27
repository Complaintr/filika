import type { Feedback } from "./db/schema";
import type { FeedbackKind } from "./envelope";

export const INBOX_PAGE_SIZE_DEFAULT = 25 as const;
export const INBOX_PAGE_SIZE_MAX = 50 as const;
export const INBOX_READ_ONLY = true as const;

export interface InboxContextItem {
  label: string;
  value: string;
}

export interface InboxFeedbackItem {
  applicationRelease: string | null;
  description: string;
  eventId: string;
  expectedBehavior: string;
  feedbackId: string;
  kind: FeedbackKind;
  optionalContext: readonly InboxContextItem[];
  origin: string;
  receiptTimestamp: string;
  reproductionSteps: string;
  routeLabel: string | null;
  source: string;
  title: string;
}

export interface InboxListQuery {
  cursor: string | null;
  limit: number;
}

export interface InboxListResult {
  items: readonly InboxFeedbackItem[];
  nextCursor: string | null;
}

export interface InboxDetailResult {
  feedback: InboxFeedbackItem;
}

export function isBoundedPageSize(limit: number): boolean {
  return limit >= 1 && limit <= INBOX_PAGE_SIZE_MAX;
}

export function boundPageSize(limit: number): number {
  if (limit <= 0) {
    return INBOX_PAGE_SIZE_DEFAULT;
  }

  if (limit > INBOX_PAGE_SIZE_MAX) {
    return INBOX_PAGE_SIZE_MAX;
  }

  return limit;
}

export function toInboxItem(row: Feedback): InboxFeedbackItem {
  return {
    applicationRelease: row.applicationRelease,
    description: row.description,
    eventId: row.eventId,
    expectedBehavior: row.expectedBehavior,
    feedbackId: row.id,
    kind: row.kind,
    optionalContext: row.optionalContext as InboxContextItem[],
    origin: row.origin,
    receiptTimestamp: row.receiptTimestamp.toISOString(),
    reproductionSteps: row.reproductionSteps,
    routeLabel: row.routeLabel,
    source: row.source,
    title: row.title,
  };
}

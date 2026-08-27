import type { Feedback } from "./db/schema";
import type { FeedbackKind } from "./envelope";

export const INBOX_PAGE_SIZE_DEFAULT = 25 as const;
export const INBOX_PAGE_SIZE_MAX = 50 as const;
export const INBOX_READ_ONLY = true as const;

export interface InboxFeedbackItem {
  applicationRelease: string | null;
  description: string;
  eventId: string;
  expectedBehavior: string | null;
  feedbackId: string;
  kind: FeedbackKind;
  origin: string;
  receiptTimestamp: string;
  reproductionSteps: readonly string[] | null;
  routeLabel: string | null;
  sdkVersion: string;
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
    origin: row.origin,
    receiptTimestamp: row.receiptTimestamp.toISOString(),
    reproductionSteps: row.reproductionSteps,
    routeLabel: row.routeLabel,
    sdkVersion: row.sdkVersion,
    source: row.source,
    title: row.title,
  };
}

import type { Feedback } from "./db/schema";
import type { FeedbackKind } from "./envelope";

export const INBOX_PAGE_SIZE_DEFAULT = 25 as const;
export const INBOX_PAGE_SIZE_MAX = 50 as const;
export const INBOX_READ_ONLY = true as const;

export interface InboxFeedbackRecord {
  applicationRelease: string | null;
  description: string;
  expectedBehavior: string | null;
  expiresAt: string;
  feedbackId: string;
  kind: FeedbackKind;
  receivedAt: string;
  reproductionSteps: readonly string[] | null;
  requestOrigin: string;
  routeLabel: string | null;
  source: "web_sdk_unverified";
  title: string;
}

export type InboxListItemViewModel = Pick<
  InboxFeedbackRecord,
  "feedbackId" | "kind" | "receivedAt" | "requestOrigin" | "routeLabel" | "title"
>;

export interface InboxListQuery {
  cursor: string | null;
  limit: number;
  search?: string;
  kind?: FeedbackKind;
}

export interface InboxListResult {
  items: readonly InboxListItemViewModel[];
  nextCursor: string | null;
}

export interface InboxDetailResult {
  feedback: InboxFeedbackRecord;
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

export function toInboxItem(row: Feedback, retentionHours: number): InboxFeedbackRecord {
  const receivedAt = row.receiptTimestamp.toISOString();

  return {
    applicationRelease: row.applicationRelease,
    description: row.description,
    expectedBehavior: row.expectedBehavior,
    expiresAt: new Date(row.receiptTimestamp.getTime() + retentionHours * 3_600_000).toISOString(),
    feedbackId: row.id,
    kind: row.kind,
    receivedAt,
    reproductionSteps: row.reproductionSteps,
    requestOrigin: row.origin,
    routeLabel: row.routeLabel,
    source: "web_sdk_unverified",
    title: row.title,
  };
}

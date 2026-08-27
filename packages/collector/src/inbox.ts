import { and, desc, eq, sql } from "drizzle-orm";

import type { Db } from "./db/client";
import { feedback, project } from "./db/schema";
import {
  boundPageSize,
  type InboxFeedbackRecord,
  type InboxListItemViewModel,
  type InboxListQuery,
  type InboxListResult,
  toInboxItem,
} from "./inbox-contract";

const CURSOR_SEPARATOR = "|" as const;

export function encodeCursor(timestamp: string, feedbackId: string): string {
  return `${timestamp}${CURSOR_SEPARATOR}${feedbackId}`;
}

export function decodeCursor(cursor: string): { id: string; timestamp: string } | null {
  const separatorIndex = cursor.indexOf(CURSOR_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  const timestamp = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);

  if (Number.isNaN(new Date(timestamp).getTime()) || id === "") {
    return null;
  }

  return { id, timestamp };
}

function toListItem(row: {
  feedback: typeof feedback.$inferSelect;
  retentionHours: number;
}): InboxListItemViewModel {
  const record: InboxFeedbackRecord = toInboxItem(row.feedback, row.retentionHours);

  return {
    feedbackId: record.feedbackId,
    kind: record.kind,
    receivedAt: record.receivedAt,
    requestOrigin: record.requestOrigin,
    routeLabel: record.routeLabel,
    title: record.title,
  };
}

export async function listInbox(db: Db, query: InboxListQuery): Promise<InboxListResult> {
  const limit = boundPageSize(query.limit);
  const decodedCursor = query.cursor === null ? null : decodeCursor(query.cursor);
  const cursorCondition =
    decodedCursor === null
      ? undefined
      : sql`(${feedback.receiptTimestamp}, ${feedback.id}) < (${decodedCursor.timestamp}, ${decodedCursor.id})`;

  const rows = await db
    .select({ feedback, retentionHours: project.retentionHours })
    .from(feedback)
    .innerJoin(project, eq(feedback.projectId, project.id))
    .where(cursorCondition)
    .orderBy(desc(feedback.receiptTimestamp), desc(feedback.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);

  return {
    items: page.map((row) => toListItem(row)),
    nextCursor:
      hasMore && last !== undefined
        ? encodeCursor(last.feedback.receiptTimestamp.toISOString(), last.feedback.id)
        : null,
  };
}

export async function getInboxFeedback(
  db: Db,
  feedbackId: string,
): Promise<InboxFeedbackRecord | null> {
  const rows = await db
    .select({ feedback, retentionHours: project.retentionHours })
    .from(feedback)
    .innerJoin(project, eq(feedback.projectId, project.id))
    .where(and(eq(feedback.id, feedbackId)))
    .limit(1);
  const row = rows[0];

  return row === undefined ? null : toInboxItem(row.feedback, row.retentionHours);
}

import { and, eq } from "drizzle-orm";

import type { Db } from "./db/client";
import { type Feedback, feedback } from "./db/schema";
import type { FilikaFeedbackEnvelopeV1 } from "./envelope";

export interface PersistFeedbackInput {
  context: FilikaFeedbackEnvelopeV1["context"];
  eventId: string;
  feedback: FilikaFeedbackEnvelopeV1["feedback"];
  origin: string;
  projectId: string;
  receivedAt: string;
  source: string;
}

export interface FeedbackInsertValues {
  applicationRelease: string | null;
  description: string;
  eventId: string;
  expectedBehavior: string | null;
  kind: FilikaFeedbackEnvelopeV1["feedback"]["kind"];
  origin: string;
  projectId: string;
  receiptTimestamp: Date;
  reproductionSteps: string[] | null;
  routeLabel: string | null;
  sdkVersion: string;
  source: string;
  title: string;
}

export function buildFeedbackInsert(input: PersistFeedbackInput): FeedbackInsertValues {
  return {
    applicationRelease: input.context.applicationRelease ?? null,
    description: input.feedback.description,
    eventId: input.eventId,
    expectedBehavior: input.feedback.expectedBehavior ?? null,
    kind: input.feedback.kind,
    origin: input.origin,
    projectId: input.projectId,
    receiptTimestamp: new Date(input.receivedAt),
    reproductionSteps: input.feedback.reproductionSteps ?? null,
    routeLabel: input.context.routeLabel ?? null,
    sdkVersion: input.context.sdkVersion,
    source: input.source,
    title: input.feedback.title,
  };
}
export type PersistResult =
  | { feedback: Feedback; outcome: "created" }
  | { feedback: Feedback; outcome: "duplicate" };

export async function persistFeedback(db: Db, input: PersistFeedbackInput): Promise<PersistResult> {
  const values = buildFeedbackInsert(input);

  return db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(feedback)
      .values(values)
      .onConflictDoNothing()
      .returning();
    const created = inserted[0];

    if (created !== undefined) {
      return { feedback: created, outcome: "created" };
    }

    const existing = await transaction
      .select()
      .from(feedback)
      .where(and(eq(feedback.projectId, values.projectId), eq(feedback.eventId, values.eventId)))
      .limit(1);
    const stored = existing[0];

    if (stored === undefined) {
      throw new Error("Duplicate flagged but no stored feedback found.");
    }

    return { feedback: stored, outcome: "duplicate" };
  });
}

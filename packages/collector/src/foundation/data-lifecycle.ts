export const FEEDBACK_LIFECYCLE_STATES = [
  "received",
  "accepted",
  "read",
  "expired",
  "deleted",
] as const;

export type FeedbackLifecycleState = (typeof FEEDBACK_LIFECYCLE_STATES)[number];

export const FEEDBACK_RETENTION_HOURS = 24 as const;

export type FeedbackLifecycleEvent =
  | { type: "ACCEPTED" }
  | { type: "CLEANUP" }
  | { type: "EXPIRED" }
  | { type: "LISTED" };

export function transitionFeedback(
  state: FeedbackLifecycleState,
  event: FeedbackLifecycleEvent,
): FeedbackLifecycleState {
  if (state === "received" && event.type === "ACCEPTED") {
    return "accepted";
  }

  if (state === "accepted" && event.type === "LISTED") {
    return "read";
  }

  if (state === "accepted" && event.type === "EXPIRED") {
    return "expired";
  }

  if (state === "read" && event.type === "EXPIRED") {
    return "expired";
  }

  if (state === "expired" && event.type === "CLEANUP") {
    return "deleted";
  }

  return state;
}

export const DUPLICATE_RETRY_OUTCOME = {
  duplicate: true,
  returnsOriginalReceipt: true,
  storesNoNewRow: true,
} as const;

export const RETENTION_POLICY = {
  cleanupIsIdempotent: true,
  feedbackHours: FEEDBACK_RETENTION_HOURS,
  projectsAreNeverDeleted: true,
  rateLimitIdentifiersExpireTogether: true,
} as const;

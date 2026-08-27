import {
  APPROVED_PUBLIC_FEEDBACK_FIELD_IDS,
  type ApprovedPublicFeedbackFields,
} from "./feedback-fields";

export interface ServerDerivedRequestFacts {
  expiresAt: string;
  feedbackId: string;
  receivedAt: string;
  requestOrigin: string;
  source: "web_sdk_unverified";
}

export const SERVER_DERIVED_REQUEST_FACT_IDS = [
  "expiresAt",
  "feedbackId",
  "receivedAt",
  "requestOrigin",
  "source",
] as const satisfies readonly (keyof ServerDerivedRequestFacts)[];

export const SERVER_FACT_PRESENTATION_SOURCES = {
  expiresAt: ["receiptTimestamp", "retentionWindow"],
  feedbackId: ["feedbackId"],
  receivedAt: ["receiptTimestamp"],
  requestOrigin: ["requestOrigin"],
  source: ["source"],
} as const satisfies Record<
  keyof ServerDerivedRequestFacts,
  readonly ("feedbackId" | "receiptTimestamp" | "requestOrigin" | "retentionWindow" | "source")[]
>;

export type InboxFeedbackRecord = ApprovedPublicFeedbackFields & ServerDerivedRequestFacts;

export type InboxListItemViewModel = Pick<
  InboxFeedbackRecord,
  "feedbackId" | "kind" | "receivedAt" | "requestOrigin" | "routeLabel" | "title"
>;

export type InboxDetailViewModel = InboxFeedbackRecord;

export type InboxListViewState =
  | { status: "loading" }
  | { status: "empty" }
  | { items: readonly InboxListItemViewModel[]; status: "ready" }
  | { retryable: boolean; status: "error" };

export type InboxDetailViewState =
  | { status: "loading" }
  | { feedback: InboxDetailViewModel; status: "ready" }
  | { status: "not_found" }
  | { expiredAt: string; status: "expired" }
  | { retryable: boolean; status: "error" };

export const APPROVED_INBOX_SOURCE_FIELDS = [
  ...APPROVED_PUBLIC_FEEDBACK_FIELD_IDS,
  ...SERVER_DERIVED_REQUEST_FACT_IDS,
] as const satisfies readonly (keyof InboxFeedbackRecord)[];

export const INBOX_NON_READY_PRESENTATIONS = {
  empty: {
    body: "Accepted feedback will appear here.",
    heading: "No feedback yet",
    role: "status",
  },
  error: {
    body: "Feedback could not be loaded. Try again.",
    heading: "Unable to load feedback",
    role: "alert",
  },
  expired: {
    body: "This feedback is no longer available because its retention period ended.",
    heading: "Feedback expired",
    role: "status",
  },
  loading: {
    body: "Loading feedback...",
    heading: "Loading",
    role: "status",
  },
  not_found: {
    body: "The feedback may have been removed or the address may be incorrect.",
    heading: "Feedback not found",
    role: "status",
  },
} as const;

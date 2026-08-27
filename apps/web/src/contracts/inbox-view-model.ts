export interface ApprovedPublicFeedbackFields {
  applicationRelease: string | null;
  description: string;
  expectedBehavior: string | null;
  kind: string;
  reproductionSteps: string | null;
  routeLabel: string | null;
  title: string;
}

export interface ServerDerivedRequestFacts {
  expiresAt: string;
  feedbackId: string;
  receivedAt: string;
  requestOrigin: string;
  source: "web_sdk_unverified";
}

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
  "applicationRelease",
  "description",
  "expectedBehavior",
  "expiresAt",
  "feedbackId",
  "kind",
  "receivedAt",
  "reproductionSteps",
  "requestOrigin",
  "routeLabel",
  "source",
  "title",
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

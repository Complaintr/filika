export const UI_STATE_IDS = [
  "idle",
  "unsupported_browser",
  "report_review",
  "invalid_input",
  "submitting",
  "success",
  "duplicate",
  "cancelled",
  "timeout",
  "aborted",
  "collector_rejected",
  "internal_error",
  "outcome_unknown",
] as const;

export type UiStateId = (typeof UI_STATE_IDS)[number];

export interface UiStateContract {
  announcement: string | null;
  blocksHostInteraction: boolean;
  heading: string;
  id: UiStateId;
  primaryAction: "close" | "confirm" | "edit" | "none" | "open_feedback" | "retry";
}

export const UI_STATE_CONTRACTS = {
  aborted: {
    announcement: "Submission stopped.",
    blocksHostInteraction: true,
    heading: "Submission stopped",
    id: "aborted",
    primaryAction: "close",
  },
  cancelled: {
    announcement: "Feedback canceled.",
    blocksHostInteraction: false,
    heading: "Feedback canceled",
    id: "cancelled",
    primaryAction: "none",
  },
  collector_rejected: {
    announcement: "The collector did not accept this feedback.",
    blocksHostInteraction: true,
    heading: "Feedback not accepted",
    id: "collector_rejected",
    primaryAction: "edit",
  },
  duplicate: {
    announcement: "This feedback was already received.",
    blocksHostInteraction: true,
    heading: "Already received",
    id: "duplicate",
    primaryAction: "close",
  },
  idle: {
    announcement: null,
    blocksHostInteraction: false,
    heading: "Send feedback",
    id: "idle",
    primaryAction: "open_feedback",
  },
  internal_error: {
    announcement: "Feedback could not be submitted.",
    blocksHostInteraction: true,
    heading: "Something went wrong",
    id: "internal_error",
    primaryAction: "retry",
  },
  invalid_input: {
    announcement: "Check the highlighted feedback fields.",
    blocksHostInteraction: true,
    heading: "Check the report",
    id: "invalid_input",
    primaryAction: "edit",
  },
  outcome_unknown: {
    announcement: "Filika could not confirm whether the feedback was received.",
    blocksHostInteraction: true,
    heading: "Submission status unknown",
    id: "outcome_unknown",
    primaryAction: "retry",
  },
  report_review: {
    announcement: null,
    blocksHostInteraction: true,
    heading: "Review feedback",
    id: "report_review",
    primaryAction: "confirm",
  },
  submitting: {
    announcement: "Submitting feedback.",
    blocksHostInteraction: true,
    heading: "Submitting feedback",
    id: "submitting",
    primaryAction: "none",
  },
  success: {
    announcement: "Feedback received.",
    blocksHostInteraction: true,
    heading: "Feedback received",
    id: "success",
    primaryAction: "close",
  },
  timeout: {
    announcement: "The collector did not respond in time.",
    blocksHostInteraction: true,
    heading: "Submission timed out",
    id: "timeout",
    primaryAction: "retry",
  },
  unsupported_browser: {
    announcement: "Browser agent feedback is unavailable. Manual feedback is still available.",
    blocksHostInteraction: false,
    heading: "Browser agent unavailable",
    id: "unsupported_browser",
    primaryAction: "open_feedback",
  },
} as const satisfies Record<UiStateId, UiStateContract>;

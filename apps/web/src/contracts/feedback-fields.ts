export const AGENT_AUTHORED_REPORT_FIELD_IDS = [
  "kind",
  "title",
  "description",
  "expectedBehavior",
  "reproductionSteps",
] as const;

export const HOST_CONTEXT_REPORT_FIELD_IDS = ["routeLabel", "applicationRelease"] as const;

export const REPORT_FIELD_IDS = [
  ...AGENT_AUTHORED_REPORT_FIELD_IDS,
  ...HOST_CONTEXT_REPORT_FIELD_IDS,
] as const;

export type ReportFieldId = (typeof REPORT_FIELD_IDS)[number];
export type FeedbackDraft = Record<ReportFieldId, string | null>;

export const REQUIRED_REPORT_FIELD_IDS = ["kind", "title", "description"] as const;
export type RequiredReportFieldId = (typeof REQUIRED_REPORT_FIELD_IDS)[number];

export const APPROVED_PUBLIC_FEEDBACK_FIELD_IDS = REPORT_FIELD_IDS;
export type ApprovedPublicFeedbackFieldId = (typeof APPROVED_PUBLIC_FEEDBACK_FIELD_IDS)[number];
export type ApprovedPublicFeedbackFields = {
  [Field in ApprovedPublicFeedbackFieldId]: Field extends RequiredReportFieldId
    ? string
    : string | null;
};

export interface ReportFieldContract {
  accessibleDescription: string;
  clearable: boolean;
  editable: boolean;
  label: string;
  removable: boolean;
  requiredForSubmission: boolean;
  shownInReceipt: false;
}

export const REPORT_FIELD_CONTRACTS = {
  applicationRelease: {
    accessibleDescription:
      "The application release supplied by the host. Remove it if it should not be submitted.",
    clearable: false,
    editable: false,
    label: "Application release",
    removable: true,
    requiredForSubmission: false,
    shownInReceipt: false,
  },
  description: {
    accessibleDescription: "Describe what happened and why it was a problem.",
    clearable: true,
    editable: true,
    label: "What happened?",
    removable: false,
    requiredForSubmission: true,
    shownInReceipt: false,
  },
  expectedBehavior: {
    accessibleDescription: "Optionally describe what you expected to happen instead.",
    clearable: true,
    editable: true,
    label: "Expected behavior",
    removable: true,
    requiredForSubmission: false,
    shownInReceipt: false,
  },
  kind: {
    accessibleDescription: "Choose the option that best describes this feedback.",
    clearable: true,
    editable: true,
    label: "Feedback type",
    removable: false,
    requiredForSubmission: true,
    shownInReceipt: false,
  },
  reproductionSteps: {
    accessibleDescription: "Optionally list the steps that make the problem happen.",
    clearable: true,
    editable: true,
    label: "Steps to reproduce",
    removable: true,
    requiredForSubmission: false,
    shownInReceipt: false,
  },
  routeLabel: {
    accessibleDescription:
      "The page label supplied by the host. Remove it if it should not be submitted.",
    clearable: false,
    editable: false,
    label: "Page",
    removable: true,
    requiredForSubmission: false,
    shownInReceipt: false,
  },
  title: {
    accessibleDescription: "Write a short summary that helps maintainers identify the report.",
    clearable: true,
    editable: true,
    label: "Summary",
    removable: false,
    requiredForSubmission: true,
    shownInReceipt: false,
  },
} as const satisfies Record<ReportFieldId, ReportFieldContract>;

export const RECEIPT_VISIBLE_FIELDS = ["feedbackId", "receivedAt", "duplicate"] as const;

export function createEmptyFeedbackDraft(seed: Partial<FeedbackDraft> = {}): FeedbackDraft {
  return {
    applicationRelease: null,
    description: null,
    expectedBehavior: null,
    kind: null,
    reproductionSteps: null,
    routeLabel: null,
    title: null,
    ...seed,
  };
}

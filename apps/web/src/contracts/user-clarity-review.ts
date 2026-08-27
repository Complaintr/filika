import { REPORT_FIELD_CONTRACTS, type ReportFieldId } from "./feedback-fields";

export interface UserClarityFinding {
  decision: "approved";
  field: ReportFieldId;
  label: string;
  rationale: string;
}

export const FILIKA_SUBMIT_FEEDBACK_CLARITY_REVIEW = {
  description:
    "Open a review dialog with a feedback draft. The feedback is sent only after the user reviews and confirms it.",
  name: "filika_submit_feedback",
  reviewChecks: {
    describesReviewBeforeSending: true,
    distinguishesDraftingFromSubmission: true,
    namesTheUserVisibleAction: true,
    usesImplementationJargon: false,
  },
  title: "Draft feedback for review",
} as const;

export const REPORT_FIELD_CLARITY_FINDINGS = [
  {
    decision: "approved",
    field: "kind",
    label: REPORT_FIELD_CONTRACTS.kind.label,
    rationale: "Asks the person to classify the feedback without exposing protocol terminology.",
  },
  {
    decision: "approved",
    field: "title",
    label: REPORT_FIELD_CONTRACTS.title.label,
    rationale: "Requests a short recognizable summary in plain language.",
  },
  {
    decision: "approved",
    field: "description",
    label: REPORT_FIELD_CONTRACTS.description.label,
    rationale: "Uses a direct question that explains what information belongs in the field.",
  },
  {
    decision: "approved",
    field: "expectedBehavior",
    label: REPORT_FIELD_CONTRACTS.expectedBehavior.label,
    rationale: "Clearly marks the comparison with what actually happened as optional.",
  },
  {
    decision: "approved",
    field: "reproductionSteps",
    label: REPORT_FIELD_CONTRACTS.reproductionSteps.label,
    rationale: "Uses familiar issue-report language and explicitly allows omission.",
  },
  {
    decision: "approved",
    field: "routeLabel",
    label: REPORT_FIELD_CONTRACTS.routeLabel.label,
    rationale: "Presents host-supplied route context as a removable page label.",
  },
  {
    decision: "approved",
    field: "applicationRelease",
    label: REPORT_FIELD_CONTRACTS.applicationRelease.label,
    rationale: "Explains the host-supplied release value and the person's option to remove it.",
  },
] as const satisfies readonly UserClarityFinding[];

export const USER_CLARITY_REVIEW_DECISION = {
  approvedFieldCount: REPORT_FIELD_CLARITY_FINDINGS.length,
  decision: "approved",
  requiresUserConfirmationBeforeSending: true,
  reviewedFromPerspective: "person reviewing agent-authored feedback",
} as const;

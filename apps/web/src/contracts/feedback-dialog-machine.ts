import {
  createEmptyFeedbackDraft,
  type FeedbackDraft,
  REPORT_FIELD_CONTRACTS,
  REPORT_FIELD_IDS,
  type ReportFieldId,
} from "./feedback-fields";

export const SDK_EXECUTION_OUTCOMES = [
  "success",
  "invalid_input",
  "cancelled",
  "timeout",
  "aborted",
  "collector_rejected",
  "internal_error",
  "outcome_unknown",
] as const;

export type SdkExecutionOutcome = (typeof SDK_EXECUTION_OUTCOMES)[number];
export type DialogInvocationSource = "manual" | "webmcp";

export interface ReceiptViewModel {
  duplicate: boolean;
  feedbackId: string;
  receivedAt: string;
}

export interface DialogValidationIssue {
  field: ReportFieldId | "form";
  message: "Check this field." | "The report could not be validated." | "This field is required.";
}

interface DialogSession {
  draft: FeedbackDraft;
  source: DialogInvocationSource;
}

export type FeedbackDialogState =
  | { status: "closed" }
  | (DialogSession & { issues: readonly DialogValidationIssue[]; status: "editing" })
  | (DialogSession & { status: "confirming" })
  | (DialogSession & { status: "submitting" })
  | (DialogSession & { receipt: ReceiptViewModel; status: "success" })
  | (DialogSession & { issues: readonly DialogValidationIssue[]; status: "invalid_input" })
  | (DialogSession & {
      status:
        | "aborted"
        | "cancelled"
        | "collector_rejected"
        | "internal_error"
        | "outcome_unknown"
        | "timeout";
    });

export type SdkExecutionResult =
  | { outcome: "success"; receipt: ReceiptViewModel }
  | { issues?: readonly DialogValidationIssue[]; outcome: "invalid_input" }
  | {
      outcome:
        | "aborted"
        | "cancelled"
        | "collector_rejected"
        | "internal_error"
        | "outcome_unknown"
        | "timeout";
    };

export type FeedbackDialogEvent =
  | { draft?: Partial<FeedbackDraft>; source: DialogInvocationSource; type: "OPEN" }
  | { field: ReportFieldId; type: "SET_FIELD"; value: string }
  | { field: ReportFieldId; type: "CLEAR_FIELD" }
  | { field: ReportFieldId; type: "REMOVE_FIELD" }
  | { type: "REVIEW" }
  | { type: "EDIT" }
  | { type: "CONFIRM" }
  | { type: "CANCEL" }
  | { result: SdkExecutionResult; type: "RESOLVE" }
  | { type: "RETRY" }
  | { type: "CLOSE" };

export const INITIAL_FEEDBACK_DIALOG_STATE: FeedbackDialogState = { status: "closed" };

const requiredFieldIds = REPORT_FIELD_IDS.filter(
  (field) => REPORT_FIELD_CONTRACTS[field].requiredForSubmission,
);

export function validateDraftForReview(draft: FeedbackDraft): readonly DialogValidationIssue[] {
  return requiredFieldIds.flatMap((field) => {
    const value = draft[field];

    return value === null || value.trim() === ""
      ? [{ field, message: "This field is required." as const }]
      : [];
  });
}

function updateField(
  state: Extract<FeedbackDialogState, { status: "editing" }>,
  field: ReportFieldId,
  value: string | null,
): FeedbackDialogState {
  return {
    ...state,
    draft: { ...state.draft, [field]: value },
    issues: state.issues.filter((issue) => issue.field !== field),
  };
}

function resolveExecution(
  state: Extract<FeedbackDialogState, { status: "submitting" }>,
  result: SdkExecutionResult,
): FeedbackDialogState {
  if (result.outcome === "success") {
    return { ...state, receipt: result.receipt, status: "success" };
  }

  if (result.outcome === "invalid_input") {
    return {
      ...state,
      issues: result.issues ?? [
        {
          field: "form",
          message: "The report could not be validated.",
        },
      ],
      status: "invalid_input",
    };
  }

  return { ...state, status: result.outcome };
}

export function transitionFeedbackDialog(
  state: FeedbackDialogState,
  event: FeedbackDialogEvent,
): FeedbackDialogState {
  if (event.type === "OPEN" && state.status === "closed") {
    return {
      draft: createEmptyFeedbackDraft(event.draft),
      issues: [],
      source: event.source,
      status: "editing",
    };
  }

  if (event.type === "CLOSE" && state.status !== "submitting") {
    return INITIAL_FEEDBACK_DIALOG_STATE;
  }

  if (state.status === "editing") {
    if (event.type === "SET_FIELD" && REPORT_FIELD_CONTRACTS[event.field].editable) {
      return updateField(state, event.field, event.value);
    }

    if (event.type === "CLEAR_FIELD" && REPORT_FIELD_CONTRACTS[event.field].clearable) {
      return updateField(state, event.field, "");
    }

    if (event.type === "REMOVE_FIELD" && REPORT_FIELD_CONTRACTS[event.field].removable) {
      return updateField(state, event.field, null);
    }

    if (event.type === "REVIEW") {
      const issues = validateDraftForReview(state.draft);

      return issues.length === 0 ? { ...state, status: "confirming" } : { ...state, issues };
    }

    if (event.type === "CANCEL") {
      return { draft: state.draft, source: state.source, status: "cancelled" };
    }
  }

  if (state.status === "confirming") {
    if (event.type === "EDIT") {
      return { ...state, issues: [], status: "editing" };
    }

    if (event.type === "CONFIRM") {
      return { ...state, status: "submitting" };
    }

    if (event.type === "CANCEL") {
      return { ...state, status: "cancelled" };
    }
  }

  if (state.status === "submitting") {
    if (event.type === "RESOLVE") {
      return resolveExecution(state, event.result);
    }

    if (event.type === "CANCEL") {
      return { ...state, status: "aborted" };
    }
  }

  if (state.status === "invalid_input" && event.type === "EDIT") {
    return { ...state, status: "editing" };
  }

  if (state.status === "collector_rejected" && event.type === "EDIT") {
    return { ...state, issues: [], status: "editing" };
  }

  if (
    (state.status === "timeout" ||
      state.status === "internal_error" ||
      state.status === "outcome_unknown") &&
    event.type === "RETRY"
  ) {
    return { ...state, status: "submitting" };
  }

  return state;
}

export const NATIVE_DIALOG_CONTRACT = {
  attributes: {
    "aria-describedby": "filika-feedback-description",
    "aria-labelledby": "filika-feedback-title",
  },
  cancelBehavior: {
    escapeKey: "dispatch_cancel",
    submittingOutcome: "aborted",
  },
  descriptionId: "filika-feedback-description",
  dialogId: "filika-feedback-dialog",
  element: "dialog",
  errorPresentation: {
    fieldErrorIdPattern: "filika-{field}-error",
    fieldUsesAriaDescribedBy: true,
    fieldUsesAriaInvalid: true,
    focusFirstInvalidField: true,
    summaryId: "filika-feedback-errors",
    summaryLinksFocusInvalidField: true,
    summaryRole: "alert",
  },
  focusOrder: {
    confirming: ["filika-edit", "filika-confirm", "filika-cancel"],
    editing: [
      "filika-kind",
      "filika-title",
      "filika-description-field",
      "filika-expected-behavior",
      "filika-reproduction-steps",
      "filika-route-label-remove",
      "filika-application-release-remove",
      "filika-review",
      "filika-cancel",
    ],
    outcome: ["filika-outcome-primary", "filika-close"],
  },
  initialFocusId: "filika-kind",
  labelId: "filika-feedback-title",
  liveRegion: {
    atomic: true,
    id: "filika-feedback-status",
    politeness: "polite",
    role: "status",
  },
  removalControlAccessibleNames: {
    applicationRelease: "Remove application release",
    routeLabel: "Remove page",
  },
  requiredMarkup: [
    {
      attributes: {
        "aria-describedby": "filika-feedback-description",
        "aria-labelledby": "filika-feedback-title",
      },
      element: "dialog",
      id: "filika-feedback-dialog",
    },
    { element: "h2", id: "filika-feedback-title" },
    { element: "p", id: "filika-feedback-description" },
    {
      attributes: { role: "alert", tabindex: "-1" },
      element: "div",
      id: "filika-feedback-errors",
    },
    {
      attributes: { "aria-atomic": "true", "aria-live": "polite", role: "status" },
      element: "div",
      id: "filika-feedback-status",
    },
  ],
  restoreFocusToInvoker: true,
  showMethod: "showModal",
  usesShowModal: true,
} as const;

export const MANUAL_FEEDBACK_BUTTON_CONTRACT = {
  accessibleName: "Send feedback",
  dependsOnWebMcp: false,
  element: "button",
  text: "Send feedback",
  type: "button",
} as const;

export const FILIKA_OPEN_INTERACTION_CONTRACT = {
  arguments: "none",
  concurrentCallBehavior: "focus_existing_dialog_and_share_active_result",
  expectedFailureBehavior: "resolve_with_internal_error_outcome",
  opensEmptyManualDraft: true,
  returnType: "Promise<SdkExecutionResult>",
} as const;

export interface FilikaUiApi {
  open(): Promise<SdkExecutionResult>;
}

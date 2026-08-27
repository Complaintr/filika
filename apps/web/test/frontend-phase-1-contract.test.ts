import { describe, expect, test } from "bun:test";

import {
  type FeedbackDialogState,
  FILIKA_OPEN_INTERACTION_CONTRACT,
  INITIAL_FEEDBACK_DIALOG_STATE,
  MANUAL_FEEDBACK_BUTTON_CONTRACT,
  NATIVE_DIALOG_CONTRACT,
  SDK_EXECUTION_OUTCOMES,
  type SdkExecutionResult,
  transitionFeedbackDialog,
} from "../src/contracts/feedback-dialog-machine";
import {
  createEmptyFeedbackDraft,
  RECEIPT_VISIBLE_FIELDS,
  REPORT_FIELD_CONTRACTS,
  REPORT_FIELD_IDS,
} from "../src/contracts/feedback-fields";
import {
  APPROVED_INBOX_SOURCE_FIELDS,
  INBOX_NON_READY_PRESENTATIONS,
} from "../src/contracts/inbox-view-model";

const completeDraft = createEmptyFeedbackDraft({
  description: "The save action did not complete.",
  kind: "bug",
  title: "Save action failed",
});

function createSubmittingState(): Extract<FeedbackDialogState, { status: "submitting" }> {
  const editing = transitionFeedbackDialog(INITIAL_FEEDBACK_DIALOG_STATE, {
    draft: completeDraft,
    source: "webmcp",
    type: "OPEN",
  });
  const confirming = transitionFeedbackDialog(editing, { type: "REVIEW" });
  const submitting = transitionFeedbackDialog(confirming, { type: "CONFIRM" });

  if (submitting.status !== "submitting") {
    throw new Error("Expected the dialog to reach the submitting state.");
  }

  return submitting;
}

describe("P1-FE-01 dialog state machine", () => {
  test("blocks review until every required field has a value", () => {
    const editing = transitionFeedbackDialog(INITIAL_FEEDBACK_DIALOG_STATE, {
      source: "manual",
      type: "OPEN",
    });
    const result = transitionFeedbackDialog(editing, { type: "REVIEW" });

    expect(result.status).toBe("editing");
    if (result.status === "editing") {
      expect(result.issues.map((issue) => issue.field)).toEqual(["kind", "title", "description"]);
    }
  });

  test("moves a complete report through review and confirmation", () => {
    expect(createSubmittingState().draft).toEqual(completeDraft);
  });

  test("maps every SDK execution outcome to an explicit state", () => {
    const receipt = {
      duplicate: false,
      feedbackId: "feedback-123",
      receivedAt: "2026-08-27T08:00:00.000Z",
    };
    const results: readonly SdkExecutionResult[] = SDK_EXECUTION_OUTCOMES.map((outcome) => {
      if (outcome === "success") {
        return { outcome, receipt };
      }

      return { outcome };
    });

    const states = results.map((result) =>
      transitionFeedbackDialog(createSubmittingState(), { result, type: "RESOLVE" }),
    );

    expect(states.map((state) => state.status)).toEqual(SDK_EXECUTION_OUTCOMES);
  });

  test("does not open an overlapping session", () => {
    const active = transitionFeedbackDialog(INITIAL_FEEDBACK_DIALOG_STATE, {
      draft: completeDraft,
      source: "manual",
      type: "OPEN",
    });

    expect(
      transitionFeedbackDialog(active, {
        source: "webmcp",
        type: "OPEN",
      }),
    ).toBe(active);
  });

  test("retries only timeout, internal error, and unknown outcomes", () => {
    for (const status of ["timeout", "internal_error", "outcome_unknown"] as const) {
      expect(
        transitionFeedbackDialog(
          { draft: completeDraft, source: "webmcp", status },
          { type: "RETRY" },
        ).status,
      ).toBe("submitting");
    }

    expect(
      transitionFeedbackDialog(
        { draft: completeDraft, source: "webmcp", status: "collector_rejected" },
        { type: "RETRY" },
      ).status,
    ).toBe("collector_rejected");
  });
});

describe("P1-FE-02 field behavior", () => {
  test("defines behavior for every approved UI report field", () => {
    expect(Object.keys(REPORT_FIELD_CONTRACTS).sort()).toEqual([...REPORT_FIELD_IDS].sort());
  });

  test("requires the core report and makes optional fields removable", () => {
    expect(REPORT_FIELD_CONTRACTS.kind.requiredForSubmission).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.title.requiredForSubmission).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.description.requiredForSubmission).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.expectedBehavior.removable).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.reproductionSteps.removable).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.routeLabel.removable).toBe(true);
    expect(REPORT_FIELD_CONTRACTS.applicationRelease.removable).toBe(true);
  });

  test("keeps host context read-only but removable", () => {
    const editing = transitionFeedbackDialog(INITIAL_FEEDBACK_DIALOG_STATE, {
      draft: { routeLabel: "Settings" },
      source: "manual",
      type: "OPEN",
    });
    const attemptedEdit = transitionFeedbackDialog(editing, {
      field: "routeLabel",
      type: "SET_FIELD",
      value: "Private page",
    });
    const removed = transitionFeedbackDialog(attemptedEdit, {
      field: "routeLabel",
      type: "REMOVE_FIELD",
    });

    expect(attemptedEdit).toBe(editing);
    if (removed.status === "editing") {
      expect(removed.draft.routeLabel).toBeNull();
    }
  });

  test("keeps submitted report text out of the receipt", () => {
    expect(RECEIPT_VISIBLE_FIELDS).toEqual(["feedbackId", "receivedAt", "duplicate"]);
    expect(REPORT_FIELD_IDS.every((field) => !REPORT_FIELD_CONTRACTS[field].shownInReceipt)).toBe(
      true,
    );
  });
});

describe("P1-FE-03 and P1-FE-04 interaction contracts", () => {
  test("defines a labelled native modal dialog and deterministic focus order", () => {
    expect(NATIVE_DIALOG_CONTRACT.element).toBe("dialog");
    expect(NATIVE_DIALOG_CONTRACT.usesShowModal).toBe(true);
    expect(NATIVE_DIALOG_CONTRACT.labelId).toBeTruthy();
    expect(NATIVE_DIALOG_CONTRACT.descriptionId).toBeTruthy();
    expect(NATIVE_DIALOG_CONTRACT.focusOrder.editing.at(-1)).toBe("filika-cancel");
    expect(NATIVE_DIALOG_CONTRACT.restoreFocusToInvoker).toBe(true);
  });

  test("keeps manual feedback available without WebMCP", () => {
    expect(MANUAL_FEEDBACK_BUTTON_CONTRACT.type).toBe("button");
    expect(MANUAL_FEEDBACK_BUTTON_CONTRACT.dependsOnWebMcp).toBe(false);
    expect(FILIKA_OPEN_INTERACTION_CONTRACT.arguments).toBe("none");
    expect(FILIKA_OPEN_INTERACTION_CONTRACT.concurrentCallBehavior).toContain(
      "focus_existing_dialog",
    );
  });
});

describe("P1-FE-05 and P1-FE-06 inbox contracts", () => {
  test("allows only public report fields and server-derived request facts", () => {
    expect(APPROVED_INBOX_SOURCE_FIELDS).not.toContain("pageContent");
    expect(APPROVED_INBOX_SOURCE_FIELDS).not.toContain("screenshot");
    expect(APPROVED_INBOX_SOURCE_FIELDS).not.toContain("credentials");
    expect(APPROVED_INBOX_SOURCE_FIELDS).not.toContain("browsingHistory");
    expect(APPROVED_INBOX_SOURCE_FIELDS).not.toContain("userAgent");
  });

  test("defines every required non-ready state with bounded copy", () => {
    expect(Object.keys(INBOX_NON_READY_PRESENTATIONS).sort()).toEqual(
      ["empty", "error", "expired", "loading", "not_found"].sort(),
    );
    expect(INBOX_NON_READY_PRESENTATIONS.error.role).toBe("alert");
    expect(INBOX_NON_READY_PRESENTATIONS.expired.body).not.toContain("description");
  });
});

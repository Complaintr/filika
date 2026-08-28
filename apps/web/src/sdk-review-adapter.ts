/**
 * SDK review bridge adapter.
 *
 * Listens for the `filika:review` custom event dispatched by the SDK and opens
 * the feedback dialog, then completes the SDK review promise with the user's
 * decision. This module keeps the bridge logic isolated from the main app
 * wiring.
 */

import type { FeedbackDialog } from "./components/feedback-dialog";
import type { FeedbackDraft } from "./contracts/feedback-fields";
import type { SdkExecutionResult } from "./contracts/feedback-dialog-machine";

export interface ReviewEventDetail {
  readonly request: {
    readonly draft: {
      readonly kind: string;
      readonly title: string;
      readonly description: string;
      readonly expectedBehavior?: string;
      readonly reproductionSteps?: readonly string[];
    } | null;
    readonly context: {
      readonly sdkVersion: string;
      readonly routeLabel?: string;
      readonly applicationRelease?: string;
    };
    readonly projectKey: string;
    readonly collectorOrigin: string;
    readonly signal: AbortSignal;
    readonly retry?: {
      readonly eventId: string;
      readonly feedback: {
        readonly kind: string;
        readonly title: string;
        readonly description: string;
        readonly expectedBehavior?: string;
        readonly reproductionSteps?: readonly string[];
      };
      readonly context: {
        readonly sdkVersion: string;
        readonly routeLabel?: string;
        readonly applicationRelease?: string;
      };
    };
  };
  complete(decision: unknown): void;
}

/**
 * Map an SDK draft (which uses `reproductionSteps` as `string[]`) to the
 * dialog's `FeedbackDraft` (which uses `reproductionSteps` as a single
 * `string | null`).
 */
function sdkDraftToDialogDraft(
  sdkDraft: ReviewEventDetail["request"]["draft"],
  context: ReviewEventDetail["request"]["context"],
): Partial<FeedbackDraft> {
  const draft: Partial<FeedbackDraft> = {};

  if (sdkDraft !== null) {
    draft.kind = sdkDraft.kind;
    draft.title = sdkDraft.title;
    draft.description = sdkDraft.description;
    if (sdkDraft.expectedBehavior !== undefined) {
      draft.expectedBehavior = sdkDraft.expectedBehavior;
    }
    if (sdkDraft.reproductionSteps !== undefined && sdkDraft.reproductionSteps.length > 0) {
      draft.reproductionSteps = sdkDraft.reproductionSteps.join("\n");
    }
  }

  if (context.routeLabel !== undefined) {
    draft.routeLabel = context.routeLabel;
  }
  if (context.applicationRelease !== undefined) {
    draft.applicationRelease = context.applicationRelease;
  }

  return draft;
}

/**
 * Map the dialog result back to an SDK review decision.
 *
 * The SDK expects one of:
 * - `{ kind: "confirmed", feedback, context }`
 * - `{ kind: "cancelled" }`
 * - `{ kind: "retry" }`
 */
function dialogResultToSdkDecision(
  result: SdkExecutionResult,
  dialogDraft: FeedbackDraft,
  originalContext: ReviewEventDetail["request"]["context"],
): unknown {
  if (result.outcome === "cancelled" || result.outcome === "aborted") {
    return { kind: "cancelled" };
  }

  if (result.outcome === "success") {
    // The dialog handled confirmation already; this path shouldn't
    // normally fire since we resolve before submission, but handle
    // it defensively.
    return { kind: "cancelled" };
  }

  // Build the confirmed feedback from the dialog's draft state.
  const feedback: Record<string, unknown> = {
    kind: dialogDraft.kind ?? "",
    title: dialogDraft.title ?? "",
    description: dialogDraft.description ?? "",
  };
  if (dialogDraft.expectedBehavior !== null && dialogDraft.expectedBehavior !== "") {
    feedback.expectedBehavior = dialogDraft.expectedBehavior;
  }
  if (dialogDraft.reproductionSteps !== null && dialogDraft.reproductionSteps !== "") {
    feedback.reproductionSteps = dialogDraft.reproductionSteps
      .split("\n")
      .map((step) => step.trim())
      .filter((step) => step.length > 0);
  }

  const context: Record<string, unknown> = {
    sdkVersion: originalContext.sdkVersion,
  };
  if (dialogDraft.routeLabel !== null && dialogDraft.routeLabel !== "") {
    context.routeLabel = dialogDraft.routeLabel;
  }
  if (dialogDraft.applicationRelease !== null && dialogDraft.applicationRelease !== "") {
    context.applicationRelease = dialogDraft.applicationRelease;
  }

  return { kind: "confirmed", feedback, context };
}

export interface ReviewAdapterCallbacks {
  onReceipt?(receipt: { feedbackId: string; receivedAt: string; duplicate: boolean }): void;
}

/**
 * Install the review bridge adapter on the given document. Returns a dispose
 * function that removes the listener.
 */
export function installReviewAdapter(
  target: Document,
  feedbackDialog: FeedbackDialog,
  callbacks: ReviewAdapterCallbacks = {},
): () => void {
  const handler = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as ReviewEventDetail;
    if (detail?.request === undefined || typeof detail.complete !== "function") {
      return;
    }

    // Claim the review so the SDK knows a UI is handling it.
    event.preventDefault();

    const { request } = detail;
    const isRetry = request.retry !== undefined;
    const sdkDraft = isRetry ? request.retry.feedback : request.draft;
    const sdkContext = isRetry ? request.retry.context : request.context;
    const dialogDraft = sdkDraftToDialogDraft(sdkDraft ?? null, sdkContext);
    const source = "webmcp" as const;

    // Open the dialog and bridge the resolution. The dialog's own submit
    // callback is replaced: instead of making a network request, we
    // resolve the SDK review promise. The SDK handles the actual HTTP
    // request.
    void feedbackDialog.open(dialogDraft, source).then((result) => {
      if (isRetry && result.outcome !== "cancelled" && result.outcome !== "aborted") {
        detail.complete({ kind: "retry" });
        return;
      }

      if (result.outcome === "success" && result.receipt !== undefined) {
        callbacks.onReceipt?.({
          feedbackId: result.receipt.feedbackId,
          receivedAt: result.receipt.receivedAt,
          duplicate: result.receipt.duplicate,
        });
      }

      const state = feedbackDialog.state;
      const currentDraft =
        state.status !== "closed" && "draft" in state
          ? state.draft
          : {
              kind: null,
              title: null,
              description: null,
              expectedBehavior: null,
              reproductionSteps: null,
              routeLabel: null,
              applicationRelease: null,
            };

      detail.complete(dialogResultToSdkDecision(result, currentDraft, request.context));
    });
  };

  target.addEventListener("filika:review", handler);
  return () => target.removeEventListener("filika:review", handler);
}

/**
 * SDK review bridge adapter.
 *
 * Listens for the `filika:review` custom event dispatched by the SDK bundle
 * and opens the FeedbackDialog. When the user confirms, the adapter resolves
 * the SDK review promise with the confirmed decision so the SDK can transmit
 * to the collector. A receipt toast handles the visible outcome.
 *
 * For the manual-button path (no SDK involved) the dialog uses its own submit
 * callback and this adapter is not involved.
 */

import type { FeedbackDialog } from "./components/feedback-dialog";
import type { FeedbackDraft, ReportFieldId } from "./contracts/feedback-fields";
import type {
  DialogInvocationSource,
  SdkExecutionResult,
} from "./contracts/feedback-dialog-machine";

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
function sdkDraftToDialogSeed(
  sdkDraft: ReviewEventDetail["request"]["draft"],
  context: ReviewEventDetail["request"]["context"],
): Partial<FeedbackDraft> {
  const seed: Partial<FeedbackDraft> = {};

  if (sdkDraft !== null) {
    seed.kind = sdkDraft.kind;
    seed.title = sdkDraft.title;
    seed.description = sdkDraft.description;
    if (sdkDraft.expectedBehavior !== undefined) {
      seed.expectedBehavior = sdkDraft.expectedBehavior;
    }
    if (sdkDraft.reproductionSteps !== undefined && sdkDraft.reproductionSteps.length > 0) {
      seed.reproductionSteps = sdkDraft.reproductionSteps.join("\n");
    }
  }

  if (context.routeLabel !== undefined) {
    seed.routeLabel = context.routeLabel;
  }
  if (context.applicationRelease !== undefined) {
    seed.applicationRelease = context.applicationRelease;
  }

  return seed;
}

/**
 * Read the dialog's current draft state and build the SDK review decision
 * for confirmation. Returns `{ kind: "confirmed", feedback, context }`.
 */
function buildConfirmedDecision(
  draft: FeedbackDraft,
  originalContext: ReviewEventDetail["request"]["context"],
): unknown {
  const feedback: Record<string, unknown> = {
    kind: draft.kind ?? "",
    title: draft.title ?? "",
    description: draft.description ?? "",
  };
  if (draft.expectedBehavior !== null && draft.expectedBehavior !== "") {
    feedback.expectedBehavior = draft.expectedBehavior;
  }
  if (draft.reproductionSteps !== null && draft.reproductionSteps !== "") {
    feedback.reproductionSteps = draft.reproductionSteps
      .split("\n")
      .map((step) => step.trim())
      .filter((step) => step.length > 0);
  }

  const context: Record<string, unknown> = {
    sdkVersion: originalContext.sdkVersion,
  };
  if (draft.routeLabel !== null && draft.routeLabel !== "") {
    context.routeLabel = draft.routeLabel;
  }
  if (draft.applicationRelease !== null && draft.applicationRelease !== "") {
    context.applicationRelease = draft.applicationRelease;
  }

  return { kind: "confirmed", feedback, context };
}

/**
 * Extract the current draft from the dialog's state. Returns `null` if the
 * dialog is in a state without a draft (e.g. closed).
 */
function readDialogDraft(dialog: FeedbackDialog): FeedbackDraft | null {
  const state = dialog.state;
  if (state.status === "closed") {
    return null;
  }
  if ("draft" in state) {
    return state.draft;
  }
  return null;
}

export interface ReviewAdapterCallbacks {
  /** Called when a receipt is received after successful SDK transmission. */
  onReceipt?(receipt: { feedbackId: string; receivedAt: string; duplicate: boolean }): void;
}

const REVIEW_EVENT_NAME = "filika:review";

/**
 * Install the review bridge adapter on the given document. Returns a dispose
 * function that removes the listener.
 *
 * Flow:
 * 1. SDK dispatches `filika:review` event on document
 * 2. Adapter catches event, calls `event.preventDefault()` to claim review
 * 3. Adapter opens the FeedbackDialog with the agent's draft
 * 4. User reviews, edits, and confirms
 * 5. Dialog transitions to "submitting" → adapter's submit callback fires
 * 6. Submit callback resolves the SDK review with `{ kind: "confirmed" }`
 * 7. SDK receives the confirmed decision and transmits to the collector
 * 8. SDK returns result; adapter maps it to an `SdkExecutionResult`
 * 9. Adapter reports receipt via callback (for toast display)
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

    const detail = event.detail as ReviewEventDetail | undefined;
    if (detail?.request === undefined || typeof detail.complete !== "function") {
      return;
    }

    // Claim the review so the SDK knows a UI is handling it.
    event.preventDefault();

    const { request } = detail;
    const isRetry = request.retry !== undefined;
    const sdkDraft = isRetry ? request.retry.feedback : request.draft;
    const sdkContext = isRetry ? request.retry.context : request.context;
    const dialogSeed = sdkDraftToDialogSeed(sdkDraft ?? null, sdkContext);
    const source: DialogInvocationSource = "webmcp";

    // For retry, tell the SDK to reuse its retained submission.
    if (isRetry) {
      detail.complete({ kind: "retry" });
      return;
    }

    // Open the dialog. The dialog result is used after we've already
    // resolved the SDK review (the dialog's own submit callback does
    // the resolution). We handle the dialog result for receipt display.
    void feedbackDialog.open(dialogSeed, source).then((result: SdkExecutionResult) => {
      if (result.outcome === "success" && result.receipt !== undefined) {
        callbacks.onReceipt?.({
          feedbackId: result.receipt.feedbackId,
          receivedAt: result.receipt.receivedAt,
          duplicate: result.receipt.duplicate,
        });
      }
    });
  };

  target.addEventListener(REVIEW_EVENT_NAME, handler);
  return () => target.removeEventListener(REVIEW_EVENT_NAME, handler);
}

export { sdkDraftToDialogSeed, buildConfirmedDecision, readDialogDraft };
export type { DialogInvocationSource, ReportFieldId };

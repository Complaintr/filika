import type {
  FilikaExecutionOutcome,
  FilikaFeedbackDraftV1,
  FilikaPublicApi,
  ReviewEventDetail,
  ReviewRequest,
} from "@filika/sdk";
import { FeedbackDialog } from "./components/feedback-dialog";
import type { SdkExecutionResult } from "./contracts/feedback-dialog-machine";
import type { FeedbackDraft } from "./contracts/feedback-fields";

export function dialogResult(result: FilikaExecutionOutcome): SdkExecutionResult {
  if (result.code !== "success") return { outcome: result.code };
  const { duplicate, feedbackId, receivedAt } = result.receipt;
  return { outcome: "success", receipt: { duplicate, feedbackId, receivedAt } };
}

export function reviewDraft(request: ReviewRequest): Partial<FeedbackDraft> {
  return {
    kind: request.draft?.kind ?? null,
    title: request.draft?.title ?? null,
    description: request.draft?.description ?? null,
    expectedBehavior: request.draft?.expectedBehavior ?? null,
    reproductionSteps: request.draft?.reproductionSteps?.join("\n") ?? null,
    routeLabel: request.context.routeLabel ?? null,
    applicationRelease: request.context.applicationRelease ?? null,
  };
}

export function confirmedDecision(
  draft: FeedbackDraft,
  request: ReviewRequest,
  original: FilikaFeedbackDraftV1 | null = request.draft,
): unknown {
  const steps =
    draft.reproductionSteps === original?.reproductionSteps?.join("\n")
      ? original.reproductionSteps
      : draft.reproductionSteps?.split("\n").filter((step) => step.trim() !== "");
  return {
    kind: "confirmed",
    feedback: {
      kind: draft.kind,
      title: draft.title,
      description: draft.description,
      ...(draft.expectedBehavior ? { expectedBehavior: draft.expectedBehavior } : {}),
      ...(steps && steps.length > 0 ? { reproductionSteps: steps } : {}),
    },
    context: {
      sdkVersion: request.context.sdkVersion,
      ...(draft.routeLabel !== null ? { routeLabel: draft.routeLabel } : {}),
      ...(draft.applicationRelease !== null
        ? { applicationRelease: draft.applicationRelease }
        : {}),
    },
  };
}

/** The UI makes decisions; only the public SDK owns validation, identity and transport. */
export function connectSdkDialog(host: HTMLElement, api: FilikaPublicApi) {
  const document = host.ownerDocument;
  let current: ReviewEventDetail | null = null;
  let submitted = false;
  let lastOutcome: FilikaExecutionOutcome["code"] | null = null;
  let pending: {
    draft: FeedbackDraft;
    retry: boolean;
    original: FilikaFeedbackDraftV1 | null;
  } | null = null;
  const dialog = new FeedbackDialog(host, {
    identity: {
      collectorOrigin: "http://localhost:8787",
      privacyUrl: "/#privacy",
      projectName: "filika-demo",
      retentionSummary: "Demo feedback is retained for up to 24 hours.",
    },
    settleAfterAbort: true,
    async submit(draft, signal) {
      if (!current) return { outcome: "internal_error" };
      if (submitted) {
        pending = {
          draft,
          retry: lastOutcome === "outcome_unknown",
          original: current.request.draft,
        };
        try {
          const result = await api.open({ signal });
          lastOutcome = result.code;
          return dialogResult(result);
        } finally {
          pending = null;
        }
      }
      submitted = true;
      const detail = current;
      const stop = () => detail.request.abort();
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) stop();
      detail.complete(confirmedDecision(draft, detail.request));
      try {
        const result = await detail.request.outcome;
        lastOutcome = result.code;
        return dialogResult(result);
      } finally {
        signal.removeEventListener("abort", stop);
      }
    },
  });

  function review(event: Event): void {
    const detail = (event as CustomEvent<ReviewEventDetail>).detail;
    if (!detail || typeof detail.complete !== "function" || !detail.request) return;
    event.preventDefault();
    current = detail;
    if (pending) {
      detail.complete(
        pending.retry
          ? { kind: "retry" }
          : confirmedDecision(pending.draft, detail.request, pending.original),
      );
      return;
    }
    submitted = false;
    lastOutcome = null;
    dialog.reset();
    dialog.setIdentity({
      collectorOrigin: detail.request.collectorOrigin,
      privacyUrl: "/#privacy",
      projectName: detail.request.projectKey,
      sdkVersion: detail.request.context.sdkVersion,
      retentionSummary: "Demo feedback is retained for up to 24 hours.",
    });
    void dialog
      .open(reviewDraft(detail.request), detail.request.draft ? "webmcp" : "manual")
      .then((result) => {
        if (result.outcome === "cancelled") detail.complete({ kind: "cancelled" });
      });
    void detail.request.outcome.then((result) => {
      if (current !== detail) return;
      lastOutcome = result.code;
      submitted = true;
      dialog.resolveReview(dialogResult(result));
    });
  }
  document.addEventListener("filika:review", review);
  return {
    dialog,
    dispose() {
      document.removeEventListener("filika:review", review);
      current?.request.abort();
      api.dispose();
      dialog.dispose();
    },
  };
}

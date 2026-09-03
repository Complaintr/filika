import { abortScope, withAbort } from "./abort";
import { createContext, reviewedContext } from "./context";
import type {
  FilikaFeedbackContextV1,
  FilikaFeedbackDraftV1,
  FilikaFeedbackEnvelopeV1,
} from "./envelope";
import { EXECUTION_LIMITS } from "./outcomes";
import type { FilikaExecutionOutcome } from "./receipt";
import { takeReviewCompletion } from "./review-completion";
import type { RuntimeSession } from "./runtime";
import { type PreparedSubmission, parseDraft, prepareSubmission } from "./submission";
import { closedRecord } from "./validation";

export interface ReviewRequest {
  readonly draft: FilikaFeedbackDraftV1 | null;
  readonly context: Readonly<FilikaFeedbackContextV1>;
  readonly projectKey: string;
  readonly collectorOrigin: string;
  readonly signal: AbortSignal;
  /** Internal UI bridge only; never serialized into tool metadata or wire data. */
  readonly outcome: Promise<FilikaExecutionOutcome>;
  abort(): void;
  readonly retry?: {
    readonly eventId: string;
    readonly feedback: FilikaFeedbackDraftV1;
    readonly context: FilikaFeedbackContextV1;
  };
}

export type ReviewAdapter = (request: ReviewRequest) => Promise<unknown>;
export type SubmissionTransport = (
  session: RuntimeSession,
  submission: PreparedSubmission,
  signal: AbortSignal,
) => Promise<FilikaExecutionOutcome>;

export interface ExecutionDependencies {
  review: ReviewAdapter;
  transmit: SubmissionTransport;
  randomUUID?: () => string;
  reviewTimeoutMs?: number;
}

export function createExecution(dependencies: ExecutionDependencies) {
  let active: object | null = null;
  let retained: { session: RuntimeSession; submission: PreparedSubmission } | null = null;
  async function run(
    session: RuntimeSession,
    input: unknown,
    finalOutcome: Promise<FilikaExecutionOutcome>,
    callerSignal?: AbortSignal,
  ): Promise<FilikaExecutionOutcome> {
    if (session.signal.aborted || callerSignal?.aborted) return { code: "aborted" };
    if (active) return { code: "internal_error" };
    const draft = input === null ? null : parseDraft(input);
    if (input !== null && !draft) return { code: "invalid_input" };
    const token = {};
    active = token;
    const scope = abortScope(callerSignal ? [session.signal, callerSignal] : [session.signal]);
    let expired = false;
    let dispatched = false;
    let submission: PreparedSubmission | null = null;
    let settleReviewOutcome: ((outcome: FilikaExecutionOutcome) => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (outcome: FilikaExecutionOutcome): FilikaExecutionOutcome => {
      settleReviewOutcome?.(outcome);
      // A receipt cannot be represented inside the outcome byte budget, so the
      // acceptance is reported conservatively instead of as success.
      if (
        outcome.code === "success" &&
        new TextEncoder().encode(JSON.stringify(outcome)).byteLength > EXECUTION_LIMITS.outcomeBytes
      ) {
        return { code: "outcome_unknown" };
      }
      return outcome;
    };
    try {
      const originalContext = createContext(session.config);
      const retry = retained?.session === session ? retained.submission : null;
      // This JSON was produced locally after review; give the UI a detached copy.
      const retryEnvelope = retry ? (JSON.parse(retry.body) as FilikaFeedbackEnvelopeV1) : null;
      timer = setTimeout(() => {
        expired = true;
        scope.controller.abort();
      }, dependencies.reviewTimeoutMs ?? EXECUTION_LIMITS.reviewTimeoutMs);
      const reviewResponse = await withAbort(scope.controller.signal, () =>
        dependencies.review({
          draft,
          context: originalContext,
          projectKey: session.config.projectKey,
          collectorOrigin: new URL(session.config.endpoint).origin,
          signal: scope.controller.signal,
          outcome: finalOutcome,
          abort: () => scope.controller.abort(),
          ...(retry && retryEnvelope
            ? {
                retry: {
                  eventId: retry.eventId,
                  feedback: retryEnvelope.feedback,
                  context: retryEnvelope.context,
                },
              }
            : {}),
        }),
      );
      const completion = takeReviewCompletion(reviewResponse);
      const response = completion?.decision ?? reviewResponse;
      settleReviewOutcome = completion?.settle ?? null;
      clearTimeout(timer);
      if (scope.controller.signal.aborted) return finish({ code: expired ? "timeout" : "aborted" });
      const cancelled = closedRecord(response, ["kind"]);
      if (cancelled?.kind === "cancelled") return finish({ code: "cancelled" });
      if (cancelled?.kind === "retry") {
        if (!retry) return finish({ code: "invalid_input" });
        submission = retry;
      } else {
        const decision = closedRecord(response, ["kind", "feedback", "context"]);
        if (decision?.kind !== "confirmed") return finish({ code: "invalid_input" });
        const feedback = parseDraft(decision.feedback);
        const context = reviewedContext(decision.context, originalContext);
        if (!feedback || !context) return finish({ code: "invalid_input" });
        submission = prepareSubmission(session.config, feedback, context, dependencies.randomUUID);
      }
      if (!submission) return finish({ code: "internal_error" });
      const outgoing = submission;
      const outcome = await withAbort(scope.controller.signal, () => {
        dispatched = true;
        return dependencies.transmit(session, outgoing, scope.controller.signal);
      });
      if (active === token && !session.signal.aborted)
        retained = outcome.code === "outcome_unknown" ? { session, submission } : null;
      return finish(outcome);
    } catch {
      if (dispatched) {
        if (submission && active === token && !session.signal.aborted)
          retained = { session, submission };
        return finish({ code: "outcome_unknown" });
      }
      if (scope.controller.signal.aborted) return finish({ code: expired ? "timeout" : "aborted" });
      return finish({ code: "internal_error" });
    } finally {
      clearTimeout(timer);
      scope.controller.abort();
      scope.cleanup();
      if (active === token) active = null;
    }
  }
  return {
    async execute(session: RuntimeSession, input: unknown, signal?: AbortSignal) {
      let settle: (value: FilikaExecutionOutcome) => void = () => {};
      const outcome = new Promise<FilikaExecutionOutcome>((resolve) => {
        settle = resolve;
      });
      const result = await run(session, input, outcome, signal);
      settle(result);
      return result;
    },
    clear() {
      active = null;
      retained = null;
    },
  };
}

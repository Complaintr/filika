/**
 * Collector submission service for the demo application.
 *
 * Builds a V1 feedback envelope from the dialog's draft and POSTs it to the
 * collector endpoint. Returns an `SdkExecutionResult` that the dialog can use
 * to transition to its terminal state.
 */

import type { SdkExecutionResult } from "../contracts/feedback-dialog-machine";
import type { FeedbackDraft } from "../contracts/feedback-fields";

const COLLECTOR_ENDPOINT = "/api/v1/feedback";
const IDEMPOTENCY_HEADER = "Idempotency-Key";
const SCHEMA_VERSION = 1;
const SDK_VERSION = "0.1.0";
const SUBMISSION_TIMEOUT_MS = 15_000;

export interface CollectorSubmitOptions {
  /** Collector origin, e.g. "http://localhost:8787". */
  collectorOrigin: string;
  /** Project key for the envelope. */
  projectKey: string;
  /** Optional static route label from host configuration. */
  routeLabel?: string;
  /** Optional static application release from host configuration. */
  applicationRelease?: string;
}

interface FeedbackReceipt {
  schemaVersion: number;
  eventId: string;
  feedbackId: string;
  receivedAt: string;
  duplicate: boolean;
}

function isReceiptShape(value: unknown): value is FeedbackReceipt {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === SCHEMA_VERSION &&
    typeof record.eventId === "string" &&
    typeof record.feedbackId === "string" &&
    typeof record.receivedAt === "string" &&
    typeof record.duplicate === "boolean"
  );
}

/**
 * Build a V1 envelope from the dialog's draft state and submit it to the
 * collector. The draft uses `reproductionSteps` as a single multi-line string;
 * we split it into individual lines for the envelope's `string[]` format.
 */
export function createCollectorSubmit(
  options: CollectorSubmitOptions,
): (draft: FeedbackDraft, signal: AbortSignal) => Promise<SdkExecutionResult> {
  return async (draft: FeedbackDraft, signal: AbortSignal): Promise<SdkExecutionResult> => {
    const eventId = crypto.randomUUID();

    const feedback: Record<string, unknown> = {
      kind: draft.kind ?? "",
      title: draft.title ?? "",
      description: draft.description ?? "",
    };
    if (draft.expectedBehavior !== null && draft.expectedBehavior.trim() !== "") {
      feedback.expectedBehavior = draft.expectedBehavior;
    }
    if (draft.reproductionSteps !== null && draft.reproductionSteps.trim() !== "") {
      feedback.reproductionSteps = draft.reproductionSteps
        .split("\n")
        .map((step) => step.trim())
        .filter((step) => step.length > 0);
    }

    const context: Record<string, unknown> = {
      sdkVersion: SDK_VERSION,
    };
    if (draft.routeLabel !== null && draft.routeLabel.trim() !== "") {
      context.routeLabel = draft.routeLabel;
    }
    if (draft.applicationRelease !== null && draft.applicationRelease.trim() !== "") {
      context.applicationRelease = draft.applicationRelease;
    }

    const envelope = {
      schemaVersion: SCHEMA_VERSION,
      projectKey: options.projectKey,
      eventId,
      feedback,
      context,
    };

    const url = `${options.collectorOrigin}${COLLECTOR_ENDPOINT}`;
    const timeoutId = setTimeout(() => {
      // The AbortSignal from the dialog already handles cancellation;
      // this is a safety net for network stalls.
    }, SUBMISSION_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [IDEMPOTENCY_HEADER]: eventId,
        },
        body: JSON.stringify(envelope),
        credentials: "omit",
        signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 201 || response.status === 200) {
        const body: unknown = await response.json();
        if (isReceiptShape(body)) {
          return {
            outcome: "success",
            receipt: {
              feedbackId: body.feedbackId,
              receivedAt: body.receivedAt,
              duplicate: body.duplicate,
            },
          };
        }
        // Receipt did not match expected shape; treat as unknown outcome.
        return { outcome: "outcome_unknown" };
      }

      if (response.status === 422 || response.status === 400) {
        return { outcome: "collector_rejected" };
      }

      if (response.status === 429) {
        return { outcome: "collector_rejected" };
      }

      return { outcome: "internal_error" };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (signal.aborted) {
        return { outcome: "aborted" };
      }

      if (error instanceof TypeError) {
        // Network error (e.g. collector unreachable)
        return { outcome: "outcome_unknown" };
      }

      return { outcome: "internal_error" };
    }
  };
}

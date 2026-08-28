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
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const RECEIPT_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CollectorSubmitOptions {
  /** Collector origin, e.g. "http://localhost:8787". */
  collectorOrigin: string;
  /** Project key for the envelope. */
  projectKey: string;
  /** Optional static route label from host configuration. */
  routeLabel?: string;
  /** Optional static application release from host configuration. */
  applicationRelease?: string;
  fetchFn?: FetchFn;
  timeoutMs?: number;
}

interface FeedbackReceipt {
  duplicate: boolean;
  eventId: string;
  feedbackId: string;
  receivedAt: string;
  schemaVersion: 1;
}

function parseReceipt(value: unknown, expectedEventId: string): FeedbackReceipt | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    Reflect.ownKeys(record).length !== 5 ||
    record.schemaVersion !== SCHEMA_VERSION ||
    record.eventId !== expectedEventId ||
    typeof record.feedbackId !== "string" ||
    !UUID_V4_PATTERN.test(record.feedbackId) ||
    typeof record.receivedAt !== "string" ||
    !RECEIPT_TIMESTAMP_PATTERN.test(record.receivedAt) ||
    Number.isNaN(new Date(record.receivedAt).getTime()) ||
    typeof record.duplicate !== "boolean"
  ) {
    return null;
  }
  return {
    duplicate: record.duplicate,
    eventId: expectedEventId,
    feedbackId: record.feedbackId,
    receivedAt: record.receivedAt,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Build a V1 envelope from the dialog's draft state and submit it to the
 * collector. The draft uses `reproductionSteps` as a single multi-line string;
 * we split it into individual lines for the envelope's `string[]` format.
 */
export function createCollectorSubmit(
  options: CollectorSubmitOptions,
): (draft: FeedbackDraft, signal: AbortSignal) => Promise<SdkExecutionResult> {
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? SUBMISSION_TIMEOUT_MS;
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
    const requestController = new AbortController();
    const abortRequest = (): void => requestController.abort();
    signal.addEventListener("abort", abortRequest, { once: true });
    const timeoutId = setTimeout(abortRequest, timeoutMs);

    try {
      const response = await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [IDEMPOTENCY_HEADER]: eventId,
        },
        body: JSON.stringify(envelope),
        credentials: "omit",
        signal: requestController.signal,
      });

      if (response.status === 201 || response.status === 200) {
        const receipt = parseReceipt(await response.json(), eventId);
        if (receipt !== null && receipt.duplicate === (response.status === 200)) {
          return {
            outcome: "success",
            receipt: {
              feedbackId: receipt.feedbackId,
              receivedAt: receipt.receivedAt,
              duplicate: receipt.duplicate,
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
      if (signal.aborted) {
        return { outcome: "aborted" };
      }

      if (requestController.signal.aborted) {
        return { outcome: "timeout" };
      }

      if (error instanceof TypeError) {
        // Network error (e.g. collector unreachable)
        return { outcome: "outcome_unknown" };
      }

      return { outcome: "internal_error" };
    } finally {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortRequest);
    }
  };
}

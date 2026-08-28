/**
 * Inbox API service for connecting maintainer inbox views to collector backend read endpoints.
 *
 * Implements read-only contracts for:
 * - GET /api/v1/inbox -> InboxListViewState (loading, empty, ready, error)
 * - GET /api/v1/inbox/:id -> InboxDetailViewState (loading, ready, not_found, expired, error)
 *
 * Does not add fake fallbacks; failures return explicit retryable error states.
 */

import type {
  InboxDetailViewModel,
  InboxDetailViewState,
  InboxListItemViewModel,
  InboxListViewState,
} from "../contracts/inbox-view-model";

const INBOX_LIST_ENDPOINT = "/api/v1/inbox";
const INBOX_DETAIL_ENDPOINT_PREFIX = "/api/v1/inbox/";

export interface InboxApiOptions {
  collectorOrigin: string;
  fetchFn?: typeof fetch;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateListItem(raw: unknown): InboxListItemViewModel | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  if (
    typeof raw.feedbackId !== "string" ||
    typeof raw.kind !== "string" ||
    typeof raw.receivedAt !== "string" ||
    typeof raw.requestOrigin !== "string" ||
    typeof raw.title !== "string"
  ) {
    return null;
  }

  const routeLabel = typeof raw.routeLabel === "string" ? raw.routeLabel : null;

  return {
    feedbackId: raw.feedbackId,
    kind: raw.kind as InboxListItemViewModel["kind"],
    receivedAt: raw.receivedAt,
    requestOrigin: raw.requestOrigin,
    routeLabel,
    title: raw.title,
  };
}

function validateDetailFeedback(raw: unknown): InboxDetailViewModel | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const requiredFields = [
    "feedbackId",
    "kind",
    "title",
    "description",
    "source",
    "receivedAt",
    "expiresAt",
    "requestOrigin",
  ] as const;

  for (const field of requiredFields) {
    if (typeof raw[field] !== "string") {
      return null;
    }
  }

  // Ensure reproductionSteps is either string or null (or string array normalized)
  let reproductionSteps: string | null = null;
  if (typeof raw.reproductionSteps === "string") {
    reproductionSteps = raw.reproductionSteps;
  } else if (Array.isArray(raw.reproductionSteps)) {
    reproductionSteps = raw.reproductionSteps.join("\n");
  }

  return {
    applicationRelease: typeof raw.applicationRelease === "string" ? raw.applicationRelease : null,
    description: String(raw.description),
    expectedBehavior: typeof raw.expectedBehavior === "string" ? raw.expectedBehavior : null,
    expiresAt: String(raw.expiresAt),
    feedbackId: String(raw.feedbackId),
    kind: raw.kind as InboxDetailViewModel["kind"],
    receivedAt: String(raw.receivedAt),
    reproductionSteps,
    requestOrigin: String(raw.requestOrigin),
    routeLabel: typeof raw.routeLabel === "string" ? raw.routeLabel : null,
    source: "web_sdk_unverified",
    title: String(raw.title),
  };
}

export class InboxApiService {
  readonly #collectorOrigin: string;
  readonly #fetch: typeof fetch;

  constructor(options: InboxApiOptions) {
    this.#collectorOrigin = options.collectorOrigin.replace(/\/+$/, "");
    this.#fetch = options.fetchFn ?? fetch;
  }

  async fetchList(signal?: AbortSignal): Promise<InboxListViewState> {
    const url = `${this.#collectorOrigin}${INBOX_LIST_ENDPOINT}`;

    try {
      const response = await this.#fetch(url, {
        headers: { Accept: "application/json" },
        method: "GET",
        signal,
      });

      if (!response.ok) {
        return { retryable: true, status: "error" };
      }

      const data: unknown = await response.json();
      if (!isPlainObject(data) || !Array.isArray(data.items)) {
        return { retryable: true, status: "error" };
      }

      const items: InboxListItemViewModel[] = [];
      for (const rawItem of data.items) {
        const item = validateListItem(rawItem);
        if (item !== null) {
          items.push(item);
        }
      }

      if (items.length === 0) {
        return { status: "empty" };
      }

      return { items, status: "ready" };
    } catch {
      return { retryable: true, status: "error" };
    }
  }

  async fetchDetail(feedbackId: string, signal?: AbortSignal): Promise<InboxDetailViewState> {
    const url = `${this.#collectorOrigin}${INBOX_DETAIL_ENDPOINT_PREFIX}${encodeURIComponent(feedbackId)}`;

    try {
      const response = await this.#fetch(url, {
        headers: { Accept: "application/json" },
        method: "GET",
        signal,
      });

      if (response.status === 404) {
        return { status: "not_found" };
      }

      if (!response.ok) {
        return { retryable: true, status: "error" };
      }

      const data: unknown = await response.json();
      if (!isPlainObject(data) || !isPlainObject(data.feedback)) {
        return { retryable: true, status: "error" };
      }

      const feedback = validateDetailFeedback(data.feedback);
      if (feedback === null) {
        return { retryable: true, status: "error" };
      }

      const expiresAtDate = new Date(feedback.expiresAt);
      if (!Number.isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() <= Date.now()) {
        return { expiredAt: feedback.expiresAt, status: "expired" };
      }

      return { feedback, status: "ready" };
    } catch {
      return { retryable: true, status: "error" };
    }
  }
}

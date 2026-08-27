import type { ReviewAdapter, ReviewRequest } from "./execution";

export const REVIEW_EVENT = "filika:review";

export interface ReviewEventDetail {
  readonly request: ReviewRequest;
  complete(decision: unknown): void;
}

/** The frontend owns rendering and user confirmation. An absent UI fails closed. */
export function createReviewBridge(target: unknown): ReviewAdapter {
  return (request) =>
    new Promise((resolve, reject) => {
      if (!(target instanceof EventTarget)) {
        reject(new Error("Review unavailable"));
        return;
      }
      const stop = () => reject(new Error("Review stopped"));
      let settled = false;
      const complete = (decision: unknown) => {
        if (settled || request.signal.aborted) return;
        settled = true;
        request.signal.removeEventListener("abort", stop);
        // Wait until dispatch has finished so claiming the review is mandatory,
        // including when a listener completes synchronously.
        queueMicrotask(() => {
          if (event.defaultPrevented && !request.signal.aborted) resolve(decision);
          else reject(new Error("Review unavailable"));
        });
      };
      request.signal.addEventListener("abort", stop, { once: true });
      const event = new CustomEvent<ReviewEventDetail>(REVIEW_EVENT, {
        cancelable: true,
        detail: Object.freeze({ request, complete }),
      });
      try {
        // preventDefault claims the review. It does not confirm transmission.
        target.dispatchEvent(event);
        if (!event.defaultPrevented) {
          request.signal.removeEventListener("abort", stop);
          reject(new Error("Review unavailable"));
        }
      } catch {
        request.signal.removeEventListener("abort", stop);
        reject(new Error("Review unavailable"));
      }
    });
}

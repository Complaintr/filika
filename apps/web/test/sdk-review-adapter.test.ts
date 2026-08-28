import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import {
  installReviewAdapter,
  type ReviewEventDetail,
  type SdkPublicOutcome,
} from "../src/sdk-review-adapter";

const receipt = {
  duplicate: false,
  eventId: "11111111-1111-4111-8111-111111111111",
  feedbackId: "22222222-2222-4222-8222-222222222222",
  receivedAt: "2026-08-28T12:00:00.000Z",
  schemaVersion: 1 as const,
};

function createFixture(): {
  dialog: FeedbackDialog;
  document: Document;
  host: HTMLElement;
  submitCalls: { count: number };
} {
  const browserWindow = new Window({ url: "http://localhost:4173" });
  const document = browserWindow.document as unknown as Document;
  const host = document.createElement("div");
  document.body.append(host);
  const submitCalls = { count: 0 };
  const dialog = new FeedbackDialog(host, {
    identity: {
      collectorOrigin: "http://localhost:8787",
      privacyUrl: "#privacy",
      projectName: "Filika local demo",
      retentionSummary: "Demo feedback is retained for up to 24 hours.",
    },
    submit: () => {
      submitCalls.count += 1;
      return Promise.resolve({ outcome: "internal_error" });
    },
  });
  return { dialog, document, host, submitCalls };
}

function reviewDetail(
  complete: ReviewEventDetail["complete"],
  signal = new AbortController().signal,
): ReviewEventDetail {
  return {
    complete,
    request: {
      collectorOrigin: "http://localhost:8787",
      context: {
        applicationRelease: "demo-2026.08",
        routeLabel: "Sample task",
        sdkVersion: "0.0.0",
      },
      draft: {
        description: "The save operation failed.",
        kind: "bug",
        title: "Save failed",
      },
      projectKey: "filika_demo",
      signal,
    },
  };
}

function dispatchReview(document: Document, detail: ReviewEventDetail): void {
  const view = document.defaultView;
  if (view === null) throw new Error("Expected a browser window");
  document.dispatchEvent(new view.CustomEvent("filika:review", { cancelable: true, detail }));
}

function click(host: HTMLElement, id: string): void {
  (host.shadowRoot?.getElementById(id) as HTMLButtonElement | null)?.click();
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("SDK review adapter", () => {
  test("returns the reviewed decision to the SDK and renders its final receipt", async () => {
    const { dialog, document, host, submitCalls } = createFixture();
    let decision: unknown;
    let visibleReceiptId: string | null = null;
    installReviewAdapter(document, dialog, {
      onReceipt: (value) => {
        visibleReceiptId = value.feedbackId;
      },
    });
    dispatchReview(
      document,
      reviewDetail((value) => {
        decision = value;
        return Promise.resolve({ code: "success", receipt });
      }),
    );

    click(host, "filika-review");
    click(host, "filika-confirm");
    await flushAsyncWork();

    expect(decision).toEqual({
      context: {
        applicationRelease: "demo-2026.08",
        routeLabel: "Sample task",
        sdkVersion: "0.0.0",
      },
      feedback: {
        description: "The save operation failed.",
        kind: "bug",
        title: "Save failed",
      },
      kind: "confirmed",
    });
    expect(submitCalls.count).toBe(0);
    expect(host.shadowRoot?.textContent).toContain("Feedback received");
    expect(host.shadowRoot?.textContent).toContain(receipt.feedbackId);
    expect(visibleReceiptId).toBe(receipt.feedbackId);
  });

  test("completes cancellation without transmitting", async () => {
    const { dialog, document, host, submitCalls } = createFixture();
    let decision: unknown;
    installReviewAdapter(document, dialog);
    dispatchReview(
      document,
      reviewDetail((value) => {
        decision = value;
        return Promise.resolve({ code: "cancelled" });
      }),
    );

    click(host, "filika-cancel");
    await flushAsyncWork();

    expect(decision).toEqual({ kind: "cancelled" });
    expect(submitCalls.count).toBe(0);
  });

  test("uses the SDK retry path after an unknown outcome", async () => {
    const { dialog, document, host } = createFixture();
    let retries = 0;
    installReviewAdapter(document, dialog, {
      retry: (): Promise<SdkPublicOutcome> => {
        retries += 1;
        return Promise.resolve({ code: "success", receipt: { ...receipt, duplicate: true } });
      },
    });
    dispatchReview(
      document,
      reviewDetail(() => Promise.resolve({ code: "outcome_unknown" })),
    );

    click(host, "filika-review");
    click(host, "filika-confirm");
    await flushAsyncWork();
    expect(host.shadowRoot?.textContent).toContain("Submission status unknown");

    click(host, "filika-outcome-primary");
    await flushAsyncWork();

    expect(retries).toBe(1);
    expect(host.shadowRoot?.textContent).toContain("Already received");
  });
});

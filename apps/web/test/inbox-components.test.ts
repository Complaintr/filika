import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { MaintainerInbox, renderInboxDetail, renderInboxList } from "../src/components/inbox";
import type {
  InboxDetailViewModel,
  InboxDetailViewState,
  InboxListViewState,
} from "../src/contracts/inbox-view-model";

const sampleFeedback: InboxDetailViewModel = {
  applicationRelease: "demo-2026.08",
  description: "The sample save failed.",
  expectedBehavior: "The draft should be saved.",
  expiresAt: "2026-08-28T10:00:00.000Z",
  feedbackId: "fb_test_123",
  kind: "bug",
  receivedAt: "2026-08-27T10:00:00.000Z",
  reproductionSteps: "Run the sample task.",
  requestOrigin: "http://localhost:4173",
  routeLabel: "Sample task",
  source: "web_sdk_unverified",
  title: "Sample save failed",
};

function createDocument(): Document {
  return new Window({ url: "http://localhost:4173" }).document as unknown as Document;
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Missing test element: ${selector}`);
  }
  return element as T;
}

describe("inbox-components", () => {
  test("renders list rows and opens a selected report", () => {
    const document = createDocument();
    let selected = "";
    const list = renderInboxList(
      document,
      {
        items: [sampleFeedback],
        status: "ready",
      },
      {
        onOpen: (feedbackId) => {
          selected = feedbackId;
        },
        onRetry: () => {},
      },
    );
    expect(list.textContent).toContain("Sample save failed");
    requiredElement<HTMLButtonElement>(list, "button").click();
    expect(selected).toBe("fb_test_123");
  });

  test("separates authored, host-supplied, and server-derived detail fields", () => {
    const document = createDocument();
    const detail = renderInboxDetail(
      document,
      { feedback: sampleFeedback, status: "ready" },
      { onBack: () => {}, onRetry: () => {} },
    );
    const headings = [...detail.querySelectorAll("h2")].map((heading) => heading.textContent);
    expect(headings).toEqual(["Report content", "Page context", "Receipt details"]);
    expect(detail.textContent).toContain("web_sdk_unverified");
  });

  test("renders every non-ready list and detail state", () => {
    const document = createDocument();
    const listStates: readonly InboxListViewState[] = [
      { status: "loading" },
      { status: "empty" },
      { retryable: true, status: "error" },
    ];
    const detailStates: readonly InboxDetailViewState[] = [
      { status: "loading" },
      { status: "not_found" },
      { expiredAt: "2026-08-27T10:00:00.000Z", status: "expired" },
      { retryable: true, status: "error" },
    ];

    expect(
      listStates.map(
        (state) =>
          renderInboxList(document, state, {
            onOpen: () => {},
            onRetry: () => {},
          }).querySelector<HTMLElement>(".state-panel")?.dataset.state,
      ),
    ).toEqual(["loading", "empty", "error"]);
    expect(
      detailStates.map(
        (state) =>
          renderInboxDetail(document, state, {
            onBack: () => {},
            onRetry: () => {},
          }).querySelector<HTMLElement>(".state-panel")?.dataset.state,
      ),
    ).toEqual(["loading", "not_found", "expired", "error"]);
  });

  test("switches a maintained inbox between list and detail views", () => {
    const document = createDocument();
    const container = document.createElement("div");
    const inbox = new MaintainerInbox(container, {
      onBack: () => {},
      onOpen: () => {},
      onRetry: () => {},
    });
    inbox.showList({ items: [sampleFeedback], status: "ready" });
    expect(container.firstElementChild?.getAttribute("data-view")).toBe("inbox-list");
    inbox.showDetail({ feedback: sampleFeedback, status: "ready" });
    expect(container.firstElementChild?.getAttribute("data-view")).toBe("inbox-detail");
  });
});

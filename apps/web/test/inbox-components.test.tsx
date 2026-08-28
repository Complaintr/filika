import { describe, expect, test } from "bun:test";
import type { InboxDetailViewState, InboxListViewState } from "../src/contracts/inbox-view-model";
import { InboxDetailShell, InboxDetailState, InboxList, InboxStatePanel } from "../src/workspace/inbox-view";
import { renderReact } from "./helpers/render-react";

const sampleItem = {
  feedbackId: "fb_test_123",
  kind: "bug",
  receivedAt: "2026-08-28T12:00:00.000Z",
  requestOrigin: "http://localhost:4173",
  routeLabel: "/checkout",
  title: "Sample save failed",
};

const sampleFeedback = {
  applicationRelease: "2026.08.1",
  description: "The sample save failed.",
  expectedBehavior: "Save should succeed.",
  expiresAt: "2026-09-01T00:00:00.000Z",
  feedbackId: "fb_test_123",
  kind: "bug",
  receivedAt: "2026-08-28T12:00:00.000Z",
  reproductionSteps: "Run the sample task.",
  requestOrigin: "http://localhost:4173",
  routeLabel: "/checkout",
  source: "web_sdk_unverified",
  title: "Sample save failed",
};

describe("inbox-components", () => {
  test("renders list rows and links to the selected report", async () => {
    const result = await renderReact(<InboxList items={[sampleItem]} />);
    expect(result.container.querySelector("ol")).not.toBeNull();
    expect(result.container.textContent).toContain("Sample save failed");
    const link = result.container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/complaints/fb_test_123");
    await result.close();
  });

  test("separates authored, host-supplied, and server-derived detail fields", async () => {
    const result = await renderReact(<InboxDetailState state={{ feedback: sampleFeedback, status: "ready" }} />);
    const headings = [...result.container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual(["Report content", "Page context", "Receipt details"]);
    expect(result.container.textContent).toContain("web_sdk_unverified");
    await result.close();
  });

  test("renders every non-ready list and detail state", async () => {
    const listStates: readonly InboxListViewState[] = [
      { status: "loading" },
      { status: "empty" },
      { retryable: true, status: "error" },
    ];
    for (const state of listStates) {
      const result = await renderReact(
        <InboxStatePanel
          role="status"
          state={state.status}
          heading={state.status}
          body={`${state.status} body`}
        />,
      );
      expect(result.container.querySelector(`[data-state="${state.status}"]`)).not.toBeNull();
      await result.close();
    }
    const detailStates: readonly InboxDetailViewState[] = [
      { status: "loading" },
      { status: "not_found" },
      { expiredAt: "2000-01-01T00:00:00.000Z", status: "expired" },
      { retryable: true, status: "error" },
    ];
    for (const state of detailStates) {
      const result = await renderReact(<InboxDetailState state={state} />);
      expect(result.container.querySelector("h2")).not.toBeNull();
      await result.close();
    }
  });

  test("switches a detail shell between views with a back link", async () => {
    const result = await renderReact(
      <InboxDetailShell kind="bug">
        <h1>Sample save failed</h1>
      </InboxDetailShell>,
    );
    expect(result.container.querySelector('[data-view="inbox-detail"]')).not.toBeNull();
    const back = result.container.querySelector("a.text-button");
    expect(back?.getAttribute("href")).toBe("/complaints");
    expect(result.container.textContent).toContain("bug");
    await result.close();
  });
});
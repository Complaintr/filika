import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import type { FeedbackDraft } from "../src/contracts/feedback-fields";

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  const host = document.createElement("div");
  host.id = "filika-feedback-root";
  document.body.append(host);
  return { document, host, window };
}

function dispatchInput(document: Document, element: HTMLElement) {
  const view = document.defaultView;
  if (!view) throw new Error("Missing defaultView");
  element.dispatchEvent(new view.Event("input", { bubbles: true }));
}

describe("field visibility, editing, and removal before submission", () => {
  test("all authored and host fields are visible and editable/removable in editing view", () => {
    const { host } = setupDom();
    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: () => Promise.resolve({ outcome: "cancelled" }),
    });

    void dialog.open(
      {
        applicationRelease: "v2.1.0",
        description: "Initial description",
        expectedBehavior: "Initial expected behavior",
        kind: "bug",
        reproductionSteps: "Step 1\nStep 2\nStep 3",
        routeLabel: "/checkout",
        title: "Initial title",
      },
      "webmcp",
    );

    const shadow = host.shadowRoot;

    // Check all authored controls are visible
    const kindSelect = shadow?.getElementById("filika-kind") as HTMLSelectElement;
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    const descTextarea = shadow?.getElementById("filika-description") as HTMLTextAreaElement;
    const expTextarea = shadow?.getElementById("filika-expected-behavior") as HTMLTextAreaElement;
    const stepsTextarea = shadow?.getElementById(
      "filika-reproduction-steps",
    ) as HTMLTextAreaElement;

    expect(kindSelect).not.toBeNull();
    expect(kindSelect.value).toBe("bug");
    expect(titleInput).not.toBeNull();
    expect(titleInput.value).toBe("Initial title");
    expect(descTextarea).not.toBeNull();
    expect(descTextarea.value).toBe("Initial description");
    expect(expTextarea).not.toBeNull();
    expect(expTextarea.value).toBe("Initial expected behavior");
    expect(stepsTextarea).not.toBeNull();
    expect(stepsTextarea.value).toBe("Step 1\nStep 2\nStep 3");

    // Check host context items are visible with removal buttons
    const routeRemoveBtn = shadow?.getElementById("filika-route-label-remove") as HTMLButtonElement;
    const releaseRemoveBtn = shadow?.getElementById(
      "filika-application-release-remove",
    ) as HTMLButtonElement;

    expect(routeRemoveBtn).not.toBeNull();
    expect(routeRemoveBtn.getAttribute("aria-label")).toBe("Remove page");
    expect(releaseRemoveBtn).not.toBeNull();
    expect(releaseRemoveBtn.getAttribute("aria-label")).toBe("Remove application release");
  });

  test("removing host context fields excludes them from confirmation and submitted draft", async () => {
    const { host } = setupDom();
    const resultHolder: { submittedDraft: FeedbackDraft | null } = { submittedDraft: null };

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: (draft) => {
        resultHolder.submittedDraft = draft;
        return Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_clean_payload",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        });
      },
    });

    void dialog.open(
      {
        applicationRelease: "v1.5.0",
        description: "Observed unexpected error on dashboard",
        expectedBehavior: "Dashboard should load stats",
        kind: "bug",
        reproductionSteps: "1. Open dashboard\n2. Click refresh",
        routeLabel: "/dashboard",
        title: "Dashboard statistics failed to load",
      },
      "webmcp",
    );

    const shadow = host.shadowRoot;

    // Remove routeLabel
    const routeRemoveBtn = shadow?.getElementById("filika-route-label-remove") as HTMLButtonElement;
    routeRemoveBtn.click();

    // Proceed to review
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();

    expect(dialog.state.status).toBe("confirming");

    // Review list contains applicationRelease but NOT routeLabel (/dashboard)
    const reviewText = shadow?.querySelector(".review-list")?.textContent;
    expect(reviewText).toContain("v1.5.0");
    expect(reviewText).not.toContain("/dashboard");
    expect(reviewText).toContain("Dashboard statistics failed to load");

    // Confirm submission
    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(resultHolder.submittedDraft?.routeLabel).toBeNull();
    expect(resultHolder.submittedDraft?.applicationRelease).toBe("v1.5.0");
    expect(resultHolder.submittedDraft?.title).toBe("Dashboard statistics failed to load");
  });

  test("editing from confirmation view allows changing values and returning to confirm", async () => {
    const { document, host } = setupDom();
    const secondResultHolder: { submittedDraft: FeedbackDraft | null } = { submittedDraft: null };

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: (draft) => {
        secondResultHolder.submittedDraft = draft;
        return Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_edit_return",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        });
      },
    });

    void dialog.open(
      {
        description: "First description",
        kind: "bug",
        title: "First title",
      },
      "manual",
    );

    const shadow = host.shadowRoot;

    // Move to review
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();
    expect(dialog.state.status).toBe("confirming");

    // Click 'Edit report'
    const editBtn = shadow?.getElementById("filika-edit") as HTMLButtonElement;
    expect(editBtn).not.toBeNull();
    editBtn.click();
    expect(dialog.state.status).toBe("editing");

    // Update title
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    titleInput.value = "Corrected title";
    dispatchInput(document, titleInput);

    // Re-review and confirm
    const secondReviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    secondReviewBtn.click();
    expect(dialog.state.status).toBe("confirming");
    expect(shadow?.querySelector(".review-list")?.textContent).toContain("Corrected title");

    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(secondResultHolder.submittedDraft?.title).toBe("Corrected title");
  });
});

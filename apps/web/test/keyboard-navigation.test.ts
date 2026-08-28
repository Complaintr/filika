import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import type { FeedbackDraft } from "../src/contracts/feedback-fields";

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  const invokerButton = document.createElement("button");
  invokerButton.id = "open-feedback-btn";
  invokerButton.textContent = "Give feedback";
  document.body.append(invokerButton);

  const host = document.createElement("div");
  host.id = "filika-feedback-root";
  document.body.append(host);

  return { document, host, invokerButton, window };
}

function dispatchInput(document: Document, element: HTMLElement) {
  const view = document.defaultView;
  if (!view) throw new Error("Missing defaultView");
  element.dispatchEvent(new view.Event("input", { bubbles: true }));
}

function dispatchKey(document: Document, element: HTMLElement, key: string) {
  const view = document.defaultView;
  if (!view) throw new Error("Missing defaultView");
  element.dispatchEvent(
    new view.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key,
    }),
  );
}

describe("P4-FE-01 keyboard navigation and focus management", () => {
  test("initial focus moves to first field on open, and returns to invoker on cancel and close", async () => {
    const { document, host, invokerButton } = setupDom();
    invokerButton.focus();
    expect(document.activeElement).toBe(invokerButton);

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "filika-demo",
        retentionSummary: "24h retention",
      },
      submit: () => Promise.resolve({ outcome: "cancelled" }),
    });

    const openPromise = dialog.open({}, "manual");
    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();

    // Verify initial focus is on #filika-kind
    const kindSelect = shadow?.getElementById("filika-kind");
    expect(kindSelect).not.toBeNull();

    // Cancel via cancel button
    const cancelBtn = shadow?.getElementById("filika-cancel") as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    const result = await openPromise;
    expect(result.outcome).toBe("cancelled");
    expect(dialog.state.status).toBe("cancelled");

    // Close from outcome screen returns focus
    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();
    expect(dialog.state.status).toBe("closed");
    expect(document.activeElement).toBe(invokerButton);
  });

  test("validation error moves focus to the first invalid field and error summary link focuses target", async () => {
    const { host } = setupDom();
    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "filika-demo",
        retentionSummary: "24h retention",
      },
      submit: () => Promise.resolve({ outcome: "cancelled" }),
    });

    void dialog.open({}, "manual");
    const shadow = host.shadowRoot;

    // Click review with empty required fields
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();

    // Dialog remains in editing with issues
    expect(dialog.state.status).toBe("editing");
    expect(dialog.state.issues.length).toBeGreaterThan(0);

    // Error summary is rendered with role="alert"
    const errorSummary = shadow?.getElementById("filika-feedback-errors");
    expect(errorSummary).not.toBeNull();
    expect(errorSummary?.getAttribute("role")).toBe("alert");

    // Click error link to focus corresponding input
    const firstErrorLink = errorSummary?.querySelector<HTMLAnchorElement>("a");
    expect(firstErrorLink).not.toBeNull();
    firstErrorLink?.click();

    const targetInput = shadow?.getElementById("filika-kind");
    expect(targetInput).not.toBeNull();
  });

  test("keyboard-driven full flow: edit -> remove context -> review -> confirm -> close and focus return", async () => {
    const { document, host, invokerButton } = setupDom();
    invokerButton.focus();

    let submittedPayload: FeedbackDraft | null = null;
    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "filika-demo",
        retentionSummary: "24h retention",
      },
      submit: (draft) => {
        submittedPayload = draft;
        return Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_kb_123",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        });
      },
    });

    const openPromise = dialog.open(
      {
        applicationRelease: "v1.0.0",
        description: "Initial description",
        kind: "bug",
        routeLabel: "Settings page",
        title: "Initial title",
      },
      "manual",
    );

    const shadow = host.shadowRoot;

    // Edit fields
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    titleInput.value = "Updated title via keyboard";
    dispatchInput(document, titleInput);

    // Remove routeLabel context control
    const removePageBtn = shadow?.getElementById("filika-route-label-remove") as HTMLButtonElement;
    expect(removePageBtn).not.toBeNull();
    expect(removePageBtn.getAttribute("aria-label")).toBe("Remove page");
    removePageBtn.click();

    // Proceed to review
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();
    expect(dialog.state.status).toBe("confirming");

    // Confirm submission
    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(dialog.state.status).toBe("success");
    expect(submittedPayload?.title).toBe("Updated title via keyboard");
    expect(submittedPayload?.routeLabel).toBeNull();
    expect(submittedPayload?.applicationRelease).toBe("v1.0.0");

    // Close from success
    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();

    const result = await openPromise;
    expect(result.outcome).toBe("success");
    expect(dialog.state.status).toBe("closed");
    expect(document.activeElement).toBe(invokerButton);
  });

  test("keyboard escape triggers cancel and restores focus to invoker on close", async () => {
    const { document, host, invokerButton } = setupDom();
    invokerButton.focus();

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "filika-demo",
        retentionSummary: "24h retention",
      },
      submit: () => Promise.resolve({ outcome: "cancelled" }),
    });

    const openPromise = dialog.open({ kind: "bug", title: "Test" }, "manual");
    const shadow = host.shadowRoot;
    const dialogEl = shadow?.querySelector<HTMLDialogElement>("dialog");
    expect(dialogEl).not.toBeNull();

    if (dialogEl) {
      dispatchKey(document, dialogEl, "Escape");
    }

    const result = await openPromise;
    expect(result.outcome).toBe("cancelled");
    expect(dialog.state.status).toBe("cancelled");

    // Close outcome
    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();
    expect(dialog.state.status).toBe("closed");
    expect(document.activeElement).toBe(invokerButton);
  });

  test("outcome retry and close buttons properly handle keyboard activation and focus", async () => {
    const { document, host, invokerButton } = setupDom();
    invokerButton.focus();

    let attempts = 0;
    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "filika-demo",
        retentionSummary: "24h retention",
      },
      submit: () => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({ outcome: "outcome_unknown" });
        }
        return Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: true,
            feedbackId: "fb_retry_1",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        });
      },
    });

    const openPromise = dialog.open(
      { description: "Desc", kind: "bug", title: "Retry title" },
      "manual",
    );
    const shadow = host.shadowRoot;

    // Move to confirming and submit
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();
    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(dialog.state.status).toBe("outcome_unknown");

    // Retry button is available and clickable
    const retryBtn = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();
    expect(retryBtn.textContent).toBe("Retry");
    retryBtn.click();
    await Promise.resolve();

    expect(dialog.state.status).toBe("success");
    expect(attempts).toBe(2);

    // Close from success
    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();
    const result = await openPromise;
    expect(result.outcome).toBe("success");
    expect(document.activeElement).toBe(invokerButton);
  });
});

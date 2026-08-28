import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import { renderInboxDetail, renderInboxList } from "../src/components/inbox";
import { ReceiptToast } from "../src/components/receipt-toast";

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  const host = document.createElement("div");
  host.id = "filika-feedback-root";
  document.body.append(host);
  return { document, host, window };
}

describe("P4-FE-02 screen reader, live regions, and aria associations", () => {
  test("feedback dialog contains labeled dialog, describedby, and polite atomic live-region status", () => {
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

    void dialog.open({}, "manual");
    const shadow = host.shadowRoot;

    const dialogEl = shadow?.querySelector<HTMLDialogElement>("dialog");
    expect(dialogEl).not.toBeNull();
    expect(dialogEl?.getAttribute("aria-labelledby")).toBe("filika-feedback-title");
    expect(dialogEl?.getAttribute("aria-describedby")).toBe("filika-feedback-description");

    const statusEl = shadow?.getElementById("filika-feedback-status");
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute("role")).toBe("status");
    expect(statusEl?.getAttribute("aria-live")).toBe("polite");
    expect(statusEl?.getAttribute("aria-atomic")).toBe("true");
    expect(statusEl?.textContent).toBe("Feedback review form ready.");
  });

  test("live region announces validation errors when validation fails", () => {
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

    void dialog.open({}, "manual");
    const shadow = host.shadowRoot;

    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();

    const statusEl = shadow?.getElementById("filika-feedback-status");
    expect(statusEl?.textContent).toBe("Validation errors found. Review the highlighted fields.");

    // Form fields have aria-invalid and aria-describedby pointing to error and help
    const kindSelect = shadow?.getElementById("filika-kind") as HTMLSelectElement;
    expect(kindSelect.getAttribute("aria-invalid")).toBe("true");
    expect(kindSelect.getAttribute("aria-describedby")).toContain("filika-kind-help");
    expect(kindSelect.getAttribute("aria-describedby")).toContain("filika-kind-error");

    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    expect(titleInput.getAttribute("aria-invalid")).toBe("true");
    expect(titleInput.getAttribute("aria-describedby")).toContain("filika-title-help");
    expect(titleInput.getAttribute("aria-describedby")).toContain("filika-title-error");
  });

  test("live region announces confirmation, submitting, and success states", async () => {
    const { host } = setupDom();
    let resolveSubmit: (res: unknown) => void;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: () =>
        submitPromise as Promise<{
          outcome: "success";
          receipt: { duplicate: boolean; feedbackId: string; receivedAt: string };
        }>,
    });

    void dialog.open({ description: "Desc", kind: "bug", title: "Valid report title" }, "manual");
    const shadow = host.shadowRoot;

    // Move to confirmation
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();

    expect(shadow?.getElementById("filika-feedback-status")?.textContent).toContain(
      "Review submission to Filika demo",
    );

    // Click confirm -> submitting state
    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();

    expect(shadow?.getElementById("filika-feedback-status")?.textContent).toBe(
      "Submitting feedback.",
    );

    // Resolve submission with success
    resolveSubmit?.({
      outcome: "success",
      receipt: {
        duplicate: false,
        feedbackId: "fb_screenreader_123",
        receivedAt: "2026-08-28T12:00:00.000Z",
      },
    });
    await Promise.resolve();

    const successStatus = shadow?.getElementById("filika-feedback-status");
    expect(successStatus?.textContent).toContain("Feedback received successfully");
    expect(successStatus?.textContent).toContain("fb_screenreader_123");
  });

  test("live region announces duplicate receipt and error outcomes", async () => {
    const { host } = setupDom();
    let submitOutcome = "outcome_unknown";

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: () => {
        if (submitOutcome === "outcome_unknown") {
          return Promise.resolve({ outcome: "outcome_unknown" as const });
        }
        return Promise.resolve({
          outcome: "success" as const,
          receipt: {
            duplicate: true,
            feedbackId: "fb_dup_456",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        });
      },
    });

    void dialog.open({ description: "Desc", kind: "bug", title: "Test" }, "manual");
    const shadow = host.shadowRoot;

    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();
    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(shadow?.getElementById("filika-feedback-status")?.textContent).toContain(
      "Submission status unknown",
    );

    // Retry and get duplicate receipt
    submitOutcome = "duplicate";
    const retryBtn = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    retryBtn.click();
    await Promise.resolve();

    const dupStatus = shadow?.getElementById("filika-feedback-status");
    expect(dupStatus?.textContent).toContain("Feedback already received");
    expect(dupStatus?.textContent).toContain("fb_dup_456");
  });

  test("ReceiptToast has polite atomic live region, duplicate badge, and dismiss accessible name", () => {
    const { document } = setupDom();
    const container = document.createElement("div");
    document.body.append(container);

    const toast = new ReceiptToast(container);
    const toastEl = toast.show({
      duplicate: true,
      feedbackId: "fb_toast_123",
      receivedAt: "2026-08-28T12:00:00.000Z",
    });

    expect(toastEl.getAttribute("role")).toBe("status");
    expect(toastEl.getAttribute("aria-live")).toBe("polite");
    expect(toastEl.getAttribute("aria-atomic")).toBe("true");

    const dismissBtn = toastEl.querySelector(".toast-dismiss-btn");
    expect(dismissBtn?.getAttribute("aria-label")).toBe("Dismiss notification");

    toast.dismiss();
    expect(toast.isVisible).toBe(false);
  });

  test("inbox list and detail render accessible heading hierarchy and polite landmark labels", () => {
    const { document } = setupDom();

    // Inbox List
    const listSection = renderInboxList(
      document,
      {
        items: [
          {
            feedbackId: "fb_1",
            kind: "bug",
            receivedAt: "2026-08-28T12:00:00.000Z",
            requestOrigin: "http://localhost:4173",
            routeLabel: "Demo page",
            title: "Row 1",
          },
        ],
        status: "ready",
      },
      { onOpen: () => {}, onRetry: () => {} },
    );

    const listEl = listSection.querySelector("ol");
    expect(listEl?.getAttribute("aria-label")).toBe("Accepted feedback");
    expect(listSection.querySelector("h1")?.textContent).toBe("Feedback inbox");

    // Inbox Detail
    const detailSection = renderInboxDetail(
      document,
      {
        feedback: {
          applicationRelease: "v1.0",
          description: "Detail desc",
          expectedBehavior: "Expected",
          expiresAt: "2026-08-29T12:00:00.000Z",
          feedbackId: "fb_1",
          kind: "bug",
          receivedAt: "2026-08-28T12:00:00.000Z",
          reproductionSteps: "Steps",
          requestOrigin: "http://localhost:4173",
          routeLabel: "Demo page",
          source: "web_sdk_unverified",
          title: "Detail Title",
        },
        status: "ready",
      },
      { onBack: () => {}, onRetry: () => {} },
    );

    expect(detailSection.querySelector("h1")?.textContent).toBe("Detail Title");
    const headings = Array.from(detailSection.querySelectorAll("h2")).map((h) => h.textContent);
    expect(headings).toContain("Report content");
    expect(headings).toContain("Host-supplied context");
    expect(headings).toContain("Server-derived facts");
  });
});

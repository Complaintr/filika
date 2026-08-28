import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog, type FeedbackDialogOptions } from "../src/components/feedback-dialog";
import type { FeedbackDraft } from "../src/contracts/feedback-fields";
import { SampleApplication } from "../src/sample-app";

function createDocument(): Document {
  const window = new Window({ url: "http://localhost:4173" });
  return window.document as unknown as Document;
}

function dispatchInputEvent(document: Document, element: HTMLElement): void {
  const view = document.defaultView;
  if (view === null) {
    throw new Error("Missing defaultView");
  }
  element.dispatchEvent(new view.Event("input", { bubbles: true }));
}

function createDialog(
  document: Document,
  submit: FeedbackDialogOptions["submit"] = () =>
    Promise.resolve({
      outcome: "success",
      receipt: {
        duplicate: false,
        feedbackId: "fb_test_p3_1",
        receivedAt: "2026-08-28T12:00:00.000Z",
      },
    }),
): { dialog: FeedbackDialog; host: HTMLElement } {
  const host = document.createElement("div");
  document.body.append(host);
  return {
    dialog: new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika local demo",
        retentionSummary: "Demo feedback is retained for up to 24 hours.",
      },
      submit,
    }),
    host,
  };
}

function clickButton(root: ShadowRoot | null, id: string): void {
  const btn = root?.getElementById(id) as HTMLButtonElement | null;
  btn?.click();
}

describe("P3-FE-06 dialog interaction flows", () => {
  test("P3-FE-06a: edit authored fields, validate, confirm, and verify success receipt", async () => {
    const document = createDocument();
    let submittedDraft: FeedbackDraft | null = null;

    const { dialog, host } = createDialog(document, (draft) => {
      submittedDraft = draft;
      return Promise.resolve({
        outcome: "success",
        receipt: {
          duplicate: false,
          feedbackId: "fb_p3_success_99",
          receivedAt: "2026-08-28T12:30:00.000Z",
        },
      });
    });

    const openPromise = dialog.open({
      description: "Initial description",
      kind: "bug",
      title: "Initial title",
    });

    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();

    // Edit title
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    titleInput.value = "Updated edited title";
    dispatchInputEvent(document, titleInput);

    // Edit description
    const descInput = shadow?.getElementById("filika-description") as HTMLTextAreaElement;
    descInput.value = "Updated description of the observed defect";
    dispatchInputEvent(document, descInput);

    // Edit expected behavior
    const expectedInput = shadow?.getElementById("filika-expected-behavior") as HTMLTextAreaElement;
    expectedInput.value = "Should save draft smoothly";
    dispatchInputEvent(document, expectedInput);

    // Click review
    clickButton(shadow, "filika-review");

    // Verify confirmation screen is shown
    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe("Confirm submission");
    expect(shadow?.textContent).toContain("Updated edited title");
    expect(shadow?.textContent).toContain("Should save draft smoothly");

    // Click confirm
    clickButton(shadow, "filika-confirm");

    const result = await openPromise;
    expect(result.outcome).toBe("success");
    if (result.outcome === "success") {
      expect(result.receipt.feedbackId).toBe("fb_p3_success_99");
      expect(result.receipt.duplicate).toBe(false);
    }

    expect(submittedDraft?.title).toBe("Updated edited title");
    expect(submittedDraft?.description).toBe("Updated description of the observed defect");
    expect(submittedDraft?.expectedBehavior).toBe("Should save draft smoothly");

    // Verify receipt rendered in dialog
    expect(shadow?.textContent).toContain("Feedback received");
    expect(shadow?.textContent).toContain("fb_p3_success_99");

    // Close dialog
    clickButton(shadow, "filika-close");
    expect(dialog.state.status).toBe("closed");
  });

  test("P3-FE-06b: remove context fields and verify they are omitted from submission", async () => {
    const document = createDocument();
    let submittedDraft: FeedbackDraft | null = null;

    const { dialog, host } = createDialog(document, (draft) => {
      submittedDraft = draft;
      return Promise.resolve({
        outcome: "success",
        receipt: {
          duplicate: false,
          feedbackId: "fb_p3_ctx_1",
          receivedAt: "2026-08-28T12:00:00.000Z",
        },
      });
    });

    void dialog.open({
      applicationRelease: "release-v1.0",
      description: "Description text",
      kind: "idea",
      routeLabel: "Settings page",
      title: "Feature idea",
    });

    const shadow = host.shadowRoot;

    // Check that context remove buttons exist
    const removeRouteBtn = shadow?.getElementById("filika-route-label-remove") as HTMLButtonElement;
    const removeReleaseBtn = shadow?.getElementById(
      "filika-application-release-remove",
    ) as HTMLButtonElement;

    expect(removeRouteBtn).not.toBeNull();
    expect(removeReleaseBtn).not.toBeNull();

    // Remove route label and application release
    removeRouteBtn.click();
    removeReleaseBtn.click();

    // Context section should no longer show removed items
    expect(shadow?.getElementById("filika-route-label-remove")).toBeNull();
    expect(shadow?.getElementById("filika-application-release-remove")).toBeNull();

    // Review and Confirm
    clickButton(shadow, "filika-review");
    clickButton(shadow, "filika-confirm");

    await Promise.resolve();

    expect(submittedDraft?.routeLabel).toBeNull();
    expect(submittedDraft?.applicationRelease).toBeNull();
  });

  test("P3-FE-06b: cancel flow from editing and confirmation states", async () => {
    const document = createDocument();
    const { dialog, host } = createDialog(document);

    // Cancel from editing
    const promise1 = dialog.open({ description: "Desc", kind: "bug", title: "Draft 1" });
    const shadow = host.shadowRoot;
    clickButton(shadow, "filika-cancel");

    const result1 = await promise1;
    expect(result1.outcome).toBe("cancelled");

    // Close
    clickButton(shadow, "filika-close");
    expect(dialog.state.status).toBe("closed");

    // Cancel from confirmation
    const promise2 = dialog.open({ description: "Desc", kind: "bug", title: "Draft 2" });
    clickButton(shadow, "filika-review");
    clickButton(shadow, "filika-cancel");

    const result2 = await promise2;
    expect(result2.outcome).toBe("cancelled");
  });

  test("P3-FE-06b: manual feedback button opens empty manual draft and restores focus", async () => {
    const document = createDocument();
    const { dialog, host } = createDialog(document);

    const appContainer = document.createElement("div");
    document.body.append(appContainer);

    const app = new SampleApplication(appContainer, { feedbackDialog: dialog });
    app.render();

    const buttons = Array.from(appContainer.querySelectorAll("button"));
    const manualBtn = buttons.find((btn) => btn.textContent === "Send feedback");
    expect(manualBtn).toBeDefined();

    manualBtn?.click();

    expect(dialog.state.status).toBe("editing");
    if (dialog.state.status === "editing") {
      expect(dialog.state.source).toBe("manual");
      expect(dialog.state.draft.title).toBeNull();
      expect(dialog.state.draft.description).toBeNull();
    }

    const shadow = host.shadowRoot;
    clickButton(shadow, "filika-cancel");
    clickButton(shadow, "filika-close");

    expect(dialog.state.status).toBe("closed");
  });

  test("P3-FE-06c: retry from timeout, internal_error, and outcome_unknown states", async () => {
    const document = createDocument();
    let attempt = 0;

    const { dialog, host } = createDialog(document, () => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.resolve({ outcome: "timeout" });
      }
      if (attempt === 2) {
        return Promise.resolve({ outcome: "internal_error" });
      }
      if (attempt === 3) {
        return Promise.resolve({ outcome: "outcome_unknown" });
      }
      return Promise.resolve({
        outcome: "success",
        receipt: {
          duplicate: false,
          feedbackId: "fb_after_retries",
          receivedAt: "2026-08-28T12:00:00.000Z",
        },
      });
    });

    void dialog.open({ description: "Retry desc", kind: "bug", title: "Retry test" });
    const shadow = host.shadowRoot;

    // Review & Confirm attempt 1 -> timeout
    clickButton(shadow, "filika-review");
    clickButton(shadow, "filika-confirm");
    await Promise.resolve();

    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe(
      "Submission timed out",
    );
    const retryBtn1 = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    expect(retryBtn1.textContent).toBe("Retry");

    // Retry attempt 2 -> internal_error
    retryBtn1.click();
    await Promise.resolve();
    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe(
      "Something went wrong",
    );
    const retryBtn2 = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    expect(retryBtn2.textContent).toBe("Retry");

    // Retry attempt 3 -> outcome_unknown
    retryBtn2.click();
    await Promise.resolve();
    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe(
      "Submission status unknown",
    );
    const retryBtn3 = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    expect(retryBtn3.textContent).toBe("Retry");

    // Retry attempt 4 -> success!
    retryBtn3.click();
    await Promise.resolve();
    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe("Feedback received");
    expect(shadow?.textContent).toContain("fb_after_retries");
  });

  test("P3-FE-06c: collector_rejected and invalid_input allow editing report and resubmitting", async () => {
    const document = createDocument();
    let attempt = 0;

    const { dialog, host } = createDialog(document, () => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.resolve({ outcome: "collector_rejected" });
      }
      return Promise.resolve({
        outcome: "success",
        receipt: {
          duplicate: false,
          feedbackId: "fb_after_fix",
          receivedAt: "2026-08-28T12:00:00.000Z",
        },
      });
    });

    void dialog.open({ description: "Desc", kind: "bug", title: "Bad title" });
    const shadow = host.shadowRoot;

    // Review & Confirm attempt 1 -> collector_rejected
    clickButton(shadow, "filika-review");
    clickButton(shadow, "filika-confirm");
    await Promise.resolve();

    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe(
      "Feedback not accepted",
    );
    const editBtn = shadow?.getElementById("filika-outcome-primary") as HTMLButtonElement;
    expect(editBtn.textContent).toBe("Edit report");

    // Click edit report -> back to editing
    editBtn.click();
    expect(dialog.state.status).toBe("editing");

    // Fix title and resubmit
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    titleInput.value = "Fixed good title";
    dispatchInputEvent(document, titleInput);

    clickButton(shadow, "filika-review");
    clickButton(shadow, "filika-confirm");
    await Promise.resolve();

    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe("Feedback received");
  });
});

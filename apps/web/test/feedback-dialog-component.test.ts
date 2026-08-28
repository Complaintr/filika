import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog, type FeedbackDialogOptions } from "../src/components/feedback-dialog";
import type { FeedbackDraft } from "../src/contracts/feedback-fields";

const completeDraft: Partial<FeedbackDraft> = {
  applicationRelease: "demo-2026.08",
  description: "The sample save failed.",
  expectedBehavior: "The draft should be saved.",
  kind: "bug",
  reproductionSteps: "Run the sample task.",
  routeLabel: "Sample task",
  title: "Sample save failed",
};

function createDocument(): Document {
  return new Window({ url: "http://localhost:4173" }).document as unknown as Document;
}

function createDialog(
  document: Document,
  submit: FeedbackDialogOptions["submit"] = () =>
    Promise.resolve({
      outcome: "success",
      receipt: {
        duplicate: false,
        feedbackId: "fb_test_123",
        receivedAt: "2026-08-27T10:00:00.000Z",
      },
    }),
): { dialog: FeedbackDialog; host: HTMLElement } {
  const host = document.createElement("div");
  document.body.append(host);
  return {
    dialog: new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "https://collector.example.test",
        privacyUrl: "https://example.test/privacy",
        projectName: "Example project",
        retentionSummary: "Feedback is retained for 24 hours.",
      },
      submit,
    }),
    host,
  };
}

function requiredShadowRoot(host: HTMLElement): ShadowRoot {
  if (host.shadowRoot === null) {
    throw new Error("Expected a shadow root.");
  }
  return host.shadowRoot;
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Missing test element: ${selector}`);
  }
  return element as T;
}

describe("feedback-dialog-component", () => {
  test("isolates a native dialog in Shadow DOM and validates required fields", () => {
    const document = createDocument();
    const { dialog, host } = createDialog(document);
    void dialog.open();
    let root = requiredShadowRoot(host);

    expect(requiredElement<HTMLDialogElement>(root, "dialog").open).toBe(true);
    expect(root.textContent).toContain("Nothing is sent until you review");
    requiredElement<HTMLButtonElement>(root, "#filika-review").click();
    root = requiredShadowRoot(host);

    expect(root.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3);
    expect(root.textContent).toContain("Feedback type");
    expect(root.textContent).toContain("Summary");
    expect(root.textContent).toContain("What happened?");
    expect(root.activeElement?.id).toBe("filika-kind");
  });

  test("edits all authored fields, removes host context, and shows identity before confirmation", () => {
    const document = createDocument();
    const { dialog, host } = createDialog(document);
    void dialog.open(completeDraft, "webmcp");
    let root = requiredShadowRoot(host);

    const expectedBehavior = requiredElement<HTMLTextAreaElement>(
      root,
      "#filika-expected-behavior",
    );
    expectedBehavior.value = "";
    const view = document.defaultView;
    if (view === null) {
      throw new Error("Expected a document window.");
    }
    expectedBehavior.dispatchEvent(new view.Event("input", { bubbles: true }));
    requiredElement<HTMLButtonElement>(root, "#filika-route-label-remove").click();
    root = requiredShadowRoot(host);
    expect(root.textContent).not.toContain("Sample task");

    requiredElement<HTMLButtonElement>(root, "#filika-review").click();
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Example project");
    expect(root.textContent).toContain("https://collector.example.test");
    expect(root.textContent).toContain("Feedback is retained for 24 hours.");
    expect(requiredElement<HTMLAnchorElement>(root, ".privacy a").href).toBe(
      "https://example.test/privacy",
    );
  });

  test("renders submitting and duplicate receipt states", async () => {
    const document = createDocument();
    let resolveSubmission: (result: {
      outcome: "success";
      receipt: { duplicate: boolean; feedbackId: string; receivedAt: string };
    }) => void = () => {};

    const { dialog, host } = createDialog(
      document,
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        }),
    );
    const resultPromise = dialog.open(completeDraft);
    let root = requiredShadowRoot(host);
    requiredElement<HTMLButtonElement>(root, "#filika-review").click();
    root = requiredShadowRoot(host);
    requiredElement<HTMLButtonElement>(root, "#filika-confirm").click();
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Submitting feedback");

    resolveSubmission({
      outcome: "success",
      receipt: {
        duplicate: true,
        feedbackId: "fb_duplicate_1",
        receivedAt: "2026-08-27T10:00:00.000Z",
      },
    });
    expect(await resultPromise).toEqual({
      outcome: "success",
      receipt: {
        duplicate: true,
        feedbackId: "fb_duplicate_1",
        receivedAt: "2026-08-27T10:00:00.000Z",
      },
    });
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Already received");
    expect(root.textContent).not.toContain("The sample save failed.");
  });

  test("supports timeout retry, collector rejection editing, cancellation, and abort", async () => {
    const outcomes = [
      { outcome: "timeout" as const },
      { outcome: "outcome_unknown" as const },
      { outcome: "collector_rejected" as const },
    ];
    const document = createDocument();
    const { dialog, host } = createDialog(document, () =>
      Promise.resolve(outcomes.shift() ?? { outcome: "internal_error" }),
    );
    void dialog.open(completeDraft);
    let root = requiredShadowRoot(host);
    requiredElement<HTMLButtonElement>(root, "#filika-review").click();
    requiredElement<HTMLButtonElement>(requiredShadowRoot(host), "#filika-confirm").click();
    await Promise.resolve();
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Review timed out");
    requiredElement<HTMLButtonElement>(root, "#filika-outcome-primary").click();
    expect(dialog.state.status).toBe("editing");
    requiredElement<HTMLButtonElement>(root, "#filika-review").click();
    requiredElement<HTMLButtonElement>(root, "#filika-confirm").click();
    await Promise.resolve();
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Submission status unknown");
    requiredElement<HTMLButtonElement>(root, "#filika-outcome-primary").click();
    await Promise.resolve();
    root = requiredShadowRoot(host);
    expect(root.textContent).toContain("Feedback not accepted");
    requiredElement<HTMLButtonElement>(root, "#filika-outcome-primary").click();
    expect(requiredShadowRoot(host).textContent).toContain("Review feedback");

    const cancelDocument = createDocument();
    const invoker = cancelDocument.createElement("button");
    cancelDocument.body.append(invoker);
    invoker.focus();
    const cancelFixture = createDialog(cancelDocument);
    const canceled = cancelFixture.dialog.open();
    requiredElement<HTMLButtonElement>(
      requiredShadowRoot(cancelFixture.host),
      "#filika-cancel",
    ).click();
    expect(await canceled).toEqual({ outcome: "cancelled" });
    requiredElement<HTMLButtonElement>(
      requiredShadowRoot(cancelFixture.host),
      "#filika-close",
    ).click();
    expect(cancelDocument.activeElement).toBe(invoker);

    const abortDocument = createDocument();
    const abortFixture = createDialog(
      abortDocument,
      (_draft, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const aborted = abortFixture.dialog.open(completeDraft);
    requiredElement<HTMLButtonElement>(
      requiredShadowRoot(abortFixture.host),
      "#filika-review",
    ).click();
    requiredElement<HTMLButtonElement>(
      requiredShadowRoot(abortFixture.host),
      "#filika-confirm",
    ).click();
    requiredElement<HTMLButtonElement>(
      requiredShadowRoot(abortFixture.host),
      "#filika-cancel",
    ).click();
    expect(await aborted).toEqual({ outcome: "aborted" });
    expect(requiredShadowRoot(abortFixture.host).textContent).toContain("Submission stopped");
  });
});

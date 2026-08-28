import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import { SampleApplication } from "../src/sample-app";

function createDocument(): Document {
  return new Window({ url: "http://localhost:4173" }).document as unknown as Document;
}

function createDialog(document: Document): { dialog: FeedbackDialog; host: HTMLElement } {
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
      submit: () =>
        Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_test_123",
            receivedAt: "2026-08-27T10:00:00.000Z",
          },
        }),
    }),
    host,
  };
}

describe("sample-application", () => {
  test("shows a normal task and a deterministic resettable failure", () => {
    const document = createDocument();
    const container = document.createElement("main");
    const dialogFixture = createDialog(document);
    const sample = new SampleApplication(container, { feedbackDialog: dialogFixture.dialog });
    sample.render();

    expect(container.textContent).toContain("Normal task");
    expect(container.textContent).toContain("Run sample task");
    sample.runFailure();
    expect(container.textContent).toContain("Sample save failed");
    sample.resetFailure();
    expect(container.textContent).toContain("Sample draft is ready");
  });

  test("uses the same feedback dialog for the manual button", () => {
    const document = createDocument();
    const container = document.createElement("main");
    const dialogFixture = createDialog(document);
    const sample = new SampleApplication(container, { feedbackDialog: dialogFixture.dialog });
    sample.render();

    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Send feedback",
    );
    button?.click();

    expect(dialogFixture.dialog.state.status).toBe("editing");
    expect(dialogFixture.host.shadowRoot?.textContent).toContain("Review feedback");
  });
});

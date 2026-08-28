import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";

function createHostileDocument(advanced = false): Document {
  const window = new Window({ url: "http://localhost:4173" });
  const doc = window.document as unknown as Document;

  const hostileStyle = doc.createElement("style");
  hostileStyle.textContent = advanced
    ? `
    *, *::before, *::after {
      all: unset !important;
      box-sizing: content-box !important;
      color: transparent !important;
      font-size: 0px !important;
      line-height: 0 !important;
      margin: -999px !important;
      padding: 0 !important;
      transform: scale(0.01) !important;
      filter: blur(100px) !important;
      clip-path: polygon(0 0, 0 0, 0 0) !important;
      pointer-events: none !important;
    }
    body {
      display: flex !important;
      flex-direction: column-reverse !important;
      background: #000000 !important;
    }
    dialog {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -99999 !important;
    }
    button, input, select, textarea {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `
    : `
    * {
      all: unset !important;
      box-sizing: content-box !important;
      color: red !important;
      font-size: 0px !important;
    }
    dialog {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    button, input, select, textarea {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  doc.head.append(hostileStyle);

  const rootHost = doc.createElement("div");
  rootHost.id = "filika-feedback-root";
  doc.body.append(rootHost);

  return doc;
}

describe("P4-FE-09 hostile CSS isolation", () => {
  test("shadow DOM isolates dialog structure and styles from standard hostile host CSS", async () => {
    const document = createHostileDocument(false);
    const host = document.getElementById("filika-feedback-root") as HTMLElement;

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika local demo",
        retentionSummary: "Demo feedback is retained for up to 24 hours.",
      },
      submit: () =>
        Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_isolated_1",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        }),
    });

    void dialog.open({
      description: "Observed bug description under hostile CSS",
      kind: "bug",
      title: "Hostile CSS test report",
    });

    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow?.mode).toBe("open");

    const styleEl = shadow?.querySelector("style");
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain("--filika-dialog-bg");
    expect(styleEl?.textContent).toContain("dialog {");
    expect(styleEl?.textContent).toContain(".surface {");

    const dialogEl = shadow?.querySelector<HTMLDialogElement>("dialog");
    expect(dialogEl).not.toBeNull();
    expect(dialogEl?.open).toBe(true);

    const kindSelect = shadow?.getElementById("filika-kind") as HTMLSelectElement;
    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    const descTextarea = shadow?.getElementById("filika-description") as HTMLTextAreaElement;
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    const cancelBtn = shadow?.getElementById("filika-cancel") as HTMLButtonElement;

    expect(kindSelect).not.toBeNull();
    expect(titleInput).not.toBeNull();
    expect(descTextarea).not.toBeNull();
    expect(reviewBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();

    expect(kindSelect.value).toBe("bug");
    expect(titleInput.value).toBe("Hostile CSS test report");
    expect(descTextarea.value).toBe("Observed bug description under hostile CSS");

    reviewBtn.click();
    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe("Confirm submission");

    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    confirmBtn.click();
    await Promise.resolve();

    expect(shadow?.getElementById("filika-feedback-title")?.textContent).toBe("Feedback received");
    expect(shadow?.textContent).toContain("fb_isolated_1");

    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();
    expect(dialog.state.status).toBe("closed");
  });

  test("shadow DOM isolates dialog against advanced hostile CSS (transforms, flex reverse, transparent text)", async () => {
    const document = createHostileDocument(true);
    const host = document.getElementById("filika-feedback-root") as HTMLElement;

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: () =>
        Promise.resolve({
          outcome: "success",
          receipt: {
            duplicate: false,
            feedbackId: "fb_isolated_adv",
            receivedAt: "2026-08-28T12:00:00.000Z",
          },
        }),
    });

    void dialog.open({
      description: "Advanced hostile test desc",
      kind: "bug",
      title: "Advanced hostile report",
    });

    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();

    // Dialog remains open and interactive
    const dialogEl = shadow?.querySelector<HTMLDialogElement>("dialog");
    expect(dialogEl?.open).toBe(true);

    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Advanced hostile report");

    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();
    expect(dialog.state.status).toBe("confirming");

    const confirmBtn = shadow?.getElementById("filika-confirm") as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();

    expect(dialog.state.status).toBe("success");
    expect(shadow?.textContent).toContain("fb_isolated_adv");

    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();
    expect(dialog.state.status).toBe("closed");
  });
});

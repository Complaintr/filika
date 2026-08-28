import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import { FILIKA_DESIGN_TOKENS, FILIKA_TOKEN_CSS } from "../src/foundation/design-tokens";

describe("P4-FE-04 reduced-motion behavior and backdrop isolation", () => {
  test("reduced motion token overrides resolve durations to 0ms", () => {
    expect(FILIKA_DESIGN_TOKENS.motion.reducedDuration).toBe("0ms");
    expect(FILIKA_TOKEN_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-motion-fast: 0ms");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-motion-normal: 0ms");
  });

  test("dialog styles contain reduced motion overrides for spinners, transitions, and animations", () => {
    const window = new Window({ url: "http://localhost:4173" });
    const document = window.document as unknown as Document;
    const host = document.createElement("div");
    document.body.append(host);

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
    const styleEl = shadow?.querySelector("style");

    expect(styleEl?.textContent).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styleEl?.textContent).toContain(".spinner { animation: none; }");
    expect(styleEl?.textContent).toContain("animation-duration: 0ms !important");
    expect(styleEl?.textContent).toContain("transition-duration: 0ms !important");
  });

  test("modal backdrop isolation locks document body scroll while open and restores it on close", () => {
    const window = new Window({ url: "http://localhost:4173" });
    const document = window.document as unknown as Document;
    const host = document.createElement("div");
    document.body.append(host);

    expect(document.body.style.overflow).toBe("");

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
    expect(document.body.style.overflow).toBe("hidden");

    const shadow = host.shadowRoot;
    const cancelBtn = shadow?.getElementById("filika-cancel") as HTMLButtonElement;
    cancelBtn.click();

    // From outcome, close dialog
    const closeBtn = shadow?.getElementById("filika-close") as HTMLButtonElement;
    closeBtn.click();

    expect(document.body.style.overflow).toBe("");
  });

  test("modal disposal restores document body scroll", () => {
    const window = new Window({ url: "http://localhost:4173" });
    const document = window.document as unknown as Document;
    const host = document.createElement("div");
    document.body.append(host);

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
    expect(document.body.style.overflow).toBe("hidden");

    dialog.dispose();
    expect(document.body.style.overflow).toBe("");
  });
});

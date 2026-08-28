import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import { renderInboxDetail, renderInboxList } from "../src/components/inbox";
import { ReceiptToast } from "../src/components/receipt-toast";

const XSS_PAYLOADS = [
  '<script>window.__xss_executed = true; alert("xss");</script>',
  '<img src="invalid_img" onerror="window.__xss_executed = true;" />',
  '<svg onload="window.__xss_executed = true;"><circle r="10"/></svg>',
  '<iframe src="javascript:window.__xss_executed=true;"></iframe>',
  '"><script>window.__xss_executed = true;</script><input value="',
  '<a href="javascript:window.__xss_executed=true;">Exploit</a>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  "<style>body { display: none !important; }</style>",
  "{{constructor.constructor('window.__xss_executed=true')()}}",
  "&lt;script&gt;alert(1)&lt;/script&gt;",
  "\u003cscript\u003ealert(1)\u003c/script\u003e",
];

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  return { document, window };
}

describe("P4-FE-06 stored-XSS regression and text rendering safety", () => {
  test("inbox list view renders adversarial payloads strictly as text without executing or parsing HTML", () => {
    const { document } = setupDom();

    for (const payload of XSS_PAYLOADS) {
      const section = renderInboxList(
        document,
        {
          items: [
            {
              feedbackId: `fb_${payload}`,
              kind: payload,
              receivedAt: "2026-08-28T12:00:00.000Z",
              requestOrigin: payload,
              routeLabel: payload,
              title: payload,
            },
          ],
          status: "ready",
        },
        { onOpen: () => {}, onRetry: () => {} },
      );

      // Verify no injected script, img, iframe, or meta tags exist in the DOM
      expect(section.querySelector("script")).toBeNull();
      expect(section.querySelector("img")).toBeNull();
      expect(section.querySelector("iframe")).toBeNull();
      expect(section.querySelector("meta")).toBeNull();

      // Verify payload is safely preserved verbatim in textContent
      expect(section.textContent).toContain(payload);
    }
  });

  test("inbox detail view renders all report fields, host context, and server facts as literal text", () => {
    const { document } = setupDom();

    for (const payload of XSS_PAYLOADS) {
      const section = renderInboxDetail(
        document,
        {
          feedback: {
            applicationRelease: payload,
            description: payload,
            expectedBehavior: payload,
            expiresAt: "2026-08-29T12:00:00.000Z",
            feedbackId: payload,
            kind: "bug",
            receivedAt: "2026-08-28T12:00:00.000Z",
            reproductionSteps: payload,
            requestOrigin: payload,
            routeLabel: payload,
            source: payload,
            title: payload,
          },
          status: "ready",
        },
        { onBack: () => {}, onRetry: () => {} },
      );

      // No injected elements
      expect(section.querySelector("script")).toBeNull();
      expect(section.querySelector("img")).toBeNull();
      expect(section.querySelector("iframe")).toBeNull();
      expect(section.querySelector("meta")).toBeNull();

      // Literal representation in textContent
      expect(section.textContent).toContain(payload);
    }
  });

  test("receipt toast renders receipt identifiers safely as text without DOM injection", () => {
    const { document } = setupDom();
    const container = document.createElement("div");
    document.body.append(container);

    const toast = new ReceiptToast(container);
    for (const payload of XSS_PAYLOADS) {
      const toastEl = toast.show({
        duplicate: false,
        feedbackId: payload,
        receivedAt: "2026-08-28T12:00:00.000Z",
      });

      expect(toastEl.querySelector("script")).toBeNull();
      expect(toastEl.querySelector("img")).toBeNull();
      expect(toastEl.querySelector("iframe")).toBeNull();
      expect(toastEl.textContent).toContain(payload);

      toast.dismiss();
    }
  });

  test("feedback dialog renders hostile prefilled drafts in input values and confirmation preview as text", () => {
    const { document } = setupDom();
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

    const hostileTitle = '<script>alert("xss")</script>';
    const hostileDesc = "<img src=x onerror=alert(1)>";
    const hostileExpected = '<iframe src="javascript:alert(1)"></iframe>';
    const hostileSteps = "<svg onload=alert(1)></svg>";
    const hostileRoute = '<meta http-equiv="refresh">';

    void dialog.open(
      {
        description: hostileDesc,
        expectedBehavior: hostileExpected,
        kind: "bug",
        reproductionSteps: hostileSteps,
        routeLabel: hostileRoute,
        title: hostileTitle,
      },
      "webmcp",
    );

    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();

    const titleInput = shadow?.getElementById("filika-title") as HTMLInputElement;
    const descTextarea = shadow?.getElementById("filika-description") as HTMLTextAreaElement;
    const expTextarea = shadow?.getElementById("filika-expected-behavior") as HTMLTextAreaElement;
    const stepsTextarea = shadow?.getElementById(
      "filika-reproduction-steps",
    ) as HTMLTextAreaElement;

    expect(titleInput.value).toBe(hostileTitle);
    expect(descTextarea.value).toBe(hostileDesc);
    expect(expTextarea.value).toBe(hostileExpected);
    expect(stepsTextarea.value).toBe(hostileSteps);

    // Proceed to confirmation
    const reviewBtn = shadow?.getElementById("filika-review") as HTMLButtonElement;
    reviewBtn.click();

    // Verify confirmation list contains text representation without parsing tags
    expect(shadow?.querySelector("script")).toBeNull();
    expect(shadow?.querySelector("img")).toBeNull();
    expect(shadow?.querySelector("iframe")).toBeNull();
    expect(shadow?.querySelector("svg")).toBeNull();

    const reviewList = shadow?.querySelector(".review-list");
    expect(reviewList?.textContent).toContain(hostileTitle);
    expect(reviewList?.textContent).toContain(hostileDesc);
    expect(reviewList?.textContent).toContain(hostileExpected);
    expect(reviewList?.textContent).toContain(hostileSteps);
    expect(reviewList?.textContent).toContain(hostileRoute);
  });
});

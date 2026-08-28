import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { ReceiptToast, type ReceiptToastData } from "../src/components/receipt-toast";

describe("ReceiptToast", () => {
  let document: Document;
  let container: HTMLElement;

  beforeEach(() => {
    const window = new Window();
    document = window.document as unknown as Document;
    container = document.createElement("div");
    document.body.append(container);
  });

  test("renders accepted receipt with only server-derived facts and no report body", () => {
    const toast = new ReceiptToast(container, { autoDismissMs: 0 });
    const receiptData: ReceiptToastData = {
      duplicate: false,
      feedbackId: "fb_test_12345678",
      receivedAt: "2026-08-28T10:00:00.000Z",
    };

    const element = toast.show(receiptData);

    expect(toast.isVisible).toBe(true);
    expect(element.getAttribute("role")).toBe("status");
    expect(element.getAttribute("aria-live")).toBe("polite");
    expect(element.dataset.duplicate).toBe("false");
    expect(element.textContent).toContain("Feedback accepted");
    expect(element.textContent).toContain("fb_test_12345678");
    expect(element.textContent).not.toContain("Title");
    expect(element.textContent).not.toContain("Description");
  });

  test("renders duplicate receipt with appropriate duplicate indicator", () => {
    const toast = new ReceiptToast(container, { autoDismissMs: 0 });
    const receiptData: ReceiptToastData = {
      duplicate: true,
      feedbackId: "fb_dup_87654321",
      receivedAt: "2026-08-28T09:30:00.000Z",
    };

    const element = toast.show(receiptData);

    expect(element.dataset.duplicate).toBe("true");
    expect(element.textContent).toContain("Feedback already received");
    expect(element.textContent).toContain("Duplicate");
    expect(element.textContent).toContain("fb_dup_87654321");
  });

  test("dismiss removes the toast from DOM and triggers callback", () => {
    let dismissed = false;
    const toast = new ReceiptToast(container, {
      autoDismissMs: 0,
      onDismiss: () => {
        dismissed = true;
      },
    });

    toast.show({
      duplicate: false,
      feedbackId: "fb_123",
      receivedAt: "2026-08-28T10:00:00.000Z",
    });
    expect(toast.isVisible).toBe(true);

    toast.dismiss();

    expect(toast.isVisible).toBe(false);
    expect(dismissed).toBe(true);
    expect(container.children.length).toBe(0);
  });

  test("clicking dismiss button removes toast", () => {
    const toast = new ReceiptToast(container, { autoDismissMs: 0 });
    const element = toast.show({
      duplicate: false,
      feedbackId: "fb_123",
      receivedAt: "2026-08-28T10:00:00.000Z",
    });

    const button = element.querySelector<HTMLButtonElement>(".toast-dismiss-btn");
    expect(button).not.toBeNull();
    button?.click();

    expect(toast.isVisible).toBe(false);
  });

  test("opens the exact accepted feedback from the receipt", () => {
    let openedFeedbackId: string | null = null;
    const toast = new ReceiptToast(container, {
      autoDismissMs: 0,
      onViewInbox: (feedbackId) => {
        openedFeedbackId = feedbackId;
      },
    });
    const element = toast.show({
      duplicate: false,
      feedbackId: "fb_exact_123",
      receivedAt: "2026-08-28T10:00:00.000Z",
    });

    element.querySelector<HTMLButtonElement>(".toast-view-inbox")?.click();

    expect(openedFeedbackId).toBe("fb_exact_123");
    expect(toast.isVisible).toBe(false);
  });
});

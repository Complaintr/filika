/**
 * ReceiptToast component for presenting accepted / duplicate feedback receipts.
 *
 * Requirements:
 * - Shows only server-derived receipt facts: feedbackId, receivedAt, and duplicate status.
 * - Never echoes agent-authored report content (title, description, steps).
 * - Accessible with role="status", aria-live="polite", and keyboard dismiss.
 */

export interface ReceiptToastData {
  feedbackId: string;
  receivedAt: string;
  duplicate: boolean;
}

export interface ReceiptToastOptions {
  autoDismissMs?: number;
  onDismiss?(): void;
  onViewInbox?(feedbackId: string): void;
}

const DEFAULT_AUTO_DISMISS_MS = 8000;

export class ReceiptToast {
  readonly #container: HTMLElement;
  readonly #document: Document;
  readonly #options: ReceiptToastOptions;
  #timerId: ReturnType<typeof setTimeout> | null = null;
  #element: HTMLElement | null = null;

  constructor(container: HTMLElement, options: ReceiptToastOptions = {}) {
    this.#container = container;
    this.#document = container.ownerDocument;
    this.#options = options;
  }

  show(receipt: ReceiptToastData): HTMLElement {
    this.dismiss();

    const toast = this.#document.createElement("aside");
    toast.className = "filika-receipt-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.dataset.duplicate = receipt.duplicate ? "true" : "false";

    const header = this.#document.createElement("div");
    header.className = "toast-header";

    const badge = this.#document.createElement("span");
    badge.className = "toast-badge";
    badge.textContent = receipt.duplicate ? "Duplicate" : "Received";

    const title = this.#document.createElement("strong");
    title.className = "toast-title";
    title.textContent = receipt.duplicate ? "Feedback already received" : "Feedback accepted";

    const dismissBtn = this.#document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "toast-dismiss-btn";
    dismissBtn.setAttribute("aria-label", "Dismiss notification");
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("click", () => this.dismiss());

    header.append(badge, title, dismissBtn);

    const body = this.#document.createElement("div");
    body.className = "toast-body";

    const dl = this.#document.createElement("dl");
    dl.className = "toast-facts";

    const dtId = this.#document.createElement("dt");
    dtId.textContent = "Feedback ID";
    const ddId = this.#document.createElement("dd");
    ddId.className = "mono";
    ddId.textContent = receipt.feedbackId;

    const dtTime = this.#document.createElement("dt");
    dtTime.textContent = "Received";
    const ddTime = this.#document.createElement("dd");
    ddTime.textContent = new Date(receipt.receivedAt).toLocaleString();

    dl.append(dtId, ddId, dtTime, ddTime);
    body.append(dl);

    if (this.#options.onViewInbox !== undefined) {
      const viewInbox = this.#document.createElement("button");
      viewInbox.type = "button";
      viewInbox.className = "button button-secondary toast-view-inbox";
      viewInbox.textContent = "View in inbox";
      viewInbox.addEventListener("click", () => {
        this.dismiss();
        this.#options.onViewInbox?.(receipt.feedbackId);
      });
      body.append(viewInbox);
    }

    toast.append(header, body);
    this.#container.append(toast);
    this.#element = toast;

    const autoDismiss = this.#options.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;
    if (autoDismiss > 0) {
      this.#timerId = setTimeout(() => {
        this.dismiss();
      }, autoDismiss);
    }

    return toast;
  }

  dismiss(): void {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    if (this.#element !== null) {
      this.#element.remove();
      this.#element = null;
      this.#options.onDismiss?.();
    }
  }

  get isVisible(): boolean {
    return this.#element !== null;
  }
}

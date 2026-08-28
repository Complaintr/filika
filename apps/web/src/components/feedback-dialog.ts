import {
  type DialogInvocationSource,
  type FeedbackDialogState,
  INITIAL_FEEDBACK_DIALOG_STATE,
  type SdkExecutionResult,
  transitionFeedbackDialog,
} from "../contracts/feedback-dialog-machine";
import {
  AGENT_AUTHORED_REPORT_FIELD_IDS,
  type FeedbackDraft,
  REPORT_FIELD_CONTRACTS,
  type ReportFieldId,
} from "../contracts/feedback-fields";
import { FILIKA_TOKEN_CSS } from "../foundation/design-tokens";
import { getOrCreateFilikaShadowRoot } from "../foundation/style-isolation";

const DIALOG_STYLES = `
${FILIKA_TOKEN_CSS}

* { box-sizing: border-box; }

dialog {
  inline-size: min(42rem, calc(100vw - 2rem));
  max-block-size: min(48rem, calc(100vh - 2rem));
  margin: auto;
  padding: 0;
  border: 1px solid var(--filika-dialog-border);
  border-radius: 1.5rem;
  color: var(--filika-color-text);
  background: var(--filika-dialog-bg);
  box-shadow:
    0 2rem 6rem rgb(0 0 0 / 32%),
    inset 0 1px 0 var(--filika-dialog-highlight);
  backdrop-filter: saturate(180%) blur(2rem);
}

dialog::backdrop {
  background: var(--filika-backdrop-bg);
  backdrop-filter: blur(0.75rem);
}

.surface { padding: clamp(1.5rem, 5vw, 2.5rem); }
.eyebrow {
  margin: 0;
  color: var(--filika-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 { margin: 0.3rem 0 0.6rem; font-size: 1.75rem; line-height: 1.14; letter-spacing: -0.035em; }
h3 { margin-block: 1.5rem 0.75rem; font-size: 1rem; }
p { margin-block: 0.5rem; }
.muted, .help { color: var(--filika-color-text-muted); }
.help { margin-block-start: 0.25rem; font-size: 0.875rem; }

.field { display: grid; gap: 0.4rem; margin-block: 1rem; }
label { font-weight: 650; }
input, select, textarea {
  inline-size: 100%;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--filika-input-border);
  border-radius: 0.875rem;
  color: var(--filika-color-text);
  background: var(--filika-input-bg);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 6%);
  font: inherit;
  transition:
    border-color var(--filika-motion-fast) var(--filika-motion-easing),
    box-shadow var(--filika-motion-fast) var(--filika-motion-easing);
}
input:hover, select:hover, textarea:hover { border-color: var(--filika-color-primary); }
textarea { min-block-size: 6.5rem; resize: vertical; }
input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"] {
  border-color: var(--filika-color-danger);
  box-shadow: 0 0 0 1px var(--filika-color-danger);
}
.error { margin: 0; color: var(--filika-color-danger); font-size: 0.875rem; font-weight: 650; }
.error-summary {
  padding: 0.9rem 1rem;
  border: 1px solid rgb(159 38 51 / 18%);
  border-radius: 1rem;
  background: var(--filika-error-summary-bg);
}
.error-summary:empty { display: none; }
.error-summary a { color: var(--filika-color-danger); }

.context-list, .review-list, .receipt-list { display: grid; gap: 0.5rem; margin: 0; padding: 0; }
.context-item, .review-item, .receipt-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--filika-input-border);
  border-radius: 1rem;
  background: var(--filika-color-surface-muted);
}
.context-item dt, .review-item dt, .receipt-item dt { color: var(--filika-color-text-muted); font-size: 0.8rem; font-weight: 650; }
.context-item dd, .review-item dd, .receipt-item dd { margin: 0.2rem 0 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.review-item, .receipt-item { grid-template-columns: 1fr; }

.privacy {
  margin-block: 1.25rem;
  padding: 1.15rem;
  border: 1px solid var(--filika-input-border);
  border-radius: 1rem;
  background: var(--filika-privacy-bg);
}
.privacy dl { display: grid; gap: 0.75rem; margin-block: 0.75rem; }
.privacy dt { color: var(--filika-color-text-muted); font-size: 0.8rem; font-weight: 650; }
.privacy dd { margin: 0.15rem 0 0; overflow-wrap: anywhere; }
.privacy a { color: var(--filika-color-primary); font-weight: 650; }

.actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-block-start: 1.5rem; }
button {
  min-block-size: 2.75rem;
  padding: 0.7rem 1.1rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform var(--filika-motion-fast) var(--filika-motion-easing),
    box-shadow var(--filika-motion-fast) var(--filika-motion-easing),
    background var(--filika-motion-fast) var(--filika-motion-easing);
}
.primary {
  color: var(--filika-color-on-primary);
  background: var(--filika-color-primary);
  box-shadow: 0 0.5rem 1.25rem rgb(15 118 110 / 24%);
}
.secondary {
  border-color: var(--filika-input-border);
  color: var(--filika-color-primary);
  background: var(--filika-secondary-btn-bg);
}
.text-action { padding-inline: 0.25rem; border: 0; color: var(--filika-color-primary); background: transparent; text-decoration: underline; text-underline-offset: 0.2em; }
button:active { transform: scale(0.98); }
button:disabled { cursor: wait; opacity: 0.6; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: var(--filika-focus-width) solid var(--filika-color-focus);
  outline-offset: var(--filika-focus-offset);
}
.spinner { inline-size: 1rem; block-size: 1rem; border: 0.15rem solid currentColor; border-inline-end-color: transparent; border-radius: 50%; animation: spin var(--filika-motion-normal) linear infinite; }
@keyframes spin { to { transform: rotate(1turn); } }

@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
}
`;

export interface FeedbackDialogIdentity {
  collectorOrigin: string;
  privacyUrl: string;
  projectName: string;
  retentionSummary: string;
}

export interface FeedbackDialogOptions {
  identity: FeedbackDialogIdentity;
  submit(draft: FeedbackDraft, signal: AbortSignal): Promise<SdkExecutionResult>;
}

export type FeedbackDialogSubmit = FeedbackDialogOptions["submit"];

const outcomeCopy = {
  aborted: {
    body: "The in-progress submission was stopped.",
    heading: "Submission stopped",
  },
  cancelled: {
    body: "Nothing was sent to the collector.",
    heading: "Feedback canceled",
  },
  collector_rejected: {
    body: "The collector did not accept this report. Review the fields before trying again.",
    heading: "Feedback not accepted",
  },
  internal_error: {
    body: "Filika could not complete the request.",
    heading: "Something went wrong",
  },
  outcome_unknown: {
    body: "Filika could not confirm whether the collector received this report. Retrying uses the same submission identity.",
    heading: "Submission status unknown",
  },
  timeout: {
    body: "The collector did not respond in time.",
    heading: "Submission timed out",
  },
} as const;

function appendText(
  document: Document,
  parent: Element,
  tagName: string,
  text: string,
  className?: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className !== undefined) {
    element.className = className;
  }
  parent.append(element);
  return element;
}

function createButton(
  document: Document,
  id: string,
  text: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function fieldElementId(field: ReportFieldId): string {
  return `filika-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function currentFieldValue(draft: FeedbackDraft, field: ReportFieldId): string {
  return draft[field] ?? "";
}

function resultForTerminalState(state: FeedbackDialogState): SdkExecutionResult | null {
  if (state.status === "success") {
    return { outcome: "success", receipt: state.receipt };
  }

  if (
    state.status === "aborted" ||
    state.status === "cancelled" ||
    state.status === "collector_rejected" ||
    state.status === "internal_error" ||
    state.status === "outcome_unknown" ||
    state.status === "timeout"
  ) {
    return { outcome: state.status };
  }

  if (state.status === "invalid_input") {
    return { issues: state.issues, outcome: "invalid_input" };
  }

  return null;
}

export class FeedbackDialog {
  readonly #document: Document;
  readonly #host: HTMLElement;
  readonly #options: FeedbackDialogOptions;
  readonly #root: ShadowRoot;
  #activePromise: Promise<SdkExecutionResult> | null = null;
  #invoker: HTMLElement | null = null;
  #resolve: ((result: SdkExecutionResult) => void) | null = null;
  #state: FeedbackDialogState = INITIAL_FEEDBACK_DIALOG_STATE;
  #submissionController: AbortController | null = null;
  #submitOverride: FeedbackDialogSubmit | null = null;

  constructor(host: HTMLElement, options: FeedbackDialogOptions) {
    this.#host = host;
    this.#document = host.ownerDocument;
    this.#root = getOrCreateFilikaShadowRoot(host);
    this.#options = options;
  }

  get state(): FeedbackDialogState {
    return this.#state;
  }

  open(
    draft: Partial<FeedbackDraft> = {},
    source: DialogInvocationSource = "manual",
    submit?: FeedbackDialogSubmit,
  ): Promise<SdkExecutionResult> {
    if (this.#activePromise !== null) {
      this.#root.querySelector<HTMLDialogElement>("dialog")?.focus();
      return this.#activePromise;
    }

    const activeElement = this.#document.activeElement;
    const view = this.#document.defaultView;
    this.#invoker =
      view !== null && activeElement instanceof view.HTMLElement ? activeElement : null;
    this.#state = transitionFeedbackDialog(this.#state, { draft, source, type: "OPEN" });
    this.#submitOverride = submit ?? null;
    this.#activePromise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
    this.render();
    return this.#activePromise;
  }

  dispose(): void {
    this.#submissionController?.abort();
    if (this.#activePromise !== null) {
      this.#settle({ outcome: "aborted" });
    }
    this.#root.replaceChildren();
    this.#state = INITIAL_FEEDBACK_DIALOG_STATE;
    this.#host.remove();
  }

  render(): void {
    if (this.#state.status === "closed") {
      this.#root.replaceChildren();
      return;
    }

    const style = this.#document.createElement("style");
    style.textContent = DIALOG_STYLES;
    const dialog = this.#document.createElement("dialog");
    dialog.id = "filika-feedback-dialog";
    dialog.setAttribute("aria-labelledby", "filika-feedback-title");
    dialog.setAttribute("aria-describedby", "filika-feedback-description");
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.#cancel();
    });

    const surface = this.#document.createElement("div");
    surface.className = "surface";
    dialog.append(surface);
    this.#renderState(surface);
    this.#root.replaceChildren(style, dialog);
    dialog.showModal();
    this.#focusAfterRender();
  }

  #cancel(): void {
    if (this.#state.status === "submitting") {
      this.#submissionController?.abort();
    }
    this.#state = transitionFeedbackDialog(this.#state, { type: "CANCEL" });
    this.render();
    const result = resultForTerminalState(this.#state);
    if (result !== null) {
      this.#settle(result, false);
    }
  }

  #close(): void {
    const pendingResult = resultForTerminalState(this.#state);
    if (pendingResult !== null) {
      this.#settle(pendingResult, false);
    }
    const dialog = this.#root.querySelector<HTMLDialogElement>("dialog");
    if (dialog?.open) {
      dialog.close();
    }
    this.#state = transitionFeedbackDialog(this.#state, { type: "CLOSE" });
    this.#root.replaceChildren();
    this.#activePromise = null;
    this.#resolve = null;
    this.#submissionController = null;
    this.#submitOverride = null;
    this.#invoker?.focus();
    this.#invoker = null;
  }

  #settle(result: SdkExecutionResult, close = false): void {
    this.#resolve?.(result);
    this.#resolve = null;
    if (close) {
      this.#close();
    }
  }

  #focusAfterRender(): void {
    const issue =
      this.#state.status === "editing"
        ? this.#state.issues.find((item) => item.field !== "form")
        : undefined;
    const targetId =
      issue?.field !== undefined && issue.field !== "form"
        ? fieldElementId(issue.field)
        : this.#state.status === "editing"
          ? "filika-kind"
          : undefined;
    const target = targetId === undefined ? null : this.#root.getElementById(targetId);
    (target ?? this.#root.querySelector<HTMLElement>("button, input, select, textarea"))?.focus();
  }

  #renderState(surface: HTMLElement): void {
    appendText(this.#document, surface, "p", "Filika feedback", "eyebrow");

    if (this.#state.status === "editing") {
      this.#renderEditing(surface);
      return;
    }

    if (this.#state.status === "confirming") {
      this.#renderConfirmation(surface);
      return;
    }

    if (this.#state.status === "submitting") {
      this.#renderSubmitting(surface);
      return;
    }

    if (this.#state.status === "success") {
      this.#renderSuccess(surface);
      return;
    }

    if (this.#state.status === "invalid_input") {
      this.#renderInvalidInput(surface);
      return;
    }

    if (this.#state.status !== "closed") {
      this.#renderOutcome(surface, this.#state.status);
    }
  }

  #renderHeading(surface: HTMLElement, heading: string, description: string): void {
    const title = appendText(this.#document, surface, "h2", heading);
    title.id = "filika-feedback-title";
    const body = appendText(this.#document, surface, "p", description, "muted");
    body.id = "filika-feedback-description";
    const status = this.#document.createElement("div");
    status.id = "filika-feedback-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    surface.append(status);
  }

  #renderEditing(surface: HTMLElement): void {
    if (this.#state.status !== "editing") {
      return;
    }
    this.#renderHeading(
      surface,
      "Review feedback",
      "Nothing is sent until you review the report and confirm it on the next step.",
    );
    this.#renderErrorSummary(surface);
    appendText(this.#document, surface, "h3", "Report content");
    for (const field of AGENT_AUTHORED_REPORT_FIELD_IDS) {
      this.#renderEditableField(surface, field);
    }
    this.#renderContext(surface);

    const actions = this.#document.createElement("div");
    actions.className = "actions";
    actions.append(
      createButton(this.#document, "filika-review", "Review submission", "primary", () => {
        this.#state = transitionFeedbackDialog(this.#state, { type: "REVIEW" });
        this.render();
      }),
      createButton(this.#document, "filika-cancel", "Cancel", "secondary", () => this.#cancel()),
    );
    surface.append(actions);
  }

  #renderErrorSummary(surface: HTMLElement): void {
    if (this.#state.status !== "editing") {
      return;
    }
    const summary = this.#document.createElement("div");
    summary.id = "filika-feedback-errors";
    summary.className = "error-summary";
    summary.setAttribute("role", "alert");
    summary.tabIndex = -1;
    if (this.#state.issues.length > 0) {
      appendText(this.#document, summary, "p", "Check the following fields:");
      const list = this.#document.createElement("ul");
      for (const issue of this.#state.issues) {
        if (issue.field === "form") {
          continue;
        }
        const item = this.#document.createElement("li");
        const link = this.#document.createElement("a");
        const issueField = issue.field;
        link.href = `#${fieldElementId(issueField)}`;
        link.textContent = REPORT_FIELD_CONTRACTS[issueField].label;
        link.addEventListener("click", (event) => {
          event.preventDefault();
          this.#root.getElementById(fieldElementId(issueField))?.focus();
        });
        item.append(link);
        list.append(item);
      }
      summary.append(list);
    }
    surface.append(summary);
  }

  #renderEditableField(
    surface: HTMLElement,
    field: (typeof AGENT_AUTHORED_REPORT_FIELD_IDS)[number],
  ): void {
    if (this.#state.status !== "editing") {
      return;
    }
    const contract = REPORT_FIELD_CONTRACTS[field];
    const fieldId = fieldElementId(field);
    const issue = this.#state.issues.find((item) => item.field === field);
    const wrapper = this.#document.createElement("div");
    wrapper.className = "field";
    const label = appendText(
      this.#document,
      wrapper,
      "label",
      `${contract.label}${contract.requiredForSubmission ? " (required)" : " (optional)"}`,
    );
    label.setAttribute("for", fieldId);
    let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (field === "kind") {
      const select = this.#document.createElement("select");
      const options = [
        ["", "Choose a feedback type"],
        ["bug", "Bug"],
        ["blocked_task", "Blocked task"],
        ["confusing_behavior", "Confusing behavior"],
        ["idea", "Idea"],
      ] as const;
      for (const [value, text] of options) {
        const option = this.#document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      }
      control = select;
    } else if (field === "title") {
      const input = this.#document.createElement("input");
      input.type = "text";
      input.maxLength = 160;
      control = input;
    } else {
      const textarea = this.#document.createElement("textarea");
      textarea.maxLength = field === "description" ? 4000 : 3000;
      control = textarea;
    }

    control.id = fieldId;
    control.value = currentFieldValue(this.#state.draft, field);
    control.setAttribute(
      "aria-describedby",
      `${fieldId}-help${issue === undefined ? "" : ` ${fieldId}-error`}`,
    );
    if (issue !== undefined) {
      control.setAttribute("aria-invalid", "true");
    }
    control.addEventListener("input", () => {
      this.#state = transitionFeedbackDialog(this.#state, {
        field,
        type: "SET_FIELD",
        value: control.value,
      });
    });
    wrapper.append(control);
    const help = appendText(this.#document, wrapper, "p", contract.accessibleDescription, "help");
    help.id = `${fieldId}-help`;
    if (issue !== undefined) {
      const error = appendText(this.#document, wrapper, "p", issue.message, "error");
      error.id = `${fieldId}-error`;
    }
    surface.append(wrapper);
  }

  #renderContext(surface: HTMLElement): void {
    if (this.#state.status !== "editing") {
      return;
    }
    const draft = this.#state.draft;
    const contextFields = ["routeLabel", "applicationRelease"] as const;
    const visibleFields = contextFields.filter((field) => draft[field] !== null);
    if (visibleFields.length === 0) {
      return;
    }
    appendText(this.#document, surface, "h3", "Optional host context");
    appendText(
      this.#document,
      surface,
      "p",
      "These values were supplied by the host application. Remove any item you do not want to send.",
      "help",
    );
    const list = this.#document.createElement("dl");
    list.className = "context-list";
    for (const field of visibleFields) {
      const item = this.#document.createElement("div");
      item.className = "context-item";
      const copy = this.#document.createElement("div");
      appendText(this.#document, copy, "dt", REPORT_FIELD_CONTRACTS[field].label);
      appendText(this.#document, copy, "dd", currentFieldValue(this.#state.draft, field));
      item.append(copy);
      item.append(
        createButton(
          this.#document,
          `filika-${field === "routeLabel" ? "route-label" : "application-release"}-remove`,
          "Remove",
          "text-action",
          () => {
            this.#state = transitionFeedbackDialog(this.#state, {
              field,
              type: "REMOVE_FIELD",
            });
            this.render();
          },
        ),
      );
      item
        .querySelector("button")
        ?.setAttribute(
          "aria-label",
          field === "routeLabel" ? "Remove page" : "Remove application release",
        );
      list.append(item);
    }
    surface.append(list);
  }

  #renderConfirmation(surface: HTMLElement): void {
    if (this.#state.status !== "confirming") {
      return;
    }
    this.#renderHeading(
      surface,
      "Confirm submission",
      "Check the destination and privacy details before sending this feedback.",
    );
    const list = this.#document.createElement("dl");
    list.className = "review-list";
    for (const field of AGENT_AUTHORED_REPORT_FIELD_IDS) {
      const value = this.#state.draft[field];
      if (value === null || value === "") {
        continue;
      }
      const item = this.#document.createElement("div");
      item.className = "review-item";
      appendText(this.#document, item, "dt", REPORT_FIELD_CONTRACTS[field].label);
      appendText(this.#document, item, "dd", value);
      list.append(item);
    }
    surface.append(list);
    this.#renderPrivacy(surface);
    const actions = this.#document.createElement("div");
    actions.className = "actions";
    actions.append(
      createButton(this.#document, "filika-edit", "Edit report", "secondary", () => {
        this.#state = transitionFeedbackDialog(this.#state, { type: "EDIT" });
        this.render();
      }),
      createButton(this.#document, "filika-confirm", "Send feedback", "primary", () => {
        this.#state = transitionFeedbackDialog(this.#state, { type: "CONFIRM" });
        this.render();
        void this.#submit();
      }),
      createButton(this.#document, "filika-cancel", "Cancel", "text-action", () => this.#cancel()),
    );
    surface.append(actions);
  }

  #renderPrivacy(surface: HTMLElement): void {
    const panel = this.#document.createElement("section");
    panel.className = "privacy";
    appendText(this.#document, panel, "h3", "Destination and privacy");
    const list = this.#document.createElement("dl");
    for (const [label, value] of [
      ["Project", this.#options.identity.projectName],
      ["Collector", this.#options.identity.collectorOrigin],
      ["Retention", this.#options.identity.retentionSummary],
    ] as const) {
      const item = this.#document.createElement("div");
      appendText(this.#document, item, "dt", label);
      appendText(this.#document, item, "dd", value);
      list.append(item);
    }
    panel.append(list);
    const link = this.#document.createElement("a");
    link.href = this.#options.identity.privacyUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Read the privacy notice";
    panel.append(link);
    surface.append(panel);
  }

  #renderSubmitting(surface: HTMLElement): void {
    this.#renderHeading(
      surface,
      "Submitting feedback",
      "Keep this dialog open while Filika contacts the collector.",
    );
    const status = this.#root.getElementById("filika-feedback-status");
    if (status !== null) {
      status.textContent = "Submitting feedback.";
    }
    const actions = this.#document.createElement("div");
    actions.className = "actions";
    const indicator = this.#document.createElement("span");
    indicator.className = "spinner";
    indicator.setAttribute("aria-hidden", "true");
    actions.append(
      indicator,
      createButton(this.#document, "filika-cancel", "Stop", "secondary", () => this.#cancel()),
    );
    surface.append(actions);
  }

  async #submit(): Promise<void> {
    if (this.#state.status !== "submitting") {
      return;
    }
    this.#submissionController = new AbortController();
    const draft = this.#state.draft;
    let result: SdkExecutionResult;
    try {
      const submit = this.#submitOverride ?? this.#options.submit;
      result = await submit(draft, this.#submissionController.signal);
    } catch {
      result = {
        outcome: this.#submissionController.signal.aborted ? "aborted" : "internal_error",
      };
    }
    if (this.#state.status !== "submitting") {
      return;
    }
    this.#state = transitionFeedbackDialog(this.#state, { result, type: "RESOLVE" });
    this.render();
    const terminalResult = resultForTerminalState(this.#state);
    if (
      terminalResult !== null &&
      (terminalResult.outcome === "success" || terminalResult.outcome === "aborted")
    ) {
      this.#settle(terminalResult, false);
    }
  }

  #renderSuccess(surface: HTMLElement): void {
    if (this.#state.status !== "success") {
      return;
    }
    const heading = this.#state.receipt.duplicate ? "Already received" : "Feedback received";
    const description = this.#state.receipt.duplicate
      ? "The collector recognized this submission and returned its original receipt."
      : "The collector accepted your feedback.";
    this.#renderHeading(surface, heading, description);
    const list = this.#document.createElement("dl");
    list.className = "receipt-list";
    for (const [label, value] of [
      ["Feedback ID", this.#state.receipt.feedbackId],
      ["Received", this.#state.receipt.receivedAt],
    ] as const) {
      const item = this.#document.createElement("div");
      item.className = "receipt-item";
      appendText(this.#document, item, "dt", label);
      appendText(this.#document, item, "dd", value);
      list.append(item);
    }
    surface.append(list);
    const actions = this.#document.createElement("div");
    actions.className = "actions";
    actions.append(
      createButton(this.#document, "filika-close", "Close", "primary", () => this.#close()),
    );
    surface.append(actions);
  }

  #renderInvalidInput(surface: HTMLElement): void {
    this.#renderHeading(
      surface,
      "Check the report",
      "The collector could not validate one or more report fields.",
    );
    const actions = this.#document.createElement("div");
    actions.className = "actions";
    actions.append(
      createButton(this.#document, "filika-outcome-primary", "Edit report", "primary", () => {
        this.#state = transitionFeedbackDialog(this.#state, { type: "EDIT" });
        this.render();
      }),
      createButton(this.#document, "filika-close", "Close", "secondary", () => this.#close()),
    );
    surface.append(actions);
  }

  #renderOutcome(
    surface: HTMLElement,
    status:
      | "aborted"
      | "cancelled"
      | "collector_rejected"
      | "internal_error"
      | "outcome_unknown"
      | "timeout",
  ): void {
    const copy = outcomeCopy[status];
    this.#renderHeading(surface, copy.heading, copy.body);
    const actions = this.#document.createElement("div");
    actions.className = "actions";

    if (status === "collector_rejected") {
      actions.append(
        createButton(this.#document, "filika-outcome-primary", "Edit report", "primary", () => {
          this.#state = transitionFeedbackDialog(this.#state, { type: "EDIT" });
          this.render();
        }),
      );
    } else if (
      status === "timeout" ||
      status === "internal_error" ||
      status === "outcome_unknown"
    ) {
      actions.append(
        createButton(this.#document, "filika-outcome-primary", "Retry", "primary", () => {
          this.#state = transitionFeedbackDialog(this.#state, { type: "RETRY" });
          this.render();
          void this.#submit();
        }),
      );
    }

    actions.append(
      createButton(this.#document, "filika-close", "Close", "secondary", () => this.#close()),
    );
    surface.append(actions);
  }
}

export function createManualFeedbackButton(
  document: Document,
  onOpen: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-primary";
  button.textContent = "Send feedback";
  button.addEventListener("click", onOpen);
  return button;
}

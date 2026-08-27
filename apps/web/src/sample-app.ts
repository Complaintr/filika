import { createManualFeedbackButton, type FeedbackDialog } from "./components/feedback-dialog";
import {
  INITIAL_SAMPLE_FAILURE_STATE,
  SAMPLE_FAILURE_VISIBLE_STATES,
  type SampleFailureState,
  transitionSampleFailure,
} from "./foundation/sample-failure";

export interface SampleApplicationOptions {
  feedbackDialog: FeedbackDialog;
  onFailureStateChange?(state: SampleFailureState): void;
}

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
  text: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

export class SampleApplication {
  readonly #container: HTMLElement;
  readonly #document: Document;
  readonly #options: SampleApplicationOptions;
  #failureState: SampleFailureState = INITIAL_SAMPLE_FAILURE_STATE;
  #normalTaskComplete = false;

  constructor(container: HTMLElement, options: SampleApplicationOptions) {
    this.#container = container;
    this.#document = container.ownerDocument;
    this.#options = options;
  }

  get failureState(): SampleFailureState {
    return this.#failureState;
  }

  runFailure(): void {
    this.#failureState = transitionSampleFailure(this.#failureState, { type: "RUN_SAMPLE" });
    this.#options.onFailureStateChange?.(this.#failureState);
    this.render();
  }

  resetFailure(): void {
    this.#failureState = transitionSampleFailure(this.#failureState, { type: "RESET" });
    this.render();
    this.#failureState = transitionSampleFailure(this.#failureState, { type: "RESET_COMPLETE" });
    this.#options.onFailureStateChange?.(this.#failureState);
    this.render();
  }

  render(): void {
    const section = this.#document.createElement("section");
    section.className = "demo-hero";
    section.dataset.view = "sample-application";
    appendText(this.#document, section, "p", "WebMCP feedback workflow", "eyebrow");
    appendText(this.#document, section, "h1", "A small task with a useful failure.");
    appendText(
      this.#document,
      section,
      "p",
      "Complete the normal task or run the resettable failure. Manual feedback stays available with or without WebMCP.",
      "lede",
    );

    const grid = this.#document.createElement("div");
    grid.className = "demo-grid";
    grid.append(this.#renderNormalTask(), this.#renderFailureTask());
    section.append(grid);

    const feedback = this.#document.createElement("section");
    feedback.className = "task-card";
    appendText(this.#document, feedback, "h2", "Share feedback");
    appendText(
      this.#document,
      feedback,
      "p",
      "Review every report field before anything is sent.",
      "muted",
    );
    feedback.append(
      createManualFeedbackButton(this.#document, () => {
        void this.#options.feedbackDialog.open(
          {
            applicationRelease: "demo-2026.08",
            routeLabel: "Sample task",
          },
          "manual",
        );
      }),
    );
    section.append(feedback);
    this.#container.replaceChildren(section);
  }

  #renderNormalTask(): HTMLElement {
    const card = this.#document.createElement("article");
    card.className = "task-card";
    appendText(this.#document, card, "p", "Normal task", "eyebrow");
    appendText(this.#document, card, "h2", "Confirm the release checklist");
    appendText(
      this.#document,
      card,
      "p",
      this.#normalTaskComplete
        ? "Checklist confirmed. This task completed normally."
        : "The local build and review notes are ready to confirm.",
      "status-line",
    );
    const button = createButton(
      this.#document,
      this.#normalTaskComplete ? "Confirmed" : "Confirm checklist",
      "button button-secondary",
      () => {
        this.#normalTaskComplete = true;
        this.render();
      },
    );
    button.disabled = this.#normalTaskComplete;
    card.append(button);
    return card;
  }

  #renderFailureTask(): HTMLElement {
    const card = this.#document.createElement("article");
    card.className = "task-card";
    card.dataset.failureState = this.#failureState.status;
    const copy = SAMPLE_FAILURE_VISIBLE_STATES[this.#failureState.status];
    appendText(this.#document, card, "p", "Deterministic failure", "eyebrow");
    appendText(this.#document, card, "h2", copy.heading);
    const description = appendText(
      this.#document,
      card,
      "p",
      copy.description,
      this.#failureState.status === "failed" ? "failure-message" : "status-line",
    );
    description.setAttribute("role", this.#failureState.status === "failed" ? "alert" : "status");

    if (this.#failureState.status === "ready" && copy.action !== null) {
      card.append(
        createButton(this.#document, copy.action, "button button-primary", () => this.runFailure()),
      );
    } else if (this.#failureState.status === "failed" && copy.action !== null) {
      card.append(
        createButton(this.#document, copy.action, "button button-secondary", () =>
          this.resetFailure(),
        ),
      );
    }
    return card;
  }
}

import {
  INBOX_NON_READY_PRESENTATIONS,
  type InboxDetailViewModel,
  type InboxDetailViewState,
  type InboxListItemViewModel,
  type InboxListViewState,
} from "../contracts/inbox-view-model";

export interface InboxCallbacks {
  onBack(): void;
  onOpen(feedbackId: string): void;
  onRetry(): void;
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

function createAction(
  document: Document,
  text: string,
  onClick: () => void,
  className = "button button-secondary",
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function renderNonReadyState(
  document: Document,
  state: "empty" | "error" | "expired" | "loading" | "not_found",
  onRetry?: () => void,
): HTMLElement {
  const copy = INBOX_NON_READY_PRESENTATIONS[state];
  const panel = document.createElement("section");
  panel.className = "state-panel";
  panel.setAttribute("role", copy.role);
  panel.dataset.state = state;
  appendText(document, panel, "h2", copy.heading);
  appendText(document, panel, "p", copy.body, "muted");

  if (state === "error" && onRetry !== undefined) {
    panel.append(createAction(document, "Try again", onRetry));
  }

  return panel;
}

function createListItem(
  document: Document,
  item: InboxListItemViewModel,
  onOpen: (feedbackId: string) => void,
): HTMLLIElement {
  const listItem = document.createElement("li");
  const article = document.createElement("article");
  article.className = "inbox-row";
  const content = document.createElement("div");
  appendText(document, content, "p", item.kind, "eyebrow");
  appendText(document, content, "h2", item.title);
  appendText(
    document,
    content,
    "p",
    `${item.routeLabel ?? "No page label"} | ${new Date(item.receivedAt).toLocaleString()}`,
    "muted",
  );
  appendText(document, content, "p", item.requestOrigin, "mono");
  article.append(content);
  article.append(createAction(document, "View feedback", () => onOpen(item.feedbackId)));
  listItem.append(article);
  return listItem;
}

export function renderInboxList(
  document: Document,
  state: InboxListViewState,
  callbacks: Pick<InboxCallbacks, "onOpen" | "onRetry">,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "page-section";
  section.dataset.view = "inbox-list";
  section.dataset.untrusted = "true";
  appendText(document, section, "p", "Maintainer workspace", "eyebrow");
  appendText(document, section, "h1", "Feedback inbox");
  appendText(
    document,
    section,
    "p",
    "Public, read-only demo reports. Records older than 24 hours remain until a maintainer runs cleanup.",
    "lede",
  );

  if (state.status !== "ready") {
    section.append(renderNonReadyState(document, state.status, callbacks.onRetry));
    return section;
  }

  const list = document.createElement("ol");
  list.className = "inbox-list";
  list.setAttribute("aria-label", "Accepted feedback");
  for (const item of state.items) {
    list.append(createListItem(document, item, callbacks.onOpen));
  }
  section.append(list);
  return section;
}

function appendDetailField(
  document: Document,
  parent: Element,
  label: string,
  value: string | null,
): void {
  if (value === null || value === "") {
    return;
  }

  const item = document.createElement("div");
  item.className = "detail-field";
  appendText(document, item, "dt", label);
  appendText(document, item, "dd", value);
  parent.append(item);
}

function createDetailGroup(document: Document, heading: string): HTMLElement {
  const section = document.createElement("section");
  section.className = "detail-group";
  appendText(document, section, "h2", heading);
  const list = document.createElement("dl");
  section.append(list);
  return section;
}

function renderReadyDetail(document: Document, feedback: InboxDetailViewModel): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const authored = createDetailGroup(document, "Report content");
  authored.dataset.untrusted = "true";
  const untrustedNotice = document.createElement("p");
  untrustedNotice.className = "untrusted-notice";
  untrustedNotice.dataset.untrusted = "true";
  untrustedNotice.setAttribute("role", "note");
  untrustedNotice.textContent = "External report content is treated as untrusted data.";
  authored.append(untrustedNotice);

  const authoredList = authored.querySelector("dl");
  if (authoredList === null) {
    throw new Error("Missing report content list.");
  }
  appendDetailField(document, authoredList, "Feedback type", feedback.kind);
  appendDetailField(document, authoredList, "What happened?", feedback.description);
  appendDetailField(document, authoredList, "Expected behavior", feedback.expectedBehavior);
  appendDetailField(document, authoredList, "Steps to reproduce", feedback.reproductionSteps);

  const context = createDetailGroup(document, "Host-supplied context");
  const contextList = context.querySelector("dl");
  if (contextList === null) {
    throw new Error("Missing host context list.");
  }
  appendDetailField(document, contextList, "Page", feedback.routeLabel);
  appendDetailField(document, contextList, "Application release", feedback.applicationRelease);

  const facts = createDetailGroup(document, "Server-derived facts");
  const factsList = facts.querySelector("dl");
  if (factsList === null) {
    throw new Error("Missing server facts list.");
  }
  appendDetailField(document, factsList, "Feedback ID", feedback.feedbackId);
  appendDetailField(document, factsList, "Request origin", feedback.requestOrigin);
  appendDetailField(document, factsList, "Source", feedback.source);
  appendDetailField(document, factsList, "Received", feedback.receivedAt);
  appendDetailField(document, factsList, "Expires", feedback.expiresAt);

  fragment.append(authored, context, facts);
  return fragment;
}

export function renderInboxDetail(
  document: Document,
  state: InboxDetailViewState,
  callbacks: Pick<InboxCallbacks, "onBack" | "onRetry">,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "page-section";
  section.dataset.view = "inbox-detail";
  section.dataset.untrusted = "true";

  const nav = document.createElement("div");
  nav.className = "inbox-detail-nav";
  nav.append(createAction(document, "Back to inbox", callbacks.onBack, "text-button"));

  if (state.status !== "ready") {
    section.append(nav);
    appendText(document, section, "h1", "Feedback detail");
    section.append(renderNonReadyState(document, state.status, callbacks.onRetry));
    if (state.status === "expired") {
      appendText(document, section, "p", `Expired at ${state.expiredAt}`, "muted");
    }
    return section;
  }

  appendText(document, nav, "p", state.feedback.kind, "eyebrow");
  section.append(nav);
  appendText(document, section, "h1", state.feedback.title);
  section.append(renderReadyDetail(document, state.feedback));
  return section;
}

export class MaintainerInbox {
  readonly #callbacks: InboxCallbacks;
  readonly #container: HTMLElement;
  readonly #document: Document;
  #detailState: InboxDetailViewState | null = null;
  #listState: InboxListViewState = { status: "loading" };

  constructor(container: HTMLElement, callbacks: InboxCallbacks) {
    this.#container = container;
    this.#document = container.ownerDocument;
    this.#callbacks = callbacks;
  }

  showList(state: InboxListViewState): void {
    this.#listState = state;
    this.#detailState = null;
    this.render();
  }

  showDetail(state: InboxDetailViewState): void {
    this.#detailState = state;
    this.render();
  }

  render(): void {
    this.#container.replaceChildren(
      this.#detailState === null
        ? renderInboxList(this.#document, this.#listState, this.#callbacks)
        : renderInboxDetail(this.#document, this.#detailState, this.#callbacks),
    );
  }
}

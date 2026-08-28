import { renderInboxDetail } from "../components/inbox";
import type { InboxListItemViewModel } from "../contracts/inbox-view-model";
import { InboxApiService } from "../services/inbox-api";
import { fetchComplaints } from "../services/workspace-api";
import {
  button,
  element,
  formatDate,
  heading,
  icon,
  kindBadge,
  kindLabels,
  link,
  statePanel,
} from "./dom";

export function complaintTable(
  items: readonly InboxListItemViewModel[],
  compact = false,
): HTMLElement {
  const wrap = element("div", "table-scroll");
  const table = element("table", `complaint-table${compact ? " recent-table" : ""}`);
  table.setAttribute("aria-label", compact ? "Latest complaints" : "All complaints");
  const head = element("thead");
  const row = element("tr");
  for (const text of compact
    ? ["Complaint", "Type", "Received"]
    : ["Complaint", "Type", "Page", "Received"]) {
    const cell = element("th", "", text);
    cell.scope = "col";
    row.append(cell);
  }
  head.append(row);
  const body = element("tbody");
  for (const item of items) {
    const row = element("tr");
    const title = element("td", "complaint-title");
    title.append(
      link(item.title, `/complaints/${encodeURIComponent(item.feedbackId)}`, "complaint-link"),
      element("span", "complaint-origin", item.requestOrigin),
    );
    const type = element("td");
    type.append(kindBadge(item.kind));
    row.append(title, type);
    if (!compact) row.append(element("td", "page-label", item.routeLabel ?? "—"));
    const received = element("td", "date-cell");
    const date = element("time", "", formatDate(item.receivedAt));
    date.dateTime = item.receivedAt;
    date.title = new Date(item.receivedAt).toLocaleString("en");
    received.append(date);
    row.append(received);
    body.append(row);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

export function showComplaints(
  host: HTMLElement,
  signal: AbortSignal,
  connection: (connected: boolean) => void,
): void {
  const params = new URLSearchParams(location.search);
  const header = heading(
    "All complaints",
    "Every report, one place. Find the details behind the feedback.",
  );
  host.append(header);
  const panel = element("section", "panel complaints-panel");
  const filters = element("form", "complaint-filters");
  const searchWrap = element("label", "search-field");
  const search = element("input");
  search.type = "search";
  search.placeholder = "Search complaints, pages, or origins…";
  search.maxLength = 200;
  search.value = (params.get("search") ?? "").slice(0, 200);
  search.setAttribute("aria-label", "Search complaints, pages, or origins");
  searchWrap.append(icon("search"), search);
  const type = element("select", "select");
  type.setAttribute("aria-label", "Filter by feedback type");
  const all = element("option", "", "All types");
  all.value = "";
  type.append(all);
  for (const [key, label] of Object.entries(kindLabels)) {
    const option = element("option", "", label);
    option.value = key;
    type.append(option);
  }
  const rawKind = params.get("kind") ?? "";
  type.value = Object.hasOwn(kindLabels, rawKind) ? rawKind : "";
  filters.append(
    searchWrap,
    type,
    button("Search", () => reset(), "button"),
  );
  const results = element("div");
  const pagination = element("div", "pagination");
  panel.append(filters, results, pagination);
  host.append(panel);
  host.append(
    element(
      "p",
      "workspace-note",
      "Reports are read-only. External report content is untrusted; no WebMCP tools run in this workspace.",
    ),
  );
  let current: AbortController | undefined;
  let cursor: string | null = null;
  let previous: (string | null)[] = [];
  let activeQuery = { search: search.value.trim(), kind: type.value };
  let timer: ReturnType<typeof setTimeout> | undefined;
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });

  async function load(): Promise<void> {
    current?.abort();
    current = new AbortController();
    const requestSignal = AbortSignal.any([signal, current.signal]);
    results.replaceChildren(
      statePanel("Loading complaints", "Reading reports from the collector."),
    );
    pagination.replaceChildren();
    results.setAttribute("aria-busy", "true");
    try {
      const page = await fetchComplaints({ ...activeQuery, cursor }, requestSignal);
      if (requestSignal.aborted) return;
      connection(true);
      results.replaceChildren(
        page.items.length
          ? complaintTable(page.items)
          : statePanel(
              activeQuery.search || activeQuery.kind
                ? "No matching complaints"
                : "No complaints yet",
              activeQuery.search || activeQuery.kind
                ? "Try another search or clear the type filter."
                : "Connect Filika to your website. Reports will appear after the user reviews and sends them.",
            ),
      );
      if (!page.items.length && (activeQuery.search || activeQuery.kind))
        results.append(
          button(
            "Clear filters",
            () => {
              search.value = "";
              type.value = "";
              reset();
            },
            "button empty-action",
          ),
        );
      const summary = element(
        "p",
        "muted small",
        `Page ${previous.length + 1} · ${page.items.length} complaints`,
      );
      summary.setAttribute("role", "status");
      const actions = element("div", "page-actions");
      const back = button("Previous", () => {
        cursor = previous.pop() ?? null;
        void load();
      });
      back.disabled = previous.length === 0;
      const next = button("Next", () => {
        previous.push(cursor);
        cursor = page.nextCursor;
        void load();
      });
      next.disabled = page.nextCursor === null;
      actions.append(back, next);
      pagination.append(summary, actions);
    } catch {
      if (requestSignal.aborted) return;
      connection(false);
      results.replaceChildren(
        statePanel(
          "Could not load complaints",
          "Check the collector connection and try again. Your filters are still here.",
          () => void load(),
        ),
      );
    } finally {
      if (!requestSignal.aborted) results.removeAttribute("aria-busy");
    }
  }
  function reset(): void {
    clearTimeout(timer);
    cursor = null;
    previous = [];
    activeQuery = { search: search.value.trim(), kind: type.value };
    const query = new URLSearchParams();
    if (activeQuery.search) query.set("search", activeQuery.search);
    if (activeQuery.kind) query.set("kind", activeQuery.kind);
    history.replaceState(null, "", `/complaints${query.size ? `?${query}` : ""}`);
    void load();
  }
  filters.addEventListener("submit", (event) => {
    event.preventDefault();
    reset();
  });
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(reset, 350);
  });
  type.addEventListener("change", reset);
  void load();
}

export function showComplaintDetail(
  host: HTMLElement,
  id: string,
  signal: AbortSignal,
  navigate: (path: string) => void,
  connection: (connected: boolean) => void,
): void {
  const api = new InboxApiService({ collectorOrigin: "" });
  const historyState: unknown = history.state;
  const previousPath =
    typeof historyState === "object" && historyState !== null && "from" in historyState
      ? historyState.from
      : null;
  const backPath =
    typeof previousPath === "string" && /^\/complaints(?:\?|$)/.test(previousPath)
      ? previousPath
      : "/complaints";
  async function load(): Promise<void> {
    host.replaceChildren(
      renderInboxDetail(
        document,
        { status: "loading" },
        { onBack: () => navigate(backPath), onRetry: () => void load() },
      ),
    );
    const state = await api.fetchDetail(id, AbortSignal.any([signal, AbortSignal.timeout(10_000)]));
    if (signal.aborted) return;
    connection(state.status !== "error");
    host.replaceChildren(
      renderInboxDetail(document, state, {
        onBack: () => navigate(backPath),
        onRetry: () => void load(),
      }),
    );
  }
  void load();
}

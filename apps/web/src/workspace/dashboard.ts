import { type DashboardData, fetchComplaints, fetchDashboard } from "../services/workspace-api";
import { complaintTable } from "./complaints";
import { element, formatDate, heading, icon, kindLabels, link, statePanel } from "./dom";
import type { Preferences } from "./preferences";

function panel(title: string, subtitle: string): HTMLElement {
  const node = element("section", "panel");
  const header = element("div", "panel-heading");
  header.append(element("h2", "", title), element("span", "muted small", subtitle));
  node.append(header);
  return node;
}

function renderChart(data: DashboardData): HTMLElement {
  const container = element("div", "chart-container");
  const daily = new Map(data.daily.map((item) => [item.date, item.count]));
  const start = new Date(data.generatedAt);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - data.days + 1);
  const points = Array.from({ length: data.days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: daily.get(key) ?? 0 };
  });
  const maximum = Math.max(4, ...points.map((point) => point.count));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 760 240");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `${data.total} complaints over ${data.days} days. Daily values are available below the chart.`,
  );
  const shape = (tag: string, attributes: Record<string, string>) => {
    const node = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    svg.append(node);
    return node;
  };
  for (let index = 0; index <= 4; index++) {
    const y = 18 + index * 48;
    shape("line", { x1: "40", x2: "750", y1: String(y), y2: String(y), class: "chart-grid" });
    shape("text", {
      x: "28",
      y: String(y + 4),
      "text-anchor": "end",
      class: "chart-label",
    }).textContent = String(Math.round((maximum * (4 - index)) / 4));
  }
  const coordinates = points.map(
    (point, index) =>
      `${40 + (index * 710) / (points.length - 1)},${210 - (point.count / maximum) * 192}`,
  );
  shape("polygon", { points: `40,210 ${coordinates.join(" ")} 750,210`, class: "chart-area" });
  shape("polyline", { points: coordinates.join(" "), class: "chart-line" });
  for (const index of [0, Math.floor((points.length - 1) / 2), points.length - 1]) {
    const point = points[index];
    if (point)
      shape("text", {
        x: String(40 + (index * 710) / (points.length - 1)),
        y: "235",
        "text-anchor": index === 0 ? "start" : index === points.length - 1 ? "end" : "middle",
        class: "chart-label",
      }).textContent = new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(point.date));
  }
  container.append(svg);
  if (data.total === 0) {
    const empty = element("div", "chart-empty");
    empty.append(
      element("strong", "", "A clearer picture starts with the first report."),
      element("span", "muted", "Complaints received in this period will appear here."),
    );
    container.append(empty);
  }
  const detail = element("details", "chart-data");
  detail.append(element("summary", "", "View daily counts"));
  const table = element("table");
  const head = element("thead");
  const row = element("tr");
  row.append(element("th", "", "Date (UTC)"), element("th", "", "Complaints"));
  head.append(row);
  const body = element("tbody");
  for (const point of points) {
    const row = element("tr");
    row.append(element("td", "", point.date), element("td", "", String(point.count)));
    body.append(row);
  }
  table.append(head, body);
  detail.append(table);
  container.append(detail);
  return container;
}

export function showDashboard(
  host: HTMLElement,
  preferences: Preferences,
  signal: AbortSignal,
  connection: (connected: boolean) => void,
): void {
  const header = heading("Dashboard", "A little clarity on what needs your attention.");
  const controls = element("div", "page-actions");
  const range = element("select", "select");
  range.setAttribute("aria-label", "Dashboard date range");
  for (const days of [7, 30, 90]) {
    const option = element("option", "", `Last ${days} days`);
    option.value = String(days);
    range.append(option);
  }
  const requestedDays = new URLSearchParams(location.search).get("days");
  range.value =
    requestedDays === "7" || requestedDays === "30" || requestedDays === "90"
      ? requestedDays
      : String(preferences.days);
  const rangeWrap = element("div", "select-with-icon");
  rangeWrap.append(icon("calendar"), range);
  controls.append(rangeWrap, link("View complaints", "/complaints", "button button-primary"));
  header.append(controls);
  const body = element("div", "dashboard-body");
  host.append(header, body);
  let current: AbortController | undefined;

  async function load(): Promise<void> {
    current?.abort();
    const controller = new AbortController();
    current = controller;
    const requestSignal = AbortSignal.any([signal, controller.signal]);
    const days = range.value === "7" ? 7 : range.value === "90" ? 90 : 30;
    body.replaceChildren(
      statePanel("Loading your dashboard", "Reading complaint activity from the collector."),
    );
    body.setAttribute("aria-busy", "true");
    try {
      const data = await fetchDashboard(days, requestSignal);
      if (requestSignal.aborted) return;
      connection(true);
      body.replaceChildren();
      const stats = element("div", "stats-grid");
      const statItems = [
        {
          label: "Total complaints",
          value: data.total,
          symbol: "complaints",
          note: "Across all feedback types",
        },
        {
          label: "Bug reports",
          value: data.kinds.find((item) => item.kind === "bug")?.count ?? 0,
          symbol: "bug",
          note: "Things that need a fix",
        },
        {
          label: "Blocked tasks",
          value: data.kinds.find((item) => item.kind === "blocked_task")?.count ?? 0,
          symbol: "blocked",
          note: "Journeys that could not finish",
        },
        {
          label: "Ideas",
          value: data.kinds.find((item) => item.kind === "idea")?.count ?? 0,
          symbol: "idea",
          note: "Room for something better",
        },
      ] as const;
      for (const stat of statItems) {
        const card = element("section", "stat-card");
        const label = element("div", "stat-label");
        label.append(element("span", "", stat.label), icon(stat.symbol));
        const value = element("div", "stat-value");
        value.append(
          element("strong", "", stat.value.toLocaleString("en")),
          element("span", "muted small", stat.note),
        );
        card.append(label, value);
        stats.append(card);
      }
      const grid = element("div", "dashboard-grid");
      const activity = panel("Complaint activity", `Daily volume · UTC · ${days} days`);
      activity.classList.add("activity-panel");
      activity.append(renderChart(data));
      const breakdown = panel("By feedback type", "What people report");
      const breakdownBody = element("div", "breakdown");
      for (const [kind, label] of Object.entries(kindLabels)) {
        const count = data.kinds.find((item) => item.kind === kind)?.count ?? 0;
        const row = element("a", "breakdown-row");
        row.href = `/complaints?kind=${kind}`;
        const info = element("div", "breakdown-label");
        info.append(element("span", "", label), element("strong", "mono", String(count)));
        const track = element("div", "bar-track");
        const fill = element("span", `bar-fill kind-${kind}`);
        fill.style.width = `${data.total ? (count / data.total) * 100 : 0}%`;
        track.append(fill);
        row.append(info, track);
        breakdownBody.append(row);
      }
      breakdown.append(
        breakdownBody,
        element("p", "panel-note", "Every report starts with the user's review."),
      );
      const recent = panel("Latest complaints", "Most recently received · all dates");
      recent.append(statePanel("Loading recent reports", "Fetching the latest complaints."));
      const routes = panel("Most reported pages", "Top 5 in this period");
      if (data.routes.length === 0)
        routes.append(
          statePanel("No pages yet", "Page labels will appear when reports include them."),
        );
      else {
        const list = element("ol", "route-list");
        for (const [index, route] of data.routes.entries()) {
          const row = element("li");
          row.append(
            element("span", "route-rank mono", String(index + 1)),
            element("span", "route-name", route.label ?? "No page label"),
            element("strong", "mono", String(route.count)),
          );
          list.append(row);
        }
        routes.append(list);
      }
      grid.append(activity, breakdown, recent, routes);
      body.append(stats, grid);
      const footer = element("div", "dashboard-footer");
      footer.append(
        element(
          "span",
          "",
          `Updated ${formatDate(data.generatedAt)} · Counts include retained records in this period.`,
        ),
        link("Workspace settings", "/settings"),
      );
      body.append(footer);
      void fetchComplaints({ search: "", kind: "", cursor: null }, requestSignal)
        .then((page) => {
          if (requestSignal.aborted) return;
          recent.lastElementChild?.remove();
          recent.append(
            page.items.length
              ? complaintTable(page.items.slice(0, 5), true)
              : statePanel(
                  "No complaints yet",
                  "User-reviewed reports from your website will arrive here.",
                ),
          );
          recent.append(link("View all complaints →", "/complaints", "panel-link"));
        })
        .catch(() => {
          if (requestSignal.aborted) return;
          recent.lastElementChild?.remove();
          recent.append(
            statePanel(
              "Recent complaints unavailable",
              "Try refreshing the dashboard.",
              () => void load(),
            ),
          );
        });
    } catch {
      if (requestSignal.aborted) return;
      connection(false);
      body.replaceChildren(
        statePanel(
          "Could not load your dashboard",
          "Check that the collector and database are running, then try again.",
          () => void load(),
        ),
      );
      body.append(link("Connection details", "/settings", "panel-link"));
    } finally {
      if (!requestSignal.aborted) body.removeAttribute("aria-busy");
    }
  }
  range.addEventListener("change", () => {
    history.replaceState(null, "", `/dashboard?days=${range.value}`);
    void load();
  });
  void load();
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const paths = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  complaints:
    "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z M7 9h9 M7 13h6",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  refresh: "M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 2 M18 18A8 8 0 0 1 5 16",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M16 16l5 5",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M7 3v4 M17 3v4 M3 11h18",
  bug: "M8 8h8v7a4 4 0 0 1-8 0Z M9 8V6a3 3 0 0 1 6 0v2 M4 10h4 M16 10h4 M3 15h5 M16 15h5 M6 21l3-3 M18 21l-3-3 M12 9v9",
  blocked: "M8 3h8l5 5v8l-5 5H8l-5-5V8Z M12 7v6 M12 17h.01",
  idea: "M9 18h6 M9 21h6 M8 15a7 7 0 1 1 8 0l-1 3H9Z",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z M8 12l3 3 5-6",
  code: "M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  check: "M5 12l4 4L19 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  chevron: "M9 5l7 7-7 7",
} as const;
export type IconName = keyof typeof paths;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[name]);
  svg.append(path);
  return svg;
}

export function button(
  label: string,
  action: () => void,
  className = "button",
  symbol?: IconName,
): HTMLButtonElement {
  const node = element("button", className);
  node.type = "button";
  if (symbol) node.append(icon(symbol));
  node.append(document.createTextNode(label));
  node.addEventListener("click", action);
  return node;
}

export function link(label: string, href: string, className = "text-link"): HTMLAnchorElement {
  const node = element("a", className, label);
  node.href = href;
  return node;
}

export function heading(title: string, description: string): HTMLElement {
  const node = element("div", "page-heading");
  const copy = element("div");
  const h1 = element("h1", "", title);
  h1.tabIndex = -1;
  copy.append(h1, element("p", "muted", description));
  node.append(copy);
  return node;
}

export function statePanel(title: string, body: string, retry?: () => void): HTMLElement {
  const panel = element("div", "state-panel");
  panel.setAttribute("role", retry ? "alert" : "status");
  const symbol = element("span", "state-icon");
  symbol.append(icon(retry ? "blocked" : "complaints"));
  panel.append(symbol, element("h2", "", title), element("p", "muted", body));
  if (retry) panel.append(button("Try again", retry, "button", "refresh"));
  return panel;
}

export const kindLabels: Record<string, string> = {
  bug: "Bug report",
  blocked_task: "Blocked task",
  confusing_behavior: "Confusing behavior",
  idea: "Idea",
};

export function kindBadge(kind: string): HTMLElement {
  return element(
    "span",
    `kind-badge kind-${Object.hasOwn(kindLabels, kind) ? kind : "unknown"}`,
    kindLabels[kind] ?? "Other",
  );
}

export function kindBadgeClass(kind: string): string {
  return `kind-badge kind-${Object.hasOwn(kindLabels, kind) ? kind : "unknown"}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

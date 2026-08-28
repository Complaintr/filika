import { mountBottomNavigation } from "./workspace/bottom-navigation";
import { showComplaintDetail, showComplaints } from "./workspace/complaints";
import { showDashboard } from "./workspace/dashboard";
import { button, element, icon, link } from "./workspace/dom";
import { readPreferences, type Preferences } from "./workspace/preferences";
import { showSettings } from "./workspace/settings";

const root = document.getElementById("app");
if (!root) throw new Error("Missing workspace root.");

let preferences = readPreferences();
let routeController = new AbortController();
const shell = element("div", "workspace-shell");
const brand = link("", "/dashboard", "brand");
const mark = element("span", "brand-mark");
// Filika's sail is drawn locally rather than using an imported brand asset.
mark.append(
  element("span", "sail-main"),
  element("span", "sail-small"),
  element("span", "sail-hull"),
);
brand.append(mark, element("span", "", "filika"));
const workspace = link("", "/settings", "workspace-switcher");
const initial = element("span", "workspace-avatar", "W");
const workspaceCopy = element("span", "workspace-copy");
const workspaceName = element("strong", "", preferences.workspaceName);
workspaceCopy.append(workspaceName, element("span", "muted small", "Local workspace"));
workspace.append(initial, workspaceCopy, icon("chevron"));
const navHost = element("div", "navigation-root");
const connectionLabel = element("span", "", "Checking connection");
const connectionIndicator = element("span", "connection-dot");
const connectionBox = element("div", "connection-status");
connectionBox.setAttribute("role", "status");
connectionBox.append(connectionIndicator, connectionLabel);
const topbar = element("header", "topbar");
const topbarInner = element("div", "topbar-inner");
const identity = element("div", "workspace-identity");
const separator = element("span", "identity-separator", "/");
separator.setAttribute("aria-hidden", "true");
identity.append(brand, separator, workspace);
const topActions = element("div", "topbar-actions");
const refresh = button("Refresh", () => renderRoute(false), "button button-quiet", "refresh");
const settingsLink = link("", "/settings", "topbar-avatar");
settingsLink.setAttribute("aria-label", "Workspace settings");
settingsLink.append(icon("settings"));
topActions.append(connectionBox, refresh, settingsLink);
topbarInner.append(identity, topActions);
topbar.append(topbarInner);
const content = element("main", "workspace-content");
content.id = "app-content";
content.tabIndex = -1;
shell.append(topbar, content, navHost);
root.replaceChildren(shell);
const updateNavigation = mountBottomNavigation(navHost);

function applyPreferences(value: Preferences): void {
  preferences = value;
  workspaceName.textContent = value.workspaceName;
  initial.textContent = value.workspaceName.slice(0, 1).toUpperCase();
  document.documentElement.dataset.density = value.density;
}

function navigate(path: string): void {
  history.pushState({ from: location.pathname + location.search }, "", path);
  renderRoute(true);
}

function renderRoute(focus: boolean): void {
  routeController.abort();
  routeController = new AbortController();
  const signal = routeController.signal;
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") history.replaceState(null, "", "/dashboard");
  const section = path.startsWith("/complaints")
    ? "/complaints"
    : path === "/settings"
      ? "/settings"
      : "/dashboard";
  const title =
    section === "/complaints"
      ? "All complaints"
      : section === "/settings"
        ? "Settings"
        : "Dashboard";
  document.title = `${title} · Filika`;
  updateNavigation(section);
  content.replaceChildren();
  const connection = (connected: boolean) => {
    if (signal.aborted) return;
    connectionBox.dataset.state = connected ? "connected" : "offline";
    connectionLabel.textContent = connected ? "Collector connected" : "Collector unavailable";
  };
  if (section === "/settings")
    showSettings(content, preferences, signal, applyPreferences, connection);
  else if (path.startsWith("/complaints/"))
    showComplaintDetail(content, path.slice("/complaints/".length), signal, navigate, connection);
  else if (section === "/complaints") showComplaints(content, signal, connection);
  else showDashboard(content, preferences, signal, connection);
  if (focus) {
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
}

document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href);
  if (
    url.origin !== location.origin ||
    !/^\/(dashboard|complaints(?:\/[^/]+)?|settings)$/.test(url.pathname)
  )
    return;
  event.preventDefault();
  navigate(url.pathname + url.search);
});
window.addEventListener("popstate", () => renderRoute(true));
window.addEventListener("pagehide", () => routeController.abort());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) renderRoute(false);
});
applyPreferences(preferences);
renderRoute(false);

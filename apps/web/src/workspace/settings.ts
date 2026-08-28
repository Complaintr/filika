import { fetchDashboard } from "../services/workspace-api";
import { button, element, heading, icon } from "./dom";
import { DEFAULT_PREFERENCES, type Preferences, savePreferences } from "./preferences";

function settingRow(
  title: string,
  description: string,
  control: HTMLElement,
  id: string,
): HTMLElement {
  const row = element("div", "setting-row");
  const copy = element("div");
  const label = element("label", "setting-label", title);
  label.htmlFor = id;
  const hint = element("p", "muted small", description);
  hint.id = `${id}-hint`;
  control.id = id;
  control.setAttribute("aria-describedby", hint.id);
  copy.append(label, hint);
  row.append(copy, control);
  return row;
}

export function showSettings(
  host: HTMLElement,
  preferences: Preferences,
  signal: AbortSignal,
  onSave: (value: Preferences) => void,
  connection: (connected: boolean) => void,
): void {
  host.append(heading("Settings", "Make this workspace feel like yours."));
  const grid = element("div", "settings-grid");
  const main = element("div", "settings-main");
  const form = element("form", "panel settings-panel");
  const header = element("div", "panel-heading");
  header.append(
    element("h2", "", "Workspace preferences"),
    element("span", "subtle-badge", "This browser"),
  );
  const name = element("input", "input");
  name.type = "text";
  name.value = preferences.workspaceName;
  name.maxLength = 60;
  name.required = true;
  name.autocomplete = "off";
  const range = element("select", "select");
  for (const days of [7, 30, 90]) {
    const option = element("option", "", `Last ${days} days`);
    option.value = String(days);
    range.append(option);
  }
  range.value = String(preferences.days);
  const density = element("select", "select");
  for (const value of ["comfortable", "compact"]) {
    const option = element("option", "", value === "compact" ? "Compact" : "Comfortable");
    option.value = value;
    density.append(option);
  }
  density.value = preferences.density;
  form.append(
    header,
    settingRow(
      "Workspace name",
      "A display name for this browser. It does not rename collector projects.",
      name,
      "workspace-name",
    ),
    settingRow(
      "Default date range",
      "The period shown when you open your dashboard.",
      range,
      "default-range",
    ),
    settingRow(
      "Table density",
      "Choose how much space complaint rows use.",
      density,
      "table-density",
    ),
  );
  const appearance = element("div", "setting-row");
  const copy = element("div");
  copy.append(
    element("span", "setting-label", "Appearance"),
    element("p", "muted small", "Filika's light workspace, in white, blue, and gray."),
  );
  const swatches = element("div", "palette-preview");
  swatches.setAttribute("aria-label", "White, blue, and gray theme");
  for (const color of ["white", "blue", "gray"])
    swatches.append(element("span", `swatch swatch-${color}`));
  appearance.append(copy, swatches);
  form.append(appearance);
  const footer = element("div", "settings-form-footer");
  const status = element("p", "save-status small");
  status.setAttribute("role", "status");
  const save = element("button", "button button-primary", "Save changes");
  save.type = "submit";
  footer.append(
    button("Restore defaults", () => {
      name.value = DEFAULT_PREFERENCES.workspaceName;
      range.value = String(DEFAULT_PREFERENCES.days);
      density.value = DEFAULT_PREFERENCES.density;
      status.textContent = "Defaults restored. Save changes to apply them.";
    }),
    save,
  );
  form.append(footer, status);
  name.addEventListener("input", () => name.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!name.value.trim()) {
      name.setCustomValidity("Enter a workspace name.");
      name.reportValidity();
      return;
    }
    const next: Preferences = {
      workspaceName: name.value.trim().slice(0, 60),
      days: range.value === "7" ? 7 : range.value === "90" ? 90 : 30,
      density: density.value === "compact" ? "compact" : "comfortable",
    };
    if (!savePreferences(next)) {
      status.textContent =
        "Your browser could not save these settings. Allow local storage and try again.";
      return;
    }
    onSave(next);
    status.textContent = "Changes saved.";
  });
  const collector = element("section", "panel settings-panel");
  const collectorHeader = element("div", "panel-heading");
  collectorHeader.append(element("h2", "", "Collector connection"), icon("globe"));
  const info = element("div", "connection-info");
  info.append(
    element("p", "", "Your workspace reads reports through the Filika web server."),
    element("code", "endpoint", "/api/v1/inbox"),
    element(
      "p",
      "muted small",
      "Set FILIKA_COLLECTOR_ORIGIN on the web server to change the upstream collector. The default is http://localhost:8787.",
    ),
  );
  const connectionStatus = element("p", "small muted", "Checking the collector…");
  connectionStatus.setAttribute("role", "status");
  let checking = false;
  const check = button("Check connection", () => void checkConnection(), "button", "refresh");
  const actions = element("div", "connection-actions");
  actions.append(connectionStatus, check);
  collector.append(collectorHeader, info, actions);
  async function checkConnection(): Promise<void> {
    if (checking) return;
    checking = true;
    check.disabled = true;
    connectionStatus.textContent = "Checking the collector…";
    try {
      await fetchDashboard(7, signal);
      if (!signal.aborted) {
        connection(true);
        connectionStatus.textContent = "Connected. The collector and database are responding.";
      }
    } catch {
      if (!signal.aborted) {
        connection(false);
        connectionStatus.textContent =
          "Could not connect. Check the collector address and database.";
      }
    } finally {
      checking = false;
      check.disabled = false;
    }
  }
  main.append(form, collector);
  const aside = element("aside", "settings-aside");
  const privacy = element("section", "privacy-card");
  const symbol = element("span", "privacy-icon");
  symbol.append(icon("shield"));
  privacy.append(
    symbol,
    element("h2", "", "Feedback, with boundaries."),
    element(
      "p",
      "muted",
      "Users review every agent-authored report before it is sent. Your workspace only shows the feedback they chose to share.",
    ),
  );
  const list = element("ul", "privacy-list");
  for (const text of [
    "No page content or browsing history",
    "No screenshots or credentials",
    "No agent tools on management pages",
  ]) {
    const item = element("li");
    item.append(icon("check"), document.createTextNode(text));
    list.append(item);
  }
  privacy.append(list);
  const note = element("section", "settings-note");
  note.append(
    element("h3", "", "About this workspace"),
    element(
      "p",
      "muted small",
      "This is a local, read-only management interface. Reports remain publicly readable through the collector API. There are no accounts or access controls; keep the collector on a trusted network.",
    ),
    element(
      "p",
      "muted small",
      "Retention is configured per collector project. Expired records remain in counts until the cleanup command runs.",
    ),
  );
  aside.append(privacy, note);
  grid.append(main, aside);
  host.append(grid);
  void checkConnection();
}

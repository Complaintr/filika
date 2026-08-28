import type { FilikaPublicApi } from "@filika/sdk";
import { MaintainerInbox } from "./components/inbox";
import { ReceiptToast } from "./components/receipt-toast";
import { SampleApplication } from "./sample-app";
import { createSampleTaskTool } from "./sample-task-tool";
import { connectSdkDialog } from "./sdk-dialog";
import { InboxApiService } from "./services/inbox-api";
import type { ModelContext } from "./webmcp-test-tool";

type WebMcpDocument = Document & {
  readonly modelContext?: ModelContext;
};

declare global {
  interface Window {
    Filika: FilikaPublicApi;
  }
}

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

const content = getRequiredElement<HTMLElement>("app-content");
const dialogHost = getRequiredElement<HTMLElement>("filika-feedback-root");
const demoNavigation = getRequiredElement<HTMLButtonElement>("nav-demo");
const inboxNavigation = getRequiredElement<HTMLButtonElement>("nav-inbox");
const webMcpStatus = getRequiredElement<HTMLElement>("webmcp-status");

const COLLECTOR_ORIGIN = "http://localhost:8787";

const receiptToast = new ReceiptToast(document.body, {
  onViewInbox: (feedbackId) => showInbox(feedbackId),
});
const inboxApi = new InboxApiService({ collectorOrigin: COLLECTOR_ORIGIN });

const api = window.Filika;
const integration = connectSdkDialog(dialogHost, api, {
  onReceipt: (receipt) => receiptToast.show(receipt),
});
window.addEventListener("pagehide", () => integration.dispose(), { once: true });
const sampleApplication = new SampleApplication(content, {
  feedbackDialog: { open: () => api.open() },
});

async function loadInboxList(): Promise<void> {
  inbox.showList({ status: "loading" });
  const state = await inboxApi.fetchList();
  inbox.showList(state);
}

async function loadInboxDetail(feedbackId: string): Promise<void> {
  inbox.showDetail({ status: "loading" });
  const state = await inboxApi.fetchDetail(feedbackId);
  inbox.showDetail(state);
}

const inbox = new MaintainerInbox(content, {
  onBack: () => void loadInboxList(),
  onOpen: (feedbackId) => void loadInboxDetail(feedbackId),
  onRetry: () => void loadInboxList(),
});

function showDemo(): void {
  demoNavigation.setAttribute("aria-current", "page");
  inboxNavigation.removeAttribute("aria-current");
  sampleApplication.render();
}

function showInbox(targetFeedbackId?: string): void {
  inboxNavigation.setAttribute("aria-current", "page");
  demoNavigation.removeAttribute("aria-current");
  if (targetFeedbackId !== undefined) {
    void loadInboxDetail(targetFeedbackId);
  } else {
    void loadInboxList();
  }
}

demoNavigation.addEventListener("click", () => showDemo());
inboxNavigation.addEventListener("click", () => showInbox());

async function registerSampleTaskTool(): Promise<void> {
  const modelContext = (document as WebMcpDocument).modelContext;
  if (modelContext === undefined) {
    webMcpStatus.dataset.state = "unsupported";
    webMcpStatus.textContent = "WebMCP unavailable. Manual feedback is ready.";
    return;
  }

  const controller = new AbortController();
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
  const tool = createSampleTaskTool(() => {
    showDemo();
    sampleApplication.runFailure();
  });

  try {
    await modelContext.registerTool(tool, { signal: controller.signal });
    webMcpStatus.dataset.state = "registered";
    webMcpStatus.textContent = "WebMCP demo task ready.";
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "UnknownError";
    webMcpStatus.dataset.state = "failed";
    webMcpStatus.textContent = `WebMCP registration failed: ${name}. Manual feedback is ready.`;
  }
}

type ThemePreference = "system" | "light" | "dark";

function initThemeSwitcher(): void {
  const switcher = document.getElementById("theme-switcher");
  if (!(switcher instanceof HTMLElement)) {
    return;
  }

  const buttons = switcher.querySelectorAll<HTMLButtonElement>(".theme-btn");

  function getStoredTheme(): ThemePreference {
    try {
      const stored = localStorage.getItem("filika-theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      // Ignored
    }
    return "system";
  }

  function applyTheme(pref: ThemePreference): void {
    if (pref === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = pref;
    }

    for (const btn of buttons) {
      const val = btn.dataset.themeValue;
      const isSelected = val === pref;
      btn.setAttribute("aria-checked", isSelected ? "true" : "false");
    }
  }

  let currentPref = getStoredTheme();
  applyTheme(currentPref);

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.themeValue as ThemePreference | undefined;
      if (selected === "light" || selected === "dark" || selected === "system") {
        currentPref = selected;
        try {
          localStorage.setItem("filika-theme", selected);
        } catch {
          // Ignored
        }
        applyTheme(currentPref);
      }
    });
  }
}

showDemo();
initThemeSwitcher();
void registerSampleTaskTool();

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
// Capture the same fixed script configuration once for explicit reinitialization
// after leaving the isolated inbox. The public SDK validates it again at init.
const sdkScript = document.getElementById("filika-sdk");
const sdkConfig = {
  projectKey: sdkScript?.getAttribute("data-project-key") ?? "",
  endpoint: sdkScript?.getAttribute("data-endpoint") ?? "",
  ...(sdkScript?.hasAttribute("data-route-label")
    ? { routeLabel: sdkScript.getAttribute("data-route-label") ?? "" }
    : {}),
  ...(sdkScript?.hasAttribute("data-application-release")
    ? { applicationRelease: sdkScript.getAttribute("data-application-release") ?? "" }
    : {}),
};
const integration = connectSdkDialog(dialogHost, api, {
  onReceipt: (receipt) => receiptToast.show(receipt),
});
window.addEventListener("pagehide", () => integration.dispose(), { once: true });
const sampleApplication = new SampleApplication(content, {
  feedbackDialog: { open: () => api.open() },
});

let navigation = 0;

async function loadInboxList(): Promise<void> {
  const currentNavigation = ++navigation;
  inbox.showList({ status: "loading" });
  const state = await inboxApi.fetchList();
  if (navigation === currentNavigation) inbox.showList(state);
}

async function loadInboxDetail(feedbackId: string): Promise<void> {
  const currentNavigation = ++navigation;
  inbox.showDetail({ status: "loading" });
  const state = await inboxApi.fetchDetail(feedbackId);
  if (navigation === currentNavigation) inbox.showDetail(state);
}

const inbox = new MaintainerInbox(content, {
  onBack: () => void loadInboxList(),
  onOpen: (feedbackId) => void loadInboxDetail(feedbackId),
  onRetry: () => void loadInboxList(),
});

let demoToolController: AbortController | null = null;

async function activateDemoTools(): Promise<void> {
  const modelContext = (document as WebMcpDocument).modelContext;
  if (modelContext === undefined) {
    webMcpStatus.dataset.state = "unsupported";
    webMcpStatus.textContent = "WebMCP unavailable. Manual feedback is ready.";
    return;
  }

  demoToolController?.abort();
  const controller = new AbortController();
  demoToolController = controller;
  window.addEventListener("pagehide", () => controller.abort(), { once: true });

  const tool = createSampleTaskTool(() => {
    showDemo();
    sampleApplication.runFailure();
  });

  try {
    await modelContext.registerTool(tool, { signal: controller.signal });
    if (!controller.signal.aborted) {
      webMcpStatus.dataset.state = "registered";
      webMcpStatus.textContent = "WebMCP demo task ready.";
    }
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    const name = error instanceof DOMException ? error.name : "UnknownError";
    webMcpStatus.dataset.state = "failed";
    webMcpStatus.textContent = `WebMCP registration failed: ${name}. Manual feedback is ready.`;
  }
}

function deactivateDemoTools(): void {
  api.dispose();
  if (demoToolController !== null) {
    demoToolController.abort();
    demoToolController = null;
  }
  const modelContext = (document as WebMcpDocument).modelContext;
  if (modelContext !== undefined) {
    webMcpStatus.dataset.state = "inbox_isolated";
    webMcpStatus.textContent = "WebMCP tools disabled on maintainer inbox route.";
  }
}

function showDemo(): void {
  navigation++;
  if (api.status.state === "disposed") void api.init(sdkConfig);
  demoNavigation.setAttribute("aria-current", "page");
  inboxNavigation.removeAttribute("aria-current");
  sampleApplication.render();
  void activateDemoTools();
}

function showInbox(targetFeedbackId?: string): void {
  deactivateDemoTools();
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

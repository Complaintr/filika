import { FeedbackDialog } from "./components/feedback-dialog";
import { MaintainerInbox } from "./components/inbox";
import type { InboxDetailViewModel, InboxListItemViewModel } from "./contracts/inbox-view-model";
import { SampleApplication } from "./sample-app";
import { createSampleTaskTool } from "./sample-task-tool";
import type { ModelContext } from "./webmcp-test-tool";

type WebMcpDocument = Document & {
  readonly modelContext?: ModelContext;
};

const sampleFeedback: readonly InboxDetailViewModel[] = [
  {
    applicationRelease: "demo-2026.08",
    description: "Saving the sample draft always ends with the visible conflict message.",
    expectedBehavior: "The draft should save or explain how to resolve the conflict.",
    expiresAt: "2026-08-28T18:30:00.000Z",
    feedbackId: "fb_demo_7f31",
    kind: "bug",
    receivedAt: "2026-08-27T18:30:00.000Z",
    reproductionSteps: "Open the sample task, run the save task, and observe the failure panel.",
    requestOrigin: "http://localhost:4173",
    routeLabel: "Sample task",
    source: "web_sdk_unverified",
    title: "Sample draft cannot be saved",
  },
  {
    applicationRelease: null,
    description: "The confirmation copy could explain the retention window more directly.",
    expectedBehavior: null,
    expiresAt: "2026-08-28T17:15:00.000Z",
    feedbackId: "fb_demo_2a94",
    kind: "idea",
    receivedAt: "2026-08-27T17:15:00.000Z",
    reproductionSteps: null,
    requestOrigin: "http://localhost:4173",
    routeLabel: "Feedback review",
    source: "web_sdk_unverified",
    title: "Clarify retention before confirmation",
  },
];

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function abortableDelay(duration: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Submission aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

const content = getRequiredElement<HTMLElement>("app-content");
const dialogHost = getRequiredElement<HTMLElement>("filika-feedback-root");
const demoNavigation = getRequiredElement<HTMLButtonElement>("nav-demo");
const inboxNavigation = getRequiredElement<HTMLButtonElement>("nav-inbox");
const webMcpStatus = getRequiredElement<HTMLElement>("webmcp-status");

const feedbackDialog = new FeedbackDialog(dialogHost, {
  identity: {
    collectorOrigin: "http://localhost:8787",
    privacyUrl: "#privacy",
    projectName: "Filika local demo",
    retentionSummary: "Demo feedback is retained for up to 24 hours.",
  },
  async submit(_draft, signal) {
    await abortableDelay(300, signal);
    return {
      outcome: "success",
      receipt: {
        duplicate: false,
        feedbackId: `fb_preview_${crypto.randomUUID().slice(0, 8)}`,
        receivedAt: new Date().toISOString(),
      },
    };
  },
});

const sampleApplication = new SampleApplication(content, { feedbackDialog });
const listItems: readonly InboxListItemViewModel[] = sampleFeedback.map(
  ({ feedbackId, kind, receivedAt, requestOrigin, routeLabel, title }) => ({
    feedbackId,
    kind,
    receivedAt,
    requestOrigin,
    routeLabel,
    title,
  }),
);
const inbox = new MaintainerInbox(content, {
  onBack: () => inbox.showList({ items: listItems, status: "ready" }),
  onOpen: (feedbackId) => {
    const feedback = sampleFeedback.find((item) => item.feedbackId === feedbackId);
    inbox.showDetail(
      feedback === undefined ? { status: "not_found" } : { feedback, status: "ready" },
    );
  },
  onRetry: () => inbox.showList({ items: listItems, status: "ready" }),
});

function showDemo(): void {
  demoNavigation.setAttribute("aria-current", "page");
  inboxNavigation.removeAttribute("aria-current");
  sampleApplication.render();
}

function showInbox(): void {
  inboxNavigation.setAttribute("aria-current", "page");
  demoNavigation.removeAttribute("aria-current");
  inbox.showList({ items: listItems, status: "ready" });
}

demoNavigation.addEventListener("click", showDemo);
inboxNavigation.addEventListener("click", showInbox);

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

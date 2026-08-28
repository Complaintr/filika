import type { FilikaPublicApi } from "@filika/sdk";
import { expect, type Page, test } from "@playwright/test";

interface BrowserTool {
  execute(
    input: unknown,
    options: { signal: AbortSignal },
  ): Promise<{ code: string; receipt?: BrowserReceipt }>;
}

interface BrowserReceipt {
  duplicate: boolean;
  eventId: string;
  feedbackId: string;
  receivedAt: string;
  schemaVersion: 1;
}

declare global {
  interface Window {
    Filika: FilikaPublicApi;
    __filikaTools: Record<string, BrowserTool>;
  }
}

const FEEDBACK_ID = "33333333-3333-4333-8333-333333333333";
const RECEIVED_AT = "2026-08-28T13:00:00.000Z";

function receipt(eventId: string): BrowserReceipt {
  return {
    duplicate: false,
    eventId,
    feedbackId: FEEDBACK_ID,
    receivedAt: RECEIVED_AT,
    schemaVersion: 1,
  };
}

async function installModelContext(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools: Record<string, BrowserTool> = {};
    Object.defineProperty(window, "__filikaTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: BrowserTool & { name: string }): Promise<void> {
          tools[tool.name] = tool;
          return Promise.resolve();
        },
      },
    });
  });
}

async function waitForSdk(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status.state ?? "missing"))
    .toBe("ready");
  await expect
    .poll(() => page.evaluate(() => window.__filikaTools.filika_submit_feedback !== undefined))
    .toBe(true);
}

async function startSdkFeedback(page: Page): Promise<void> {
  await page.evaluate(() => {
    const tool = window.__filikaTools.filika_submit_feedback;
    if (tool === undefined) throw new Error("Filika feedback tool was not registered");
    void tool.execute(
      {
        description: "The sample save failed with a visible conflict.",
        expectedBehavior: "The draft should save successfully.",
        kind: "bug",
        reproductionSteps: ["Run the demo save task", "Observe the conflict"],
        title: "Sample save failed",
      },
      { signal: new AbortController().signal },
    );
  });
}

async function focusedDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#filika-feedback-root")?.shadowRoot;
    return root?.activeElement instanceof HTMLElement ? root.activeElement.id : null;
  });
}

async function tabUntilDialog(page: Page, targetId: string): Promise<void> {
  for (let step = 0; step < 24; step++) {
    if ((await focusedDialogId(page)) === targetId) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard focus never reached dialog element #${targetId}`);
}

async function focusedMainText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement;
    return element instanceof HTMLElement ? (element.textContent?.trim() ?? "") : "";
  });
}

async function tabUntilMain(page: Page, label: string): Promise<void> {
  for (let step = 0; step < 24; step++) {
    if ((await focusedMainText(page)) === label) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard focus never reached page element labeled "${label}"`);
}

async function interceptCollector(
  page: Page,
  onPost?: (body: Record<string, unknown>) => void,
): Promise<{ posts(): number }> {
  let postCount = 0;
  await page.route("http://localhost:8787/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Origin": "http://localhost:4173",
          Vary: "Origin",
        },
      });
      return;
    }
    if (request.method() === "POST") {
      postCount++;
      const body = JSON.parse(request.postData() ?? "null") as Record<string, unknown>;
      onPost?.(body);
      await route.fulfill({
        body: JSON.stringify(receipt(String(body.eventId))),
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        status: 201,
      });
      return;
    }
    await route.abort();
  });
  return { posts: () => postCount };
}

test("completes the SDK review flow from open to receipt using only the keyboard", async ({
  page,
}) => {
  await installModelContext(page);
  const submission = { body: null as Record<string, unknown> | null };
  const collector = await interceptCollector(page, (body) => {
    submission.body = body;
  });

  await page.goto("/");
  await waitForSdk(page);
  await startSdkFeedback(page);

  await expect(page.locator("#filika-kind")).toBeVisible();
  await expect.poll(() => focusedDialogId(page)).toBe("filika-kind");

  await tabUntilDialog(page, "filika-title");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Keyboard edited title");

  await tabUntilDialog(page, "filika-description");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Edited entirely with the keyboard.");

  await tabUntilDialog(page, "filika-route-label-remove");
  await page.keyboard.press("Enter");
  await expect(page.locator("#filika-route-label-remove")).toHaveCount(0);

  await tabUntilDialog(page, "filika-application-release-remove");
  await page.keyboard.press("Enter");
  await expect(page.locator("#filika-application-release-remove")).toHaveCount(0);

  await tabUntilDialog(page, "filika-review");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Confirm submission" })).toBeVisible();

  await tabUntilDialog(page, "filika-confirm");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Feedback received" })).toBeVisible();
  await expect(page.locator("#filika-feedback-status")).toContainText(FEEDBACK_ID);
  await expect(page.locator(".filika-receipt-toast")).toContainText(FEEDBACK_ID);

  expect(submission.body).not.toBeNull();
  const feedback = submission.body?.feedback as Record<string, unknown> | undefined;
  expect(feedback?.kind).toBe("bug");
  expect(feedback?.title).toBe("Keyboard edited title");
  expect(feedback?.description).toBe("Edited entirely with the keyboard.");
  const context = submission.body?.context as Record<string, unknown> | undefined;
  expect(context?.routeLabel).toBeUndefined();
  expect(context?.applicationRelease).toBeUndefined();

  await tabUntilDialog(page, "filika-close");
  await page.keyboard.press("Enter");
  await expect(page.locator("#filika-feedback-dialog")).toHaveCount(0);
  expect(collector.posts()).toBe(1);
});

test("keeps manual feedback keyboard-only and restores focus after escape cancel", async ({
  page,
}) => {
  const collector = await interceptCollector(page);

  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status.state ?? "missing"))
    .toBe("unsupported_browser");

  await tabUntilMain(page, "Send feedback");
  await page.keyboard.press("Enter");
  await expect(page.locator("#filika-kind")).toBeVisible();
  await expect.poll(() => focusedDialogId(page)).toBe("filika-kind");

  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#filika-kind")).toHaveValue("bug");

  await tabUntilDialog(page, "filika-title");
  await page.keyboard.type("Keyboard manual report");

  await tabUntilDialog(page, "filika-description");
  await page.keyboard.type("Submitted without touching the mouse.");

  await tabUntilDialog(page, "filika-review");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Confirm submission" })).toBeVisible();

  await tabUntilDialog(page, "filika-confirm");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Feedback received" })).toBeVisible();

  await tabUntilDialog(page, "filika-close");
  await page.keyboard.press("Enter");
  await expect.poll(() => focusedMainText(page)).toBe("Send feedback");

  await page.keyboard.press("Enter");
  await expect(page.locator("#filika-kind")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Feedback canceled" })).toBeVisible();

  await tabUntilDialog(page, "filika-close");
  await page.keyboard.press("Enter");
  await expect.poll(() => focusedMainText(page)).toBe("Send feedback");
  expect(collector.posts()).toBe(1);
});

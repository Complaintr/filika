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
    __filikaExecution?: Promise<{ code: string; receipt?: BrowserReceipt }>;
    __filikaTools: Record<string, BrowserTool>;
  }
}

const FEEDBACK_ID = "22222222-2222-4222-8222-222222222222";
const RECEIVED_AT = "2026-08-28T12:00:00.000Z";

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

function receipt(eventId: string, duplicate: boolean): BrowserReceipt {
  return {
    duplicate,
    eventId,
    feedbackId: FEEDBACK_ID,
    receivedAt: RECEIVED_AT,
    schemaVersion: 1,
  };
}

async function startSdkFeedback(page: Page): Promise<void> {
  await page.evaluate(() => {
    const tool = window.__filikaTools.filika_submit_feedback;
    if (tool === undefined) throw new Error("Filika feedback tool was not registered");
    window.__filikaExecution = tool.execute(
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

async function waitForSdk(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status.state ?? "missing"))
    .toBe("ready");
  await expect
    .poll(() => page.evaluate(() => window.__filikaTools.filika_submit_feedback !== undefined))
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await installModelContext(page);
});

test("edits, removes context, confirms, and opens the exact inbox detail", async ({ page }) => {
  const submission = { body: null as Record<string, unknown> | null };
  await page.route("http://localhost:4173/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      submission.body = JSON.parse(request.postData() ?? "null") as Record<string, unknown>;
      const eventId = String(submission.body.eventId);
      await route.fulfill({
        body: JSON.stringify(receipt(eventId, false)),
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        status: 201,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        feedback: {
          applicationRelease: null,
          description: "The sample save failed with a visible conflict.",
          expectedBehavior: "The draft should save successfully.",
          expiresAt: "2026-08-29T12:00:00.000Z",
          feedbackId: FEEDBACK_ID,
          kind: "bug",
          receivedAt: RECEIVED_AT,
          reproductionSteps: ["Run the demo save task", "Observe the conflict"],
          requestOrigin: "http://localhost:4173",
          routeLabel: null,
          source: "web_sdk_unverified",
          title: "Edited save failure",
        },
      }),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 200,
    });
  });

  await page.goto("/");
  await waitForSdk(page);
  await startSdkFeedback(page);

  await page.locator("#filika-title").fill("Edited save failure");
  await page.locator("#filika-route-label-remove").click();
  await page.locator("#filika-application-release-remove").click();
  await page.locator("#filika-review").click();
  await page.locator("#filika-confirm").click();

  await expect(page.getByRole("heading", { name: "Feedback received" })).toBeVisible();
  await expect(page.locator(".filika-receipt-toast")).toContainText(FEEDBACK_ID);
  await expect(page.locator(".filika-receipt-toast")).not.toContainText("Edited save failure");
  expect(submission.body).not.toBeNull();
  expect(submission.body?.context).toEqual({ sdkVersion: "0.0.0" });

  await page.locator("#filika-close").click();
  await page.getByRole("button", { name: "View in inbox" }).click();
  await expect(page.getByRole("heading", { name: "Edited save failure" })).toBeVisible();
  await expect(page.getByText(FEEDBACK_ID, { exact: true })).toBeVisible();
});

test("supports cancel and the default manual feedback button", async ({ page }) => {
  await page.route("http://localhost:4173/**", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
    await route.fulfill({
      body: JSON.stringify(receipt(body.eventId, false)),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 201,
    });
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.locator("#filika-cancel").click();
  await expect(page.getByRole("heading", { name: "Feedback canceled" })).toBeVisible();
  await page.locator("#filika-close").click();

  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.locator("#filika-kind").selectOption("idea");
  await page.locator("#filika-title").fill("Manual feedback");
  await page.locator("#filika-description").fill("Submitted through the manual fallback.");
  await page.locator("#filika-review").click();
  await page.locator("#filika-confirm").click();
  await expect(page.getByRole("heading", { name: "Feedback received" })).toBeVisible();
});

test("retries an unknown SDK outcome with the original event ID", async ({ page }) => {
  const eventIds: string[] = [];
  await page.route("http://localhost:4173/**", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
    eventIds.push(body.eventId);
    if (eventIds.length === 1) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      body: JSON.stringify(receipt(body.eventId, true)),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 200,
    });
  });

  await page.goto("/");
  await waitForSdk(page);
  await startSdkFeedback(page);
  await page.locator("#filika-review").click();
  await page.locator("#filika-confirm").click();
  await expect(page.getByRole("heading", { name: "Submission status unknown" })).toBeVisible();

  await page.locator("#filika-outcome-primary").click();
  await expect(page.getByRole("heading", { name: "Already received" })).toBeVisible();
  expect(eventIds).toHaveLength(2);
  expect(eventIds[1]).toBe(eventIds[0]);
});

test("keeps the dialog usable under aggressive host CSS", async ({ page }) => {
  await page.goto("/");
  await waitForSdk(page);
  await page.addStyleTag({
    content: `
      body * { color: red !important; font-size: 0 !important; }
      body button, body input, body select, body textarea { display: none !important; }
      body dialog { visibility: hidden !important; pointer-events: none !important; }
    `,
  });
  await page.evaluate(() => {
    if (window.Filika === undefined) throw new Error("Filika SDK is unavailable");
    window.__filikaExecution = window.Filika.open();
  });

  const dialog = page.locator("#filika-feedback-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#filika-title")).toBeVisible();
  await expect(page.locator("#filika-description")).toBeVisible();
  await expect(page.locator("#filika-cancel")).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);
  expect(box?.height ?? 0).toBeGreaterThan(200);
});

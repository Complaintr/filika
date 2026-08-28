import type { FilikaPublicApi } from "@filika/sdk";
import { expect, type Page, type Route, test } from "@playwright/test";

interface BrowserTool {
  name: string;
  execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown>;
}

declare global {
  interface Window {
    Filika: FilikaPublicApi;
    filikaTest: {
      abort(): void;
      invoke(name: string, input: unknown): void;
      names(): string[];
      outcome: Promise<unknown> | null;
    };
  }
}

const FEEDBACK_ENDPOINT = "http://localhost:8787/api/v1/feedback";
const RECEIVED_AT = "2026-08-28T14:00:00.000Z";

const draft = {
  kind: "bug",
  title: "Sample draft save conflict",
  description: "The sample save task reported a conflict.",
  reproductionSteps: ["Run sample task", "Observe conflict"],
};

const PREFLIGHT_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "http://localhost:4173",
  Vary: "Origin",
} as const;

function receipt(eventId: string, duplicate: boolean): Record<string, unknown> {
  return {
    duplicate,
    eventId,
    feedbackId: "99999999-9999-4999-8999-999999999999",
    receivedAt: RECEIVED_AT,
    schemaVersion: 1,
  };
}

async function fulfillPreflight(route: Route): Promise<void> {
  await route.fulfill({
    status: 204,
    headers: { ...PREFLIGHT_HEADERS },
  });
}

async function openDemo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools = new Map<string, BrowserTool>();
    let execution = new AbortController();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: BrowserTool, options: { signal: AbortSignal }) {
          if (tools.has(tool.name)) throw new DOMException("Duplicate tool", "InvalidStateError");
          tools.set(tool.name, tool);
          options.signal.addEventListener("abort", () => tools.delete(tool.name), {
            once: true,
          });
        },
      },
    });
    window.filikaTest = {
      abort: () => execution.abort(),
      invoke(name, input) {
        const tool = tools.get(name);
        if (!tool) throw new Error("Tool missing");
        execution = new AbortController();
        this.outcome = tool.execute(input, { signal: execution.signal });
      },
      names: () => [...tools.keys()],
      outcome: null,
    };
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.Filika.status.state)).toBe("ready");
}

async function invokeFeedback(page: Page): Promise<void> {
  await page.evaluate((input) => window.filikaTest.invoke("filika_submit_feedback", input), draft);
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function reviewAndSend(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Review submission" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
}

test("invalid input surface shows the field error copy and recovers after editing", async ({
  page,
}) => {
  const posts: string[] = [];
  await page.route(FEEDBACK_ENDPOINT, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }
    posts.push(route.request().postData() ?? "");
    const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
    await route.fulfill({
      body: JSON.stringify(receipt(body.eventId, false)),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 201,
    });
  });

  await openDemo(page);
  await invokeFeedback(page);
  await page.locator("#filika-expected-behavior").fill("x".repeat(2500));
  await reviewAndSend(page);

  await expect(page.getByRole("heading", { name: "Check the report" })).toBeVisible();
  await expect(page.locator("#filika-feedback-status")).toContainText(
    "Submission rejected due to invalid input.",
  );
  expect(posts).toHaveLength(0);

  await page.getByRole("button", { name: "Edit report" }).click();
  await expect(page.getByRole("heading", { name: "Review feedback" })).toBeVisible();
  await page.locator("#filika-expected-behavior").fill("A short expected behavior.");
  await reviewAndSend(page);

  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("submitting surface stays visible while the collector responds, then shows the receipt", async ({
  page,
}) => {
  const release = Promise.withResolvers<void>();
  await page.route(FEEDBACK_ENDPOINT, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }
    await release.promise;
    const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
    await route.fulfill({
      body: JSON.stringify(receipt(body.eventId, false)),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 201,
    });
  });

  await openDemo(page);
  await invokeFeedback(page);
  await reviewAndSend(page);

  await expect(page.getByRole("heading", { name: "Submitting feedback" })).toBeVisible();
  await expect(page.locator(".spinner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();

  release.resolve();
  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
});

test("not accepted surface follows a documented collector rejection and recovers after editing", async ({
  page,
}) => {
  let posts = 0;
  await page.route(FEEDBACK_ENDPOINT, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }
    posts++;
    if (posts === 1) {
      await route.fulfill({
        body: JSON.stringify({ code: "collector_rejected" }),
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        status: 400,
      });
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
    await route.fulfill({
      body: JSON.stringify(receipt(body.eventId, false)),
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      status: 201,
    });
  });

  await openDemo(page);
  await invokeFeedback(page);
  await reviewAndSend(page);

  await expect(page.getByRole("heading", { name: "Feedback not accepted" })).toBeVisible();
  await expect(page.locator("#filika-feedback-status")).toContainText("Feedback not accepted.");
  await expect(page.getByRole("dialog")).toContainText(
    "The collector did not accept this report. Review the fields before trying again.",
  );
  expect(posts).toBe(1);

  await page.getByRole("button", { name: "Edit report" }).click();
  await expect(page.getByRole("heading", { name: "Review feedback" })).toBeVisible();
  await page.locator("#filika-kind").selectOption("idea");
  await reviewAndSend(page);

  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  expect(posts).toBe(2);
});

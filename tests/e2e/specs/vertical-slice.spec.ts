import type {
  FilikaExecutionOutcome,
  FilikaFeedbackEnvelopeV1,
  FilikaPublicApi,
  FilikaReceiptV1,
} from "@filika/sdk";
import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    Filika: FilikaPublicApi;
    filikaTest: {
      invoke(name: string, input: unknown): void;
      names(): string[];
      abort(): void;
      outcome: Promise<unknown> | null;
    };
  }
}

const endpoint = "http://localhost:8787/api/v1/feedback";
const draft = {
  kind: "bug",
  title: "Sample draft save conflict",
  description: "The sample save task reported a conflict.",
  reproductionSteps: ["Run sample task", "Observe conflict"],
};

async function openDemo(page: Page, supported = true) {
  await page.route("https://fonts.**/*", (route) => route.abort());
  await page.addInitScript((supported) => {
    type Tool = {
      name: string;
      execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown>;
    };
    const tools = new Map<string, Tool>();
    let execution = new AbortController();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: supported
        ? {
            registerTool(tool: Tool, options: { signal: AbortSignal }) {
              if (tools.has(tool.name))
                throw new DOMException("Duplicate tool", "InvalidStateError");
              tools.set(tool.name, tool);
              options.signal.addEventListener("abort", () => tools.delete(tool.name), {
                once: true,
              });
            },
          }
        : undefined,
    });
    window.filikaTest = {
      outcome: null,
      names: () => [...tools.keys()],
      abort: () => execution.abort(),
      invoke(name, input) {
        const tool = tools.get(name);
        if (!tool) throw new Error("Tool missing");
        execution = new AbortController();
        this.outcome = tool.execute(input, { signal: execution.signal });
      },
    };
  }, supported);
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.Filika.status.state))
    .toBe(supported ? "ready" : "unsupported_browser");
}

async function invokeFeedback(page: Page) {
  await page.evaluate((input) => window.filikaTest.invoke("filika_submit_feedback", input), draft);
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("sample failure -> reviewed tool submission -> real persisted inbox record", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const sent: FilikaFeedbackEnvelopeV1[] = [];
  page.on("request", (request) => {
    if (request.url() === endpoint && request.method() === "POST")
      sent.push(request.postDataJSON() as FilikaFeedbackEnvelopeV1);
  });
  await openDemo(page);
  await expect
    .poll(() => page.evaluate(() => window.filikaTest.names().sort()))
    .toEqual(["filika_demo_save_draft", "filika_submit_feedback"]);
  await page.evaluate(() => window.filikaTest.invoke("filika_demo_save_draft", {}));
  await expect(page.getByText("Sample save failed", { exact: true })).toBeVisible();
  await invokeFeedback(page);
  await page
    .getByLabel("Summary (required)", { exact: true })
    .fill("Reviewed sample save conflict");
  await page.getByRole("button", { name: "Remove page", exact: true }).click();
  expect(sent).toHaveLength(0);
  await page.getByRole("button", { name: "Review submission" }).click();
  await expect(page.getByRole("dialog")).toContainText("http://localhost:8787");
  expect(sent).toHaveLength(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  const result = (await page.evaluate(() => window.filikaTest.outcome)) as FilikaExecutionOutcome;
  expect(result.code).toBe("success");
  if (result.code !== "success") throw new Error("Expected receipt");
  expect(sent).toHaveLength(1);
  expect(sent[0]?.feedback.title).toBe("Reviewed sample save conflict");
  expect(sent[0]?.context).not.toHaveProperty("routeLabel");
  expect(sent[0]?.context.applicationRelease).toBe("demo-2026.08");
  const detail = await request.get(
    `http://localhost:8787/api/v1/inbox/${result.receipt.feedbackId}`,
  );
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({
    feedback: {
      feedbackId: result.receipt.feedbackId,
      title: "Reviewed sample save conflict",
      reproductionSteps: draft.reproductionSteps,
      routeLabel: null,
      applicationRelease: "demo-2026.08",
      requestOrigin: "http://localhost:4173",
      source: "web_sdk_unverified",
    },
  });
  const list = await request.get("http://localhost:8787/api/v1/inbox?limit=50");
  expect((await list.json()).items).toEqual(
    expect.arrayContaining([expect.objectContaining({ feedbackId: result.receipt.feedbackId })]),
  );
  await expect(page.locator(".filika-receipt-toast")).toContainText(result.receipt.feedbackId);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "View in inbox", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reviewed sample save conflict", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(result.receipt.feedbackId);
  expect(errors).toEqual([]);
});

test("lost response retries the original event and receives a duplicate receipt", async ({
  page,
  request,
}) => {
  await openDemo(page);
  let original: FilikaReceiptV1 | null = null;
  const bodies: string[] = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    bodies.push(route.request().postData() ?? "");
    const response = await route.fetch();
    if (bodies.length === 1) {
      original = (await response.json()) as FilikaReceiptV1;
      await route.abort();
    } else {
      await route.fulfill({ response });
    }
  });
  await invokeFeedback(page);
  await page.getByRole("button", { name: "Review submission" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Submission status unknown" })).toBeVisible();
  expect(await page.evaluate(() => window.filikaTest.outcome)).toEqual({ code: "outcome_unknown" });
  expect(bodies).toHaveLength(1);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Already received" })).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  const receipt = original as FilikaReceiptV1 | null;
  if (!receipt) throw new Error("First receipt missing");
  await expect(page.getByRole("dialog")).toContainText(receipt.feedbackId);
  await expect(page.getByRole("dialog")).toContainText(receipt.receivedAt);
  const list = await request.get("http://localhost:8787/api/v1/inbox?limit=50");
  const matching = (await list.json()).items.filter(
    (item: { feedbackId: string }) => item.feedbackId === receipt.feedbackId,
  );
  expect(matching).toHaveLength(1);
});

test("cancel and abort during review do not send feedback", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await openDemo(page);
  await invokeFeedback(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate(() => window.filikaTest.outcome)).toEqual({ code: "cancelled" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await invokeFeedback(page);
  await page.evaluate(() => window.filikaTest.abort());
  await expect(page.getByRole("heading", { name: "Submission stopped" })).toBeVisible();
  expect(await page.evaluate(() => window.filikaTest.outcome)).toEqual({ code: "aborted" });
  expect(posts).toEqual([]);
});

test("manual feedback uses the same SDK without WebMCP", async ({ page }) => {
  await openDemo(page, false);
  await page.getByRole("button", { name: "Send feedback", exact: true }).click();
  await page.getByLabel("Feedback type (required)", { exact: true }).selectOption("idea");
  await page.getByLabel("Summary (required)", { exact: true }).fill("Manual feedback path");
  await page
    .getByLabel("What happened? (required)", { exact: true })
    .fill("The manual review path works without WebMCP.");
  await page.getByRole("button", { name: "Review submission" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
});

test("expired review requires a fresh confirmation before sending", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await openDemo(page);
  await page.clock.install();
  await invokeFeedback(page);
  await page.clock.fastForward(120_001);
  await expect(page.getByRole("heading", { name: "Review timed out" })).toBeVisible();
  expect(await page.evaluate(() => window.filikaTest.outcome)).toEqual({ code: "timeout" });
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Edit report", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review feedback" })).toBeVisible();
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Review submission" }).click();
  expect(posts).toEqual([]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  expect(posts).toEqual([endpoint]);
});

import type { FilikaPublicApi } from "@filika/sdk";
import { expect, type Page, test } from "@playwright/test";

interface BrowserTool {
  name: string;
  execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown>;
}

declare global {
  interface Window {
    Filika: FilikaPublicApi;
    filikaTest: {
      invoke(name: string, input: unknown): void;
      names(): string[];
      outcome: Promise<unknown> | null;
    };
  }
}

const FEEDBACK_ENDPOINT = "http://localhost:8787/api/v1/feedback";

const draft = {
  kind: "bug",
  title: "Sample draft save conflict",
  description: "The sample save task reported a conflict.",
  reproductionSteps: ["Run sample task", "Observe conflict"],
};

const HOSTILE_FIXTURES = [
  { fixture: "hostile-css.html", label: "standard hostile host CSS" },
  { fixture: "hostile-css-advanced.html", label: "advanced hostile host CSS" },
] as const;

async function openFixture(page: Page, fixture: string): Promise<void> {
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
  await page.goto(`/fixtures/${fixture}`);
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status.state ?? "missing"))
    .toBe("ready");
  await expect
    .poll(() => page.evaluate(() => window.filikaTest.names().sort()))
    .toEqual(["filika_demo_save_draft", "filika_submit_feedback"]);
}

for (const { fixture, label } of HOSTILE_FIXTURES) {
  test(`real SDK dialog stays usable on the ${label} fixture`, async ({ page }) => {
    await page.route(FEEDBACK_ENDPOINT, async (route) => {
      if (route.request().method() === "OPTIONS") {
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
      const body = JSON.parse(route.request().postData() ?? "null") as { eventId: string };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        body: JSON.stringify({
          duplicate: false,
          eventId: body.eventId,
          feedbackId: "44444444-4444-4444-8444-444444444444",
          receivedAt: "2026-08-28T18:00:00.000Z",
          schemaVersion: 1,
        }),
      });
    });

    await openFixture(page, fixture);
    await page.evaluate(
      (input) => window.filikaTest.invoke("filika_submit_feedback", input),
      draft,
    );

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await page.locator("#filika-feedback-dialog").boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
    expect(box?.height ?? 0).toBeGreaterThan(200);

    await expect(page.locator("#filika-title")).toBeVisible();
    await expect(page.locator("#filika-description")).toBeVisible();
    await expect(page.locator("#filika-review")).toBeVisible();

    await page.locator("#filika-title").fill("Edited under hostile CSS");
    await page.getByRole("button", { name: "Review submission" }).click();
    await expect(page.getByRole("heading", { name: "Confirm submission" })).toBeVisible();
    await dialog.getByRole("button", { name: "Send feedback", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Feedback received", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".filika-receipt-toast")).toContainText(
      "44444444-4444-4444-8444-444444444444",
    );
    expect(await page.evaluate(() => window.filikaTest.outcome)).toEqual(
      expect.objectContaining({ code: "success" }),
    );
  });
}

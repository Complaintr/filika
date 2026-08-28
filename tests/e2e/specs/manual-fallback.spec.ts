import type { FilikaPublicApi } from "@filika/sdk";
import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    Filika: FilikaPublicApi;
  }
}

const FEEDBACK_ID = "33333333-3333-4333-8333-333333333333";
const RECEIVED_AT = "2026-08-28T17:00:00.000Z";

async function routeCollectorAndInbox(page: Page): Promise<{ posts(): number }> {
  let postCount = 0;
  await page.route("http://localhost:8787/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
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
      const body = JSON.parse(request.postData() ?? "null") as { eventId: string };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        body: JSON.stringify({
          duplicate: false,
          eventId: body.eventId,
          feedbackId: FEEDBACK_ID,
          receivedAt: RECEIVED_AT,
          schemaVersion: 1,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      body: JSON.stringify({
        feedback: {
          applicationRelease: null,
          description: "The manual path works end to end.",
          expectedBehavior: null,
          expiresAt: "2026-08-29T17:00:00.000Z",
          feedbackId: FEEDBACK_ID,
          kind: pathname.startsWith("/api/v1/inbox/") ? "idea" : "bug",
          receivedAt: RECEIVED_AT,
          reproductionSteps: null,
          requestOrigin: "http://localhost:4173",
          routeLabel: null,
          source: "web_sdk_unverified",
          title: "Manual journey without WebMCP",
        },
      }),
    });
  });
  return { posts: () => postCount };
}

async function waitForUnsupported(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status.state ?? "missing"))
    .toBe("unsupported_browser");
  await expect(page.locator("#webmcp-status")).toContainText(
    "WebMCP unavailable. Manual feedback is ready.",
  );
}

async function fillManualReport(page: Page): Promise<void> {
  await page.getByLabel("Feedback type (required)", { exact: true }).selectOption("idea");
  await page.getByLabel("Summary (required)", { exact: true }).fill("Manual journey without WebMCP");
  await page
    .getByLabel("What happened? (required)", { exact: true })
    .fill("The manual path works end to end.");
}

test("manual button completes the full journey to the inbox detail without WebMCP", async ({
  page,
}) => {
  const collector = await routeCollectorAndInbox(page);

  await page.goto("/");
  await waitForUnsupported(page);

  await page.getByRole("button", { name: "Send feedback", exact: true }).click();
  await fillManualReport(page);
  await page.getByRole("button", { name: "Review submission" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: "Feedback received", exact: true }),
  ).toBeVisible();
  expect(collector.posts()).toBe(1);

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "View in inbox", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Manual journey without WebMCP", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-view="inbox-detail"]')).toContainText(FEEDBACK_ID);
  await expect(page.getByRole("heading", { name: "Report content" })).toBeVisible();
});

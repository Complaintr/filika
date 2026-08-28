import { expect, type Locator, type Page, test } from "@playwright/test";

const FEEDBACK_ID = "55555555-5555-4555-8555-555555555555";
const RECEIVED_AT = "2026-08-28T19:00:00.000Z";

const LONG_TITLE = "t".repeat(160);
const LONG_DESCRIPTION = "d".repeat(4000);
const LONG_EXPECTED = "e".repeat(2000);
const LONG_STEPS = Array.from({ length: 10 }, (_, index) => `${index}${"s".repeat(289)}`).join(
  "\n",
);

async function routeCollectorAndInbox(page: Page): Promise<void> {
  await page.route("http://localhost:4173/**", async (route) => {
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
    if (pathname === "/api/v1/inbox") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        body: JSON.stringify({
          items: [
            {
              feedbackId: FEEDBACK_ID,
              kind: "bug",
              receivedAt: RECEIVED_AT,
              requestOrigin: "http://localhost:4173",
              routeLabel: null,
              title: LONG_TITLE,
            },
          ],
          nextCursor: null,
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
          description: LONG_DESCRIPTION,
          expectedBehavior: LONG_EXPECTED,
          expiresAt: "2026-08-29T19:00:00.000Z",
          feedbackId: FEEDBACK_ID,
          kind: "bug",
          receivedAt: RECEIVED_AT,
          reproductionSteps: LONG_STEPS.split("\n"),
          requestOrigin: "http://localhost:4173",
          routeLabel: null,
          source: "web_sdk_unverified",
          title: LONG_TITLE,
        },
      }),
    });
  });
}

async function expectNotClipped(locator: Locator): Promise<void> {
  const metrics = await locator.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    textOverflow: getComputedStyle(node).textOverflow,
  }));
  expect(metrics.textOverflow).not.toBe("ellipsis");
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test("long but valid report content stays readable through review, receipt, and inbox", async ({
  page,
}) => {
  await routeCollectorAndInbox(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Send feedback", exact: true }).click();
  await page.getByLabel("Feedback type (required)", { exact: true }).selectOption("bug");
  await page.getByLabel("Summary (required)", { exact: true }).fill(LONG_TITLE);
  await page.getByLabel("What happened? (required)", { exact: true }).fill(LONG_DESCRIPTION);
  await page.getByLabel("Expected behavior (optional)", { exact: true }).fill(LONG_EXPECTED);
  await page.getByLabel("Steps to reproduce (optional)", { exact: true }).fill(LONG_STEPS);
  await page.getByRole("button", { name: "Review submission" }).click();

  const reviewValues = await page
    .locator(".review-list dd")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
  expect(reviewValues).toContain(LONG_TITLE);
  expect(reviewValues).toContain(LONG_DESCRIPTION);
  expect(reviewValues).toContain(LONG_EXPECTED);
  expect(reviewValues).toContain(LONG_STEPS);

  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  await expect(page.locator(".filika-receipt-toast")).toContainText(FEEDBACK_ID);
  await expect(page.locator(".filika-receipt-toast")).not.toContainText(LONG_TITLE);

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "View in inbox", exact: true }).click();

  const detail = page.locator('[data-view="inbox-detail"]');
  await expect(detail.getByRole("heading", { level: 1 })).toHaveText(LONG_TITLE);
  const description = detail.locator("dd", { hasText: "d".repeat(400) }).first();
  await expect(description).toHaveText(LONG_DESCRIPTION);
  await expect(detail).toContainText(LONG_STEPS);
  await expectNotClipped(detail.getByRole("heading", { level: 1 }));
  await expectNotClipped(description);

  await page.getByRole("button", { name: "Back to inbox" }).click();
  const listTitle = page.locator('[data-view="inbox-list"] h2').first();
  await expect(listTitle).toHaveText(LONG_TITLE);
  await expectNotClipped(listTitle);
});

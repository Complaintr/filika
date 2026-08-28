import { expect, type Page, type Route, test } from "@playwright/test";

const INBOX_BASE = "http://localhost:8787/api/v1/inbox";
const FEEDBACK_ID = "11111111-1111-4111-8111-111111111111";
const RECEIVED_AT = "2026-08-28T15:00:00.000Z";

const listItem = {
  feedbackId: FEEDBACK_ID,
  kind: "bug",
  receivedAt: RECEIVED_AT,
  requestOrigin: "http://localhost:4173",
  routeLabel: "Sample task",
  title: "Sample save failed",
};

async function fulfillJson(
  route: Route,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
    body: JSON.stringify(body),
  });
}

async function openInbox(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
}

test("inbox shows the loading surface while fetching, then the empty surface", async ({ page }) => {
  const release = Promise.withResolvers<void>();
  await page.route(`${INBOX_BASE}*`, async (route) => {
    await release.promise;
    await fulfillJson(route, 200, { items: [], nextCursor: null });
  });

  await openInbox(page);
  await expect(page.getByRole("heading", { name: "Loading" })).toBeVisible();
  await expect(page.locator('[data-state="loading"]')).toHaveAttribute("role", "status");

  release.resolve();
  await expect(page.getByRole("heading", { name: "No feedback yet" })).toBeVisible();
  await expect(page.locator('[data-state="empty"]')).toHaveAttribute("role", "status");
  await expect(page.locator('[data-view="inbox-list"]')).toContainText(
    "Accepted feedback will appear here.",
  );
});

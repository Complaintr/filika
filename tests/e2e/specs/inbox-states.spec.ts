import { expect, type Page, type Route, test } from "@playwright/test";

const INBOX_BASE = "http://localhost:4173/api/v1/inbox";
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
  await page.route(`${INBOX_BASE}**`, async (route) => {
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

test("inbox shows the load failure surface and recovers through retry", async ({ page }) => {
  let attempts = 0;
  await page.route(`${INBOX_BASE}**`, async (route) => {
    attempts++;
    if (attempts === 1) {
      await fulfillJson(route, 500, { code: "internal_error" });
      return;
    }
    await fulfillJson(route, 200, { items: [listItem], nextCursor: null });
  });

  await openInbox(page);
  await expect(page.getByRole("heading", { name: "Unable to load feedback" })).toBeVisible();
  await expect(page.locator('[data-state="error"]')).toHaveAttribute("role", "alert");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Sample save failed" })).toBeVisible();
  await expect(page.getByRole("list")).toHaveAccessibleName("Accepted feedback");
  expect(attempts).toBe(2);
});

test("inbox detail shows the not found surface and returns to the list", async ({ page }) => {
  await page.route(`${INBOX_BASE}**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/v1/inbox") {
      await fulfillJson(route, 200, { items: [listItem], nextCursor: null });
      return;
    }
    await fulfillJson(route, 404, { code: "not_found" });
  });

  await openInbox(page);
  await page.getByRole("button", { name: "View feedback" }).click();

  await expect(page.getByRole("heading", { name: "Feedback detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Feedback not found" })).toBeVisible();
  await expect(page.locator('[data-state="not_found"]')).toHaveAttribute("role", "status");

  await page.getByRole("button", { name: "Back to inbox" }).click();
  await expect(page.getByRole("heading", { name: "Sample save failed" })).toBeVisible();
});

test("inbox detail shows the expired surface with the expiration timestamp", async ({ page }) => {
  const EXPIRED_AT = "2000-01-01T00:00:00.000Z";
  await page.route(`${INBOX_BASE}**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/v1/inbox") {
      await fulfillJson(route, 200, { items: [listItem], nextCursor: null });
      return;
    }
    await fulfillJson(route, 200, {
      feedback: {
        applicationRelease: null,
        description: "The sample save failed.",
        expectedBehavior: null,
        expiresAt: EXPIRED_AT,
        feedbackId: FEEDBACK_ID,
        kind: "bug",
        receivedAt: RECEIVED_AT,
        reproductionSteps: null,
        requestOrigin: "http://localhost:4173",
        routeLabel: null,
        source: "web_sdk_unverified",
        title: "Sample save failed",
      },
    });
  });

  await openInbox(page);
  await page.getByRole("button", { name: "View feedback" }).click();

  await expect(page.getByRole("heading", { name: "Feedback detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Feedback expired" })).toBeVisible();
  await expect(page.locator('[data-state="expired"]')).toHaveAttribute("role", "status");
  await expect(page.locator('[data-view="inbox-detail"]')).toContainText(
    `Expired at ${EXPIRED_AT}`,
  );
});

import { expect, type Page, type Route, test } from "@playwright/test";

const FEEDBACK_ID = "11111111-1111-4111-8111-111111111111";

const listItem = {
  feedbackId: FEEDBACK_ID,
  kind: "bug",
  receivedAt: "2026-08-28T12:00:00.000Z",
  requestOrigin: "http://localhost:4173",
  routeLabel: "/checkout",
  title: "Checkout button missing",
};

const detailFeedback = {
  applicationRelease: "2026.08.1",
  description: "The checkout button does not appear on small screens.",
  expectedBehavior: "The checkout button should always be visible.",
  expiresAt: "2026-09-01T00:00:00.000Z",
  feedbackId: FEEDBACK_ID,
  kind: "bug",
  receivedAt: "2026-08-28T12:00:00.000Z",
  reproductionSteps: "Open the cart page.\nShrink the window.",
  requestOrigin: "http://localhost:4173",
  routeLabel: "/checkout",
  source: "web_sdk_unverified",
  title: "Checkout button missing",
};

async function routeInbox(page: Page, detail: (route: Route) => Promise<void>): Promise<void> {
  await page.route("**/api/v1/inbox**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/v1/inbox") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [listItem], nextCursor: null }),
      });
      return;
    }
    await detail(route);
  });
}

test("complaint detail shows the full report from the collector", async ({ page }) => {
  await routeInbox(page, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feedback: detailFeedback }),
    }),
  );
  await page.goto("/complaints");
  await page.getByRole("link", { name: "Checkout button missing" }).click();
  await expect(page.getByRole("heading", { name: "Checkout button missing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report content" })).toBeVisible();
  await expect(
    page.getByText("The checkout button does not appear on small screens."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Receipt details" })).toBeVisible();
  await expect(page.getByText(FEEDBACK_ID)).toBeVisible();
  await expect(page.locator('[data-untrusted="true"]').first()).toBeVisible();
});

test("complaint detail returns to the list from the back action", async ({ page }) => {
  await routeInbox(page, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feedback: detailFeedback }),
    }),
  );
  await page.goto("/complaints");
  await page.getByRole("link", { name: "Checkout button missing" }).click();
  await expect(page.getByRole("heading", { name: "Checkout button missing" })).toBeVisible();
  await page.getByRole("link", { name: "All complaints" }).click();
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
});

test("complaint detail shows the not found surface for a missing record", async ({ page }) => {
  await routeInbox(page, (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: '{"code":"not_found"}' }),
  );
  await page.goto("/complaints");
  await page.getByRole("link", { name: "Checkout button missing" }).click();
  await expect(page.getByRole("heading", { name: "Feedback not found" })).toBeVisible();
});

test("complaint detail shows the expired surface with the expiration timestamp", async ({
  page,
}) => {
  await routeInbox(page, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        feedback: { ...detailFeedback, expiresAt: "2000-01-01T00:00:00.000Z" },
      }),
    }),
  );
  await page.goto("/complaints");
  await page.getByRole("link", { name: "Checkout button missing" }).click();
  await expect(page.getByRole("heading", { name: "Feedback expired" })).toBeVisible();
  await expect(page.getByText("Expired at 2000-01-01T00:00:00.000Z")).toBeVisible();
});

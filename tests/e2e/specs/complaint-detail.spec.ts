import { expect, type Page, type Route, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

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
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
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
  await page.route("**/api/v1/apps/*/inbox**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/inbox")) {
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
  await signInAsE2eUser(page);
  await routeInbox(page, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feedback: detailFeedback }),
    }),
  );
  await page.goto("/complaints");
  await page.getByRole("button", { name: /^Checkout button missing/ }).click();
  await expect(page.getByRole("heading", { name: "Checkout button missing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What happened" })).toBeVisible();
  await expect(
    page.getByText("The checkout button does not appear on small screens."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report context" })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/complaints$/);
  await expect(page.getByText(FEEDBACK_ID)).toBeVisible();
  await expect(page.locator('[data-untrusted="true"]').first()).toBeVisible();
});

test("closing complaint details keeps the list and restores focus", async ({ page }) => {
  await signInAsE2eUser(page);
  await routeInbox(page, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feedback: detailFeedback }),
    }),
  );
  await page.goto("/complaints");
  await page.getByRole("button", { name: /^Checkout button missing/ }).click();
  await expect(page.getByRole("heading", { name: "Checkout button missing" })).toBeVisible();
  await page.getByRole("button", { name: "Close report" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Checkout button missing/ })).toBeFocused();
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
});

test("complaint detail shows the not found surface for a missing record", async ({ page }) => {
  await signInAsE2eUser(page);
  await routeInbox(page, (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: '{"code":"not_found"}' }),
  );
  await page.goto("/complaints");
  await page.getByRole("button", { name: /^Checkout button missing/ }).click();
  await expect(page.getByRole("heading", { name: "Feedback not found" })).toBeVisible();
});

test("complaint detail shows the expired surface with the expiration timestamp", async ({
  page,
}) => {
  await signInAsE2eUser(page);
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
  await page.getByRole("button", { name: /^Checkout button missing/ }).click();
  await expect(page.getByRole("heading", { name: "Feedback expired" })).toBeVisible();
  await expect(page.getByText("Expired at 2000-01-01T00:00:00.000Z")).toBeVisible();
});

test("complaint details retry a failed request and close with Escape", async ({ page }) => {
  await signInAsE2eUser(page);
  let attempts = 0;
  await routeInbox(page, async (route) => {
    attempts += 1;
    await route.fulfill(
      attempts === 1
        ? { status: 500, json: { code: "internal_error" } }
        : { json: { feedback: detailFeedback } },
    );
  });
  await page.goto("/complaints");
  const report = page.getByRole("button", { name: /^Checkout button missing/ });
  await report.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Unable to load feedback" })).toBeVisible();
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("heading", { name: "Checkout button missing" })).toBeVisible();
  expect(attempts).toBe(2);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(report).toBeFocused();
  await expect(page).toHaveURL(/\/complaints$/);
});

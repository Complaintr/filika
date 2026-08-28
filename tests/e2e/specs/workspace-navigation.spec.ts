import { expect, type Page, test } from "@playwright/test";

const navItem = (page: Page, label: string) =>
  page.locator(".bottom-nav-item", { hasText: label });
const connectionStatus = (page: Page) => page.locator(".connection-status");

async function openDashboard(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

test("workspace loads with a connected collector and three navigation destinations", async ({
  page,
}) => {
  await openDashboard(page);
  await expect(connectionStatus(page)).toContainText("Collector connected");
  await expect(navItem(page, "Dashboard")).toBeVisible();
  await expect(navItem(page, "Complaints")).toBeVisible();
  await expect(navItem(page, "Settings")).toBeVisible();
  await expect(page.getByRole("link", { name: "View complaints" })).toBeVisible();
});

test("complaints list is reachable from the dashboard and renders its empty state", async ({
  page,
}) => {
  await page.route("**/api/v1/inbox**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], nextCursor: null }),
    }),
  );
  await openDashboard(page);
  await navItem(page, "Complaints").click();
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No complaints yet" })).toBeVisible();
  await expect(connectionStatus(page)).toContainText("Collector connected");
});

test("settings is reachable and reports the connected collector", async ({ page }) => {
  await openDashboard(page);
  await navItem(page, "Settings").click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace preferences" })).toBeVisible();
  await expect(connectionStatus(page)).toContainText("Collector connected");
});

test("the collector connection status falls back to unavailable", async ({ page }) => {
  await page.route("**/api/v1/dashboard**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"code":"internal_error"}' }),
  );
  await page.goto("/");
  await expect(connectionStatus(page)).toContainText("Collector unavailable");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});
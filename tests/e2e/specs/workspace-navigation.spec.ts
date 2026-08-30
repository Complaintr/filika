import { expect, type Page, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

const navItem = (page: Page, label: string) => page.locator(".bottom-nav-item", { hasText: label });
const connectionStatus = (page: Page) => page.locator(".topbar .connection-status");

async function openDashboard(page: Page): Promise<void> {
  await signInAsE2eUser(page);
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
  await expect(page.getByRole("combobox", { name: "Dashboard date range" })).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: "Your next improvement starts here." }),
  ).toBeVisible();
  await expect(connectionStatus(page)).toContainText("Collector connected");
});

test("settings is reachable and reports the connected collector", async ({ page }) => {
  await openDashboard(page);
  await page.evaluate(() => {
    document.documentElement.dataset.navigationProbe = "preserved";
  });
  await navItem(page, "Settings").click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Settings sections" })).toBeVisible();
  await expect(connectionStatus(page)).toContainText("Collector connected");
  await expect(page.locator(".workspace-page")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.navigationProbe)).toBe(
    "preserved",
  );
  expect(
    await navItem(page, "Settings")
      .locator(".bottom-nav-label")
      .evaluate((label) => label.scrollWidth <= label.clientWidth),
  ).toBe(true);
  const [navigationBox, settingsBox] = await Promise.all([
    page.locator(".bottom-nav").boundingBox(),
    navItem(page, "Settings").boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  if (navigationBox && settingsBox) {
    expect(settingsBox.x + settingsBox.width).toBeLessThanOrEqual(
      navigationBox.x + navigationBox.width,
    );
  }
});

test("the collector connection status falls back to unavailable", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.route("**/api/v1/dashboard**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"code":"internal_error"}',
    }),
  );
  await page.goto("/");
  await expect(connectionStatus(page)).toContainText("Collector unavailable");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

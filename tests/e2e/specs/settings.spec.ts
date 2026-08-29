import { expect, type Page, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

const connectionStatus = (page: Page) => page.locator(".topbar .connection-status");
const saveStatus = (page: Page) => page.locator(".workspace-page .save-status");

test("settings preferences persist across reloads and update the brand name", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Workspace preferences" })).toBeVisible();

  const name = page.getByLabel("Workspace name");
  await name.fill("Alpha Team");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveStatus(page)).toContainText("Changes saved.");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Workspace name")).toHaveValue("Alpha Team");
  await expect(page.locator(".topbar .workspace-copy strong")).toHaveText("Alpha Team");

  await page.getByRole("button", { name: "Restore defaults" }).click();
  await expect(page.getByLabel("Workspace name")).toHaveValue("My workspace");
});

test("settings connection check reports a connected collector", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  await expect(connectionStatus(page)).toContainText("Collector connected");
  await expect(
    page.getByText(/Connected\. The collector and database are responding\./),
  ).toBeVisible();
  await expect(page.getByText("/api/v1/inbox")).toBeVisible();
});

test("settings connection check reports an unreachable collector", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.route("**/api/v1/dashboard**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"code":"internal_error"}',
    }),
  );
  await page.goto("/settings");
  await expect(connectionStatus(page)).toContainText("Collector unavailable");
  await expect(page.getByText(/Could not connect\./)).toBeVisible();
});

test("settings rejects a blank workspace name", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  const name = page.getByLabel("Workspace name");
  await name.fill("   ");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Workspace name")).toHaveValue("   ");
  await expect(saveStatus(page)).not.toContainText("Changes saved.");
});

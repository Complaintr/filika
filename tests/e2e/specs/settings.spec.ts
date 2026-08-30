import { expect, type Page, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

const connectionStatus = (page: Page) => page.locator(".topbar .connection-status");
const saveStatus = (page: Page) => page.locator(".settings-save-status");
const settingsSection = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("button", { name, exact: true });

test("settings preferences persist across reloads and update the workspace name", async ({
  page,
}) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  await expect(settingsSection(page, "Workspace")).toHaveAttribute("aria-current", "page");
  const name = page.getByLabel("Workspace name");
  await name.fill("Alpha Team");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveStatus(page)).toHaveText("Your changes are saved.");

  await page.reload();
  await expect(name).toHaveValue("Alpha Team");
  await expect(page.locator(".topbar .workspace-copy strong")).toHaveText("Alpha Team");
  await name.fill("Unsaved name");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(name).toHaveValue("Alpha Team");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

test("settings connection check reports a connected collector", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  await settingsSection(page, "Collector connection").click();
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(connectionStatus(page)).toContainText("Collector connected");
  await expect(
    page.getByText("The collector and database are responding.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("/api/v1/feedback", { exact: true })).toBeVisible();
});

test("settings connection check reports an unreachable collector", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.route("**/api/v1/dashboard**", (route) =>
    route.fulfill({ status: 500, json: { code: "internal_error" } }),
  );
  await page.goto("/settings");
  await settingsSection(page, "Collector connection").click();
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(connectionStatus(page)).toContainText("Collector unavailable");
  await expect(page.getByText(/Could not connect\. Check DATABASE_URL/)).toBeVisible();
});

test("settings rejects a blank workspace name", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.goto("/settings");
  const name = page.getByLabel("Workspace name");
  await name.fill("   ");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(saveStatus(page)).toHaveText("Enter a workspace name before saving.");
  await page.reload();
  await expect(name).toHaveValue("My workspace");
});

test("appearance exposes accessible light, dark, and system choices and persists them", async ({
  page,
}) => {
  await signInAsE2eUser(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  for (const theme of ["Dark", "Light", "System"]) {
    await settingsSection(page, "Appearance").click();
    const group = page.getByRole("group", { name: "Color theme" });
    await expect(group.getByRole("radio")).toHaveCount(3);
    await group.getByText(theme, { exact: true }).click();
    await expect(group.getByRole("radio", { name: theme, exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(saveStatus(page)).toHaveText("Your changes are saved.");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme === "Light" ? "light" : "dark",
    );
    await page.reload();
    await settingsSection(page, "Appearance").click();
    await expect(group.getByRole("radio", { name: theme, exact: true })).toBeChecked();
  }
});

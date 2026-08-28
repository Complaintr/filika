import { expect, test } from "@playwright/test";

test("demo page exposes accessible structure for navigation, tasks, and privacy", async ({
  page,
}) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation.getByRole("button", { name: "Demo" })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await expect(
    page.getByRole("heading", { name: "A small task with a useful failure." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirm the release checklist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm checklist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample draft is ready" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run sample task" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send feedback", exact: true })).toBeVisible();

  await expect(page.getByRole("radiogroup", { name: "Color theme" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Light theme" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Dark theme" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "System theme" })).toBeVisible();

  const notice = page.locator("#privacy");
  await expect(notice).toHaveAttribute("aria-labelledby", "privacy-notice-title");
  await expect(
    page.getByRole("heading", { name: "Privacy and Data Handling Notice" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Collected data" })).toBeVisible();

  await page.getByRole("button", { name: "Run sample task" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The sample draft could not be saved. Reset it and try again.",
  );
  await expect(page.getByRole("heading", { name: "Sample save failed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset sample" })).toBeVisible();

  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.locator('[data-failure-state="ready"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Run sample task" })).toBeVisible();
});

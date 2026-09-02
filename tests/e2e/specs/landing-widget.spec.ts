import { expect, test } from "@playwright/test";

test("landing dashboard opens feedback details and restores focus", async ({ page }) => {
  await page.goto("/");

  const report = page.getByRole("button", {
    name: "View feedback: Export button stops responding after filtering",
  });
  await report.click();

  const dialog = page.getByRole("dialog", {
    name: "Export button stops responding after filtering",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Export should download the currently filtered");
  await expect(dialog).toContainText("No data is sent");
  const widgetBounds = await page.getByLabel("Filika dashboard preview").boundingBox();
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(widgetBounds).not.toBeNull();
  expect(dialogBounds?.x ?? -1).toBeGreaterThanOrEqual(widgetBounds?.x ?? 0);
  expect(dialogBounds?.y ?? -1).toBeGreaterThanOrEqual(widgetBounds?.y ?? 0);
  expect((dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0)).toBeLessThanOrEqual(
    (widgetBounds?.x ?? 0) + (widgetBounds?.width ?? 0),
  );
  expect((dialogBounds?.y ?? 0) + (dialogBounds?.height ?? 0)).toBeLessThanOrEqual(
    (widgetBounds?.y ?? 0) + (widgetBounds?.height ?? 0),
  );

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(report).toBeFocused();
});

test("landing dashboard fits mobile, follows dark theme, and reduces motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");

  await page.getByRole("button", { name: "Light theme" }).click();
  const dashboard = page.getByLabel("Filika dashboard preview");
  await expect(dashboard).toHaveCSS("background-color", "rgb(23, 23, 26)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const report = page.getByRole("button", {
    name: "View feedback: Allow reports to be duplicated",
  });
  await report.hover();
  await expect(report).toHaveCSS("transform", "none");
  await report.click();

  const dialog = page.getByRole("dialog", { name: "Allow reports to be duplicated" });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

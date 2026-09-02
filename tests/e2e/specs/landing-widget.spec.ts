import { expect, test } from "@playwright/test";

test("landing dashboard opens feedback details and restores focus", async ({ page }) => {
  await page.goto("/");

  const report = page.getByRole("button", {
    name: "View feedback: Payment form resets after validation",
  });
  await report.click();

  const dialog = page.getByRole("dialog", { name: "Payment form resets after validation" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Only the invalid card number should be cleared");
  await expect(dialog).toContainText("No data is sent");

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
    name: "View feedback: Add a digest frequency option",
  });
  await report.hover();
  await expect(report).toHaveCSS("transform", "none");
  await report.click();

  const dialog = page.getByRole("dialog", { name: "Add a digest frequency option" });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

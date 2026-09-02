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

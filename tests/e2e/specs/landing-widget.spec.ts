import { expect, test } from "@playwright/test";

test("landing dashboard filters complaints, opens details, and restores focus", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const demoRequests: string[] = [];
  page.on("request", (request) => demoRequests.push(request.url()));

  const category = page.getByRole("button", { name: "View Bug report complaints" });
  await category.click();
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Bugs" })).toHaveAttribute("aria-pressed", "true");

  const report = page.getByRole("button", {
    name: "View feedback: Export button stops responding after filtering",
  });
  await report.click();

  const dialog = page.getByRole("dialog", {
    name: "Export button stops responding after filtering",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Export should download the currently filtered");
  await expect(dialog).toContainText("Read-only feedback. External content is untrusted.");
  // Measure both boxes in one pass: the landing page scrolls smoothly, so
  // separate boundingBox() calls can capture different scroll positions.
  const bounds = await page.evaluate(() => {
    const widget = document.querySelector('section[aria-label="Filika dashboard preview"]');
    const feedbackDialog = document.querySelector(
      'section[aria-label="Filika dashboard preview"] dialog',
    );
    if (!widget || !feedbackDialog) {
      throw new Error("Dashboard preview widget or feedback dialog is missing.");
    }
    const widgetBox = widget.getBoundingClientRect();
    const dialogBox = feedbackDialog.getBoundingClientRect();
    return {
      dialog: { x: dialogBox.x, y: dialogBox.y, width: dialogBox.width, height: dialogBox.height },
      widget: {
        x: widgetBox.x,
        y: widgetBox.y,
        width: widgetBox.width,
        height: widgetBox.height,
      },
    };
  });
  expect(bounds.dialog.x).toBeGreaterThanOrEqual(bounds.widget.x);
  expect(bounds.dialog.y).toBeGreaterThanOrEqual(bounds.widget.y);
  expect(bounds.dialog.x + bounds.dialog.width).toBeLessThanOrEqual(
    bounds.widget.x + bounds.widget.width,
  );
  expect(bounds.dialog.y + bounds.dialog.height).toBeLessThanOrEqual(
    bounds.widget.y + bounds.widget.height,
  );

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(report).toBeFocused();

  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(category).toBeFocused();
  expect(new URL(page.url()).pathname).toBe("/");
  expect(demoRequests).toEqual([]);
});

test("landing dashboard fits mobile, follows dark theme, and reduces motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.keyboard.press("Escape");
  const dashboard = page.getByLabel("Filika dashboard preview");
  await expect(dashboard).toHaveCSS("background-color", "rgb(21, 21, 23)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const report = page.getByRole("button", {
    name: "View feedback: Allow reports to be duplicated",
  });
  await page.getByRole("button", { name: "View Idea complaints" }).click();
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

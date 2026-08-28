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

async function focusedDialogId(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.querySelector("#filika-feedback-root")?.shadowRoot;
    return root?.activeElement instanceof HTMLElement ? root.activeElement.id : null;
  });
}

test("review dialog associates labels, errors, and focus across edit and confirm surfaces", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Send feedback", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#filika-feedback-dialog")).toHaveAttribute(
    "aria-labelledby",
    "filika-feedback-title",
  );
  await expect(page.locator("#filika-feedback-dialog")).toHaveAttribute(
    "aria-describedby",
    "filika-feedback-description",
  );
  await expect(page.getByRole("heading", { name: "Review feedback" })).toBeVisible();

  await expect(page.getByLabel("Feedback type (required)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Summary (required)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("What happened? (required)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Expected behavior (optional)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Steps to reproduce (optional)", { exact: true })).toBeVisible();

  await expect(page.locator("#filika-feedback-status")).toHaveAttribute("role", "status");
  await expect(page.locator("#filika-feedback-status")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#filika-feedback-status")).toContainText("Feedback review form ready.");

  await page.getByRole("button", { name: "Review submission" }).click();
  await expect(page.locator("#filika-feedback-errors")).toHaveAttribute("role", "alert");
  await expect(page.locator("#filika-feedback-errors")).toContainText("Check the following fields:");
  await expect(page.locator("#filika-kind")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#filika-title")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#filika-description")).toHaveAttribute("aria-invalid", "true");
  await expect.poll(() => focusedDialogId(page)).toBe("filika-kind");

  await page.locator("#filika-feedback-errors a", { hasText: "Summary" }).click();
  await expect.poll(() => focusedDialogId(page)).toBe("filika-title");

  await page.getByLabel("Feedback type (required)", { exact: true }).selectOption("bug");
  await page.getByLabel("Summary (required)", { exact: true }).fill("Accessible review pass");
  await page
    .getByLabel("What happened? (required)", { exact: true })
    .fill("Labels and errors are associated.");
  await page.getByRole("button", { name: "Review submission" }).click();
  await expect(page.getByRole("heading", { name: "Confirm submission" })).toBeVisible();

  await page.getByRole("button", { name: "Edit report" }).click();
  await expect(page.getByRole("heading", { name: "Review feedback" })).toBeVisible();
  await expect(page.locator("#filika-title")).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#filika-feedback-errors")).not.toContainText(
    "Check the following fields:",
  );
  await page.getByRole("button", { name: "Review submission" }).click();

  await expect(page.getByRole("heading", { name: "Confirm submission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Destination and privacy" })).toBeVisible();
  await expect(dialog).toContainText("filika-demo");
  await expect(dialog).toContainText("http://localhost:8787");
  await expect(dialog).toContainText("SDK version");
  await expect(page.getByRole("link", { name: "Read the privacy notice" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Feedback canceled" })).toBeVisible();
});

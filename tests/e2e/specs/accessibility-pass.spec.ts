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
  await expect(page.locator("#filika-feedback-status")).toContainText(
    "Feedback review form ready.",
  );

  await page.getByRole("button", { name: "Review submission" }).click();
  await expect(page.locator("#filika-feedback-errors")).toHaveAttribute("role", "alert");
  await expect(page.locator("#filika-feedback-errors")).toContainText(
    "Check the following fields:",
  );
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
  await expect(dialog).toContainText("http://localhost:4173");
  await expect(dialog).toContainText("SDK version");
  await expect(page.getByRole("link", { name: "Read the privacy notice" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Feedback canceled" })).toBeVisible();
});

test("receipt toast and inbox surfaces keep accessible roles and names", async ({ page }) => {
  const FEEDBACK_ID = "22222222-2222-4222-8222-222222222222";
  const RECEIVED_AT = "2026-08-28T16:00:00.000Z";
  await page.route("http://localhost:4173/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Origin": "http://localhost:4173",
          Vary: "Origin",
        },
      });
      return;
    }
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "null") as { eventId: string };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        body: JSON.stringify({
          duplicate: false,
          eventId: body.eventId,
          feedbackId: FEEDBACK_ID,
          receivedAt: RECEIVED_AT,
          schemaVersion: 1,
        }),
      });
      return;
    }
    if (pathname === "/api/v1/inbox") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
        body: JSON.stringify({
          items: [
            {
              feedbackId: FEEDBACK_ID,
              kind: "idea",
              receivedAt: RECEIVED_AT,
              requestOrigin: "http://localhost:4173",
              routeLabel: "Sample task",
              title: "Accessible inbox record",
            },
          ],
          nextCursor: null,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:4173" },
      body: JSON.stringify({
        feedback: {
          applicationRelease: "demo-2026.08",
          description: "Rendered with clear semantics.",
          expectedBehavior: null,
          expiresAt: "2026-08-29T16:00:00.000Z",
          feedbackId: FEEDBACK_ID,
          kind: "idea",
          receivedAt: RECEIVED_AT,
          reproductionSteps: null,
          requestOrigin: "http://localhost:4173",
          routeLabel: "Sample task",
          source: "web_sdk_unverified",
          title: "Accessible inbox record",
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Send feedback", exact: true }).click();
  await page.getByLabel("Feedback type (required)", { exact: true }).selectOption("idea");
  await page.getByLabel("Summary (required)", { exact: true }).fill("Accessible inbox record");
  await page
    .getByLabel("What happened? (required)", { exact: true })
    .fill("Rendered with clear semantics.");
  await page.getByRole("button", { name: "Review submission" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();

  await expect(page.getByRole("heading", { name: "Feedback received", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(FEEDBACK_ID);

  const toast = page.locator(".filika-receipt-toast");
  await expect(toast).toHaveAttribute("role", "status");
  await expect(toast).toHaveAttribute("aria-live", "polite");
  await expect(toast).toHaveAttribute("data-duplicate", "false");
  await expect(page.getByRole("button", { name: "Dismiss notification" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View in inbox", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "View in inbox", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Accessible inbox record" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report content" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Host-supplied context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Server-derived facts" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("treated as untrusted data");
  await expect(page.locator('[data-view="inbox-detail"]')).toContainText(FEEDBACK_ID);
  await expect(page.getByRole("button", { name: "Back to inbox" })).toBeVisible();

  await page.getByRole("button", { name: "Back to inbox" }).click();
  await expect(page.getByRole("heading", { name: "Feedback inbox" })).toBeVisible();
  await expect(page.getByRole("list")).toHaveAccessibleName("Accepted feedback");
  await expect(page.getByRole("heading", { name: "Accessible inbox record" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View feedback" })).toBeVisible();
});

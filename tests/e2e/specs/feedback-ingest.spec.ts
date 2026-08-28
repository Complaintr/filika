import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

async function submitFeedback(
  page: Page,
  eventId: string,
  title = "Checkout button missing on small screens",
): Promise<Awaited<ReturnType<Page["request"]["post"]>>> {
  const response = await page.request.post("http://localhost:4173/api/v1/feedback", {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": eventId,
      Origin: "http://localhost:4173",
    },
    data: {
      schemaVersion: 1,
      projectKey: "filika-demo",
      eventId,
      feedback: {
        kind: "bug",
        title,
        description: "The checkout button disappears when the window is narrow.",
        expectedBehavior: "The checkout button should always remain visible.",
        reproductionSteps: ["Open the cart page", "Shrink the window"],
      },
      context: {
        sdkVersion: "0.0.0",
        routeLabel: "/checkout",
        applicationRelease: "2026.08.1",
      },
    },
  });
  expect(response.ok()).toBe(true);
  return response;
}

test("a confirmed report is stored and visible in the complaints inbox", async ({ page }) => {
  const eventId = randomUUID();
  const title = `Checkout button missing ${randomUUID()}`;
  const response = await submitFeedback(page, eventId, title);
  const receipt = (await response.json()) as {
    feedbackId: string;
    receivedAt: string;
    schemaVersion: number;
  };

  await page.goto("/complaints");
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report content" })).toBeVisible();
  await expect(page.getByText("The checkout button disappears when the window is narrow.")).toBeVisible();
  await expect(page.getByText(receipt.feedbackId)).toBeVisible();
});

test("a duplicate event id returns the original receipt and no duplicate row", async ({ page }) => {
  const eventId = randomUUID();
  const title = "Duplicate event retry title";
  await submitFeedback(page, eventId, title);
  const duplicate = await submitFeedback(page, eventId, title);
  const body = (await duplicate.json()) as { duplicate: boolean };
  expect(body.duplicate).toBe(true);

  const list = await page.request.get("http://localhost:4173/api/v1/inbox?limit=50");
  const data = (await list.json()) as { items: { title: string }[] };
  const matches = data.items.filter((item) => item.title === title);
  expect(matches).toHaveLength(1);
});
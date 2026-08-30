import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";
import { webOrigin } from "../web-origin";

async function submitFeedback(
  page: Page,
  eventId: string,
  projectKey: string,
  title = "Checkout button missing on small screens",
): Promise<Awaited<ReturnType<Page["request"]["post"]>>> {
  const response = await page.request.post(`${webOrigin}/api/v1/feedback`, {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": eventId,
      Origin: webOrigin,
    },
    data: {
      schemaVersion: 1,
      projectKey,
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
  const app = await signInAsE2eUser(page);
  const eventId = randomUUID();
  const title = `Checkout button missing ${randomUUID()}`;
  const response = await submitFeedback(page, eventId, app.projectKey, title);
  const receipt = (await response.json()) as {
    feedbackId: string;
    receivedAt: string;
    schemaVersion: number;
  };

  await page.goto("/complaints");
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Complaints" }).getByRole("button").filter({ hasText: title }),
  ).toBeVisible();

  await page
    .getByRole("list", { name: "Complaints" })
    .getByRole("button")
    .filter({ hasText: title })
    .click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What happened" })).toBeVisible();
  await expect(
    page.getByText("The checkout button disappears when the window is narrow."),
  ).toBeVisible();
  await expect(page.getByText(receipt.feedbackId)).toBeVisible();
});

test("a duplicate event id returns the original receipt and no duplicate row", async ({ page }) => {
  const app = await signInAsE2eUser(page);
  const eventId = randomUUID();
  const title = `Duplicate event retry ${randomUUID()}`;
  await submitFeedback(page, eventId, app.projectKey, title);
  const duplicate = await submitFeedback(page, eventId, app.projectKey, title);
  const body = (await duplicate.json()) as { duplicate: boolean };
  expect(body.duplicate).toBe(true);

  const list = await page.request.get(`${webOrigin}/api/v1/apps/${app.slug}/inbox?limit=50`);
  const data = (await list.json()) as { items: { title: string }[] };
  const matches = data.items.filter((item) => item.title === title);
  expect(matches).toHaveLength(1);
});

import { expect, type Route, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

const INBOX = "**/api/v1/inbox**";

const items = [
  {
    feedbackId: "11111111-1111-4111-8111-111111111111",
    kind: "bug",
    receivedAt: "2026-08-28T12:00:00.000Z",
    requestOrigin: "http://localhost:4173",
    routeLabel: "/checkout",
    title: "Checkout button missing",
  },
  {
    feedbackId: "22222222-2222-4222-8222-222222222222",
    kind: "idea",
    receivedAt: "2026-08-28T11:00:00.000Z",
    requestOrigin: "http://localhost:4173",
    routeLabel: "/pricing",
    title: "Add a yearly plan",
  },
];

async function fulfillList(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test("complaints list renders rows from the collector", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.route(INBOX, (route) => fulfillList(route, { items, nextCursor: null }));
  await page.goto("/complaints");
  await expect(page.getByRole("heading", { name: "All complaints" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Checkout button missing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a yearly plan" })).toBeVisible();
  await expect(page.locator(".kind-badge", { hasText: "Bug report" })).toBeVisible();
  await expect(page.locator(".kind-badge", { hasText: "Idea" })).toBeVisible();
});

test("complaints search filters the request and clears the table when empty", async ({ page }) => {
  await signInAsE2eUser(page);
  const queries: string[] = [];
  await page.route(INBOX, async (route) => {
    const query = new URL(route.request().url()).searchParams.get("search") ?? "";
    queries.push(query);
    await fulfillList(
      route,
      query.includes("checkout")
        ? { items: [items[0]], nextCursor: null }
        : { items: [], nextCursor: null },
    );
  });
  await page.goto("/complaints");
  await page.getByLabel("Search complaints, pages, or origins").fill("checkout");
  await page.waitForTimeout(450);
  await expect(page.getByRole("link", { name: "Checkout button missing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a yearly plan" })).toHaveCount(0);
  expect(queries).toContain("checkout");
  await page.getByLabel("Search complaints, pages, or origins").fill("");
  await page.waitForTimeout(450);
  await expect(page.getByRole("heading", { name: "No complaints yet" })).toBeVisible();
});

test("complaints kind filter narrows the table to the selected type", async ({ page }) => {
  await signInAsE2eUser(page);
  await page.route(INBOX, async (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind") ?? "";
    await fulfillList(
      route,
      kind === "bug" ? { items: [items[0]], nextCursor: null } : { items, nextCursor: null },
    );
  });
  await page.goto("/complaints");
  await page.getByLabel("Filter by feedback type").selectOption("bug");
  await expect(page.getByRole("link", { name: "Checkout button missing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a yearly plan" })).toHaveCount(0);
});

test("complaints pagination moves between pages and disables at the end", async ({ page }) => {
  await signInAsE2eUser(page);
  const pageTwoItem = {
    feedbackId: "33333333-3333-4333-8333-333333333333",
    kind: "blocked_task",
    receivedAt: "2026-08-28T10:00:00.000Z",
    requestOrigin: "http://localhost:4173",
    routeLabel: "/signup",
    title: "Signup form stuck",
  };
  await page.route(INBOX, async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    await fulfillList(
      route,
      cursor === null
        ? {
            items: [items[0]],
            nextCursor: "2026-08-28T11:00:00.000Z|22222222-2222-4222-8222-222222222222",
          }
        : { items: [pageTwoItem], nextCursor: null },
    );
  });
  await page.goto("/complaints");
  await expect(page.getByRole("link", { name: "Checkout button missing" })).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByRole("link", { name: "Signup form stuck" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});

test("complaints list shows a retryable failure state and recovers", async ({ page }) => {
  await signInAsE2eUser(page);
  let attempts = 0;
  await page.route(INBOX, async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"code":"internal_error"}',
      });
      return;
    }
    await fulfillList(route, { items, nextCursor: null });
  });
  await page.goto("/complaints");
  await expect(page.getByRole("heading", { name: "Could not load complaints" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: "Checkout button missing" })).toBeVisible();
  expect(attempts).toBe(2);
});

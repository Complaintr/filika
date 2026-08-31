import { expect, type Route, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";

const DASHBOARD = "**/api/v1/apps/*/dashboard**";

function dashboardBody(days: number) {
  return {
    days,
    generatedAt: "2026-08-28T12:00:00.000Z",
    total: 4,
    kinds: [
      { kind: "bug", count: 2 },
      { kind: "blocked_task", count: 1 },
      { kind: "confusing_behavior", count: 0 },
      { kind: "idea", count: 1 },
    ],
    daily: [
      { date: "2026-08-27", count: 1 },
      { date: "2026-08-28", count: 3 },
    ],
    routes: [{ label: "/checkout", count: 3 }],
  };
}

async function fulfillDashboard(route: Route, days: number): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(dashboardBody(days)),
  });
}

test("dashboard renders the OpenAnalytics-style overview without lower complaint panels", async ({
  page,
}) => {
  await signInAsE2eUser(page);
  await page.route(DASHBOARD, (route) => fulfillDashboard(route, 30));

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Total complaints")).toBeVisible();
  await expect(page.locator(".stat-value").first()).toContainText("4");
  await expect(page.getByRole("heading", { name: "Complaint activity" })).toBeVisible();
  await expect(page.getByRole("img", { name: /complaints over 30 days/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "By feedback type" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest complaints" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Most reported pages" })).toHaveCount(0);
});

test("dashboard date range switch reloads the requested window", async ({ page }) => {
  await signInAsE2eUser(page);
  const requests: number[] = [];
  await page.route(DASHBOARD, async (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get("days") ?? 30);
    requests.push(days);
    await fulfillDashboard(route, days);
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator(".stat-value").first()).toContainText("4");
  await page.getByLabel("Dashboard date range").selectOption("7");
  await expect(page.getByRole("img", { name: /complaints over 7 days/ })).toBeVisible();
  expect(requests).toContain(7);
});

test("dashboard shows a retryable failure state when the collector is down", async ({ page }) => {
  await signInAsE2eUser(page);
  let attempts = 0;
  await page.route(DASHBOARD, async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"code":"internal_error"}',
      });
      return;
    }
    await fulfillDashboard(route, 30);
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Could not load your dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".stat-value").first()).toContainText("4");
  expect(attempts).toBe(2);
});

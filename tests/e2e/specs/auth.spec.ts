import { expect, test } from "@playwright/test";
import { seedE2eSession } from "../auth";
import { browserDatabaseUrl } from "../database";

test("an anonymous visitor is redirected to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in to Filika" })).toBeVisible();
});

test("the login page offers Google sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
});

test("a signed-in visitor is redirected from login to the dashboard", async ({ page }) => {
  const secret = process.env.BETTER_AUTH_SECRET ?? "test-secret";
  const { cookieName, cookieValue } = await seedE2eSession(browserDatabaseUrl(), secret);
  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("login offers google and github sign-in options", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("standalone pages share canvas colors across theme changes and navigation", async ({
  page,
}) => {
  await page.goto("/login");
  for (const [theme, color] of [
    ["light", "rgb(255, 255, 255)"],
    ["dark", "rgb(14, 14, 16)"],
  ] as const) {
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark theme" }).click();
    for (const path of ["/login", "/register", "/terms", "/forgot-password", "/reset-password"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const selector of [
        "html",
        "body",
        "main",
        path === "/terms" ? ".terms-card" : ".auth-card",
      ]) {
        await expect(page.locator(selector)).toHaveCSS("background-color", color);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/terms");
  await expect(page.locator(".terms-page")).toHaveCSS("background-color", "rgb(14, 14, 16)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("standalone pages follow a saved system theme when the device appearance changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("filika-workspace-v1", JSON.stringify({ theme: "system" }));
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".auth-page")).toHaveCSS("background-color", "rgb(14, 14, 16)");
  await page.goto("/terms");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".terms-page")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("registration swaps panels and images, with reversible navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  const form = page.locator(".auth-form-panel");
  const art = page.locator(".auth-art");
  await expect
    .poll(async () => (await art.boundingBox())?.x ?? 0)
    .toBeGreaterThan((await form.boundingBox())?.x ?? 0);
  await expect(page.locator(".auth-photo-login")).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create your Filika account" })).toBeVisible();
  await expect.poll(async () => (await form.boundingBox())?.x ?? 0).toBeGreaterThan(700);
  await expect(page.locator(".auth-photo-register")).toHaveCSS("opacity", "1");
  await expect(page.locator(".auth-photo-login")).toHaveCSS("opacity", "0");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Sign in to Filika" })).toBeVisible();
  await expect(form).toHaveCSS("transform", "none");
});

test("mobile auth and terms keep the theme and fit without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("link", { name: "Terms of Service" }).click();
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("reduced motion disables sliding", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await expect(page.locator(".auth-art")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".auth-form-content")).toHaveCSS("animation-name", "none");
});

test("email sign-in reports errors and allows password visibility toggling", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({ status: 401, json: { code: "INVALID_EMAIL_OR_PASSWORD" } }),
  );
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("reader@example.com");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("test-password-123");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "email or password is incorrect",
  );
});

test("registration sends the email credentials and shows verification instructions", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-up/email", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "reader@example.com",
      password: "test-password-123",
      name: "Test Reader",
      callbackURL: "/login?verified=1",
    });
    await route.fulfill({ json: { token: null, user: {} } });
  });
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Test Reader");
  await page.getByLabel("Email address", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText(/we’ve sent a verification link/)).toBeVisible();
});

test("recovery gives a generic confirmation and reset validates password confirmation", async ({
  page,
}) => {
  await page.route("**/api/auth/request-password-reset", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "reader@example.com",
      redirectTo: "/reset-password",
    });
    await route.fulfill({ json: { status: true } });
  });
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill("reader@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
  await page.goto("/reset-password");
  await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  await page.goto("/reset-password?token=test-token");
  await page.getByLabel("New password", { exact: true }).fill("new-password-123");
  await page.getByLabel("Confirm new password", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Your passwords do not match.",
  );
  await page.route("**/api/auth/reset-password", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token: "test-token",
      newPassword: "new-password-123",
    });
    await route.fulfill({ json: { status: true } });
  });
  await page.getByLabel("Confirm new password", { exact: true }).fill("new-password-123");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
});

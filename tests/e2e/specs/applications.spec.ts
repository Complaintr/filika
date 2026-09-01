import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";
import { webOrigin } from "../web-origin";

test("onboarding creates an application and the header switches between isolated applications", async ({
  page,
}) => {
  const identity = await signInAsE2eUser(page, { application: false });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Application name", { exact: true }).fill("Eckra");
  const slug = `eckra-${identity.userId.slice(0, 8)}`;
  await page.getByText("Workspace URL", { exact: true }).click();
  await page.getByLabel("Filika address", { exact: true }).fill(slug);
  await page.getByLabel("Website origin", { exact: true }).fill(webOrigin);
  await page.getByRole("button", { name: "Create application", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/onboarding\\?app=${slug}$`));
  await expect(page.getByRole("heading", { name: "Add Filika to Eckra." })).toBeVisible();
  await expect(page.getByText(`/sdk/filika.development.js`, { exact: false })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("onboarding-install.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "I installed it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Send one real signal." })).toBeVisible();

  const applications = (await (await page.request.get("/api/v1/apps")).json()).applications as {
    projectKey: string;
    slug: string;
  }[];
  const created = applications.find((application) => application.slug === slug);
  expect(created).toBeDefined();
  const eventId = randomUUID();
  const title = `First onboarding signal ${eventId}`;
  const feedback = await page.request.post("/api/v1/feedback", {
    headers: { "Idempotency-Key": eventId, Origin: webOrigin },
    data: {
      schemaVersion: 1,
      projectKey: created?.projectKey,
      eventId,
      feedback: {
        kind: "bug",
        title,
        description: "A reviewed test report for onboarding verification.",
      },
      context: { sdkVersion: "0.0.0", routeLabel: "/onboarding-test" },
    },
  });
  expect(feedback.status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Eckra is connected." })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("onboarding-connected.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open the first report", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/complaints/`));
  await expect(page.getByRole("button", { name: "Switch application" })).toContainText("Eckra");

  const secondSlug = `second-${identity.userId.slice(0, 8)}`;
  await page.goto("/onboarding?new=1");
  await expect(page.getByRole("heading", { name: "Connect another product." })).toBeVisible();
  await page.getByLabel("Application name", { exact: true }).fill("Second application");
  await page.getByLabel("Website origin", { exact: true }).fill(webOrigin);
  await page.getByText("Workspace URL", { exact: true }).click();
  await page.getByLabel("Filika address", { exact: true }).fill(secondSlug);
  await page.getByRole("button", { name: "Create application", exact: true }).click();
  await page.getByRole("button", { name: "Finish later", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${secondSlug}/complaints$`));
  await expect(page.getByText("Setup incomplete", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Switch application" }).click();
  await page
    .getByRole("navigation", { name: "Your applications" })
    .getByRole("link", { name: /Eckra/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/complaints$`));
  await page.getByRole("button", { name: "Switch application" }).click();
  await page
    .getByRole("navigation", { name: "Your applications" })
    .getByRole("link", { name: /Second application/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${secondSlug}/complaints$`));
  await page.locator(".bottom-nav-item", { hasText: "Settings" }).click();
  await expect(page.getByLabel(/^Application name/)).toHaveValue("Second application");
  await page.getByLabel(/^Application name/).fill("Renamed second app");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".settings-save-status")).toHaveText("Your changes are saved.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("application-settings.png"),
    fullPage: true,
  });
  const first = await page.request.get(`/api/v1/apps/${slug}`);
  expect((await first.json()).application.displayName).toBe("Eckra");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Manage profile", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Account", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByLabel(/^Application name/)).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Switch application" }).click();
  await expect(page.getByRole("navigation", { name: "Your applications" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: test.info().outputPath("mobile-application-switcher.png"),
    fullPage: true,
  });
});

test("Google photo is optional, persists, and updates the header without uploads", async ({
  page,
}) => {
  await signInAsE2eUser(page, { google: true });
  await page.route("https://lh3.googleusercontent.com/test-avatar", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#3563e9"/></svg>',
    }),
  );
  await page.goto("/account");
  const choice = page.getByRole("checkbox", { name: "Use Google profile photo" });
  await expect(choice).toBeEnabled();
  await expect(choice).not.toBeChecked();
  await expect(page.locator('.topbar button[aria-label="Open profile menu"] img')).toHaveCount(0);
  await choice.check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".settings-save-status")).toHaveText("Your changes are saved.");
  await expect(page.locator('.topbar button[aria-label="Open profile menu"] img')).toBeVisible();
  await page.reload();
  await expect(choice).toBeChecked();
  await page.screenshot({ path: test.info().outputPath("account-profile.png"), fullPage: true });
  await choice.uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".settings-save-status")).toHaveText("Your changes are saved.");
  await expect(page.locator('.topbar button[aria-label="Open profile menu"] img')).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("password-only accounts cannot select a Google photo and cannot read another app", async ({
  page,
  browser,
}) => {
  const first = await signInAsE2eUser(page);
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await signInAsE2eUser(other);
    await other.goto(`${webOrigin}/account`);
    await expect(other.getByRole("checkbox", { name: "Use Google profile photo" })).toBeDisabled();
    const denied = await other.request.get(`${webOrigin}/api/v1/apps/${first.slug}/inbox`);
    expect(denied.status()).toBe(404);
    await other.goto(`${webOrigin}/${first.slug}/complaints`);
    await expect(other.getByRole("heading", { name: "Application not found" })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

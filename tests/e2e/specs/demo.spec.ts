import { expect, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";
import { webOrigin } from "../web-origin";

test("demo storefront loads publicly and the flow panel navigates", async ({ page }) => {
  await page.goto("/demo");

  await expect(
    page.getByRole("heading", { name: "See what happens after an agent hits a dead end." }),
  ).toBeVisible();
  await expect(page.getByText("Buy the Wireless Headphones", { exact: false })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Demo guide" })).toBeVisible();

  // The flow panel exposes every tour step and reports progress.
  await expect(page.getByText("1 / 7")).toBeVisible();
  const next = page.getByRole("button", { name: /Next/ });
  await next.click();
  await expect(page.getByText("2 / 7")).toBeVisible();

  // Hide collapses the panel.
  await page.getByRole("button", { name: "Hide demo guide" }).click();
  await expect(page.getByRole("button", { name: /Reset demo/ })).toBeHidden();
  await page.getByRole("button", { name: "Show demo guide" }).click();
  await expect(page.getByRole("button", { name: /Reset demo/ })).toBeVisible();
});

test("demo store reports a deterministic checkout timeout", async ({ page }) => {
  await page.goto("/demo");

  // Advance to the product step so the agent adds the headphones.
  const next = page.getByRole("button", { name: /Next/ });
  await next.click();
  await next.click();
  await next.click();

  const placeOrder = page.getByRole("button", { name: "Place order" });
  await expect(placeOrder).toBeVisible();
  await placeOrder.click();
  await expect(page.getByText("Payment confirmation timed out", { exact: false })).toBeVisible();
});

test("device demo application is created and listed in the demo workspace", async ({ request }) => {
  const device = `e2e-${crypto.randomUUID().replaceAll("-", "")}`;
  const appResponse = await request.get(`${webOrigin}/api/v1/demo/${device}/app`);
  expect(appResponse.ok()).toBe(true);
  const body = (await appResponse.json()) as {
    application: { kind: string; slug: string; projectKey: string };
  };
  expect(body.application.kind).toBe("demo");
  expect(body.application.slug).toBe(`demo-${device}`);
  expect(body.application.projectKey).toMatch(/^app_[0-9a-f]+$/);

  // A confirmed report reaches the device inbox.
  const eventId = crypto.randomUUID();
  const ingest = await request.post(`${webOrigin}/api/v1/feedback`, {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": eventId,
      Origin: webOrigin,
    },
    data: {
      schemaVersion: 1,
      projectKey: body.application.projectKey,
      eventId,
      feedback: {
        kind: "bug",
        title: "Demo e2e checkout hangs",
        description: "The order never completes.",
      },
      context: { sdkVersion: "0.0.0", routeLabel: "/demo/checkout" },
    },
  });
  expect(ingest.ok()).toBe(true);

  const inbox = await request.get(`${webOrigin}/api/v1/demo/${device}/inbox`);
  const inboxBody = (await inbox.json()) as { items: { title: string }[] };
  expect(inboxBody.items.some((item) => item.title === "Demo e2e checkout hangs")).toBe(true);
});

test("checkout endpoint always returns 504", async ({ request }) => {
  const response = await request.post(`${webOrigin}/api/v1/demo/checkout`, { data: {} });
  expect(response.status()).toBe(504);
});

test("/demo subpaths that fall through to [appSlug] keep the workspace shell", async ({ page }) => {
  // `/demo` is a real route, but unknown `/demo/*` paths resolve to
  // `[appSlug]`. Those pages need the workspace shell (ConnectionProvider);
  // treating every `/demo/*` as standalone would crash them.
  await signInAsE2eUser(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const path of ["/demo/dashboard", "/demo/settings", "/demo/complaints"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    // Either the app slug route renders (with shell) or the account has no app
    // and it redirects to onboarding. Neither may crash on the connection hook.
    await page.waitForTimeout(500);
  }
  expect(errors.filter((message) => message.includes("useConnection"))).toEqual([]);
});

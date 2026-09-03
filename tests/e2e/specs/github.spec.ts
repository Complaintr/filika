import { expect, test } from "@playwright/test";
import { signInAsE2eUser } from "../sign-in";
import { webOrigin } from "../web-origin";

const connection = {
  version: "11111111-1111-4111-8111-111111111111",
  installationId: "2",
  repositoryId: "3",
  fullName: "owner/repo",
  isPrivate: false,
  active: true,
};
const connected = {
  configured: true,
  authorized: true,
  issueMode: "manual" as const,
  installUrl: "https://github.com/apps/filika-test/installations/new",
  connection,
};

test("GitHub settings selects a repository and confirms disconnect", async ({ page }) => {
  const identity = await signInAsE2eUser(page);
  let bound = false;
  let disconnected = false;
  let issueMode: "manual" | "automatic" = "manual";
  await page.route("**/github**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/installations"))
      return route.fulfill({
        json: { installations: [{ id: "2", login: "owner" }], nextPage: null },
      });
    if (path.endsWith("/repositories"))
      return route.fulfill({
        json: {
          repositories: [{ id: "3", fullName: "owner/repo", isPrivate: false }],
          nextPage: null,
        },
      });
    if (path.endsWith("/connection")) {
      expect(route.request().postDataJSON()).toEqual({ installationId: "2", repositoryId: "3" });
      bound = true;
      return route.fulfill({ json: { ...connected, issueMode } });
    }
    if (path.endsWith("/mode")) {
      const body: { mode: "manual" | "automatic" } = route.request().postDataJSON();
      issueMode = body.mode;
      return route.fulfill({ json: { ...connected, issueMode } });
    }
    if (path.endsWith("/disconnect")) {
      disconnected = true;
      return route.fulfill({ json: { disconnected: true } });
    }
    return route.fulfill({
      json: {
        ...connected,
        issueMode,
        authorized: !disconnected,
        connection: bound && !disconnected ? connection : null,
      },
    });
  });
  await page.goto(`/${identity.slug}/settings?github=settings`);
  await page.getByLabel("GitHub account").selectOption("2");
  await page.getByLabel("GitHub repository").selectOption("3");
  await page.getByRole("button", { name: "Save repository connection" }).click();
  await expect(
    page.getByText("Repository connected. Reports are exported only after your approval."),
  ).toBeVisible();
  expect(bound).toBe(true);
  await page.getByLabel("Issue creation").selectOption("automatic");
  await expect(
    page.getByText("Automatic issue creation enabled for newly confirmed feedback."),
  ).toBeVisible();
  await expect(page.getByText(/without another maintainer review/)).toBeVisible();
  await page.getByRole("button", { name: "Disconnect GitHub", exact: true }).click();
  expect(disconnected).toBe(false);
  await page.getByRole("button", { name: "Cancel disconnect" }).click();
  expect(disconnected).toBe(false);
  await page.getByRole("button", { name: "Disconnect GitHub", exact: true }).click();
  await page.getByRole("button", { name: "Confirm disconnect" }).click();
  await expect(page.getByText("GitHub disconnected.")).toBeVisible();
});

test("issue review sends nothing until confirmation and preserves the GitHub link", async ({
  page,
}) => {
  const identity = await signInAsE2eUser(page);
  const eventId = crypto.randomUUID();
  const accepted = await page.request.post("/api/v1/feedback", {
    headers: { Origin: webOrigin, "Idempotency-Key": eventId },
    data: {
      schemaVersion: 1,
      projectKey: identity.projectKey,
      eventId,
      feedback: { kind: "bug", title: "Checkout fails", description: "Save does not respond." },
      context: { sdkVersion: "0.0.0" },
    },
  });
  expect(accepted.ok()).toBe(true);
  const inbox = await page.request.get(`/api/v1/apps/${identity.slug}/inbox`);
  const feedbackId: string = (await inbox.json()).items[0].feedbackId;
  let posts = 0;
  let created = false;
  const issue = {
    status: "created",
    trigger: "manual",
    number: 7,
    url: "https://github.com/owner/repo/issues/7",
    fullName: "owner/repo",
  };
  await page.route("**/github/issues/**", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      created = true;
      expect(route.request().postDataJSON()).toEqual({
        connectionVersion: connection.version,
        fullName: connection.fullName,
        isPrivate: false,
        title: "Reviewed checkout failure",
        body: "Reviewed details only.",
      });
      return route.fulfill({ status: 201, json: { issue } });
    }
    return route.fulfill({
      json: {
        ...connected,
        draft: { title: "Checkout fails", body: "Save does not respond." },
        issue: created ? issue : null,
      },
    });
  });
  await page.goto(`/${identity.slug}/complaints`);
  await page.getByRole("button", { name: /^Checkout fails/ }).click();
  const panel = page.getByRole("region", { name: "GitHub issue", exact: true });
  await panel.getByRole("button", { name: "Create GitHub issue", exact: true }).click();
  await expect(panel.getByText(/Public repository: anyone/)).toBeVisible();
  expect(posts).toBe(0);
  await panel.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(posts).toBe(0);
  await panel.getByRole("button", { name: "Create GitHub issue", exact: true }).click();
  await panel.getByLabel("Issue title").fill("Reviewed checkout failure");
  await panel.getByLabel("Issue description (Markdown)").fill("Reviewed details only.");
  await page.screenshot({
    path: test.info().outputPath("github-issue-review.png"),
    fullPage: true,
  });
  await panel.getByRole("button", { name: "Confirm and create issue" }).click();
  await expect(panel.getByRole("link", { name: "View owner/repo #7" })).toBeVisible();
  expect(posts).toBe(1);
  await page.goto(`/${identity.slug}/complaints/${feedbackId}`);
  await expect(page.getByRole("link", { name: "View owner/repo #7" })).toBeVisible();
  expect(posts).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("unconfigured GitHub is optional and owner APIs require a session", async ({
  page,
  request,
}) => {
  const identity = await signInAsE2eUser(page);
  await page.goto(`/${identity.slug}/settings?github=settings`);
  await expect(
    page.getByText(
      "The server operator must configure the Filika GitHub App before repositories can be connected.",
    ),
  ).toBeVisible();
  expect((await request.get(`/api/v1/apps/${identity.slug}/github`)).status()).toBe(401);
});

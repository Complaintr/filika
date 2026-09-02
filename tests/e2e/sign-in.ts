import type { Page } from "@playwright/test";
import { seedE2eSession } from "./auth";
import { browserDatabaseUrl } from "./database";

/**
 * Signs a Playwright page in as a seeded e2e user by planting the Better Auth
 * session cookie directly. Call before the first `page.goto`.
 */
export async function signInAsE2eUser(
  page: Page,
  options: { application?: boolean; google?: boolean; github?: boolean } = {},
) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "test-secret";
  const identity = await seedE2eSession(browserDatabaseUrl(), secret, options);
  const { cookieName, cookieValue } = identity;
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
  return identity;
}

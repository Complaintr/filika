import { describe, expect, test } from "bun:test";

import { createBetterAuth } from "../src/auth/better-auth";
import type { Db } from "../src/db/client";

function authWith(githubClientId: string | undefined, githubClientSecret: string | undefined) {
  return createBetterAuth({} as Db, {
    baseURL: "http://localhost:4173",
    secret: "test-secret-for-github-auth-at-least-32-characters",
    githubClientId,
    githubClientSecret,
  }).options.socialProviders.github;
}

describe("github social provider", () => {
  test("registers the github provider when credentials are present", () => {
    const github = authWith("github-client", "github-secret");

    expect(github).toBeDefined();
    expect(github?.clientId).toBe("github-client");
    expect(github?.clientSecret).toBe("github-secret");
  });

  test("never registers the github provider without credentials", () => {
    expect(authWith(undefined, undefined)).toBeUndefined();
  });

  test("never registers the github provider with empty credentials", () => {
    expect(authWith("", "")).toBeUndefined();
  });
});

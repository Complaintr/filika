import { describe, expect, test } from "bun:test";
import { createHmac, generateKeyPairSync, verify } from "node:crypto";
import { GitHubClient, GitHubError } from "../src/github/client";
import {
  appJwt,
  decryptToken,
  encryptToken,
  type GitHubConfig,
  hashState,
  validWebhook,
} from "../src/github/config";
import { issueApproval } from "../src/github/contracts";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config: GitHubConfig = {
  appId: "1",
  appSlug: "filika-test",
  clientId: "test-client",
  clientSecret: "secret",
  privateKey: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  encryptionKey: "ab".repeat(32),
  webhookSecret: "webhook-secret",
  baseUrl: "http://localhost:4173",
};

describe("GitHub security boundaries", () => {
  test("encrypted credentials cannot move between applications or owners", () => {
    const value = encryptToken("github-token", config.encryptionKey, "project:user");
    expect(value).not.toContain("github-token");
    expect(decryptToken(value, config.encryptionKey, "project:user")).toBe("github-token");
    expect(() => decryptToken(value, config.encryptionKey, "other:user")).toThrow();
    expect(() => decryptToken(value, "cd".repeat(32), "project:user")).toThrow();
    expect(hashState("oauth-state")).not.toContain("oauth-state");
  });
  test("app JWT is signed with bounded lifetime and clock skew", () => {
    const jwt = appJwt(config, 1_800_000_000_000);
    const [header, payload, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(payload ?? "", "base64url").toString())).toEqual({
      iat: 1799999940,
      exp: 1800000540,
      iss: "test-client",
    });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        keys.publicKey,
        Buffer.from(signature ?? "", "base64url"),
      ),
    ).toBe(true);
  });
  test("webhook validation rejects missing, forged and changed payloads", () => {
    const body = '{"action":"deleted"}';
    const signature = `sha256=${createHmac("sha256", config.webhookSecret).update(body).digest("hex")}`;
    expect(validWebhook(body, signature, config.webhookSecret)).toBe(true);
    expect(validWebhook(`${body} `, signature, config.webhookSecret)).toBe(false);
    expect(validWebhook(body, null, config.webhookSecret)).toBe(false);
    expect(validWebhook(body, "sha256=invalid", config.webhookSecret)).toBe(false);
  });
  test("approval rejects unknown fields and requires the reviewed destination", () => {
    const input = {
      connectionVersion: crypto.randomUUID(),
      fullName: "owner/repo",
      isPrivate: true,
      title: "Bug",
      body: "Details",
    };
    expect(issueApproval.safeParse(input).success).toBe(true);
    expect(issueApproval.safeParse({ ...input, autoMerge: true }).success).toBe(false);
    expect(
      issueApproval.safeParse({ ...input, fullName: "https://attacker.example" }).success,
    ).toBe(false);
    expect(issueApproval.safeParse({ ...input, body: "x".repeat(12001) }).success).toBe(false);
  });
  test("installation tokens are scoped to the selected repo and issues only", async () => {
    let called = false;
    const fetcher: typeof fetch = Object.assign(
      async (input: string | URL | Request, init?: RequestInit) => {
        called = true;
        expect(String(input)).toBe("https://api.github.com/app/installations/2/access_tokens");
        expect(JSON.parse(String(init?.body))).toEqual({
          repository_ids: [3],
          permissions: { issues: "write" },
        });
        expect(init?.redirect).toBe("error");
        return Response.json({ token: "scoped-token" });
      },
      { preconnect: fetch.preconnect },
    );
    expect(await new GitHubClient(config, fetcher).installationToken("2", "3")).toBe(
      "scoped-token",
    );
    expect(called).toBe(true);
  });
  test("repository access fails closed for readers", async () => {
    const fetcher: typeof fetch = Object.assign(
      async () =>
        Response.json({
          id: 3,
          full_name: "owner/repo",
          private: true,
          archived: false,
          disabled: false,
          has_issues: true,
          permissions: { push: false },
        }),
      { preconnect: fetch.preconnect },
    );
    await expect(
      new GitHubClient(config, fetcher).accessibleRepository("user-token", "3"),
    ).rejects.toBeInstanceOf(GitHubError);
  });
  test("unreadable successful responses never authorize a second issue POST", async () => {
    for (const body of ["not-json", "x".repeat(2_000_001), null]) {
      let calls = 0;
      const fetcher: typeof fetch = Object.assign(
        async () => {
          calls++;
          return new Response(body, { status: 201 });
        },
        { preconnect: fetch.preconnect },
      );
      try {
        await new GitHubClient(config, fetcher).createIssue("token", "owner/repo", "Title", "Body");
        throw new Error("Expected an unreadable response failure");
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubError);
        expect((error as GitHubError).definite).toBe(false);
      }
      expect(calls).toBe(1);
    }
  });
});

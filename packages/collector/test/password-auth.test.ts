import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createBetterAuth } from "../src/auth/better-auth";
import type { Db } from "../src/db/client";

function fixture(configured = true) {
  const options = createBetterAuth({} as Db, {
    baseURL: "http://localhost:4173",
    secret: "test-secret-for-email-auth-at-least-32-characters",
    resendApiKey: configured ? "test" : undefined,
    emailFrom: configured ? "auth@example.com" : undefined,
  }).options;
  const deliveries: { kind: string; url: string }[] = [];
  const auth = betterAuth({
    ...options,
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    rateLimit: { enabled: false },
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    emailAndPassword: {
      ...options.emailAndPassword,
      enabled: true,
      sendResetPassword: async ({ url }) => {
        deliveries.push({ kind: "reset", url });
      },
    },
    emailVerification: {
      ...options.emailVerification,
      sendVerificationEmail: async ({ url }) => {
        deliveries.push({ kind: "verify", url });
      },
    },
  });
  const post = (path: string, body: Record<string, string>) =>
    auth.handler(
      new Request(`http://localhost:4173/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:4173" },
        body: JSON.stringify(body),
      }),
    );
  return { auth, deliveries, post };
}
const credentials = {
  name: "Test Reader",
  email: "reader@example.com",
  password: "original-password-123",
};

describe("verified email and password recovery", () => {
  test("verification gates sign-in, reset tokens are single-use, and reset revokes sessions", async () => {
    const { auth, deliveries, post } = fixture();
    expect(
      (await post("sign-up/email", { ...credentials, callbackURL: "/login?verified=1" })).status,
    ).toBe(200);
    expect((await post("sign-in/email", credentials)).status).toBe(403);
    const verify = deliveries.find((message) => message.kind === "verify");
    expect(verify).toBeDefined();
    await auth.handler(new Request(verify?.url ?? ""));
    const login = await post("sign-in/email", credentials);
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    const known = await post("request-password-reset", {
      email: credentials.email,
      redirectTo: "/reset-password",
    });
    const unknown = await post("request-password-reset", {
      email: "unknown@example.com",
      redirectTo: "/reset-password",
    });
    expect(known.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    const reset = deliveries.find((message) => message.kind === "reset");
    const callback = await auth.handler(new Request(reset?.url ?? ""));
    const token = new URL(callback.headers.get("location") ?? "").searchParams.get("token") ?? "";
    expect((await post("reset-password", { token, newPassword: "short" })).status).toBe(400);
    expect(
      (await post("reset-password", { token, newPassword: "replacement-password-123" })).status,
    ).toBe(200);
    expect(
      (await post("reset-password", { token, newPassword: "replayed-password-123" })).status,
    ).toBe(400);
    expect((await post("sign-in/email", credentials)).status).toBe(401);
    expect(
      (await post("sign-in/email", { ...credentials, password: "replacement-password-123" }))
        .status,
    ).toBe(200);
    const session = await auth.handler(
      new Request("http://localhost:4173/api/auth/get-session", { headers: { cookie } }),
    );
    expect(await session.json()).toBeNull();
  });
  test("rejects invalid reset tokens and untrusted callback URLs", async () => {
    const { post } = fixture();
    expect(
      (
        await post("reset-password", {
          token: "invalid-token",
          newPassword: "replacement-password",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post("request-password-reset", {
          email: credentials.email,
          redirectTo: "https://attacker.example/reset",
        })
      ).status,
    ).toBe(403);
  });
  test("unconfigured email fails consistently before looking up an account", async () => {
    const { post, deliveries } = fixture(false);
    expect((await post("sign-up/email", credentials)).status).toBe(503);
    expect((await post("request-password-reset", { email: credentials.email })).status).toBe(503);
    expect(deliveries).toEqual([]);
  });
});

import { describe, expect, test } from "bun:test";
import { createAuthMailer } from "../src/auth/email";

describe("Resend authentication email", () => {
  for (const kind of ["verify", "reset"] as const) {
    test(`sends a bounded ${kind} email without ambient user data`, async () => {
      let payload: unknown;
      const mailer = createAuthMailer(
        { resendApiKey: "test-key", emailFrom: "Filika <auth@example.com>" },
        async (url, init) => {
          expect(url).toBe("https://api.resend.com/emails");
          expect(init.method).toBe("POST");
          expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-key");
          expect(init.signal).toBeInstanceOf(AbortSignal);
          payload = JSON.parse(String(init.body));
          return Response.json({ id: "message-id" });
        },
      );
      await mailer({
        to: "reader@example.com",
        url: "https://filika.example/link?token=test",
        kind,
      });
      expect(payload).toMatchObject({
        from: "Filika <auth@example.com>",
        to: ["reader@example.com"],
        subject: kind === "reset" ? "Reset your Filika password" : "Verify your Filika email",
      });
      expect(JSON.stringify(payload)).toContain("https://filika.example/link?token=test");
      expect(Object.keys(payload as object).sort()).toEqual(["from", "subject", "text", "to"]);
    });
  }
  test("missing configuration never attempts delivery", async () => {
    const mailer = createAuthMailer({}, async () => {
      throw new Error("should not fetch");
    });
    await expect(
      mailer({ to: "a@example.com", url: "https://example.com", kind: "reset" }),
    ).rejects.toThrow("not configured");
  });
  test("provider and network errors cannot leak recipients or tokens", async () => {
    for (const send of [
      async () => Response.json({ message: "private-token" }, { status: 429 }),
      async () => {
        throw new Error("private-token");
      },
    ]) {
      const mailer = createAuthMailer({ resendApiKey: "key", emailFrom: "auth@example.com" }, send);
      await expect(
        mailer({ to: "a@example.com", url: "https://example.com", kind: "reset" }),
      ).rejects.toThrow("Authentication email could not be delivered.");
    }
  });
});

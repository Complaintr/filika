import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-features=WebMCPTesting"] } });

// Test doubles cover deterministic SDK diagnostics. The native case below does
// not install a double and explicitly reports missing browser support as a skip.
for (const [name, diagnostic] of [
  ["InvalidStateError", "invalid_state"],
  ["SecurityError", "security_error"],
  ["NotAllowedError", "not_allowed"],
  ["UnexpectedError", "unknown_error"],
] as const) {
  test(`registration ${name} stays bounded and preserves manual review`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((errorName) => {
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: {
          registerTool() {
            throw new DOMException("PRIVATE_REGISTRATION_DETAILS", errorName);
          },
        },
      });
    }, name);
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => window.Filika?.status))
      .toEqual({
        state: "registration_rejected",
        diagnostic,
      });
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.locator("#filika-feedback-dialog")).toBeVisible();
    await page.locator("#filika-cancel").click();
    await expect(page.getByRole("heading", { name: "Feedback canceled" })).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.locator("body").innerText()).not.toContain("PRIVATE_REGISTRATION_DETAILS");
  });
}

test("registration deadline stays bounded and preserves manual review", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool() {
          return new Promise<void>(() => {});
        },
      },
    });
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.Filika?.status), { timeout: 8000 })
    .toEqual({
      state: "registration_rejected",
      diagnostic: "registration_timeout",
    });
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.locator("#filika-feedback-dialog")).toBeVisible();
});

test.describe("native tools permissions policy", () => {
  test("Permissions-Policy: tools=() prevents native SDK registration", async ({ page }) => {
    await page.goto("/");
    const supported = await page.evaluate(() => {
      const context: unknown = Reflect.get(document, "modelContext");
      return (
        typeof context === "object" &&
        context !== null &&
        typeof Reflect.get(context, "registerTool") === "function"
      );
    });
    test.skip(!supported, "This Chromium build does not expose native document.modelContext.");
    // Positive control: a denial must come from the header, not a broken SDK.
    await expect.poll(() => page.evaluate(() => window.Filika?.status.state)).toBe("ready");
    await page.route("http://localhost:4173/", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          "Permissions-Policy": "tools=()",
        },
      });
    });
    const response = await page.goto("/");
    expect(response?.headers()["permissions-policy"]).toBe("tools=()");
    await expect
      .poll(() => page.evaluate(() => window.Filika?.status.state))
      .toBe("registration_rejected");
    const status = await page.evaluate(() => window.Filika?.status);
    if (status?.state !== "registration_rejected") throw new Error("Expected policy rejection");
    // Current draft: NotAllowedError; older Chromium testing builds: SecurityError.
    expect(["not_allowed", "security_error"]).toContain(status.diagnostic);
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.locator("#filika-feedback-dialog")).toBeVisible();
  });
});

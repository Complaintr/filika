import { expect, test } from "bun:test";
import { createElement } from "react";
import AccountPage from "../app/account/page";
import { renderReact } from "./helpers/render-react";

const profile = {
  id: "test-user",
  name: "Test User",
  email: "test@example.test",
  image: null,
  googleConnected: false,
  googleImageAvailable: false,
  useGoogleImage: false,
  theme: "light",
  density: "comfortable",
};

test("account loading and failure states do not expose an empty disabled form", async () => {
  const originalFetch = globalThis.fetch;
  const pending = Promise.withResolvers<Response>();
  globalThis.fetch = (() => pending.promise) as typeof fetch;
  const result = await renderReact(createElement(AccountPage));
  try {
    expect(result.container.textContent).toContain("Loading your account");
    expect(result.container.querySelector("form")).toBeNull();
    expect(result.container.querySelector('a[href="/onboarding?new=1"]')?.textContent).toContain(
      "Create application",
    );
    pending.resolve(Response.json({}, { status: 500 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.container.textContent).toContain("Your account could not be loaded. Try again.");
    expect(result.container.querySelector("form")).toBeNull();
  } finally {
    await result.close();
    globalThis.fetch = originalFetch;
  }
});

test("the profile photo action opens Profile from another account section", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ account: profile })) as typeof fetch;
  const result = await renderReact(createElement(AccountPage));
  try {
    const appearance = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("nav button"),
    ).find((button) => button.textContent === "Appearance");
    appearance?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.container.querySelector("#profile-photo")).toBeNull();
    result.window.history.replaceState(null, "", "/account#profile-photo");
    result.window.dispatchEvent(new result.window.Event("filika:profile-photo"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.container.querySelector("#profile-photo")).not.toBeNull();
    expect(result.window.document.activeElement?.id).toBe("profile-photo");
  } finally {
    await result.close();
    globalThis.fetch = originalFetch;
  }
});

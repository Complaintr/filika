import { expect, test } from "bun:test";
import { createElement } from "react";
import AccountPage from "../app/account/page";
import { renderReact } from "./helpers/render-react";

const profile = {
  id: "test-user",
  name: "Test User",
  email: "test@example.test",
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
    for (let i = 0; i < 25; i++) {
      if (result.container.textContent?.includes("Your account could not be loaded. Try again."))
        break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(result.container.textContent).toContain("Your account could not be loaded. Try again.");
    expect(result.container.querySelector("form")).toBeNull();
  } finally {
    await result.close();
    globalThis.fetch = originalFetch;
  }
});

test("inbox spacing choices reflow instead of overflowing a narrow settings column", async () => {
  const css = await Bun.file(`${import.meta.dir}/../src/app.css`).text();

  expect(css).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));");
});

test("the security section requires typed confirmation before deleting the account", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { method: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ method });
    if (String(input).endsWith("/api/v1/account") && method === "GET")
      return Response.json({ account: profile });
    if (String(input).endsWith("/api/v1/account") && method === "DELETE")
      return Response.json({ deleted: true });
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  const result = await renderReact(createElement(AccountPage));
  try {
    const security = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("nav button"),
    ).find((button) => button.textContent === "Security");
    security?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const openDelete = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.includes("Delete account"));
    expect(openDelete?.hasAttribute("disabled")).toBe(false);
    openDelete?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const confirmButton = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Delete my account");
    expect(confirmButton?.hasAttribute("disabled")).toBe(true);

    const input = result.container.querySelector<HTMLInputElement>(".delete-account-panel input");
    expect(input).not.toBeNull();
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(
        result.window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "delete");
      input.dispatchEvent(new result.window.Event("input", { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    const enabledConfirm = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Delete my account");
    expect(enabledConfirm?.hasAttribute("disabled")).toBe(false);

    let redirectedTo = "";
    result.window.location.assign = (url: string | URL) => {
      redirectedTo = String(url);
    };
    enabledConfirm?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
    expect(redirectedTo).toBe("/");
  } finally {
    await result.close();
    globalThis.fetch = originalFetch;
  }
});

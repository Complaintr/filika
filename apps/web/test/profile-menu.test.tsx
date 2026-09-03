import { describe, expect, test } from "bun:test";
import { ProfileMenu, type ProfileMenuProps } from "../src/workspace/profile-menu";
import { renderReact } from "./helpers/render-react";

function menu(props: ProfileMenuProps = {}) {
  return <ProfileMenu {...props} />;
}

describe("header profile menu", () => {
  test("opens from the header trigger with unavailable account actions", async () => {
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );

    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(result.container.querySelector('[role="menu"]')).not.toBeNull();
    expect(result.container.textContent).toContain("Manage profile");
    expect(result.container.textContent).toContain("Application settings");
    expect(result.container.textContent).toContain("Sign out");
    expect(result.container.querySelector('a[href="/account"]')).not.toBeNull();
    expect(result.container.querySelector('a[href="/my-store/settings"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain("Other Accounts");
    expect(result.container.textContent).not.toContain("Add another account");

    await result.close();
  });

  test("escape closes the menu and restores focus to its trigger", async () => {
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );
    if (!trigger) throw new Error("Profile menu trigger was not rendered");
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    result.window.document.dispatchEvent(
      new result.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.container.querySelector('[role="menu"]')).toBeNull();
    expect(result.window.document.activeElement as unknown).toBe(trigger);

    await result.close();
  });

  test("an outside pointer closes the open menu", async () => {
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    result.window.document.body.dispatchEvent(
      new result.window.Event("pointerdown", { bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.container.querySelector('[role="menu"]')).toBeNull();

    await result.close();
  });

  test("keyboard navigation moves between menu actions and closes when focus leaves", async () => {
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    try {
      result.container
        .querySelector<HTMLButtonElement>('[aria-label="Open profile menu"]')
        ?.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const menu = result.container.querySelector<HTMLElement>('[role="menu"]');
      expect(result.window.document.activeElement?.getAttribute("aria-label")).toBe("Light theme");
      menu?.dispatchEvent(
        new result.window.KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
        }) as unknown as Event,
      );
      expect(result.window.document.activeElement?.getAttribute("aria-label")).toBe("Dark theme");
      menu?.dispatchEvent(
        new result.window.KeyboardEvent("keydown", {
          key: "End",
          bubbles: true,
        }) as unknown as Event,
      );
      expect(result.window.document.activeElement?.getAttribute("href")).toBe("/my-store/settings");
      const outside = result.window.document.createElement("button");
      result.window.document.body.append(outside);
      outside.focus();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(result.container.querySelector('[role="menu"]')).toBeNull();
    } finally {
      await result.close();
    }
  });

  test("failed account theme saves restore the previous theme and show a bounded message", async () => {
    const originalFetch = globalThis.fetch;
    const profile = {
      id: "test-user",
      name: "Test User",
      email: "test@example.test",
      theme: "light",
      density: "comfortable",
    };
    globalThis.fetch = (async (_input, init) =>
      init?.method === "PATCH"
        ? Response.json({ error: { category: "internal_error" } }, { status: 500 })
        : Response.json({ account: profile })) as typeof fetch;
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    try {
      result.container
        .querySelector<HTMLButtonElement>('[aria-label="Open profile menu"]')
        ?.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      result.container.querySelector<HTMLButtonElement>('[aria-label="Dark theme"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(result.window.document.documentElement.dataset.theme).toBe("light");
      expect(result.container.querySelector('[role="alert"]')?.textContent).toBe(
        "Theme could not be saved. Try again.",
      );
      expect(result.container.querySelector('[role="menu"]')).not.toBeNull();
    } finally {
      await result.close();
      globalThis.fetch = originalFetch;
    }
  });

  test("light, dark, and system choices share the workspace theme preference", async () => {
    const result = await renderReact(menu({ applicationSlug: "my-store" }));
    const themeColor = result.window.document.createElement("meta");
    themeColor.name = "theme-color";
    result.window.document.head.append(themeColor);
    result.container.querySelector<HTMLButtonElement>('[aria-label="Open profile menu"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const dark = result.container.querySelector<HTMLButtonElement>('[aria-label="Dark theme"]');
    dark?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(dark?.getAttribute("aria-checked")).toBe("true");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(themeColor.content).toBe("#0e0e10");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("dark");

    Object.defineProperty(result.window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });
    const system = result.container.querySelector<HTMLButtonElement>('[aria-label="System theme"]');
    system?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(system?.getAttribute("aria-checked")).toBe("true");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("system");

    await result.close();
  });

  test("keeps the reference card, avatar, and three-way switcher proportions", async () => {
    const css = await Bun.file(`${import.meta.dir}/../src/app.css`).text();

    expect(css).toContain("width: min(340px, calc(100vw - 32px))");
    expect(css).toContain("grid-template-columns: 54px minmax(0, 1fr)");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain("width: 54px");
    expect(css).not.toContain("width: min(260px, 100%)");
    expect(css).toContain("min-height: 30px");
  });
});

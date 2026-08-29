import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ProfileMenu } from "../src/workspace/profile-menu";
import { renderReact } from "./helpers/render-react";

describe("header profile menu", () => {
  test("opens from the header trigger without rendering other accounts", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "My workspace" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );

    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(result.container.querySelector('[role="menu"]')).not.toBeNull();
    expect(result.container.textContent).toContain("Manage profile");
    expect(result.container.textContent).toContain("Settings");
    expect(result.container.textContent).toContain("Sign out");
    expect(result.container.textContent).not.toContain("Other Accounts");

    await result.close();
  });

  test("escape closes the menu and restores focus to its trigger", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "Filika" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    result.window.document.dispatchEvent(
      new result.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.container.querySelector('[role="menu"]')).toBeNull();
    expect(result.window.document.activeElement).toBe(trigger);

    await result.close();
  });

  test("an outside pointer closes the open menu", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "Filika" }));
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

  test("light, dark, and system choices share the workspace theme preference", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "Filika" }));
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

    expect(css).toContain("width: min(360px, calc(100vw - 32px))");
    expect(css).toContain("grid-template-columns: 56px minmax(0, 1fr) auto");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain("width: 56px");
    expect(css).toContain("min-height: 40px");
  });
});
